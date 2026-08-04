import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { judgeGetLeaderboard } from "@/lib/judge.functions";

const boardQ = (scope: any, key: string | undefined) =>
  queryOptions({
    queryKey: ["judge-board", scope, key ?? ""],
    queryFn: () => judgeGetLeaderboard({ data: { scope, scope_key: key, limit: 100 } }),
  });

export const Route = createFileRoute("/judge/leaderboards")({
  head: () => ({
    meta: [
      { title: "Judge Leaderboards · ZOMBIEREX" },
      { name: "description", content: "Global rankings from AI-judged motorcycle & car shows." },
      { property: "og:title", content: "Judge Leaderboards · ZOMBIEREX" },
      {
        property: "og:description",
        content: "Global rankings from AI-judged motorcycle & car shows.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(boardQ("global", undefined)),
  component: Leaderboards,
});

const SCOPES = [
  { key: "global", label: "Global" },
  { key: "event", label: "By event" },
  { key: "country", label: "Country" },
  { key: "city", label: "City" },
  { key: "vehicle_type", label: "Type" },
  { key: "brand", label: "Brand" },
  { key: "model", label: "Model" },
  { key: "engine_size", label: "Engine" },
] as const;

function Leaderboards() {
  const [scope, setScope] = useState<(typeof SCOPES)[number]["key"]>("global");
  const [key, setKey] = useState<string>("");
  const { data } = useSuspenseQuery(boardQ(scope, key || undefined));

  return (
    <div className="pb-24">
      <header className="px-5 pt-8">
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>
          ◆ LEADERBOARDS
        </p>
        <h1 className="serif mt-2 text-3xl leading-tight" style={{ color: "var(--color-ink)" }}>
          Rankings{" "}
          <span className="italic" style={{ color: "var(--color-neon)" }}>
            by scope
          </span>
        </h1>
      </header>

      <nav className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-5">
        {SCOPES.map((s) => (
          <button
            key={s.key}
            onClick={() => {
              setScope(s.key);
              setKey("");
            }}
            className="chip shrink-0"
            style={{
              background: scope === s.key ? "var(--color-obsidian)" : "transparent",
              color: scope === s.key ? "var(--color-neon)" : "var(--color-silver)",
              borderColor: scope === s.key ? "var(--color-obsidian)" : "var(--color-hair-strong)",
            }}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {scope !== "global" && (
        <div className="mt-3 px-5">
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={`Filter by ${scope.replace("_", " ")}`}
            className="w-full px-3 py-2 text-[13px]"
            style={{
              background: "var(--color-graphite)",
              border: "1px solid var(--color-hair)",
              borderRadius: 8,
              color: "var(--color-ink)",
            }}
          />
        </div>
      )}

      <section className="mt-4 px-5">
        {data.length === 0 ? (
          <div className="p-6 surface-1 lift-1 text-center" style={{ borderRadius: 10 }}>
            <p className="text-[13px]" style={{ color: "var(--color-silver)" }}>
              No rankings for this filter yet.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {data.map((r) => (
              <Link
                key={`${r.entry_id}-${r.rank}`}
                to="/judge/entries/$id"
                params={{ id: r.entry_id }}
                className="tap flex items-center justify-between px-4 py-3 surface-1 lift-1"
                style={{ borderRadius: 10 }}
              >
                <div className="flex items-center gap-3">
                  <span className="mono-tag" style={{ color: "var(--color-neon)", width: 28 }}>
                    #{r.rank}
                  </span>
                  <div>
                    <p className="text-[13px]" style={{ color: "var(--color-ink)" }}>
                      {r.entry?.display_name ?? "Entry"}
                    </p>
                    <p className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 10 }}>
                      {[r.entry?.year, r.entry?.make, r.entry?.model].filter(Boolean).join(" ")}
                    </p>
                  </div>
                </div>
                <span className="serif text-xl italic" style={{ color: "var(--color-ink)" }}>
                  {r.score}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
