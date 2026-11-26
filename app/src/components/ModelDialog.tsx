import type { ModelOption } from "../lib/types.js";
import Sheet from "./Sheet.js";

type Choice = { providerID: string; modelID: string } | null;

type Props = {
  models: ModelOption[];
  current: Choice;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSelect: (model: ModelOption) => void;
};

export default function ModelDialog({ models, current, loading, error, onClose, onSelect }: Props) {
  const currentKey = current ? `${current.providerID}/${current.modelID}` : "";

  return (
    <Sheet
      title="Modelo"
      description="Grátis primeiro. A troca vale a partir da próxima mensagem."
      onClose={onClose}
    >
      {loading && <p className="px-1 py-6 text-center text-sm text-cave-400">carregando modelos…</p>}

      {error && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {!loading && !error && (
        <ul className="-mx-1 max-h-[55vh] space-y-1 overflow-y-auto px-1">
          {models.map((model) => {
            const key = `${model.providerID}/${model.modelID}`;
            const active = key === currentKey;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => onSelect(model)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                    active
                      ? "border-ember/70 bg-ember/10"
                      : "border-cave-800 bg-cave-950 hover:border-cave-700"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-cave-100">{model.name}</span>
                    <span className="block truncate font-mono text-[10px] text-cave-500">
                      {model.providerID}/{model.modelID}
                    </span>
                  </span>
                  {model.free && (
                    <span className="shrink-0 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-300">
                      grátis
                    </span>
                  )}
                  {active && <span className="shrink-0 text-[10px] text-ember">atual</span>}
                </button>
              </li>
            );
          })}
          {models.length === 0 && (
            <li className="px-1 py-6 text-center text-sm text-cave-400">Nenhum modelo disponível.</li>
          )}
        </ul>
      )}
    </Sheet>
  );
}
