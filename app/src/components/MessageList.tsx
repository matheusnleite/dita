import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage, Session } from "../lib/types.js";
import { formatTime } from "../lib/format.js";
import { MicIcon } from "./icons.js";

type Props = {
  messages: ChatMessage[];
  pending: string[];
  session: Session | null;
  busy: boolean;
};

export default function MessageList({ messages, pending, session, busy }: Props) {
  const showThinking = busy || pending.length > 0;
  const empty = messages.length === 0 && pending.length === 0 && !showThinking;
  const scroller = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const previousTotal = useRef(0);
  const total = messages.length + pending.length + (showThinking ? 1 : 0);

  useEffect(() => {
    const element = scroller.current;
    const grew = total > previousTotal.current;
    previousTotal.current = total;
    if (!element || !grew) return;
    if (pending.length > 0 || showThinking || nearBottom.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [total, pending.length, showThinking]);

  if (empty) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-10">
        <div className="flex size-16 items-center justify-center rounded-3xl border border-ink-700 bg-ink-900 text-brass-400 shadow-[inset_0_1px_0_rgba(241,236,228,0.04)]">
          <MicIcon className="size-7" />
        </div>
        <div className="max-w-xs space-y-3 text-center">
          <p className="text-lg font-medium tracking-tight text-bone-100">Comece ditando.</p>
          <p className="text-sm leading-relaxed text-ink-400">
            Toque no microfone do app ou use o teclado. O texto vem pra cá e eu executo no seu PC.
          </p>
        </div>
        {session && (
          <p className="font-mono text-[11px] text-ink-500">
            sessão <span className="text-ink-400">{session.id.slice(0, 12)}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      ref={scroller}
      data-testid="message-scroller"
      onScroll={(event) => {
        const element = event.currentTarget;
        nearBottom.current =
          element.scrollHeight - element.scrollTop - element.clientHeight < 200;
      }}
      className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-4"
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {pending.map((text) => (
        <div key={`pending-${text}`} className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brass-500 px-4 py-2.5 text-sm text-ink-950 opacity-80">
            <p className="whitespace-pre-wrap break-words">{text}</p>
            <p className="mt-1 text-[10px] text-ink-950/65">enviando…</p>
          </div>
        </div>
      ))}

      {showThinking && (
        <div className="flex justify-start" aria-live="polite">
          <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-ink-700 bg-ink-900 px-4 py-3 text-sm text-bone-300">
            <div className="flex items-center gap-2">
              <span className="inline-flex gap-1">
                <span className="size-1.5 animate-pulse rounded-full bg-brass-400" />
                <span className="size-1.5 animate-pulse rounded-full bg-brass-400 [animation-delay:150ms]" />
                <span className="size-1.5 animate-pulse rounded-full bg-brass-400 [animation-delay:300ms]" />
              </span>
              <span>Pensando…</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brass-500 px-4 py-2.5 text-sm text-ink-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
          {message.createdAt && (
            <p className="mt-1 text-right text-[10px] text-ink-950/65">{formatTime(message.createdAt)}</p>
          )}
        </div>
      </div>
    );
  }

  if (message.role === "system") {
    return (
      <div className="flex justify-center">
        <div className="max-w-[92%] rounded-xl border border-record-500/30 bg-record-500/10 px-4 py-2 text-center text-xs leading-relaxed text-red-200">
          {message.error ?? message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-ink-700 bg-ink-900 px-4 py-3 text-sm text-bone-100">
        {message.text && (
          <div className="markdown break-words leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>,
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noreferrer" className="text-brass-500 underline break-all">
                    {children}
                  </a>
                ),
                ul: ({ children }) => <ul className="mb-2 ml-5 list-disc space-y-1 last:mb-0">{children}</ul>,
                ol: ({ children }) => <ol className="mb-2 ml-5 list-decimal space-y-1 last:mb-0">{children}</ol>,
                li: ({ children }) => <li className="whitespace-pre-wrap">{children}</li>,
                code: ({ className, children }) => {
                  const block = /language-/.test(className ?? "");
                  if (block) {
                    return <code className="block whitespace-pre-wrap font-mono text-[12px] text-bone-100">{children}</code>;
                  }
                  return (
                    <code className="rounded bg-ink-800 px-1 py-0.5 font-mono text-[12px] text-bone-100">
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => (
                  <pre className="mb-2 overflow-x-auto rounded-lg border border-ink-700 bg-ink-950 p-3 last:mb-0">
                    {children}
                  </pre>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="mb-2 border-l-2 border-ink-700 pl-3 text-bone-300 last:mb-0">
                    {children}
                  </blockquote>
                ),
                h1: ({ children }) => <h1 className="mb-2 text-base font-semibold last:mb-0">{children}</h1>,
                h2: ({ children }) => <h2 className="mb-2 text-sm font-semibold last:mb-0">{children}</h2>,
                h3: ({ children }) => <h3 className="mb-1 text-sm font-semibold last:mb-0">{children}</h3>,
                hr: () => <hr className="my-2 border-ink-700" />,
                table: ({ children }) => (
                  <div className="mb-2 overflow-x-auto last:mb-0">
                    <table className="min-w-full border-collapse text-xs">{children}</table>
                  </div>
                ),
                th: ({ children }) => <th className="border border-ink-700 bg-ink-850 px-2 py-1 text-left">{children}</th>,
                td: ({ children }) => <td className="border border-ink-700 px-2 py-1 align-top">{children}</td>,
              }}
            >
              {message.text}
            </ReactMarkdown>
          </div>
        )}
        {message.error && (
          <p className="mt-1 rounded-lg border border-record-500/30 bg-record-500/10 px-3 py-2 text-xs leading-relaxed text-red-200">
            {message.error}
          </p>
        )}
        {message.tools.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.tools.map((tool, index) => (
              <span
                key={`${tool}-${index}`}
                className="rounded-md border border-ink-700 bg-ink-850 px-2 py-0.5 font-mono text-[10px] text-ink-400"
              >
                {tool}
              </span>
            ))}
          </div>
        )}
        {message.createdAt && (
          <p className="mt-1 font-mono text-[10px] text-ink-500">{formatTime(message.createdAt)}</p>
        )}
      </div>
    </div>
  );
}
