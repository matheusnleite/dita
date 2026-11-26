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
    <div className="flex items-center gap-2 border-b border-cave-800 bg-cave-900/60 px-3 py-2">
      <label className="min-w-0 flex-1">
        <span className="sr-only">Projeto em foco</span>
        <div className="flex items-center gap-2 rounded-xl border border-cave-700 bg-cave-950 px-3">
          <span className="text-xs text-cave-500">foco</span>
          <select
            value={known ? current : ""}
            onChange={(event) => onChange(event.target.value)}
            className="h-10 min-w-0 flex-1 truncate bg-transparent text-sm text-cave-100 outline-none"
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
        className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-cave-700 bg-cave-900 text-cave-300 transition hover:border-ember/60 hover:text-ember"
      >
        <PlusIcon />
      </button>

      <button
        type="button"
        onClick={onTrash}
        aria-label="Mover projeto para a lixeira"
        className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-cave-700 bg-cave-900 text-cave-300 transition hover:border-red-500/50 hover:text-red-300"
      >
        <TrashIcon />
      </button>
    </div>
  );
}
