import { useCallback, useEffect, useState } from "react";
import Composer from "../components/Composer.js";
import FocusBar from "../components/FocusBar.js";
import MessageList from "../components/MessageList.js";
import ModelDialog from "../components/ModelDialog.js";
import NewProjectDialog from "../components/NewProjectDialog.js";
import Sheet from "../components/Sheet.js";
import TrashDialog from "../components/TrashDialog.js";
import { MenuIcon } from "../components/icons.js";
import { UnauthorizedError, api, subscribe } from "../lib/api.js";
import { errorLabel, relativeFocus, sortProjects } from "../lib/format.js";
import type { ModelOption, Project, Snapshot } from "../lib/types.js";

type Props = {
  onSignedOut: () => void;
};

type Dialog = "new-project" | "trash" | "model" | null;

const EMPTY: Snapshot = { session: null, focus: null, model: null, messages: [] };

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

  function signOut() {
    setMenuOpen(false);
    void api.logout().finally(onSignedOut);
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
    <div className="flex h-dvh flex-col bg-cave-950">
      <header className="safe-top flex items-center gap-3 border-b border-cave-800 bg-cave-950/90 px-4 pb-3">
        <h1 className="text-xl font-semibold tracking-tight">dita</h1>
        <span
          className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${
            online
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-cave-700 bg-cave-900 text-cave-400"
          }`}
        >
          <span className={`size-1.5 rounded-full ${online ? "bg-emerald-400" : "bg-cave-500"}`} />
          {online ? "online" : "reconectando"}
        </span>
        <span className="ml-auto max-w-[38%] truncate text-xs text-cave-500">{focusLabel}</span>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Menu"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-cave-800 text-cave-300 transition hover:text-cave-100"
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
        <div role="alert" className="flex items-start gap-3 border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-red-200/70">
            fechar
          </button>
        </div>
      )}

      <MessageList messages={snapshot.messages} pending={pending} session={snapshot.session} />

      <Composer onSend={send} onError={setError} disabled={busy} />

      {menuOpen && (
        <Sheet
          title="dita"
          description={
            snapshot.session
              ? `sessão ${snapshot.session.id.slice(0, 12)} · ${snapshot.messages.length} mensagens`
              : "nenhuma sessão ainda"
          }
          onClose={() => setMenuOpen(false)}
        >
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setDialog("model");
                void refreshModels();
              }}
              className="h-12 w-full rounded-xl border border-cave-700 bg-cave-950 text-left text-sm text-cave-100 transition hover:border-ember/50"
            >
              <span className="block truncate px-4">Modelo · {modelLabel}</span>
            </button>
            <button
              type="button"
              onClick={newSession}
              className="h-12 w-full rounded-xl border border-cave-700 bg-cave-950 text-left text-sm text-cave-100 transition hover:border-ember/50"
            >
              <span className="px-4">Nova sessão (contexto limpo)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setDialog("new-project");
              }}
              className="h-12 w-full rounded-xl border border-cave-700 bg-cave-950 text-left text-sm text-cave-100 transition hover:border-ember/50"
            >
              <span className="px-4">Criar projeto</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setDialog("trash");
              }}
              className="h-12 w-full rounded-xl border border-cave-700 bg-cave-950 text-left text-sm text-cave-100 transition hover:border-red-500/50"
            >
              <span className="px-4">Mover projeto para a lixeira</span>
            </button>
            <button
              type="button"
              onClick={() => void refreshProjects()}
              className="h-12 w-full rounded-xl border border-cave-700 bg-cave-950 text-left text-sm text-cave-100 transition hover:border-ember/50"
            >
              <span className="px-4">Atualizar projetos</span>
            </button>
            <button
              type="button"
              onClick={signOut}
              className="h-12 w-full rounded-xl border border-cave-800 bg-transparent text-left text-sm text-cave-400 transition hover:text-cave-100"
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
    </div>
  );
}
