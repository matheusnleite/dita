import { useCallback, useRef, useState } from "react";

type Options = {
  onRecorded: (audio: Blob) => void;
  onError: (message: string) => void;
};

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export function useRecorder({ onRecorded, onError }: Options) {
  const [recording, setRecording] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const supported =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia;

  const cleanup = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    recorder.current = null;
    chunks.current = [];
    setRecording(false);
  }, []);

  const stop = useCallback(() => {
    const current = recorder.current;
    if (!current || current.state === "inactive") {
      cleanup();
      return;
    }
    current.stop();
  }, [cleanup]);

  const start = useCallback(async () => {
    if (!supported) {
      onError("Gravação de áudio não suportada neste navegador.");
      return;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const current = new MediaRecorder(media, mimeType ? { mimeType } : undefined);
      stream.current = media;
      chunks.current = [];
      recorder.current = current;

      current.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      current.onerror = () => {
        onError("Falha ao gravar áudio.");
        cleanup();
      };
      current.onstop = () => {
        const blob = new Blob(chunks.current, { type: current.mimeType || "audio/webm" });
        cleanup();
        if (blob.size > 0) onRecorded(blob);
      };

      current.start();
      setRecording(true);
    } catch (error) {
      cleanup();
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        onError("Microfone bloqueado. Libere o acesso nas permissões do navegador.");
      } else {
        onError("Não consegui iniciar a gravação.");
      }
    }
  }, [cleanup, onError, onRecorded, supported]);

  const toggle = useCallback(() => {
    if (recording) stop();
    else void start();
  }, [recording, start, stop]);

  return { supported, recording, toggle, stop };
}
