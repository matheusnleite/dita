import { useState, type FormEvent } from "react";
import { api } from "../lib/api.js";
import { errorLabel } from "../lib/format.js";

type Props = {
  onSuccess: () => void;
};

export default function LoginScreen({ onSuccess }: Props) {
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.login(password);
      onSuccess();
    } catch (submitError) {
      setError(errorLabel(submitError));
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh flex-col justify-center overflow-hidden bg-ink-950 px-6 safe-top safe-bottom">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(201,139,47,0.14),_transparent_42%),linear-gradient(180deg,_rgba(37,42,47,0.22),_transparent_30%)]" />
      <div className="relative mx-auto w-full max-w-sm">
        <div className="mb-12">
          <div className="mb-5 flex items-center gap-3">
            <span className="size-2.5 rounded-full bg-brass-500 shadow-[0_0_0_4px_rgba(201,139,47,0.12)]" />
            <span className="font-mono text-xs text-ink-400">voz para o seu PC</span>
          </div>
          <h1 className="text-[3.5rem] font-semibold leading-none tracking-tight text-bone-100">dita</h1>
          <p className="mt-4 max-w-[18rem] text-base leading-relaxed text-ink-400">
            Dite do celular. Execute no seu PC.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-bone-300">Senha de acesso</span>
            <div className="relative">
              <input
                type={visible ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoFocus
                autoComplete="current-password"
                inputMode="text"
                className="h-14 w-full rounded-2xl border border-ink-700 bg-ink-900/90 px-4 pr-16 text-base text-bone-100 outline-none transition placeholder:text-ink-500 focus:border-brass-500/70 focus:ring-2 focus:ring-brass-500/20"
                placeholder="Digite sua senha"
              />
              <button
                type="button"
                onClick={() => setVisible((current) => !current)}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-xl px-3 py-2 text-xs text-ink-400 transition hover:bg-ink-800 hover:text-bone-100"
              >
                {visible ? "ocultar" : "mostrar"}
              </button>
            </div>
          </label>

          {error && (
            <p role="alert" className="rounded-xl border border-record-500/35 bg-record-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!password || busy}
            className="h-14 w-full rounded-2xl bg-brass-500 font-semibold text-ink-950 transition enabled:hover:bg-brass-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-8 text-xs leading-relaxed text-ink-500">
          Acesso local protegido por senha. O áudio e as credenciais ficam no seu PC.
        </p>
      </div>
    </main>
  );
}
