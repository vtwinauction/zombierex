/**
 * REX Assistant — full-page conversational AI inside ZOMBIEREX.
 * Non-streaming request/response; keeps history in local state.
 */
import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { assistantChat } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({ meta: [{ title: "REX · AI companion · ZOMBIEREX" }] }),
  component: AssistantPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Find weekend trackday events near me",
  "Recommend crews for cafe racer builds",
  "How do I list my bike in the Vault?",
  "Show trending reels this week",
];

function AssistantPage() {
  const navigate = useNavigate();
  const call = useServerFn(assistantChat);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await call({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: res.text || "…" }]);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  // Convert /path mentions in assistant messages into tappable links.
  function renderAssistant(text: string) {
    const parts = text.split(/(\/[a-z][a-z0-9/_-]*)/gi);
    return parts.map((p, i) => {
      if (/^\/[a-z]/i.test(p)) {
        return (
          <button
            key={i}
            className="underline decoration-dotted underline-offset-2"
            style={{ color: "var(--color-neon)" }}
            onClick={() => navigate({ to: p as any }).catch(() => {})}
          >
            {p}
          </button>
        );
      }
      return <span key={i}>{p}</span>;
    });
  }

  return (
    <div className="flex min-h-[100dvh] flex-col pb-32">
      <header className="px-5 pt-8">
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>
          ◆ REX · AI COMPANION
        </p>
        <h1 className="serif mt-2 text-3xl leading-tight" style={{ color: "var(--color-ink)" }}>
          Ask me{" "}
          <span className="italic" style={{ color: "var(--color-neon)" }}>
            anything
          </span>
        </h1>
        <p className="mt-2 text-[12px]" style={{ color: "var(--color-silver)" }}>
          Discover crews, events, listings, or learn the platform. Replies stay on this device.
        </p>
      </header>

      <div className="mt-5 flex-1 space-y-3 px-5">
        {messages.length === 0 && (
          <div className="space-y-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="tap w-full px-4 py-3 text-left text-[13px]"
                style={{
                  background: "var(--color-graphite)",
                  border: "1px solid var(--color-hair)",
                  borderRadius: 10,
                  color: "var(--color-ink)",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className="max-w-[85%] whitespace-pre-wrap px-4 py-3 text-[13px] leading-relaxed"
              style={
                m.role === "user"
                  ? {
                      background: "var(--color-ink)",
                      color: "var(--color-cloud, #fafafa)",
                      borderRadius: 12,
                    }
                  : {
                      background: "var(--color-graphite)",
                      border: "1px solid var(--color-hair)",
                      color: "var(--color-ink)",
                      borderRadius: 12,
                    }
              }
            >
              {m.role === "assistant" ? renderAssistant(m.content) : m.content}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start">
            <div
              className="px-4 py-3 text-[12px]"
              style={{
                background: "var(--color-graphite)",
                border: "1px solid var(--color-hair)",
                borderRadius: 12,
                color: "var(--color-silver)",
              }}
            >
              REX is thinking…
            </div>
          </div>
        )}

        {error && (
          <div
            className="px-4 py-3 text-[12px]"
            style={{
              background: "rgba(255,80,80,0.08)",
              border: "1px solid rgba(255,80,80,0.4)",
              borderRadius: 10,
              color: "#ff8080",
            }}
          >
            {error}
          </div>
        )}

        <div ref={endRef} />
      </div>

      <div
        className="fixed inset-x-0 z-40 px-4"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }}
      >
        <div
          className="flex items-end gap-2 p-2"
          style={{
            background: "var(--color-graphite)",
            border: "1px solid var(--color-hair)",
            borderRadius: 14,
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask REX…"
            rows={1}
            className="flex-1 resize-none bg-transparent px-2 py-2 text-[13px] outline-none"
            style={{ color: "var(--color-ink)", maxHeight: 120 }}
          />
          <button
            onClick={() => send(input)}
            disabled={busy || !input.trim()}
            className="tap px-4 py-2 text-[12px]"
            style={{
              background: input.trim() && !busy ? "var(--color-neon)" : "var(--color-hair)",
              color: input.trim() && !busy ? "var(--color-ink)" : "var(--color-silver)",
              borderRadius: 10,
              fontWeight: 600,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
