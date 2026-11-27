import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import fastifyStatic from "@fastify/static";
import multipart from "@fastify/multipart";
import cookie from "@fastify/cookie";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";

import {
  clearSessionCookie,
  loginAllowed,
  passwordsMatch,
  recordLoginFailure,
  recordLoginSuccess,
  requireAuth,
  setSessionCookie,
} from "./auth.js";
import { config } from "./config.js";
import {
  OpenCodeError,
  type ChatMessage,
  createSession,
  ensureServer,
  listForms,
  listModels,
  listPermissions,
  listSessions,
  getSession,
  messages,
  cancelForm,
  replyForm,
  replyPermission,
  sendPrompt,
  setSessionModel,
  stopServer,
  titleFromPrompt,
  updateSessionTitle,
} from "./opencode.js";
import {
  createProject,
  isValidProjectName,
  listProjects,
  trashProject,
} from "./projects.js";
import { getPublicVapidKey, sendPush, type PushSubscription } from "./push.js";
import { loadState, saveState, type State } from "./state.js";
import { stopTranscriber, transcribeAudio } from "./transcribe.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDist = path.resolve(__dirname, "../../app/dist");

const state: State = loadState();

const app = Fastify({
  logger: { level: process.env.DITA_LOG_LEVEL ?? "info" },
  trustProxy: true,
  bodyLimit: 1024 * 1024,
});

await app.register(cookie);
await app.register(multipart, {
  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 1,
  },
});

const notifiedApprovals = new Set<string>();
const notifiedForms = new Set<string>();

async function notifyPush(title: string, body: string) {
  const subs = (state.pushSubscriptions ?? []) as PushSubscription[];
  if (subs.length === 0) return;
  const alive = await sendPush(subs, { title, body, url: "/" });
  state.pushSubscriptions = alive;
  saveState(state);
}

async function notifyApprovals(approvals: Array<{ id: string; action: string; resources: string[] }>) {
  const fresh = approvals.filter((item) => !notifiedApprovals.has(item.id));
  if (fresh.length === 0) return;
  for (const item of fresh) notifiedApprovals.add(item.id);
  const first = fresh[0];
  if (!first) return;
  const body =
    fresh.length === 1
      ? `${first.action}${first.resources[0] ? ` · ${first.resources[0]}` : ""}`
      : `${fresh.length} ações aguardando aprovação`;
  await notifyPush("dita: aprovação necessária", body);
}

async function notifyForms(forms: Array<{ id: string; title: string }>) {
  const fresh = forms.filter((item) => !notifiedForms.has(item.id));
  if (fresh.length === 0) return;
  for (const item of fresh) notifiedForms.add(item.id);
  const first = fresh[0];
  if (!first) return;
  const body = fresh.length === 1 ? first.title : `${fresh.length} perguntas aguardando resposta`;
  await notifyPush("dita: pergunta do agente", body);
}

async function snapshot() {
  const session = state.session;
  let list: ChatMessage[] = [];
  let approvals: Awaited<ReturnType<typeof listPermissions>> = [];
  let forms: Awaited<ReturnType<typeof listForms>> = [];
  let busy = false;
  if (session) {
    try {
      list = await messages(session.id);
    } catch (error) {
      app.log.warn({ error }, "falha ao ler mensagens do OpenCode");
    }
    try {
      const raw = await getSession(session.id);
      const t = raw?.time;
      busy = Boolean(t?.busy && (!t?.idle || t.busy > t.idle));
    } catch {
      /* status indisponível */
    }
    try {
      forms = await listForms(session.id);
    } catch (error) {
      app.log.debug({ error }, "falha ao ler formulários do OpenCode");
    }
  }
  try {
    approvals = await listPermissions(config.root);
  } catch (error) {
    app.log.debug({ error }, "falha ao ler permissões do OpenCode");
  }
  if (approvals.length > 0) void notifyApprovals(approvals);
  if (forms.length > 0) void notifyForms(forms);
  return { session, focus: state.focus, model: state.model, messages: list, approvals, forms, busy };
}

async function newSession(): Promise<State["session"]> {
  await ensureServer();
  const created = await createSession(config.root, "Nova conversa", state.model);
  state.session = { id: created.id, directory: config.root, createdAt: Date.now(), title: "Nova conversa" };
  state.focus = null;
  saveState(state);
  return state.session;
}

