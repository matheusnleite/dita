import { spawn, type ChildProcess } from "node:child_process";
import { OPEN_CODE_USER, config } from "./config.js";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  text: string;
  tools: string[];
  error?: string;
  createdAt?: number;
};

export type OpenCodeSession = {
  id: string;
  title?: string;
  directory?: string;
};

export type ModelOption = {
  providerID: string;
  modelID: string;
  name: string;
  free: boolean;
  status?: string;
};

const basicAuth =
  "Basic " + Buffer.from(`${OPEN_CODE_USER}:${config.opencodePassword}`).toString("base64");

let child: ChildProcess | null = null;
let starting: Promise<void> | null = null;
let lastOutput = "";

function rememberOutput(chunk: Buffer): void {
  lastOutput = (lastOutput + chunk.toString()).slice(-2000);
}

async function request<T>(pathname: string, init: RequestInit = {}, timeoutMs = 25_000): Promise<T> {
  const url = new URL(pathname, config.opencodeUrl);
  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: basicAuth,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new OpenCodeError(response.status, body.slice(0, 500));
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export class OpenCodeError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`OpenCode ${status}: ${body}`);
  }
}

export async function ping(): Promise<boolean> {
  try {
    await request("/api/info", {}, 3000);
    return true;
  } catch {
    return false;
  }
}

export function serverStatus() {
  return {
    url: config.opencodeUrl,
    managed: child !== null,
    output: lastOutput,
  };
}

export async function ensureServer(): Promise<void> {
  if (await ping()) return;
  if (!config.manageOpencode) {
    throw new Error(`OpenCode não respondeu em ${config.opencodeUrl} e DITA_MANAGE_OPENCODE=false`);
  }
  if (starting) return starting;

  starting = (async () => {
    const url = new URL(config.opencodeUrl);
    const port = url.port || (url.protocol === "https:" ? "443" : "80");

    child = spawn(
      "opencode",
      ["serve", "--hostname", url.hostname, "--port", port],
      {
        env: { ...process.env, OPENCODE_PASSWORD: config.opencodePassword },
        stdio: ["ignore", "pipe", "pipe"],
        shell: process.platform === "win32",
        windowsHide: true,
      },
    );

    child.stdout?.on("data", rememberOutput);
    child.stderr?.on("data", rememberOutput);
    child.on("exit", () => {
      child = null;
    });

    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (await ping()) return;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error(
      `Não consegui subir o OpenCode em ${config.opencodeUrl}. Saída: ${lastOutput.slice(-500)}`,
    );
  })().finally(() => {
    starting = null;
  });

  return starting;
}

function unwrap<T>(raw: unknown): T {
  if (raw && typeof raw === "object" && "data" in raw) return (raw as { data: T }).data;
  return raw as T;
}

export async function createSession(
  directory: string,
  title: string,
  model?: { providerID: string; modelID: string } | null,
): Promise<OpenCodeSession> {
  const raw = await request<unknown>("/api/session", {
    method: "POST",
    body: JSON.stringify({
      title,
      location: { directory },
      ...(model ? { model: { providerID: model.providerID, id: model.modelID } } : {}),
    }),
  });
  const session = unwrap<OpenCodeSession>(raw);
  if (!session?.id) throw new Error("OpenCode não devolveu o id da sessão criada");
  return { ...session, directory };
}

export async function listSessions(directory: string): Promise<OpenCodeSession[]> {
  const query = new URLSearchParams({ directory, limit: "20" });
  const raw = await request<unknown>(`/api/session?${query.toString()}`);
  const data = unwrap<unknown>(raw);
  if (Array.isArray(data)) return data as OpenCodeSession[];
  const nested = (data as { data?: OpenCodeSession[] } | undefined)?.data;
  return Array.isArray(nested) ? nested : [];
}

