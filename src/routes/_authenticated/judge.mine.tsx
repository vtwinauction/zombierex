import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { judgeMyEntries } from "@/lib/judge.functions";

const mineQ = queryOptions({ queryKey: ["judge-mine"], queryFn: () => judgeMyEntries() });

export const Route = createFileRoute("/_authenticated/judge/mine")({
  head: () => ({
    meta: [{ title: "My Judge Entries · ZOMBIEREX" }, { name: "robots", content: "noindex" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(mineQ),
  component: MyEntries,
});

function MyEntries() {
  const { data } = useSuspenseQuery(mineQ);

  return (
    <div className="pb-24">
      <header className="px-5 pt-8">
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>
          ◆ MY ENTRIES
        </p>
        <h1 className="serif mt-2 text-3xl" style={{ color: "var(--color-ink)" }}>
          My submissions
        </h1>
      </header>

      <section className="mt-6 px-5">
        {data.length === 0 ? (
          <div className="p-6 surface-1 lift-1 text-center" style={{ borderRadius: 10 }}>
            <p className="text-[13px]" style={{ color: "var(--color-silver)" }}>
              No entries yet.
            </p>
            <Link
              to="/judge"
              className="chip mt-3 inline-block"
              style={{
                background: "var(--color-obsidian)",
                color: "var(--color-neon)",
                borderColor: "var(--color-obsidian)",
              }}
            >
              Browse events
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((e: any) => (
              <div key={e.id} className="p-4 surface-1 lift-1" style={{ borderRadius: 10 }}>
                <div className="flex justify-between">
                  <p className="serif text-[15px]" style={{ color: "var(--color-ink)" }}>
                    {e.display_name}
                  </p>
                  <span
                    className="mono-tag"
                    style={{
                      color:
                        e.status === "scored"
                          ? "var(--color-neon)"
                          : e.status === "processing"
                            ? "#ffae42"
                            : e.status === "failed" || e.status === "flagged"
                              ? "#ff6b6b"
                              : "var(--color-silver)",
                    }}
                  >
                    {e.status.toUpperCase()}
                  </span>
                </div>
                <p className="mono-tag mt-1" style={{ color: "var(--color-silver)", fontSize: 10 }}>
                  {e.judge_events?.title ?? "Event"} ·{" "}
                  {[e.year, e.make, e.model].filter(Boolean).join(" ")}
                </p>
                <div className="mt-2 flex gap-2">
                  {e.status === "scored" && (
                    <>
                      <span
                        className="serif text-2xl italic"
                        style={{ color: "var(--color-neon)" }}
                      >
                        {e.overall_score}
                      </span>
                      <Link
                        to="/judge/entries/$id"
                        params={{ id: e.id }}
                        className="chip"
                        style={{
                          borderColor: "var(--color-hair-strong)",
                          color: "var(--color-ink)",
                        }}
                      >
                        View report
                      </Link>
                    </>
                  )}
                  {e.status === "draft" && e.judge_events?.slug && (
                    <Link
                      to="/judge/submit/$eventSlug"
                      params={{ eventSlug: e.judge_events.slug }}
                      className="chip"
                      style={{
                        background: "var(--color-obsidian)",
                        color: "var(--color-neon)",
                        borderColor: "var(--color-obsidian)",
                      }}
                    >
                      Continue submission →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
