import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { judgeGetEntry } from "@/lib/judge.functions";

const entryQ = (id: string) =>
  queryOptions({ queryKey: ["judge-entry", id], queryFn: () => judgeGetEntry({ data: { id } }) });

export const Route = createFileRoute("/judge/entries/$id")({
  head: ({ loaderData }) => {
    const name = (loaderData as any)?.entry?.display_name ?? "Entry";
    return {
      meta: [
        { title: `${name} · AI Judgement` },
        { name: "description", content: `AI-judged concours scorecard for ${name}.` },
        { property: "og:title", content: `${name} · AI Judgement` },
        { property: "og:description", content: `AI-judged concours scorecard for ${name}.` },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(entryQ(params.id));
    if (!data.entry) throw notFound();
    return data;
  },
  component: EntryReport,
  notFoundComponent: () => (
    <div className="p-8 text-center text-[13px]" style={{ color: "var(--color-silver)" }}>
      Entry not available.
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-[13px]" style={{ color: "var(--color-silver)" }}>
      Failed: {String(error?.message ?? error)}
    </div>
  ),
});

function EntryReport() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(entryQ(id));
  const e = data.entry!;
  const media = data.media;
  const urls = data.mediaUrls;
  const categories = (e.category_scores ?? {}) as Record<string, number>;
  const defects = (e.defects ?? []) as any[];
  const highlights = (e.highlights ?? []) as string[];
  const suggestions = (e.suggestions ?? []) as string[];

  return (
    <div className="pb-24 print:pb-0">
      <header className="px-5 pt-8">
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>
          ◆ AI INSPECTION REPORT
        </p>
        <h1 className="serif mt-2 text-3xl leading-tight" style={{ color: "var(--color-ink)" }}>
          {e.display_name}
        </h1>
        <p className="mono-tag mt-1" style={{ color: "var(--color-silver)", fontSize: 10 }}>
          {[e.year, e.make, e.model].filter(Boolean).join(" ")} · {e.vehicle_type?.toUpperCase()}
          {e.city ? ` · ${e.city}` : ""}
        </p>

        <div className="mt-4 flex items-end gap-4">
          <div>
            <p className="mono-tag" style={{ color: "var(--color-silver)" }}>
              OVERALL
            </p>
            <p
              className="serif text-6xl italic leading-none"
              style={{ color: "var(--color-neon)" }}
            >
              {e.overall_score ?? "—"}
            </p>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-2">
            <MiniStat label="Engine" v={e.engine_score} />
            <MiniStat label="Exhaust" v={e.exhaust_score} />
          </div>
        </div>

        {e.awards?.length ? (
          <div className="mt-3 flex gap-2 flex-wrap">
            {e.awards.map((a: string) => (
              <span
                key={a}
                className="chip mono-tag"
                style={{
                  background: "var(--color-obsidian)",
                  color: "var(--color-neon)",
                  borderColor: "var(--color-obsidian)",
                }}
              >
                🏆 {a.replace(/_/g, " ").toUpperCase()}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      <section className="mt-6 px-5">
        <p className="mono-tag mb-2" style={{ color: "var(--color-silver)" }}>
          CATEGORY SCORES
        </p>
        <div className="space-y-2">
          {Object.entries(categories).map(([k, v]) => (
            <div key={k} className="surface-1 lift-1 p-3" style={{ borderRadius: 8 }}>
              <div className="flex justify-between">
                <span className="mono-tag" style={{ color: "var(--color-ink)" }}>
                  {k.replace(/_/g, " ").toUpperCase()}
                </span>
                <span className="mono-tag" style={{ color: "var(--color-neon)" }}>
                  {v}
                </span>
              </div>
              <div className="mt-1 h-1 rounded" style={{ background: "var(--color-hair)" }}>
                <div
                  className="h-1 rounded"
                  style={{
                    width: `${Math.max(0, Math.min(100, v))}%`,
                    background: "var(--color-neon)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {defects.length > 0 && (
        <section className="mt-6 px-5">
          <p className="mono-tag mb-2" style={{ color: "var(--color-silver)" }}>
            DETECTED ISSUES
          </p>
          <div className="space-y-1.5">
            {defects.map((d, i) => (
              <div
                key={i}
                className="surface-1 lift-1 p-3 flex items-start justify-between gap-3"
                style={{ borderRadius: 8 }}
              >
                <div>
                  <p className="text-[13px]" style={{ color: "var(--color-ink)" }}>
                    {d.note ?? d.type}
                  </p>
                  <p className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 10 }}>
                    {(d.type ?? "").toUpperCase()}
                  </p>
                </div>
                <span
                  className="chip mono-tag"
                  style={{
                    color:
                      d.severity === "major"
                        ? "#ff6b6b"
                        : d.severity === "moderate"
                          ? "#ffae42"
                          : "var(--color-silver)",
                    borderColor: "var(--color-hair-strong)",
                  }}
                >
                  {(d.severity ?? "minor").toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {highlights.length > 0 && (
        <section className="mt-6 px-5">
          <p className="mono-tag mb-2" style={{ color: "var(--color-silver)" }}>
            HIGHLIGHTS
          </p>
          <ul className="space-y-1 text-[13px]" style={{ color: "var(--color-ink)" }}>
            {highlights.map((h, i) => (
              <li key={i}>▸ {h}</li>
            ))}
          </ul>
        </section>
      )}

      {suggestions.length > 0 && (
        <section className="mt-6 px-5">
          <p className="mono-tag mb-2" style={{ color: "var(--color-silver)" }}>
            SUGGESTED IMPROVEMENTS
          </p>
          <ul className="space-y-1 text-[13px]" style={{ color: "var(--color-ink)" }}>
            {suggestions.map((s, i) => (
              <li key={i}>▸ {s}</li>
            ))}
          </ul>
        </section>
      )}

      {e.ai_comments && (
        <section className="mt-6 px-5">
          <p className="mono-tag mb-2" style={{ color: "var(--color-silver)" }}>
            JUDGE'S NOTES
          </p>
          <p className="text-[13px] whitespace-pre-wrap" style={{ color: "var(--color-ink)" }}>
            {e.ai_comments}
          </p>
        </section>
      )}

      {media.length > 0 && (
        <section className="mt-6 px-5">
          <p className="mono-tag mb-2" style={{ color: "var(--color-silver)" }}>
            MEDIA
          </p>
          <div className="grid grid-cols-2 gap-2">
            {media.map((m) => (
              <div
                key={m.id}
                className="aspect-square overflow-hidden"
                style={{ background: "var(--color-hair)", borderRadius: 8 }}
              >
                {urls[m.id] && (m.mime ?? "").startsWith("image/") && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urls[m.id]} alt={m.kind} className="h-full w-full object-cover" />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 px-5 print:hidden">
        <button
          onClick={() => window.print()}
          className="w-full py-3 mono-tag"
          style={{
            background: "var(--color-obsidian)",
            color: "var(--color-neon)",
            borderRadius: 8,
          }}
        >
          DOWNLOAD REPORT (PRINT / SAVE PDF)
        </button>
      </div>
    </div>
  );
}

function MiniStat({ label, v }: { label: string; v: number | null | undefined }) {
  return (
    <div className="surface-1 lift-1 p-2 text-center" style={{ borderRadius: 8 }}>
      <p className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 10 }}>
        {label.toUpperCase()}
      </p>
      <p className="serif text-xl italic" style={{ color: "var(--color-ink)" }}>
        {v ?? "—"}
      </p>
    </div>
  );
}