async function retryOnMissingSession<T>(operation: (sessionId: string) => Promise<T>): Promise<T> {
  const current = state.session ?? (await newSession());
  if (!current) throw new Error("Não consegui criar a sessão");
  try {
    return await operation(current.id);
  } catch (error) {
    if (error instanceof OpenCodeError && error.status === 404) {
      const fresh = await newSession();
      if (!fresh) throw error;
      return operation(fresh.id);
    }
    throw error;
  }
}

function normalizeFocus(input: unknown): string | null {
  if (input === null || input === undefined || input === "" || input === "root") return null;
  if (typeof input !== "string") throw new Error("Foco inválido");

  const target = path.resolve(config.root, input);
  const rootWithSep = config.root.endsWith(path.sep) ? config.root : config.root + path.sep;
  if (target !== config.root && !target.startsWith(rootWithSep)) {
    throw new Error("Foco fora da raiz de projetos");
  }
  if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
    throw new Error("Diretório de foco não existe");
  }
  return target === config.root ? null : target;
}

function focusPrefix(focus: string | null): string {
  if (!focus) return "";
  const relative = path.relative(config.root, focus);
  if (!relative) return "";
  return `Contexto: trabalhe em ${relative} (diretório ${focus}).\n\n`;
}

app.get("/api/health", async () => ({ ok: true, url: config.opencodeUrl }));

app.post("/api/login", async (request, reply) => {
  const ip = request.ip;
  if (!loginAllowed(ip)) {
    return reply.code(429).send({ error: "too_many_attempts" });
  }

  const body = (request.body ?? {}) as { password?: unknown };
  if (typeof body.password !== "string" || !passwordsMatch(body.password)) {
    recordLoginFailure(ip);
    return reply.code(401).send({ error: "invalid_password" });
  }

  recordLoginSuccess(ip);
  setSessionCookie(reply, request.protocol === "https");
  return { ok: true };
});

