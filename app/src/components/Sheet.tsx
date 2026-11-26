import type { ReactNode } from "react";
import { useEffect } from "react";

type Props = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

export default function Sheet({ title, description, onClose, children }: Props) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/70 backdrop-blur-sm sm:items-center">
      <button type="button" aria-label="Fechar" className="absolute inset-0" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-lg rounded-t-3xl border border-ink-700 bg-ink-900 p-5 shadow-2xl shadow-black/30 sm:rounded-3xl safe-bottom"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-700 sm:hidden" />
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-bone-100">{title}</h2>
            {description && <p className="mt-1 text-sm leading-relaxed text-ink-400">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-1.5 text-sm text-ink-400 transition hover:bg-ink-800 hover:text-bone-100"
          >
            fechar
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
