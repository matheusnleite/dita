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
          <span className="mb-2 block text-sm text-bone-300">Nome da pasta</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="meu-app"
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="h-12 w-full rounded-xl border border-ink-700 bg-ink-950 px-4 font-mono text-base text-bone-100 outline-none focus:border-brass-500/60"
          />
          <span className="mt-2 block text-xs text-ink-500">
            Letras, números, ponto, hífen e sublinhado.
          </span>
        </label>

        <fieldset>
          <legend className="mb-2 block text-sm text-bone-300">Template</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["empty", "node"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTemplate(option)}
                className={`h-11 rounded-xl border text-sm transition ${
                  template === option
                    ? "border-brass-500 bg-brass-500/10 text-brass-500"
                    : "border-ink-700 bg-ink-950 text-bone-300"
                }`}
              >
                {option === "empty" ? "vazio" : "node"}
              </button>
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={create}
          disabled={!name.trim() || busy}
          className="h-12 w-full rounded-xl bg-brass-500 font-semibold text-ink-950 transition enabled:hover:bg-brass-600 disabled:opacity-40"
        >
          {busy ? "criando…" : "Criar projeto"}
        </button>
      </div>
    </Sheet>
  );
}