await app.register(async (api) => {
  api.addHook("preHandler", requireAuth);

  api.post("/api/logout", async (request, reply) => {
    clearSessionCookie(reply, request.protocol === "https");
    return { ok: true };
  });

  api.get("/api/state", async () => snapshot());

  api.get("/api/projects", async () => ({
    root: config.root,
    projects: listProjects(),
  }));

  api.post("/api/projects", async (request, reply) => {
    const body = (request.body ?? {}) as { name?: unknown; template?: unknown };
    if (typeof body.name !== "string" || !isValidProjectName(body.name)) {
      return reply.code(400).send({ error: "invalid_name" });
    }
    const template = body.template === "node" ? "node" : "empty";
    try {
      const project = createProject(body.name, template);
      return { project };
    } catch (error) {
      return reply.code(409).send({ error: (error as Error).message });
    }
  });

  api.post("/api/projects/trash", async (request, reply) => {
    const body = (request.body ?? {}) as { name?: unknown; confirm?: unknown };
    if (typeof body.name !== "string" || !isValidProjectName(body.name)) {
      return reply.code(400).send({ error: "invalid_name" });
    }
    if (body.confirm !== body.name) {
      return reply.code(400).send({ error: "confirmation_mismatch" });
    }
    try {
      return { trashed: trashProject(body.name) };
    } catch (error) {
      return reply.code(404).send({ error: (error as Error).message });
    }
  });

  api.post("/api/session", async () => {
    const session = await newSession();
    return { session };
  });

  api.get("/api/sessions", async (_request, reply) => {
    try {
      await ensureServer();
      const sessions = await listSessions(config.root);
      return {
        sessions: sessions.map((session) => ({
          id: session.id,
          title: session.title || "Nova conversa",
          directory: session.directory || config.root,
        })),
      };
    } catch (error) {
      return reply.code(502).send({ error: (error as Error).message });
    }
  });

  api.post("/api/session/select", async (request, reply) => {
    const body = (request.body ?? {}) as { sessionID?: unknown };
    if (typeof body.sessionID !== "string") {
      return reply.code(400).send({ error: "invalid_session" });
    }
    try {
      await ensureServer();
      const sessions = await listSessions(config.root);
      const found = sessions.find((session) => session.id === body.sessionID);
      if (!found) return reply.code(404).send({ error: "session_not_found" });

      state.session = {
        id: found.id,
        directory: found.directory || config.root,
        createdAt: Date.now(),
        title: found.title || "Nova conversa",
      };
      state.focus = null;
      saveState(state);
      return { session: state.session };
    } catch (error) {
      return reply.code(502).send({ error: (error as Error).message });
    }
  });

  api.post("/api/session/rename", async (request, reply) => {
    const body = (request.body ?? {}) as { sessionID?: unknown; title?: unknown };
    if (typeof body.sessionID !== "string" || typeof body.title !== "string") {
      return reply.code(400).send({ error: "invalid_rename" });
    }
    const title = body.title.replace(/\s+/g, " ").trim().slice(0, 80);
    if (!title) return reply.code(400).send({ error: "empty_title" });

    try {
      await ensureServer();
      await updateSessionTitle(body.sessionID, title);
      if (state.session?.id === body.sessionID) {
        state.session = { ...state.session, title };
        saveState(state);
      }
      return { ok: true, title };
    } catch (error) {
      return reply.code(502).send({ error: (error as Error).message });
    }
  });

  api.post("/api/focus", async (request, reply) => {
    const body = (request.body ?? {}) as { focus?: unknown };
    try {
      state.focus = normalizeFocus(body.focus);
      saveState(state);
      return { focus: state.focus };
    } catch (error) {
      return reply.code(400).send({ error: (error as Error).message });
    }
  });

  api.get("/api/models", async (_request, reply) => {
    try {
      await ensureServer();
      return { models: await listModels(config.root) };
    } catch (error) {
      return reply.code(502).send({ error: (error as Error).message });
    }
  });

  api.post("/api/model", async (request, reply) => {
    const body = (request.body ?? {}) as { providerID?: unknown; modelID?: unknown };
    if (typeof body.providerID !== "string" || typeof body.modelID !== "string") {
      return reply.code(400).send({ error: "invalid_model" });
    }

    try {
      await ensureServer();
      const models = await listModels(config.root);
      const found = models.find(
        (model) => model.providerID === body.providerID && model.modelID === body.modelID,
      );
      if (!found) return reply.code(400).send({ error: "model_not_found" });

      state.model = { providerID: found.providerID, modelID: found.modelID };
      saveState(state);

      if (state.session) {
        try {
          await setSessionModel(state.session.id, found.providerID, found.modelID);
        } catch (error) {
          if (error instanceof OpenCodeError && error.status === 404) {
            await newSession();
          } else {
            throw error;
          }
        }
      }

      return { model: state.model };
    } catch (error) {
      app.log.error({ error }, "falha ao trocar modelo");
      return reply.code(502).send({ error: (error as Error).message });
    }
  });

  api.post("/api/prompt", async (request, reply) => {
    let text = "";
    let focusValue: unknown = undefined;
    const files: Array<{ uri: string; name?: string }> = [];
    const uploads: string[] = [];

    try {
      if (request.isMultipart()) {
        for await (const part of request.parts()) {
          if (part.type === "file") {
            if (!part.filename) {
              part.file.resume();
              continue;
            }
            const ext = path.extname(part.filename) || "";
            const tmpPath = path.join(os.tmpdir(), `dita-upload-${randomUUID()}${ext}`);
            await pipeline(part.file, fs.createWriteStream(tmpPath));
            uploads.push(tmpPath);
            files.push({ uri: pathToFileURL(tmpPath).href, name: path.basename(part.filename) });
          } else if (part.fieldname === "text" && typeof part.value === "string") {
            text = part.value;
          } else if (part.fieldname === "focus") {
            focusValue = part.value;
          }
        }
      } else {
        const body = (request.body ?? {}) as { text?: unknown; focus?: unknown };
        text = typeof body.text === "string" ? body.text : "";
        focusValue = body.focus;
      }

      text = text.trim();
      if (!text && files.length === 0) return reply.code(400).send({ error: "empty_prompt" });
      if (text.length > 8000) return reply.code(413).send({ error: "prompt_too_long" });

      if (focusValue !== undefined) {
        try {
          state.focus = normalizeFocus(focusValue);
        } catch {
          /* foco inválido não bloqueia o ditado */
        }
      }

      const promptText = text || (files.length > 0 ? "Veja os arquivos anexados." : "");
      const payload = focusPrefix(state.focus) + promptText;
      await retryOnMissingSession((sessionId) => sendPrompt(sessionId, payload, files));

      const session = state.session;
      const titleSource = text || files.map((f) => f.name).filter(Boolean).join(", ");
      if (session && (!session.title || session.title === "Nova conversa" || session.title === "dita")) {
        const title = titleFromPrompt(titleSource || "Arquivo enviado");
        session.title = title;
        void updateSessionTitle(session.id, title).catch((error) => {
          app.log.debug({ error }, "falha ao atualizar título da sessão");
        });
      }

      saveState(state);
      return { ok: true };
    } catch (error) {
      app.log.error({ error }, "falha ao enviar prompt");
      return reply.code(502).send({ error: (error as Error).message });
    }
  });

  api.get("/api/push/public-key", async () => ({ publicKey: getPublicVapidKey() }));

  api.post("/api/push/subscribe", async (request, reply) => {
    const body = request.body as PushSubscription | undefined;
    if (
      !body ||
      typeof body.endpoint !== "string" ||
      !body.keys ||
      typeof body.keys.p256dh !== "string" ||
      typeof body.keys.auth !== "string"
    ) {
      return reply.code(400).send({ error: "invalid_subscription" });
    }

    const subs = (state.pushSubscriptions ?? []) as PushSubscription[];
    const next = subs.filter((item) => item.endpoint !== body.endpoint);
    next.push({ endpoint: body.endpoint, keys: { p256dh: body.keys.p256dh, auth: body.keys.auth } });
    state.pushSubscriptions = next;
    saveState(state);
    return { ok: true };
  });

  api.post("/api/approval/reply", async (request, reply) => {
    const body = (request.body ?? {}) as {
      sessionID?: unknown;
      requestID?: unknown;
      decision?: unknown;
    };
    if (
      typeof body.sessionID !== "string" ||
      typeof body.requestID !== "string" ||
      (body.decision !== "once" && body.decision !== "always" && body.decision !== "reject")
    ) {
      return reply.code(400).send({ error: "invalid_approval" });
    }

    try {
      await replyPermission(body.sessionID, body.requestID, body.decision);
      return { ok: true };
    } catch (error) {
      app.log.error({ error }, "falha ao responder aprovação");
      return reply.code(502).send({ error: (error as Error).message });
    }
  });

  api.post("/api/form/reply", async (request, reply) => {
    const body = (request.body ?? {}) as {
      sessionID?: unknown;
      formID?: unknown;
      answer?: unknown;
    };
    if (
      typeof body.sessionID !== "string" ||
      typeof body.formID !== "string" ||
      !body.answer ||
      typeof body.answer !== "object" ||
      Array.isArray(body.answer)
    ) {
      return reply.code(400).send({ error: "invalid_form_reply" });
    }

    try {
      await replyForm(body.sessionID, body.formID, body.answer as Record<string, unknown>);
      return { ok: true };
    } catch (error) {
      if (error instanceof OpenCodeError && error.status === 409) {
        return { ok: true, settled: true };
      }
      app.log.error({ error }, "falha ao responder formulário");
      return reply.code(502).send({ error: (error as Error).message });
    }
  });

  api.post("/api/form/cancel", async (request, reply) => {
    const body = (request.body ?? {}) as {
      sessionID?: unknown;
      formID?: unknown;
      message?: unknown;
    };
    if (typeof body.sessionID !== "string" || typeof body.formID !== "string") {
      return reply.code(400).send({ error: "invalid_form_cancel" });
    }

    try {
      await cancelForm(
        body.sessionID,
        body.formID,
        typeof body.message === "string" ? body.message : undefined,
      );
      return { ok: true };
    } catch (error) {
      if (error instanceof OpenCodeError && error.status === 409) {
        return { ok: true, settled: true };
      }
      app.log.error({ error }, "falha ao cancelar formulário");
      return reply.code(502).send({ error: (error as Error).message });
    }
  });

  api.post("/api/transcribe", async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: "missing_audio" });

    const ext = path.extname(file.filename || "") || ".webm";
    const tmpPath = path.join(os.tmpdir(), `dita-audio-${randomUUID()}${ext}`);
    try {
      await pipeline(file.file, fs.createWriteStream(tmpPath));
      const text = await transcribeAudio(tmpPath);
      return { text };
    } catch (error) {
      app.log.error({ error }, "falha ao transcrever áudio");
      return reply.code(502).send({ error: (error as Error).message });
    } finally {
      fs.promises.unlink(tmpPath).catch(() => undefined);
    }
  });
});

if (fs.existsSync(appDist)) {
  await app.register(fastifyStatic, { root: appDist, wildcard: false });
  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    if (request.url.startsWith("/api/")) {
      return reply.code(404).send({ error: "not_found" });
    }
    return reply.sendFile("index.html");
  });
}

try {
  await app.listen({ host: config.host, port: config.port });
  app.log.info(`dita ouvindo em http://${config.host}:${config.port}`);
  app.log.info(`raiz de projetos: ${config.root}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    stopTranscriber();
    stopServer();
    await app.close();
    process.exit(0);
  });
}
