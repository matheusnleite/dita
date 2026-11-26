import type { Project } from "../lib/types.js";
import { relativeFocus } from "../lib/format.js";
import { PlusIcon, TrashIcon } from "./icons.js";

type Props = {
  root: string;
  projects: Project[];
  focus: string | null;
  onChange: (value: string) => void;
  onNewProject: () => void;
  onTrash: () => void;
};

export default function FocusBar({ root, projects, focus, onChange, onNewProject, onTrash }: Props) {
  const current = relativeFocus(focus, root);
  const known = current === "" || projects.some((project) => project.name === current);

  return (
    <div className="flex items-center gap-2 border-b border-ink-800 bg-ink-900/60 px-3 py-2">
      <label className="min-w-0 flex-1">
        <span className="sr-only">Projeto em foco</span>
        <div className="flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-950 px-3">
          <span className="text-xs text-ink-500">foco</span>
          <select
            value={known ? current : ""}
            onChange={(event) => onChange(event.target.value)}
            className="h-10 min-w-0 flex-1 truncate bg-transparent text-sm text-bone-100 outline-none"
          >
            <option value="">{root.split(/[\\/]/).pop() ?? "raiz"} (raiz)</option>
            {projects.map((project) => (
              <option key={project.name} value={project.name}>
                {project.name}
                {project.hasGit ? "" : " · sem git"}
              </option>
            ))}
          </select>
        </div>
      </label>

      <button
        type="button"
        onClick={onNewProject}
        aria-label="Criar novo projeto"
        className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-ink-700 bg-ink-900 text-bone-300 transition hover:border-brass-500/60 hover:text-brass-500"
      >
        <PlusIcon />
      </button>

      <button
        type="button"
        onClick={onTrash}
        aria-label="Mover projeto para a lixeira"
        className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-ink-700 bg-ink-900 text-bone-300 transition hover:border-red-500/50 hover:text-red-200"
      >
        <TrashIcon />
      </button>
    </div>
  );
}
