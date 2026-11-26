import { useState } from "react";
import { api } from "../lib/api.js";
import { errorLabel } from "../lib/format.js";
import Sheet from "./Sheet.js";

type Props = {
  onClose: () => void;
  onCreated: (name: string) => void;
};

export default function NewProjectDialog({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [template, setTemplate] = useState<"empty" | "node">("empty");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.createProject(name.trim(), template);
      onCreated(result.project.name);
    } catch (createError) {
      setError(errorLabel(createError));
      setBusy(false);
    }
  }

  return (
    <Sheet
      title="Novo projeto"
      description="Cria a pasta, roda git init e escreve README e .gitignore."
      onClose={onClose}
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm text-cave-300">Nome da pasta</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="meu-app"
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="h-12 w-full rounded-xl border border-cave-700 bg-cave-950 px-4 font-mono text-base text-cave-100 outline-none focus:border-ember/60"
          />
          <span className="mt-2 block text-xs text-cave-500">
            Letras, números, ponto, hífen e sublinhado.
          </span>
        </label>

        <fieldset>
          <legend className="mb-2 block text-sm text-cave-300">Template</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["empty", "node"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTemplate(option)}
                className={`h-11 rounded-xl border text-sm transition ${
                  template === option
                    ? "border-ember bg-ember/10 text-ember"
                    : "border-cave-700 bg-cave-950 text-cave-300"
                }`}
              >
                {option === "empty" ? "vazio" : "node"}
              </button>
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={create}
          disabled={!name.trim() || busy}
          className="h-12 w-full rounded-xl bg-ember font-semibold text-cave-950 transition enabled:hover:bg-ember-dim disabled:opacity-40"
        >
          {busy ? "criando…" : "Criar projeto"}
        </button>
      </div>
    </Sheet>
  );
}
