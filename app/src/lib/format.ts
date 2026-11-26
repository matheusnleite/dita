import type { Project } from "./types.js";

export function relativeFocus(focus: string | null, root: string): string {
  if (!focus || !root) return "";
  if (focus === root) return "";
  return focus.slice(root.length).replace(/^[\\/]+/, "");
}

export function messagePreview(text: string, limit = 60): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > limit ? `${flat.slice(0, limit - 1)}…` : flat;
}

export function formatTime(value?: number): string {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export const errorLabels: Record<string, string> = {
  invalid_password: "Senha incorreta.",
  too_many_attempts: "Muitas tentativas. Espere alguns minutos.",
  invalid_name: "Nome inválido. Use letras, números, ponto, hífen ou sublinhado.",
  confirmation_mismatch: "O nome digitado não confere.",
  empty_prompt: "Escreva ou dite algo antes de enviar.",
  prompt_too_long: "Ditado muito longo. Limite de 8000 caracteres.",
};

export function errorLabel(error: unknown): string {
  if (error instanceof Error) {
    return errorLabels[error.message] ?? error.message;
  }
  return "Algo falhou. Tente de novo.";
}

export function sortProjects(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => b.updatedAt - a.updatedAt);
}
