import { useMemo, useState } from "react";
import type { FormField, FormRequest } from "../lib/types.js";

type Props = {
  form: FormRequest;
  onReply: (sessionID: string, formID: string, answer: Record<string, unknown>) => Promise<void>;
  onCancel: (sessionID: string, formID: string) => Promise<void>;
};

type AnswerValue = string | number | boolean | string[];

function defaultValue(field: FormField): AnswerValue | undefined {
  if (field.default !== undefined) return field.default;
  if (field.type === "boolean") return false;
  if (field.type === "multiselect") return [];
  return undefined;
}

function isVisible(field: FormField, answers: Record<string, AnswerValue | undefined>): boolean {
  if (field.hidden) return false;
  if (!field.when || field.when.length === 0) return true;
  return field.when.every((cond) => {
    const actual = answers[cond.key];
    return cond.op === "eq" ? actual === cond.value : actual !== cond.value;
  });
}

function isMissing(field: FormField, value: AnswerValue | undefined): boolean {
  if (!field.required) return false;
  if (value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function coerceNumber(field: FormField, raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  if (field.type === "integer" && !Number.isInteger(n)) return undefined;
  return n;
}

export default function FormCard({ form, onReply, onCancel }: Props) {
  const initial = useMemo(() => {
    const entries: Record<string, AnswerValue | undefined> = {};
    for (const field of form.fields) entries[field.key] = defaultValue(field);
    return entries;
  }, [form.fields]);

  const [answers, setAnswers] = useState<Record<string, AnswerValue | undefined>>(initial);
  const [busy, setBusy] = useState<"reply" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setAnswer(key: string, value: AnswerValue | undefined) {
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    setError(null);
    const payload: Record<string, unknown> = {};
    for (const field of form.fields) {
      if (!isVisible(field, answers)) continue;
      const value = answers[field.key];
      if (isMissing(field, value)) {
        setError(`Preencha: ${field.title || field.key}`);
        return;
      }
      if (value === undefined) continue;
      if (typeof value === "string" && value.trim() === "" && !field.required) continue;
      payload[field.key] = value;
    }
    setBusy("reply");
    try {
      await onReply(form.sessionID, form.id, payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "falha ao responder");
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    setError(null);
    setBusy("cancel");
    try {
      await onCancel(form.sessionID, form.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "falha ao cancelar");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-950 p-3">
      <p className="text-sm font-medium text-bone-100">{form.title}</p>
      <div className="mt-3 space-y-3">
        {form.fields.map((field) => {
          if (!isVisible(field, answers)) return null;
          const value = answers[field.key];
          const label = field.title || field.key;
          return (
            <label key={field.key} className="block">
              <span className="mb-1 block text-xs text-bone-300">
                {label}
                {field.required ? <span className="text-amber-300"> *</span> : null}
              </span>
              {field.description ? (
                <span className="mb-1 block text-[11px] text-ink-500">{field.description}</span>
              ) : null}
              <FieldInput field={field} value={value} onChange={(v) => setAnswer(field.key, v)} />
            </label>
          );
        })}
      </div>
      {error ? <p className="mt-2 text-xs text-red-200">{error}</p> : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void cancel()}
          disabled={busy !== null}
          className="h-10 flex-1 rounded-lg border border-ink-700 text-sm text-bone-300 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy !== null}
          className="h-10 flex-1 rounded-lg bg-brass-500 text-sm font-medium text-ink-950 disabled:opacity-50"
        >
          {busy === "reply" ? "Enviando…" : "Responder"}
        </button>
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue | undefined) => void;
}) {
  if (field.type === "boolean") {
    const checked = value === true;
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`h-10 w-full rounded-lg border px-3 text-left text-sm ${
          checked ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-ink-700 bg-ink-900 text-bone-300"
        }`}
      >
        {checked ? "Sim" : "Não"}
      </button>
    );
  }

  if (field.type === "external") {
    const url = field.url;
    return url ? (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="block rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-brass-500 underline"
      >
        Abrir link externo
      </a>
    ) : (
      <p className="text-xs text-ink-500">Campo externo sem URL.</p>
    );
  }

  if (field.type === "multiselect") {
    const selected = Array.isArray(value) ? value : [];
    const options = field.options ?? [];
    return (
      <div className="space-y-1.5">
        {options.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                const next = active ? selected.filter((v) => v !== opt.value) : [...selected, opt.value];
                onChange(next);
              }}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                active ? "border-brass-500/60 bg-brass-500/10 text-bone-100" : "border-ink-700 bg-ink-900 text-bone-300"
              }`}
            >
              <span className="block">{opt.label}</span>
              {opt.description ? <span className="block text-[11px] text-ink-500">{opt.description}</span> : null}
            </button>
          );
        })}
        {options.length === 0 ? <p className="text-xs text-ink-500">Sem opções.</p> : null}
      </div>
    );
  }

  const options = field.options ?? [];
  if (options.length > 0 && !field.custom) {
    const selected = typeof value === "string" ? value : "";
    return (
      <div className="space-y-1.5">
        {options.map((opt) => {
          const active = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                active ? "border-brass-500/60 bg-brass-500/10 text-bone-100" : "border-ink-700 bg-ink-900 text-bone-300"
              }`}
            >
              <span className="block">{opt.label}</span>
              {opt.description ? <span className="block text-[11px] text-ink-500">{opt.description}</span> : null}
            </button>
          );
        })}
      </div>
    );
  }

  if (options.length > 0 && field.custom) {
    const selected = typeof value === "string" ? value : "";
    const inOptions = options.some((o) => o.value === selected);
    return (
      <div className="space-y-1.5">
        {options.map((opt) => {
          const active = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                active ? "border-brass-500/60 bg-brass-500/10 text-bone-100" : "border-ink-700 bg-ink-900 text-bone-300"
              }`}
            >
              <span className="block">{opt.label}</span>
              {opt.description ? <span className="block text-[11px] text-ink-500">{opt.description}</span> : null}
            </button>
          );
        })}
        <input
          value={inOptions ? "" : selected}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Outra resposta…"
          className="h-10 w-full rounded-lg border border-ink-700 bg-ink-900 px-3 text-sm text-bone-100 outline-none focus:border-brass-500/60"
        />
      </div>
    );
  }

  if (field.type === "number" || field.type === "integer") {
    const text = typeof value === "number" ? String(value) : "";
    return (
      <input
        type="number"
        inputMode={field.type === "integer" ? "numeric" : "decimal"}
        step={field.type === "integer" ? 1 : "any"}
        value={text}
        min={field.minimum}
        max={field.maximum}
        placeholder={field.placeholder}
        onChange={(e) => onChange(coerceNumber(field, e.target.value))}
        className="h-10 w-full rounded-lg border border-ink-700 bg-ink-900 px-3 text-sm text-bone-100 outline-none focus:border-brass-500/60"
      />
    );
  }

  const text = typeof value === "string" ? value : "";
  return (
    <input
      type={field.format === "email" ? "email" : field.format === "uri" ? "url" : field.format === "date" ? "date" : field.format === "date-time" ? "datetime-local" : "text"}
      value={text}
      placeholder={field.placeholder}
      minLength={field.minLength}
      maxLength={field.maxLength}
      pattern={field.pattern}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-lg border border-ink-700 bg-ink-900 px-3 text-sm text-bone-100 outline-none focus:border-brass-500/60"
    />
  );
}