import { useRef, useState, type KeyboardEvent } from "react";
import { MicIcon, SendIcon } from "./icons.js";

type Props = {
  onSend: (text: string) => void;
  disabled?: boolean;
};

export default function Composer({ onSend, disabled = false }: Props) {
  const [value, setValue] = useState("");
  const textarea = useRef<HTMLTextAreaElement>(null);
  const canSend = value.trim().length > 0 && !disabled;

  function submit() {
    if (!canSend) return;
    onSend(value.trim());
    setValue("");
    if (textarea.current) {
      textarea.current.style.height = "auto";
      textarea.current.focus();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    if (event.key === "Enter" && !event.shiftKey && finePointer && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="border-t border-cave-800 bg-cave-900/80 px-3 pt-2 safe-bottom">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-cave-500">
        <MicIcon className="size-3.5" />
        dite pelo microfone do teclado
      </div>

      <div className="flex items-end gap-2 pb-1">
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
          placeholder="Dite ou escreva…"
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
