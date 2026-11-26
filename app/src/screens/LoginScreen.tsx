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
    <main className="flex min-h-dvh flex-col justify-center bg-cave-950 px-6 safe-top safe-bottom">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-5xl font-semibold tracking-tight text-cave-100">dita</h1>
          <p className="mt-3 text-sm text-cave-400">Dite. Eu executo.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-cave-300">Senha de acesso</span>
            <div className="relative">
              <input
                type={visible ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoFocus
                autoComplete="current-password"
                inputMode="text"
                className="h-14 w-full rounded-2xl border border-cave-700 bg-cave-900 px-4 pr-16 text-lg text-cave-100 outline-none transition focus:border-ember/70 focus:ring-2 focus:ring-ember/20"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setVisible((current) => !current)}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-xl px-3 py-2 text-xs text-cave-400 transition hover:text-cave-100"
              >
                {visible ? "ocultar" : "mostrar"}
              </button>
            </div>
          </label>

          {error && (
            <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!password || busy}
            className="h-14 w-full rounded-2xl bg-ember font-semibold text-cave-950 transition enabled:hover:bg-ember-dim disabled:opacity-40"
          >
            {busy ? "entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs leading-relaxed text-cave-500">
          A senha fica em <code className="text-cave-400">~/.dita/credentials.json</code> no seu PC.
        </p>
      </div>
    </main>
  );
}
