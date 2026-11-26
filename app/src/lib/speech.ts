export type RecognitionResultLike = {
  isFinal: boolean;
  length: number;
  [index: number]: { transcript: string; confidence?: number } | undefined;
};

export type RecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: RecognitionResultLike | undefined;
  };
};

export type RecognitionErrorLike = {
  error: string;
};

export type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: RecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
};

export type RecognitionCtor = new () => SpeechRecognitionLike;

type SpeechWindow = {
  SpeechRecognition?: RecognitionCtor;
  webkitSpeechRecognition?: RecognitionCtor;
};

export function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as SpeechWindow;
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export function speechErrorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microfone bloqueado. Libere o acesso nas permissões do navegador.";
    case "no-speech":
      return "Não ouvi nada. Tente de novo.";
    case "audio-capture":
      return "Microfone indisponível neste aparelho.";
    case "network":
      return "Sem conexão para transcrever a fala.";
    case "aborted":
      return "";
    default:
      return `Falha no ditado (${code}).`;
  }
}
