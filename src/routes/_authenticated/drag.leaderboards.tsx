/**
 * Drag — Leaderboards. Filter by kind + metric.
 */
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { listDragLeaderboard } from "@/lib/drag.functions";

const Search = z.object({
  kind: z.enum(["motorcycle", "car"]).default("motorcycle"),
  metric: z
    .enum(["quarter_mile_s", "zero_to_100_kmh_s", "eighth_mile_s", "top_speed_kmh"])
    .default("quarter_mile_s"),
});

export const Route = createFileRoute("/_authenticated/drag/leaderboards")({
  head: () => ({
    meta: [
      { title: "Drag leaderboards · ZOMBIEREX" },
      { name: "description", content: "Fastest verified drag runs on ZOMBIEREX — bikes and cars." },
    ],
  }),
  validateSearch: (s) => Search.parse(s),
  loaderDeps: ({ search }) => search,
  loader: ({ deps, context }) =>
    context.queryClient.ensureQueryData(
      queryOptions({
        queryKey: ["drag", "board", deps.kind, deps.metric],
        queryFn: () => listDragLeaderboard({ data: deps }),
      }),
    ),
  component: Board,
});

const METRIC_LABELS: Record<string, string> = {
  quarter_mile_s: "1/4 mile",
  eighth_mile_s: "1/8 mile",
  zero_to_100_kmh_s: "0–100 km/h",
  top_speed_kmh: "Top speed",
};

function Board() {
  const search = Route.useSearch();
  const nav = Route.useNavigate();
  const { data } = useSuspenseQuery(
    queryOptions({
      queryKey: ["drag", "board", search.kind, search.metric],
      queryFn: () => listDragLeaderboard({ data: search }),
    }),
  );
  const rows = data as any[];

  return (
    <div className="min-h-svh pb-24">
      <div className="px-4 pt-4">
        <h1 className="serif text-3xl" style={{ color: "var(--color-ink)" }}>
          Leaderboards
        </h1>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["motorcycle", "car"] as const).map((k) => (
            <button
              key={k}
              onClick={() => nav({ search: { ...search, kind: k } })}
              className="tap rounded-lg border py-2 text-sm font-bold"
              style={{
                borderColor: search.kind === k ? "var(--color-neon)" : "var(--color-hair)",
                background:
                  search.kind === k
                    ? "color-mix(in oklab, var(--color-neon) 12%, var(--color-graphite))"
                    : "var(--color-graphite)",
                color: "var(--color-ink)",
              }}
            >
              {k === "motorcycle" ? "Bikes" : "Cars"}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.entries(METRIC_LABELS).map(([m, l]) => (
            <button
              key={m}
              onClick={() => nav({ search: { ...search, metric: m as any } })}
              className="tap rounded-full border px-3 py-1 text-xs"
              style={{
                borderColor: search.metric === m ? "var(--color-neon)" : "var(--color-hair)",
                color: search.metric === m ? "var(--color-neon)" : "var(--color-ink-3)",
              }}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {rows.length === 0 && (
            <div
              className="rounded-lg border border-dashed p-8 text-center text-sm"
              style={{ borderColor: "var(--color-hair-strong)", color: "var(--color-ink-3)" }}
            >
              No verified runs yet for this category.
            </div>
          )}
          {rows.map((r, i) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-lg border p-3"
              style={{ borderColor: "var(--color-hair)", background: "var(--color-graphite)" }}
            >
              <div
                className="mono-num text-lg font-bold"
                style={{ color: i < 3 ? "var(--color-neon)" : "var(--color-silver)", minWidth: 28 }}
              >
                {i + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>
                  {r.vehicle_name || (r.vehicle_kind === "motorcycle" ? "Motorcycle" : "Car")}
                </p>
                <p className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 9 }}>
                  {r.engine_cc ? `${r.engine_cc}cc` : ""}{" "}
                  {r.aspiration ? String(r.aspiration).toUpperCase() : ""}{" "}
                  {r.fuel_type ? String(r.fuel_type).toUpperCase() : ""}
                </p>
              </div>
              <div className="mono-num text-right font-bold" style={{ color: "var(--color-ink)" }}>
                {r[search.metric] != null
                  ? `${Number(r[search.metric]).toFixed(search.metric === "top_speed_kmh" ? 1 : 3)}${search.metric === "top_speed_kmh" ? " km/h" : "s"}`
                  : "—"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
