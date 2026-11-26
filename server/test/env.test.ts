import { describe, expect, it } from "vitest";
import { applyEnv, parseEnv } from "../src/env.js";

describe("parseEnv", () => {
  it("lê pares simples", () => {
    expect(parseEnv("DITA_PASSWORD=segredo\nDITA_PORT=8787")).toEqual({
      DITA_PASSWORD: "segredo",
      DITA_PORT: "8787",
    });
  });

  it("ignora comentários e linhas vazias", () => {
    expect(parseEnv("# comentário\n\n  \nDITA_PASSWORD=x")).toEqual({ DITA_PASSWORD: "x" });
  });

  it("remove aspas e mantém sinal de igual no valor", () => {
    expect(parseEnv('DITA_PASSWORD="a=b"\nOUTRA=\'c\'').DITA_PASSWORD).toBe("a=b");
    expect(parseEnv("OUTRA='c'").OUTRA).toBe("c");
  });

  it("ignora chaves inválidas", () => {
    expect(parseEnv("1BAD=x\nSEM_VALOR\nOK=1")).toEqual({ OK: "1" });
  });
});

describe("applyEnv", () => {
  it("não sobrescreve variável já definida", () => {
    const target = { DITA_PASSWORD: "do-shell" };
    applyEnv("DITA_PASSWORD=do-arquivo\nDITA_PORT=9000", target);
    expect(target).toEqual({ DITA_PASSWORD: "do-shell", DITA_PORT: "9000" });
  });
});
