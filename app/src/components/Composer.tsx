import { useRef, useState, type KeyboardEvent } from "react";
import { MicIcon, SendIcon } from "./icons.js";
import { useDictation } from "../lib/useDictation.js";
import { useRecorder } from "../lib/useRecorder.js";
import { api } from "../lib/api.js";
import { errorLabel } from "../lib/format.js";

type DictationMode = "server" | "browser";

type Props = {
  onSend: (text: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
  dictationMode: DictationMode;
};

export default function Composer({ onSend, onError, disabled = false, dictationMode }: Props) {
  const [value, setValue] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const canSend = value.trim().length > 0 && !disabled;

  function appendText(text: string) {
    const clean = text.trim();
    if (!clean) return;
    setValue((current) => {
      const gap = current && !/\s$/.test(current) ? " " : "";
      return current + gap + clean;
    });
    requestAnimationFrame(() => {
      const element = textarea.current;
      if (!element) return;
      element.style.height = "auto";
      element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
    });
  }

  const dictation = useDictation({
    onFinal: appendText,
    onError,
  });

  const recorder = useRecorder({
    onRecorded: (audio) => {
      setTranscribing(true);
      void api
        .transcribe(audio)
        .then((result) => appendText(result.text))
        .catch((error) => onError(errorLabel(error)))
        .finally(() => setTranscribing(false));
    },
    onError,
  });

  const serverMode = dictationMode === "server";
  const active = serverMode ? recorder.recording : dictation.listening;
  const supported = serverMode ? recorder.supported : dictation.supported;

  function toggleMic() {
    if (serverMode) recorder.toggle();
    else dictation.toggle();
  }

  function submit() {
    if (!canSend) return;
    if (dictation.listening) dictation.toggle();
    if (recorder.recording) recorder.stop();
    onSend(value.trim());
    setValue("");
    if (textarea.current) {
      textarea.current.style.height = "auto";
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    if (event.key === "Enter" && !event.shiftKey && finePointer && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  let hint = "ditado indisponível neste navegador; use o teclado";
  if (supported) {
    if (transcribing) hint = "transcrevendo no PC…";
    else if (active) hint = serverMode ? "gravando… toque para transcrever" : "ouvindo… toque para parar";
    else hint = serverMode ? "toque no microfone para gravar" : "toque no microfone para ditar";
  }

  return (
    <div className="border-t border-ink-800 bg-ink-900/90 px-3 pt-3 backdrop-blur safe-bottom">
      <div className="mb-2 flex items-center gap-2 text-[11px] text-ink-400">
        <span className={`size-1.5 rounded-full ${active || transcribing ? "bg-record-500 animate-pulse" : "bg-brass-500/70"}`} />
        <MicIcon className="size-3.5" />
        <span>{hint}</span>
      </div>

      <div className="flex items-end gap-2 pb-2">
        <button
          type="button"
          onClick={toggleMic}
          disabled={!supported || disabled || transcribing}
          aria-label={active ? "Parar ditado" : "Iniciar ditado"}
          aria-pressed={active}
          className={`flex size-12 shrink-0 items-center justify-center rounded-2xl border transition ${
            active
              ? "border-record-500/60 bg-record-500/15 text-red-200 shadow-[0_0_0_4px_rgba(217,92,74,0.12)]"
              : "border-ink-700 bg-ink-950 text-bone-300 hover:border-brass-500/50 hover:text-bone-100"
          } disabled:cursor-not-allowed disabled:opacity-30`}
        >
          <MicIcon className={active || transcribing ? "size-5 animate-pulse" : "size-5"} />
        </button>

        <textarea
          ref={textarea}
          value={value}
          rows={1}
          onChange={(event) => {
            setValue(event.target.value);
            event.target.style.height = "auto";
            event.target.style.height = `${Math.min(event.target.scrollHeight, 160)}px`;
          }}
          onKeyDown={handleKeyDown}
          placeholder={active ? "Ouvindo…" : "Dite ou escreva…"}
          enterKeyHint="send"
          className="max-h-40 min-h-12 flex-1 resize-none rounded-2xl border border-ink-700 bg-ink-950 px-4 py-3 text-base leading-relaxed text-bone-100 outline-none transition placeholder:text-ink-500 focus:border-brass-500/60 focus:ring-2 focus:ring-brass-500/15"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          aria-label="Enviar ditado"
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brass-500 text-ink-950 transition enabled:hover:bg-brass-600 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
