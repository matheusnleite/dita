import { useCallback, useEffect, useState } from "react";
import Composer from "../components/Composer.js";
import FocusBar from "../components/FocusBar.js";
import FormCard from "../components/FormCard.js";
import MessageList from "../components/MessageList.js";
import ModelDialog from "../components/ModelDialog.js";
import NewProjectDialog from "../components/NewProjectDialog.js";
import SessionsDialog from "../components/SessionsDialog.js";
import Sheet from "../components/Sheet.js";
import TrashDialog from "../components/TrashDialog.js";
import { MenuIcon } from "../components/icons.js";
import { UnauthorizedError, api, subscribe } from "../lib/api.js";
import { setupPush } from "../lib/push.js";
import { errorLabel, relativeFocus, sortProjects } from "../lib/format.js";
import type { ModelOption, Project, Snapshot } from "../lib/types.js";

type DictationMode = "server" | "browser";
const DICTATION_KEY = "dita:dictation-mode";

function loadDictationMode(): DictationMode {
  try {
    return localStorage.getItem(DICTATION_KEY) === "browser" ? "browser" : "server";
  } catch {
    return "server";
  }
}

type Props = {
  onSignedOut: () => void;
};

type Dialog = "new-project" | "trash" | "model" | "sessions" | null;

const EMPTY: Snapshot = {
  session: null,
  focus: null,
  model: null,
  messages: [],
  approvals: [],
  forms: [],
  busy: false,
};

