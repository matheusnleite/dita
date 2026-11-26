import type { ModelOption, Project, Snapshot } from "./types.js";

export class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
    this.name = "UnauthorizedError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined) headers.set("content-type", "application/json");

  const response = await fetch(path, {
    credentials: "same-origin",
    ...init,
    headers,
  });

  if (response.status === 401) throw new UnauthorizedError();

  const data = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}

export const api = {
  login(password: string) {
    return request<{ ok: true }>("/api/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  },
  logout() {
    return request<{ ok: true }>("/api/logout", { method: "POST" });
  },
  state() {
    return request<Snapshot>("/api/state");
  },
  projects() {
    return request<{ root: string; projects: Project[] }>("/api/projects");
  },
  createProject(name: string, template: "empty" | "node") {
    return request<{ project: Project }>("/api/projects", {
      method: "POST",
      body: JSON.stringify({ name, template }),
    });
  },
  trashProject(name: string, confirm: string) {
    return request<{ trashed: string }>("/api/projects/trash", {
      method: "POST",
      body: JSON.stringify({ name, confirm }),
    });
  },
  newSession() {
    return request<{ session: Snapshot["session"] }>("/api/session", { method: "POST" });
  },
  models() {
    return request<{ models: ModelOption[] }>("/api/models");
  },
  setModel(providerID: string, modelID: string) {
    return request<{ model: Snapshot["model"] }>("/api/model", {
      method: "POST",
      body: JSON.stringify({ providerID, modelID }),
    });
  },
  setFocus(focus: string) {
    return request<{ focus: string | null }>("/api/focus", {
      method: "POST",
      body: JSON.stringify({ focus }),
    });
  },
  prompt(text: string, focus: string) {
    return request<{ ok: true }>("/api/prompt", {
      method: "POST",
      body: JSON.stringify({ text, focus }),
    });
  },
};

// SSE é bufferizado por proxies (Cloudflare Tunnel segura o stream). Polling
// de estado atravessa qualquer proxy e mantém a conversa atualizada.
export const POLL_INTERVAL_MS = 1200;

export function subscribe(
  onSnapshot: (snapshot: Snapshot) => void,
  onStatus: (online: boolean) => void,
  intervalMs = POLL_INTERVAL_MS,
): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function tick() {
    if (stopped) return;
    try {
      const snapshot = await api.state();
      if (stopped) return;
      onSnapshot(snapshot);
      onStatus(true);
    } catch (error) {
      if (stopped) return;
      onStatus(false);
      if (error instanceof UnauthorizedError) return;
    }
    if (!stopped) timer = setTimeout(tick, intervalMs);
  }

  void tick();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
