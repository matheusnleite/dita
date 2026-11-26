import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "./env.js";

// .env na raiz do repositório. Variáveis já definidas no shell vencem.
loadEnvFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", ".env"));

const dataDir = process.env.DITA_DATA_DIR ?? path.join(os.homedir(), ".dita");
fs.mkdirSync(dataDir, { recursive: true });

const credentialsFile = path.join(dataDir, "credentials.json");

type Credentials = {
  password: string;
  sessionSecret: string;
  opencodePassword: string;
};

function readStored(): Partial<Credentials> {
  try {
    return JSON.parse(fs.readFileSync(credentialsFile, "utf8")) as Partial<Credentials>;
  } catch {
    return {};
  }
}

function loadCredentials(): Credentials {
  const stored = readStored();

  const password =
    process.env.DITA_PASSWORD || stored.password || crypto.randomBytes(9).toString("base64url");
  const sessionSecret =
    process.env.DITA_SESSION_SECRET ||
    stored.sessionSecret ||
    crypto.randomBytes(32).toString("base64url");
  const opencodePassword =
    process.env.OPENCODE_PASSWORD || stored.opencodePassword || crypto.randomBytes(18).toString("base64url");

  if (!process.env.DITA_PASSWORD || !process.env.DITA_SESSION_SECRET || !process.env.OPENCODE_PASSWORD) {
    const payload: Credentials = { password, sessionSecret, opencodePassword };
    fs.writeFileSync(credentialsFile, JSON.stringify(payload, null, 2), { mode: 0o600 });
  }

  return { password, sessionSecret, opencodePassword };
}

const credentials = loadCredentials();

export const config = {
  host: process.env.DITA_HOST ?? "127.0.0.1",
  port: Number(process.env.DITA_PORT ?? 8787),
  root: path.resolve(process.env.DITA_ROOT ?? path.join(os.homedir(), "Documents", "Projetos")),
  trashDirName: "_lixeira",
  dataDir,
  stateFile: path.join(dataDir, "state.json"),
  ...credentials,
  opencodeUrl: process.env.OPENCODE_URL ?? "http://127.0.0.1:4096",
  manageOpencode: process.env.DITA_MANAGE_OPENCODE !== "false",
  ffmpeg: process.env.DITA_FFMPEG ?? "ffmpeg",
  whisperModel: process.env.DITA_WHISPER_MODEL ?? "small",
  whisperDevice: process.env.DITA_WHISPER_DEVICE ?? "cpu",
  whisperCompute: process.env.DITA_WHISPER_COMPUTE ?? "int8",
};

export const OPEN_CODE_USER = "opencode";
