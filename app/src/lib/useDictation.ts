import { useCallback, useRef, useState } from "react";
import { getRecognitionCtor, speechErrorMessage, type SpeechRecognitionLike } from "./speech.js";

type Options = {
  lang?: string;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
};

export function useDictation({ lang = "pt-BR", onFinal, onError }: Options) {
  const [listening, setListening] = useState(false);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const supported = Boolean(getRecognitionCtor());

  const stop = useCallback(() => {
    const current = recognition.current;
    setListening(false);
    recognition.current = null;
    try {
      current?.stop();
    } catch {
      /* já parado */
    }
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      onError("Ditado de voz não é suportado neste navegador.");
      return;
    }

    try {
      recognition.current?.abort();
    } catch {
      /* ignora */
    }

    const instance = new Ctor();
    instance.lang = lang;
    instance.continuous = true;
    instance.interimResults = true;

    instance.onresult = (event) => {
      let chunk = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result?.isFinal) chunk += result[0]?.transcript ?? "";
      }
      const text = chunk.trim();
      if (text) onFinal(text);
    };

    instance.onerror = (event) => {
      const message = speechErrorMessage(event.error);
      if (message) onError(message);
    };

    instance.onend = () => {
      setListening(false);
      if (recognition.current === instance) recognition.current = null;
    };

    recognition.current = instance;
    try {
      instance.start();
      setListening(true);
    } catch {
      recognition.current = null;
      setListening(false);
      onError("Não consegui iniciar o microfone.");
    }
  }, [lang, onError, onFinal]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { supported, listening, start, stop, toggle };
}
