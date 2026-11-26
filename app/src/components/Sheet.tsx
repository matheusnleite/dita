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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <button type="button" aria-label="Fechar" className="absolute inset-0" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-lg rounded-t-3xl border border-cave-700 bg-cave-900 p-5 shadow-2xl sm:rounded-3xl safe-bottom"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-cave-700 sm:hidden" />
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-cave-100">{title}</h2>
            {description && <p className="mt-1 text-sm leading-relaxed text-cave-400">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-2 py-1 text-sm text-cave-400 transition hover:bg-cave-800 hover:text-cave-100"
          >
            fechar
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
