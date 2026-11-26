// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { POLL_INTERVAL_MS, subscribe } from "./api.js";
import type { Snapshot } from "./types.js";

const snapshot: Snapshot = {
  session: null,
  focus: null,
  model: null,
  messages: [],
  approvals: [],
  forms: [],
  busy: false,
};

function respostaOk() {
  return new Response(JSON.stringify(snapshot), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("subscribe por polling", () => {
  it("entrega o estado assim que conecta", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respostaOk()));
    const onSnapshot = vi.fn();
    const onStatus = vi.fn();

    const stop = subscribe(onSnapshot, onStatus);
    await vi.advanceTimersByTimeAsync(0);

    expect(onSnapshot).toHaveBeenCalledWith(snapshot);
    expect(onStatus).toHaveBeenCalledWith(true);
    stop();
  });

  it("busca de novo depois de cada intervalo", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(respostaOk());
    vi.stubGlobal("fetch", fetchMock);

    const stop = subscribe(vi.fn(), vi.fn());
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS - 1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    stop();
  });

  it("para de buscar ao cancelar", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(respostaOk());
    vi.stubGlobal("fetch", fetchMock);

    const stop = subscribe(vi.fn(), vi.fn());
    await vi.advanceTimersByTimeAsync(0);
    stop();
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 5);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("marca offline e continua tentando depois de uma falha", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("rede caiu"))
      .mockResolvedValue(respostaOk());
    vi.stubGlobal("fetch", fetchMock);
    const onStatus = vi.fn();

    const stop = subscribe(vi.fn(), onStatus);
    await vi.advanceTimersByTimeAsync(0);
    expect(onStatus).toHaveBeenLastCalledWith(false);

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    expect(onStatus).toHaveBeenLastCalledWith(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    stop();
  });
});
