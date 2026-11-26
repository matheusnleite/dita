import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { errorLabel } from "../lib/format.js";
import Sheet from "./Sheet.js";

type SessionItem = { id: string; title: string; directory: string };

type Props = {
  currentId: string | null;
  onClose: () => void;
  onSelect: (session: { id: string; directory: string; createdAt: number; title?: string }) => void;
};

export default function SessionsDialog({ currentId, onClose, onSelect }: Props) {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await api.sessions();
      setSessions(result.sessions);
    } catch (caught) {
      setError(errorLabel(caught));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function openSession(sessionID: string) {
    setBusy(true);
    setError(null);
    try {
      const result = await api.selectSession(sessionID);
      if (result.session) onSelect(result.session);
    } catch (caught) {
      setError(errorLabel(caught));
    } finally {
      setBusy(false);
    }
  }

  async function rename(sessionID: string) {
    const clean = title.trim();
    if (!clean) return;
    setBusy(true);
    setError(null);
    try {
      await api.renameSession(sessionID, clean);
      setSessions((current) =>
        current.map((item) => (item.id === sessionID ? { ...item, title: clean } : item)),
      );
      setEditing(null);
    } catch (caught) {
      setError(errorLabel(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title="Sessões" description="Sessões salvas no OpenCode. Abrir troca a conversa atual." onClose={onClose}>
      {loading && <p className="px-1 py-6 text-center text-sm text-ink-400">carregando sessões…</p>}
      {error && (
        <p role="alert" className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}
      {!loading && (
        <ul className="-mx-1 max-h-[55vh] space-y-2 overflow-y-auto px-1">
          {sessions.map((session) => {
            const current = session.id === currentId;
            return (
              <li key={session.id} className="rounded-xl border border-ink-800 bg-ink-950 p-3">
                {editing === session.id ? (
                  <div className="flex gap-2">
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="h-10 min-w-0 flex-1 rounded-lg border border-ink-700 bg-ink-900 px-3 text-sm text-bone-100 outline-none focus:border-brass-500/60"
                      maxLength={80}
                      autoFocus
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void rename(session.id)}
                      className="h-10 rounded-lg bg-brass-500 px-3 text-sm text-ink-950 disabled:opacity-30"
                    >
                      salvar
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-bone-100">{session.title}</p>
                        <p className="truncate font-mono text-[10px] text-ink-500">{session.id.slice(0, 16)}</p>
                      </div>
                      {current && <span className="shrink-0 text-[10px] text-brass-500">atual</span>}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={busy || current}
                        onClick={() => void openSession(session.id)}
                        className="h-9 rounded-lg border border-ink-700 px-3 text-xs text-bone-100 disabled:opacity-30"
                      >
                        Abrir
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setEditing(session.id);
                          setTitle(session.title);
                        }}
                        className="h-9 rounded-lg border border-ink-700 px-3 text-xs text-bone-300 disabled:opacity-30"
                      >
                        Renomear
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
          {sessions.length === 0 && (
            <li className="px-1 py-6 text-center text-sm text-ink-400">Nenhuma sessão encontrada.</li>
          )}
        </ul>
      )}
    </Sheet>
  );
}