export default function ChatScreen({ onSignedOut }: Props) {
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY);
  const [projects, setProjects] = useState<Project[]>([]);
  const [root, setRoot] = useState("");
  const [online, setOnline] = useState(false);
  const [pending, setPending] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [dictationMode, setDictationMode] = useState<DictationMode>(loadDictationMode);
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  const handleAuth = useCallback(
    (caught: unknown): boolean => {
      if (caught instanceof UnauthorizedError) {
        onSignedOut();
        return true;
      }
      return false;
    },
    [onSignedOut],
  );

  const refreshProjects = useCallback(async () => {
    try {
      const result = await api.projects();
      setRoot(result.root);
      setProjects(sortProjects(result.projects));
    } catch (caught) {
      if (!handleAuth(caught)) setError(errorLabel(caught));
    }
  }, [handleAuth]);

  const refreshModels = useCallback(async () => {
    setModelsLoading(true);
    setModelsError(null);
    try {
      const result = await api.models();
      setModels(result.models);
    } catch (caught) {
      if (!handleAuth(caught)) setModelsError(errorLabel(caught));
    } finally {
      setModelsLoading(false);
    }
  }, [handleAuth]);

  useEffect(() => {
    void refreshProjects();
    void refreshModels();
    const stop = subscribe(setSnapshot, setOnline);
    return stop;
  }, [refreshProjects, refreshModels]);

  useEffect(() => {
    setPending((current) =>
      current.filter(
        (text) =>
          !snapshot.messages.some(
            (message) => message.role === "user" && message.text.trim().endsWith(text.trim()),
          ),
      ),
    );
  }, [snapshot.messages]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") {
        api.state().then(setSnapshot).catch(handleAuth);
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [handleAuth]);

  async function guard(operation: () => Promise<void>) {
    setError(null);
    try {
      await operation();
    } catch (caught) {
      if (!handleAuth(caught)) setError(errorLabel(caught));
    }
  }

  function send(text: string) {
    setPending((current) => [...current, text]);
    void guard(async () => {
      try {
        await api.prompt(text, relativeFocus(snapshot.focus, root));
      } catch (caught) {
        setPending((current) => current.filter((item) => item !== text));
        throw caught;
      }
    });
  }

  function changeFocus(value: string) {
    void guard(async () => {
      const result = await api.setFocus(value || "root");
      setSnapshot((current) => ({ ...current, focus: result.focus }));
    });
  }

  function newSession() {
    setBusy(true);
    setMenuOpen(false);
    void guard(async () => {
      await api.newSession();
      setPending([]);
      setBusy(false);
    }).finally(() => setBusy(false));
  }

  function createdProject(name: string) {
    setDialog(null);
    void guard(async () => {
      await refreshProjects();
      const result = await api.setFocus(name);
      setSnapshot((current) => ({ ...current, focus: result.focus }));
    });
  }

  function trashedProject(name: string) {
    setDialog(null);
    void guard(async () => {
      await refreshProjects();
      if (relativeFocus(snapshot.focus, root) === name) {
        await api.setFocus("root");
      }
    });
  }

  function selectModel(model: ModelOption) {
    setDialog(null);
    void guard(async () => {
      const result = await api.setModel(model.providerID, model.modelID);
      setSnapshot((current) => ({ ...current, model: result.model }));
    });
  }

  function toggleDictationMode() {
    const next: DictationMode = dictationMode === "server" ? "browser" : "server";
    setDictationMode(next);
    try {
      localStorage.setItem(DICTATION_KEY, next);
    } catch {
      /* ignora */
    }
  }

  function enablePush() {
    setPushStatus("ativando...");
    void setupPush().then((result) => {
      const msg =
        result === "ok"
          ? "notificações ativadas"
          : result === "denied"
            ? "notificação bloqueada no navegador"
            : result === "unsupported"
              ? "push não suportado neste navegador"
              : "falha ao ativar notificações";
      setPushStatus(msg);
      if (result === "ok") setError(null);
      else setError(msg);
    });
  }

  function signOut() {
    setMenuOpen(false);
    void api.logout().finally(onSignedOut);
  }

  function replyApproval(sessionID: string, requestID: string, decision: "once" | "always" | "reject") {
    void guard(async () => {
      await api.replyApproval(sessionID, requestID, decision);
      setSnapshot((current) => ({
        ...current,
        approvals: current.approvals.filter((item) => item.id !== requestID),
      }));
    });
  }

  async function replyFormCard(sessionID: string, formID: string, answer: Record<string, unknown>) {
    await api.replyForm(sessionID, formID, answer);
    setSnapshot((current) => ({
      ...current,
      forms: current.forms.filter((item) => item.id !== formID),
    }));
  }

  async function cancelFormCard(sessionID: string, formID: string) {
    await api.cancelForm(sessionID, formID);
    setSnapshot((current) => ({
      ...current,
      forms: current.forms.filter((item) => item.id !== formID),
    }));
  }

  const focusLabel = relativeFocus(snapshot.focus, root) || "raiz";
  const selectedModel = snapshot.model;
  const currentModel = models.find(
    (model) =>
      selectedModel &&
      model.providerID === selectedModel.providerID &&
      model.modelID === selectedModel.modelID,
  );
  const modelLabel = currentModel?.name ?? selectedModel?.modelID ?? "padrão";

  return (
    <div className="flex h-dvh flex-col bg-ink-950">
      <header className="safe-top flex items-center gap-3 border-b border-ink-800 bg-ink-950/92 px-4 pb-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-brass-500" aria-hidden="true" />
          <h1 className="text-xl font-semibold tracking-tight text-bone-100">dita</h1>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${
            online
              ? "border-ok-500/30 bg-ok-500/10 text-emerald-200"
              : "border-ink-700 bg-ink-900 text-ink-400"
          }`}
        >
          <span className={`size-1.5 rounded-full ${online ? "bg-ok-500" : "bg-ink-500"}`} />
          {online ? "online" : "reconectando"}
        </span>
        <span className="ml-auto max-w-[38%] truncate font-mono text-[11px] text-ink-400">{focusLabel}</span>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Menu"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-ink-700 bg-ink-900/60 text-bone-300 transition hover:border-brass-500/40 hover:text-bone-100"
        >
          <MenuIcon />
        </button>
      </header>

      <FocusBar
        root={root}
        projects={projects}
        focus={snapshot.focus}
        onChange={changeFocus}
        onNewProject={() => setDialog("new-project")}
        onTrash={() => setDialog("trash")}
      />

      {error && (
        <div role="alert" className="flex items-start gap-3 border-b border-record-500/20 bg-record-500/10 px-4 py-2 text-sm text-red-200">
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} className="shrink-0 text-red-200/70 hover:text-red-100">
            fechar
          </button>
        </div>
      )}

      <MessageList
        messages={snapshot.messages}
        pending={pending}
        session={snapshot.session}
        busy={snapshot.busy}
      />

      {snapshot.approvals.length > 0 && (
        <div className="border-t border-amber-500/30 bg-amber-500/10 px-3 py-3">
          <p className="mb-2 text-xs font-medium text-amber-200">
            Aprovação necessária ({snapshot.approvals.length})
          </p>
          <div className="space-y-2">
            {snapshot.approvals.map((item) => (
              <div key={item.id} className="rounded-xl border border-ink-700 bg-ink-950 p-3">
                <p className="text-sm text-bone-100">
                  <span className="font-mono text-amber-300">{item.action}</span>
                </p>
                {item.resources.length > 0 && (
                  <p className="mt-1 break-all font-mono text-[11px] text-ink-400">
                    {item.resources.join(", ")}
                  </p>
                )}
                {item.message && (
                  <p className="mt-1 text-xs text-bone-300">{item.message}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => replyApproval(item.sessionID, item.id, "reject")}
                    className="h-10 flex-1 rounded-lg border border-record-500/40 text-sm text-red-200 hover:bg-record-500/10"
                  >
                    Negar
                  </button>
                  <button
                    type="button"
                    onClick={() => replyApproval(item.sessionID, item.id, "once")}
                    className="h-10 flex-1 rounded-lg border border-ink-700 text-sm text-bone-100 hover:bg-ink-800"
                  >
                    Permitir
                  </button>
                  <button
                    type="button"
                    onClick={() => replyApproval(item.sessionID, item.id, "always")}
                    className="h-10 flex-1 rounded-lg bg-ok-500 text-sm font-medium text-ink-950 hover:brightness-95"
                  >
                    Sempre
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {snapshot.forms.length > 0 && (
        <div className="border-t border-info-500/30 bg-info-500/10 px-3 py-3">
          <p className="mb-2 text-xs font-medium text-blue-100">
            Pergunta do agente ({snapshot.forms.length})
          </p>
          <div className="space-y-2">
            {snapshot.forms.map((form) => (
              <FormCard
                key={form.id}
                form={form}
                onReply={replyFormCard}
                onCancel={cancelFormCard}
              />
            ))}
          </div>
        </div>
      )}

      <Composer
        onSend={send}
        onError={setError}
        disabled={busy}
        dictationMode={dictationMode}
      />

      {menuOpen && (
        <Sheet
          title="dita"
          description={
            snapshot.session
              ? `${snapshot.session.title || "Nova conversa"} · ${snapshot.messages.length} mensagens`
              : "nenhuma sessão ainda"
          }
          onClose={() => setMenuOpen(false)}
        >
          <div className="space-y-2">
            <button
              type="button"
              onClick={toggleDictationMode}
              className="h-12 w-full rounded-xl border border-ink-700 bg-ink-950 text-left text-sm text-bone-100 transition hover:border-brass-500/50"
            >
              <span className="block truncate px-4">
                Ditado · {dictationMode === "server" ? "PC (Whisper)" : "navegador"}
              </span>
            </button>
            <button
              type="button"
              onClick={enablePush}
              className="h-12 w-full rounded-xl border border-ink-700 bg-ink-950 text-left text-sm text-bone-100 transition hover:border-brass-500/50"
            >
              <span className="block truncate px-4">
                Notificações{pushStatus ? ` · ${pushStatus}` : ""}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setDialog("model");
                void refreshModels();
              }}
              className="h-12 w-full rounded-xl border border-ink-700 bg-ink-950 text-left text-sm text-bone-100 transition hover:border-brass-500/50"
            >
              <span className="block truncate px-4">Modelo · {modelLabel}</span>
            </button>
            <button
              type="button"
              onClick={newSession}
              className="h-12 w-full rounded-xl border border-ink-700 bg-ink-950 text-left text-sm text-bone-100 transition hover:border-brass-500/50"
            >
              <span className="px-4">Nova sessão (contexto limpo)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setDialog("sessions");
              }}
              className="h-12 w-full rounded-xl border border-ink-700 bg-ink-950 text-left text-sm text-bone-100 transition hover:border-brass-500/50"
            >
              <span className="px-4">Sessões</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setDialog("new-project");
              }}
              className="h-12 w-full rounded-xl border border-ink-700 bg-ink-950 text-left text-sm text-bone-100 transition hover:border-brass-500/50"
            >
              <span className="px-4">Criar projeto</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setDialog("trash");
              }}
              className="h-12 w-full rounded-xl border border-ink-700 bg-ink-950 text-left text-sm text-bone-100 transition hover:border-red-500/50"
            >
              <span className="px-4">Mover projeto para a lixeira</span>
            </button>
            <button
              type="button"
              onClick={() => void refreshProjects()}
              className="h-12 w-full rounded-xl border border-ink-700 bg-ink-950 text-left text-sm text-bone-100 transition hover:border-brass-500/50"
            >
              <span className="px-4">Atualizar projetos</span>
            </button>
            <button
              type="button"
              onClick={signOut}
              className="h-12 w-full rounded-xl border border-ink-800 bg-transparent text-left text-sm text-ink-400 transition hover:text-bone-100"
            >
              <span className="px-4">Sair</span>
            </button>
          </div>
        </Sheet>
      )}

      {dialog === "new-project" && (
        <NewProjectDialog onClose={() => setDialog(null)} onCreated={createdProject} />
      )}

      {dialog === "trash" && (
        <TrashDialog projects={projects} onClose={() => setDialog(null)} onTrashed={trashedProject} />
      )}

      {dialog === "model" && (
        <ModelDialog
          models={models}
          current={snapshot.model}
          loading={modelsLoading}
          error={modelsError}
          onClose={() => setDialog(null)}
          onSelect={selectModel}
        />
      )}

      {dialog === "sessions" && (
        <SessionsDialog
          currentId={snapshot.session?.id ?? null}
          onClose={() => setDialog(null)}
          onSelect={(session) => {
            setDialog(null);
            setSnapshot((current) => ({ ...current, session }));
            setPending([]);
          }}
        />
      )}
    </div>
  );
}
