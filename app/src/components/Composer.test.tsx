// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Composer from "./Composer.js";

type Result = { isFinal: boolean; 0: { transcript: string }; length: number };

class FakeRecognition {
  static instance: FakeRecognition | null = null;
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((event: { resultIndex: number; results: Result[] }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => this.onend?.());
  abort = vi.fn();

  constructor() {
    FakeRecognition.instance = this;
  }

  emitFinal(text: string) {
    this.onresult?.({
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript: text }, length: 1 }],
    });
  }
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  // @ts-expect-error test cleanup
  delete window.SpeechRecognition;
  // @ts-expect-error test cleanup
  delete window.webkitSpeechRecognition;
  // @ts-expect-error test cleanup
  delete window.MediaRecorder;
  FakeRecognition.instance = null;
});

describe("Composer ditado", () => {
  it("não abre teclado ao enviar pelo botão", async () => {
    const onSend = vi.fn();
    render(<Composer onSend={onSend} onError={vi.fn()} dictationMode="browser" />);
    const textarea = screen.getByPlaceholderText(/dite ou escreva/i) as HTMLTextAreaElement;
    const focusSpy = vi.spyOn(textarea, "focus");

    fireEvent.change(textarea, { target: { value: "teste" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar ditado" }));

    expect(onSend).toHaveBeenCalledWith("teste", []);
    expect(focusSpy).not.toHaveBeenCalled();
  });

  it("mostra fallback quando ditado não é suportado", () => {
    render(<Composer onSend={vi.fn()} onError={vi.fn()} dictationMode="browser" />);
    const mic = screen.getByRole("button", { name: "Iniciar ditado" });
    expect(mic.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/ditado indisponível neste navegador/i)).toBeTruthy();
  });

  it("inicia e para o ditado no toque", () => {
    // @ts-expect-error test mock
    window.SpeechRecognition = FakeRecognition;
    render(<Composer onSend={vi.fn()} onError={vi.fn()} dictationMode="browser" />);

    const mic = screen.getByRole("button", { name: "Iniciar ditado" });
    fireEvent.click(mic);
    expect(FakeRecognition.instance?.start).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Parar ditado" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Parar ditado" }));
    expect(FakeRecognition.instance?.stop).toHaveBeenCalledTimes(1);
  });

  it("coloca o texto final no campo de ditado", () => {
    // @ts-expect-error test mock
    window.SpeechRecognition = FakeRecognition;
    render(<Composer onSend={vi.fn()} onError={vi.fn()} dictationMode="browser" />);

    fireEvent.click(screen.getByRole("button", { name: "Iniciar ditado" }));
    act(() => {
      FakeRecognition.instance?.emitFinal("olá mundo");
    });

    const textarea = screen.getByPlaceholderText(/ouvindo/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe("olá mundo");
  });

  it("reporta erro de permissão", () => {
    // @ts-expect-error test mock
    window.SpeechRecognition = FakeRecognition;
    const onError = vi.fn();
    render(<Composer onSend={vi.fn()} onError={onError} dictationMode="browser" />);

    fireEvent.click(screen.getByRole("button", { name: "Iniciar ditado" }));
    FakeRecognition.instance?.onerror?.({ error: "not-allowed" });

    expect(onError).toHaveBeenCalledWith(
      "Microfone bloqueado. Libere o acesso nas permissões do navegador.",
    );
  });

  it("anexa arquivo e envia mesmo sem texto", () => {
    const onSend = vi.fn();
    render(<Composer onSend={onSend} onError={vi.fn()} dictationMode="browser" />);
    const file = new File(["img"], "foto.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText("foto.png")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Enviar ditado" }));

    expect(onSend).toHaveBeenCalledWith("", [file]);
  });

  it("transcreve áudio no PC e coloca texto no campo", async () => {
    class FakeRecorder {
      static instance: FakeRecorder | null = null;
      state: "inactive" | "recording" = "inactive";
      mimeType = "audio/webm";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(_stream: MediaStream, _opts?: unknown) {
        FakeRecorder.instance = this;
      }
      start() {
        this.state = "recording";
      }
      stop() {
        this.state = "inactive";
        this.ondataavailable?.({ data: new Blob(["audio"], { type: "audio/webm" }) });
        this.onstop?.();
      }
      static isTypeSupported() {
        return true;
      }
    }

    // @ts-expect-error test mock
    window.MediaRecorder = FakeRecorder;
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ text: "olá do whisper" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    render(<Composer onSend={vi.fn()} onError={vi.fn()} dictationMode="server" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Iniciar ditado" }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Parar ditado" }));
    });

    expect(await screen.findByDisplayValue("olá do whisper")).toBeTruthy();
    vi.unstubAllGlobals();
  });
});