export async function sendPrompt(sessionId: string, text: string): Promise<void> {
  await request(`/api/session/${encodeURIComponent(sessionId)}/prompt`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

type RawPart = {
  type?: string;
  text?: string;
  name?: string;
  state?: { status?: string; title?: string };
};

type RawMessage = {
  id?: string;
  type?: string;
  text?: string;
  content?: RawPart[];
  outcome?: string;
  error?: { message?: string };
  time?: { created?: number };
};

function normalizeMessage(raw: RawMessage, index: number): ChatMessage | null {
  const id = raw.id ?? `msg-${index}`;
  const createdAt = raw.time?.created;

  if (raw.type === "user") {
    const text = (raw.text ?? "").trim();
    return text ? { id, role: "user", text, tools: [], createdAt } : null;
  }

  // Mensagens internas do OpenCode (ex.: catálogo de tools) não fazem parte da conversa.
  if (raw.type === "system") return null;

  if (raw.type === "idle") {
    if (raw.outcome !== "failed" || !raw.error?.message) return null;
    return {
      id,
      role: "system",
      text: "",
      tools: [],
      error: raw.error.message,
      createdAt,
    };
  }

  if (raw.type !== "assistant") return null;

  const textChunks: string[] = [];
  const tools: string[] = [];
  for (const part of raw.content ?? []) {
    if (!part || typeof part !== "object") continue;
    if (part.type === "text" && part.text) {
      textChunks.push(part.text);
    } else if (part.type === "tool" && part.name) {
      const status = part.state?.status;
      tools.push(status && status !== "completed" ? `${part.name} · ${status}` : part.name);
    }
  }

  const text = textChunks.join("\n\n").trim();
  const error = raw.error?.message;
  if (!text && !tools.length && !error) return null;

  return { id, role: "assistant", text, tools, error, createdAt };
}

export function normalizeMessages(raw: unknown): ChatMessage[] {
  const data = unwrap<unknown>(raw);
  let list: unknown = data;

  if (!Array.isArray(list) && list && typeof list === "object") {
    const record = list as Record<string, unknown>;
    list = record.messages ?? record.data ?? record.items;
  }
  if (!Array.isArray(list)) return [];

  const chronological = [...list].reverse();
  const seenErrors = new Set<string>();

  return chronological
    .map((item, index) => {
      const message = normalizeMessage(item as RawMessage, index);
      if (!message) return null;
      if (message.error) {
        if (seenErrors.has(message.error)) return null;
        seenErrors.add(message.error);
      }
      return message;
    })
    .filter((item): item is ChatMessage => item !== null);
}

export async function messages(sessionId: string): Promise<ChatMessage[]> {
  const raw = await request<unknown>(
    `/api/session/${encodeURIComponent(sessionId)}/message`,
  );
  return normalizeMessages(raw);
}

export async function setSessionModel(
  sessionId: string,
  providerID: string,
  modelID: string,
): Promise<void> {
  await request(`/api/session/${encodeURIComponent(sessionId)}/model`, {
    method: "POST",
    body: JSON.stringify({ model: { providerID, id: modelID } }),
  });
}

type RawModel = {
  providerID?: string;
  modelID?: string;
  name?: string;
  enabled?: boolean;
  status?: string;
};

export function normalizeModels(raw: unknown): ModelOption[] {
  const data = unwrap<unknown>(raw);
  const list = Array.isArray(data)
    ? data
    : ((data as { data?: unknown } | undefined)?.data as unknown);
  if (!Array.isArray(list)) return [];

  return (list as RawModel[])
    .filter((model) => model.enabled !== false && model.providerID && model.modelID)
    .map((model) => {
      const providerID = model.providerID as string;
      const modelID = model.modelID as string;
      const name = model.name ?? modelID;
      return {
        providerID,
        modelID,
        name,
        free: providerID === "opencode" || /free/i.test(name),
        status: model.status,
      };
    })
    .sort((a, b) => {
      if (a.free !== b.free) return a.free ? -1 : 1;
      if (a.providerID !== b.providerID) return a.providerID.localeCompare(b.providerID);
      return a.name.localeCompare(b.name);
    });
}

export async function listModels(directory: string): Promise<ModelOption[]> {
  const query = new URLSearchParams({ types: "chat" });
  query.set("location[directory]", directory);
  const raw = await request<unknown>(`/api/model?${query.toString()}`);
  return normalizeModels(raw);
}

export async function replyPermission(
  sessionId: string,
  requestId: string,
  reply: "once" | "always" | "reject",
): Promise<void> {
  await request(
    `/api/session/${encodeURIComponent(sessionId)}/permission/${encodeURIComponent(requestId)}/reply`,
    { method: "POST", body: JSON.stringify({ reply }) },
  );
}

export function stopServer(): void {
  child?.kill();
  child = null;
}
