import { useEffect, useState } from "react";
import { api, UnauthorizedError } from "./lib/api.js";
import ChatScreen from "./screens/ChatScreen.js";
import LoginScreen from "./screens/LoginScreen.js";

type Phase = "loading" | "login" | "ready";

export default function App() {
  const [phase, setPhase] = useState<Phase>("loading");

  useEffect(() => {
    let cancelled = false;
    api
      .state()
      .then(() => {
        if (!cancelled) setPhase("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setPhase(error instanceof UnauthorizedError ? "login" : "login");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (phase === "loading") {
    return (
      <div className="flex h-dvh items-center justify-center bg-ink-950">
        <div className="flex items-center gap-3 font-mono text-sm text-ink-400">
          <span className="size-2 animate-pulse rounded-full bg-brass-500" />
          carregando
        </div>
      </div>
    );
  }

  if (phase === "login") {
    return <LoginScreen onSuccess={() => setPhase("ready")} />;
  }

  return <ChatScreen onSignedOut={() => setPhase("login")} />;
}
