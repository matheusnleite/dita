import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const script = path.resolve(process.cwd(), "src/transcribe.py");

function hasPython() {
  const r = spawnSync("python", ["--version"], { encoding: "utf8" });
  return r.status === 0;
}

function makeWav(file: string) {
  // 1s silence, 16kHz, mono, pcm_s16le
  const sampleRate = 16000;
  const samples = sampleRate;
  const data = Buffer.alloc(samples * 2);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([header, data]));
}

describe("transcribe.py worker", () => {
  it("lê wav por wave/numpy e responde JSON (regressão av metadata_errors)", async () => {
    if (!hasPython()) return;

    const wav = path.join(os.tmpdir(), `dita-test-${Date.now()}.wav`);
    makeWav(wav);

    const proc = spawnSync(
      "python",
      [
        "-c",
        [
          "import json, sys",
          // carrega worker como script e exercita read_wav + transcribe path
          "import runpy",
          "ns = runpy.run_path(sys.argv[1])",
          "audio = ns['read_wav'](sys.argv[2])",
          "print(json.dumps({'ok': True, 'n': len(audio)}))",
        ].join("; "),
        script,
        wav,
      ],
      { encoding: "utf8", timeout: 30000 },
    );

    fs.unlinkSync(wav);
    expect(proc.status).toBe(0);
    const out = JSON.parse(proc.stdout.trim());
    expect(out).toEqual({ ok: true, n: 16000 });
  }, 30000);
});
