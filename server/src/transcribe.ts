import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";

type Pending = {
  resolve: (text: string) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

type WorkerResponse = { ok: true; text: string } | { ok: false; error: string };

let worker: ChildProcessWithoutNullStreams | null = null;
let starting: Promise<void> | null = null;
let buffer = "";
const queue: Pending[] = [];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.resolve(__dirname, "../src/transcribe.py");
const scriptPathDist = path.resolve(__dirname, "transcribe.py");

function resolveScript(): string {
  if (fs.existsSync(scriptPathDist)) return scriptPathDist;
  return scriptPath;
}

function resolveFfmpeg(): string {
  const configured = config.ffmpeg;
  if (configured !== "ffmpeg" && fs.existsSync(configured)) return configured;
  const wingetBase = path.join(
    os.homedir(),
    "AppData/Local/Microsoft/WinGet/Packages",
  );
  try {
    for (const entry of fs.readdirSync(wingetBase)) {
      if (!entry.toLowerCase().includes("gyan.ffmpeg")) continue;
      const root = path.join(wingetBase, entry);
      for (const child of fs.readdirSync(root)) {
        const candidate = path.join(root, child, "bin", "ffmpeg.exe");
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  } catch {
    /* sem winget */
  }
  return configured;
}

function rejectAll(error: Error): void {
  while (queue.length > 0) {
    const pending = queue.shift();
    if (!pending) continue;
    clearTimeout(pending.timer);
    pending.reject(error);
  }
}

function onLine(line: string): void {
  const pending = queue.shift();
  if (!pending) return;
  clearTimeout(pending.timer);
  try {
    const response = JSON.parse(line) as WorkerResponse;
    if (response.ok) pending.resolve(response.text);
    else pending.reject(new Error(response.error || "transcription_failed"));
  } catch (error) {
    pending.reject(error instanceof Error ? error : new Error("invalid_worker_response"));
  }
}

async function ensureWorker(): Promise<void> {
  if (worker && !worker.killed) return;
  if (starting) return starting;

  starting = (async () => {
    const script = resolveScript();
    const child = spawn(
      "python",
      [
        script,
        config.whisperModel,
        config.whisperDevice,
        config.whisperCompute,
        String(config.whisperBeam),
      ],
      { stdio: ["pipe", "pipe", "pipe"], windowsHide: true },
    );

    child.stdout.on("data", (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      for (;;) {
        const idx = buffer.indexOf("\n");
        if (idx === -1) break;
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (line) onLine(line);
      }
    });

    child.stderr.on("data", () => {
      /* logs do modelo não vão para o cliente */
    });

    child.on("exit", () => {
      if (worker === child) worker = null;
      rejectAll(new Error("whisper_worker_exited"));
    });

    worker = child;
  })().finally(() => {
    starting = null;
  });

  return starting;
}

function runFfmpeg(input: string, output: string): Promise<void> {
  const ffmpeg = resolveFfmpeg();
  return new Promise((resolve, reject) => {
    const child = spawn(
      ffmpeg,
      ["-y", "-i", input, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", output],
      { stdio: ["ignore", "ignore", "pipe"], windowsHide: true },
    );
    let err = "";
    child.stderr.on("data", (chunk: Buffer) => {
      err = (err + chunk.toString()).slice(-2000);
    });
    child.on("error", (error) => reject(error));
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg_failed:${code}:${err.slice(-300)}`));
    });
  });
}

export async function transcribeAudio(inputPath: string): Promise<string> {
  await ensureWorker();
  const current = worker;
  if (!current) throw new Error("whisper_worker_unavailable");

  const wavPath = path.join(os.tmpdir(), `dita-${randomUUID()}.wav`);
  try {
    await runFfmpeg(inputPath, wavPath);
    const text = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("transcription_timeout"));
      }, 120_000);
      queue.push({ resolve, reject, timer });
      current.stdin.write(`${JSON.stringify({ audio: wavPath, language: "pt" })}\n`);
    });
    return text;
  } finally {
    fs.promises.unlink(wavPath).catch(() => undefined);
  }
}

export function stopTranscriber(): void {
  worker?.kill();
  worker = null;
  rejectAll(new Error("whisper_worker_stopped"));
}
