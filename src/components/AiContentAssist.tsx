/**
 * AI content assistant — reusable inline widget for composers.
 * Emits caption/hashtag suggestions given a context string.
 */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { suggestCaption, suggestHashtags, improveText } from "@/lib/ai.functions";

type Props = {
  contextText: string;
  onInsertCaption?: (text: string) => void;
  onInsertHashtags?: (tags: string[]) => void;
};

export function AiContentAssist({ contextText, onInsertCaption, onInsertHashtags }: Props) {
  const callCaption = useServerFn(suggestCaption);
  const callTags = useServerFn(suggestHashtags);
  const callImprove = useServerFn(improveText);
  const [busy, setBusy] = useState<"caption" | "tags" | "polish" | null>(null);
  const [captions, setCaptions] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [polished, setPolished] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: "caption" | "tags" | "polish") {
    setError(null);
    setBusy(kind);
    try {
      if (kind === "caption") {
        const r = await callCaption({
          data: { context: contextText, vibe: "cinematic", kind: "image" },
        });
        setCaptions(r.captions);
      } else if (kind === "tags") {
        const r = await callTags({ data: { context: contextText || "motorcycle post" } });
        setTags(r.hashtags);
      } else {
        const r = await callImprove({ data: { text: contextText, mode: "polish" } });
        setPolished(r.text);
      }
    } catch (e: any) {
      setError(e?.message ?? "AI request failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      className="p-3"
      style={{
        background: "var(--color-graphite)",
        border: "1px solid var(--color-hair)",
        borderRadius: 12,
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>
          ◆ AI ASSIST · REX
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => run("caption")}
          disabled={!!busy}
          className="tap px-3 py-1.5 text-[11px]"
          style={{
            background: "var(--color-ink)",
            color: "var(--color-cloud, #fafafa)",
            borderRadius: 8,
          }}
        >
          {busy === "caption" ? "Writing…" : "Suggest caption"}
        </button>
        <button
          onClick={() => run("tags")}
          disabled={!!busy}
          className="tap px-3 py-1.5 text-[11px]"
          style={{
            background: "var(--color-ink)",
            color: "var(--color-cloud, #fafafa)",
            borderRadius: 8,
          }}
        >
          {busy === "tags" ? "Finding…" : "Suggest hashtags"}
        </button>
        {contextText.trim().length > 0 && (
          <button
            onClick={() => run("polish")}
            disabled={!!busy}
            className="tap px-3 py-1.5 text-[11px]"
            style={{
              background: "transparent",
              color: "var(--color-ink)",
              border: "1px solid var(--color-hair)",
              borderRadius: 8,
            }}
          >
            {busy === "polish" ? "Polishing…" : "Polish text"}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-2 text-[11px]" style={{ color: "#ff8080" }}>
          {error}
        </p>
      )}

      {captions.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {captions.map((c, i) => (
            <button
              key={i}
              onClick={() => onInsertCaption?.(c)}
              className="tap w-full px-3 py-2 text-left text-[12px]"
              style={{
                background: "transparent",
                border: "1px solid var(--color-hair)",
                borderRadius: 8,
                color: "var(--color-ink)",
              }}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {tags.length > 0 && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                onClick={() => onInsertHashtags?.([t])}
                className="tap cursor-pointer px-2 py-1 text-[11px]"
                style={{
                  background: "transparent",
                  border: "1px solid var(--color-neon)",
                  color: "var(--color-neon)",
                  borderRadius: 999,
                }}
              >
                {t}
              </span>
            ))}
          </div>
          {onInsertHashtags && (
            <button
              onClick={() => onInsertHashtags(tags)}
              className="tap mt-2 px-3 py-1.5 text-[11px]"
              style={{
                background: "var(--color-neon)",
                color: "var(--color-ink)",
                borderRadius: 8,
                fontWeight: 600,
              }}
            >
              Insert all
            </button>
          )}
        </div>
      )}

      {polished && (
        <div className="mt-3">
          <p className="mono-tag mb-1" style={{ color: "var(--color-silver)" }}>
            POLISHED
          </p>
          <button
            onClick={() => onInsertCaption?.(polished)}
            className="tap w-full px-3 py-2 text-left text-[12px]"
            style={{
              background: "transparent",
              border: "1px solid var(--color-hair)",
              borderRadius: 8,
              color: "var(--color-ink)",
            }}
          >
            {polished}
          </button>
        </div>
      )}
    </div>
  );
}
