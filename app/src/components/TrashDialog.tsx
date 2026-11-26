import { useState } from "react";
import { api } from "../lib/api.js";
import { errorLabel } from "../lib/format.js";
import type { Project } from "../lib/types.js";
import Sheet from "./Sheet.js";

type Props = {
  projects: Project[];
  onClose: () => void;
  onTrashed: (name: string) => void;
};

export default function TrashDialog({ projects, onClose, onTrashed }: Props) {
  const [selected, setSelected] = useState(projects[0]?.name ?? "");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function trash() {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.trashProject(selected, confirm);
      onTrashed(selected);
    } catch (trashError) {
      setError(errorLabel(trashError));
      setBusy(false);
    }
  }

  return (
    <Sheet
      title="Mover para a lixeira"
      description="O projeto vai para a pasta _lixeira com data e hora. Nada é apagado agora."
      onClose={onClose}
    >
      <div className="space-y-4">
        {projects.length === 0 ? (
          <p className="rounded-xl border border-cave-700 bg-cave-950 px-4 py-6 text-center text-sm text-cave-400">
            Nenhum projeto para remover.
          </p>
        ) : (
          <>
            <label className="block">
              <span className="mb-2 block text-sm text-cave-300">Projeto</span>
              <select
                value={selected}
                onChange={(event) => {
                  setSelected(event.target.value);
                  setConfirm("");
                }}
                className="h-12 w-full rounded-xl border border-cave-700 bg-cave-950 px-3 text-base text-cave-100 outline-none focus:border-ember/60"
              >
                {projects.map((project) => (
                  <option key={project.name} value={project.name}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-cave-300">
                Digite <span className="font-mono text-ember">{selected}</span> para confirmar
              </span>
              <input
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="h-12 w-full rounded-xl border border-cave-700 bg-cave-950 px-4 font-mono text-base text-cave-100 outline-none focus:border-red-400/60"
              />
            </label>

            {error && (
              <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={trash}
              disabled={busy || confirm !== selected}
              className="h-12 w-full rounded-xl bg-red-500/90 font-semibold text-white transition enabled:hover:bg-red-500 disabled:opacity-40"
            >
              {busy ? "movendo…" : "Mover para a lixeira"}
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
}
