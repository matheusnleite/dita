import { describe, expect, it } from "vitest";
import { normalizeMessages } from "../src/opencode.js";

const raw = {
  data: [
    {
      id: "msg_3",
      time: { created: 3 },
      type: "idle",
      outcome: "failed",
      error: { type: "provider.quota", message: "Limit exhausted" },
    },
    {
      id: "msg_2",
      time: { created: 2 },
      type: "assistant",
      agent: "build",
      model: { id: "m", providerID: "p" },
      content: [
        { type: "reasoning", text: "pensando" },
        { type: "tool", id: "t1", name: "bash", state: { status: "running" }, time: { created: 2 } },
      ],
      error: { type: "provider.quota", message: "Limit exhausted" },
    },
    {
      id: "msg_1",
      time: { created: 1 },
      type: "user",
      text: "olá",
    },
  ],
  cursor: null,
};

describe("normalizeMessages", () => {
  it("ordena do mais antigo para o mais novo", () => {
    const messages = normalizeMessages(raw);
    expect(messages.map((message) => message.id)).toEqual(["msg_1", "msg_2"]);
  });

  it("lê texto do usuário e conteúdo do assistente", () => {
    const [, assistant] = normalizeMessages(raw);
    expect(assistant?.role).toBe("assistant");
    expect(assistant?.tools).toEqual(["bash · running"]);
    expect(assistant?.text).toBe("");
  });

  it("não repete o erro do idle quando o assistente já trouxe o mesmo erro", () => {
    const messages = normalizeMessages(raw);
    expect(messages.filter((message) => message.role === "system")).toHaveLength(0);
    expect(messages[1]?.error).toBe("Limit exhausted");
  });

  it("mostra erro de idle sem assistente correspondente", () => {
    const messages = normalizeMessages({
      data: [
        { id: "i", time: { created: 2 }, type: "idle", outcome: "failed", error: { message: "boom" } },
        { id: "u", time: { created: 1 }, type: "user", text: "oi" },
      ],
    });
    expect(messages.at(-1)).toMatchObject({ role: "system", error: "boom" });
  });

  it("ignora eventos sem conteúdo", () => {
    expect(
      normalizeMessages({
        data: [
          { id: "a", type: "idle", outcome: "succeeded" },
          { id: "b", type: "shell" },
          { id: "c", type: "assistant", content: [] },
        ],
      }),
    ).toEqual([]);
  });
});
