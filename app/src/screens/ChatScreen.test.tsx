// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { loadDictationMode } from "./ChatScreen.js";

const KEY = "dita:dictation-mode";

afterEach(() => {
  localStorage.removeItem(KEY);
});

describe("loadDictationMode", () => {
  it("usa navegador como padrão", () => {
    localStorage.removeItem(KEY);
    expect(loadDictationMode()).toBe("browser");
  });

  it("respeita escolha salva no PC/Whisper", () => {
    localStorage.setItem(KEY, "server");
    expect(loadDictationMode()).toBe("server");
  });
});