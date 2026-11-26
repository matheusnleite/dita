import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

const NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/i;

export type Project = {
  name: string;
  path: string;
  hasGit: boolean;
  updatedAt: number;
};

export function isValidProjectName(name: string): boolean {
  return NAME_PATTERN.test(name) && name !== config.trashDirName && !name.startsWith(".");
}

export function resolveProjectPath(name: string): string {
  if (!isValidProjectName(name)) throw new Error("Nome de projeto inválido");
  const target = path.resolve(config.root, name);
  const rootWithSep = config.root.endsWith(path.sep) ? config.root : config.root + path.sep;
  if (!target.startsWith(rootWithSep)) throw new Error("Nome de projeto inválido");
  return target;
}

export function listProjects(): Project[] {
  if (!fs.existsSync(config.root)) return [];
  return fs
    .readdirSync(config.root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => entry.name !== config.trashDirName && !entry.name.startsWith("."))
    .map((entry) => {
      const fullPath = path.join(config.root, entry.name);
      const stat = fs.statSync(fullPath);
      return {
        name: entry.name,
        path: fullPath,
        hasGit: fs.existsSync(path.join(fullPath, ".git")),
        updatedAt: stat.mtimeMs,
      };
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function createProject(name: string, template: "empty" | "node" = "empty"): Project {
  const target = resolveProjectPath(name);
  if (fs.existsSync(target)) throw new Error("Já existe um projeto com esse nome");

  fs.mkdirSync(target, { recursive: true });

  const git = spawnSync("git", ["init", "-b", "main"], { cwd: target, shell: true });
  const hasGit = git.status === 0;

  fs.writeFileSync(
    path.join(target, "README.md"),
    `# ${name}\n\nProjeto criado pelo dita.\n`,
  );
  fs.writeFileSync(
    path.join(target, ".gitignore"),
    template === "node"
      ? "node_modules/\ndist/\n.env\n*.log\n"
      : ".env\n*.log\n.DS_Store\n",
  );

  if (template === "node") {
    fs.writeFileSync(
      path.join(target, "package.json"),
      JSON.stringify({ name, version: "0.1.0", private: true, type: "module" }, null, 2) + "\n",
    );
  }

  return { name, path: target, hasGit, updatedAt: Date.now() };
}

export function trashProject(name: string): string {
  const target = resolveProjectPath(name);
  if (!fs.existsSync(target)) throw new Error("Projeto não encontrado");

  const trashRoot = path.join(config.root, config.trashDirName);
  fs.mkdirSync(trashRoot, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
  let destination = path.join(trashRoot, `${name}-${stamp}`);
  let suffix = 1;
  while (fs.existsSync(destination)) {
    destination = path.join(trashRoot, `${name}-${stamp}-${suffix++}`);
  }

  try {
    fs.renameSync(target, destination);
  } catch {
    fs.cpSync(target, destination, { recursive: true });
    fs.rmSync(target, { recursive: true, force: true });
  }

  return destination;
}
