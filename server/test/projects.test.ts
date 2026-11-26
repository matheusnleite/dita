import { describe, expect, it } from "vitest";
import { isValidProjectName, resolveProjectPath } from "../src/projects.js";

describe("nome de projeto", () => {
  it("aceita nomes comuns", () => {
    expect(isValidProjectName("meu-app")).toBe(true);
    expect(isValidProjectName("app_v2")).toBe(true);
    expect(isValidProjectName("A1")).toBe(true);
  });

  it("recusa traversal, espaços e lixeira", () => {
    expect(isValidProjectName("../fora")).toBe(false);
    expect(isValidProjectName("com espaço")).toBe(false);
    expect(isValidProjectName(".oculto")).toBe(false);
    expect(isValidProjectName("_lixeira")).toBe(false);
    expect(isValidProjectName("")).toBe(false);
  });

  it("resolve dentro da raiz", () => {
    const resolved = resolveProjectPath("meu-app");
    expect(resolved.toLowerCase()).toContain("meu-app");
  });

  it("lança para nome inválido", () => {
    expect(() => resolveProjectPath("../../etc")).toThrow();
  });
});
