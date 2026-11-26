import { describe, expect, it } from "vitest";
import { normalizeModels } from "../src/opencode.js";

const fixture = {
  location: { directory: "C:/work" },
  data: [
    {
      id: "opencode/deepseek-v4.1-flash-free",
      providerID: "opencode",
      modelID: "deepseek-v4.1-flash-free",
      name: "DeepSeek V4.1 Flash Free",
      enabled: true,
      cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
    },
    {
      id: "zai/glm-5.4",
      providerID: "zai-coding-plan",
      modelID: "glm-5.4",
      name: "GLM-5.4",
      enabled: false,
    },
    {
      id: "custom/paid",
      providerID: "custom",
      modelID: "paid",
      name: "Paid Model",
      enabled: true,
    },
  ],
};

describe("normalizeModels", () => {
  it("coloca modelos grátis primeiro", () => {
    const models = normalizeModels(fixture);
    expect(models[0]).toMatchObject({
      providerID: "opencode",
      modelID: "deepseek-v4.1-flash-free",
      free: true,
    });
    expect(models.at(-1)?.modelID).toBe("paid");
  });

  it("marca grátis por provider opencode ou nome com free", () => {
    const models = normalizeModels(fixture);
    expect(models.find((model) => model.modelID === "paid")?.free).toBe(false);
  });

  it("ignora modelos desabilitados", () => {
    const models = normalizeModels(fixture);
    expect(models.some((model) => model.modelID === "glm-5.4")).toBe(false);
  });

  it("aceita lista crua e devolve vazio para lixo", () => {
    expect(normalizeModels([])).toEqual([]);
    expect(normalizeModels({ foo: "bar" })).toEqual([]);
  });
});
