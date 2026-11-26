import { describe, expect, it } from "vitest";
import { SESSION_MAX_AGE_SECONDS, signSession, verifySession } from "../src/auth.js";

describe("sessÃ£o assinada", () => {
  it("aceita token vÃ¡lido", () => {
    const token = signSession(Date.now() + 60_000, "segredo-de-teste");
    expect(verifySession(token, "segredo-de-teste")).toBe(true);
  });

  it("recusa token expirado", () => {
    const token = signSession(Date.now() - 1_000, "segredo-de-teste");
    expect(verifySession(token, "segredo-de-teste")).toBe(false);
  });

  it("recusa assinatura de outro segredo", () => {
    const token = signSession(Date.now() + 60_000, "segredo-de-teste");
    expect(verifySession(token, "outro-segredo")).toBe(false);
  });

  it("recusa token malformado", () => {
    expect(verifySession("abc", "segredo-de-teste")).toBe(false);
    expect(verifySession(undefined, "segredo-de-teste")).toBe(false);
  });
});

describe("expiração da sessão", () => {
  it("padrão é 12 horas", () => {
    expect(SESSION_MAX_AGE_SECONDS).toBe(12 * 60 * 60);
  });
});
