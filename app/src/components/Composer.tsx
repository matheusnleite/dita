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
    <div className="border-t border-cave-800 bg-cave-900/80 px-3 pt-2 safe-bottom">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-cave-500">
        <MicIcon className="size-3.5" />
        {hint}
      </div>

      <div className="flex items-end gap-2 pb-1">
        <button
          type="button"
          onClick={toggleMic}
          disabled={!supported || disabled || transcribing}
          aria-label={active ? "Parar ditado" : "Iniciar ditado"}
          aria-pressed={active}
          className={`flex size-12 shrink-0 items-center justify-center rounded-2xl border transition ${
            active
              ? "border-red-500/60 bg-red-500/15 text-red-300"
              : "border-cave-700 bg-cave-950 text-cave-300 hover:border-ember/50 hover:text-cave-100"
          } disabled:opacity-30`}
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
          className="max-h-40 min-h-12 flex-1 resize-none rounded-2xl border border-cave-700 bg-cave-950 px-4 py-3 text-base leading-relaxed text-cave-100 outline-none transition placeholder:text-cave-500 focus:border-ember/60 focus:ring-2 focus:ring-ember/15"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          aria-label="Enviar ditado"
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-ember text-cave-950 transition enabled:hover:bg-ember-dim disabled:opacity-30"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
