import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "../src/auth.js";

describe("sessão assinada", () => {
  it("aceita token válido", () => {
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
