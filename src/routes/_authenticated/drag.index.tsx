/**
 * Drag Racing — hub with entry, my runs, leaderboards.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyDragRuns } from "@/lib/drag.functions";
import { PullToRefresh } from "@/components/PullToRefresh";

export const Route = createFileRoute("/_authenticated/drag/")({
  head: () => ({
    meta: [
      { title: "Drag Racing · ZOMBIEREX" },
      {
        name: "description",
        content: "GPS-verified drag runs — 0-60, 0-100, 60-120, 1/8 mile, 1/4 mile and top speed.",
      },
    ],
  }),
  component: DragHub,
});

const STATUS: Record<string, { label: string; color: string }> = {
  verified: { label: "VERIFIED", color: "var(--color-neon)" },
  pending: { label: "PENDING", color: "var(--color-silver)" },
  flagged: { label: "FLAGGED", color: "#ff8c1a" },
  rejected: { label: "REJECTED", color: "#ff4d4d" },
};

function DragHub() {
  const listFn = useServerFn(listMyDragRuns);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["drag", "mine"],
    queryFn: () => listFn(),
    staleTime: 10_000,
  });
  const runs = data ?? [];

  return (
    <PullToRefresh onRefresh={() => refetch()}>
      <div className="min-h-svh pb-24">
        <div className="px-4 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="serif text-3xl" style={{ color: "var(--color-ink)" }}>
                Drag Racing
              </h1>
              <p className="mt-1 text-sm" style={{ color: "var(--color-ink-3)" }}>
                GPS-verified runs · anti-cheat validation · permanent record
              </p>
            </div>
            <Link
              to="/drag/run"
              search={{ step: undefined }}
              className="tap mono-caps text-[10px] font-black"
              style={{
                padding: "10px 14px",
                background: "var(--color-neon)",
                color: "var(--color-obsidian)",
              }}
            >
              + NEW RUN
            </Link>
          </div>

          <Link
            to="/drag/challenge"
            className="tap mt-4 block overflow-hidden rounded-2xl border p-4"
            style={{
              borderColor: "rgba(0,200,83,0.5)",
              background: "linear-gradient(120deg,#050505,#0f2015)",
              boxShadow: "0 12px 32px rgba(0,200,83,0.22)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="mono-caps text-[10px] font-black"
                  style={{ color: "#00c853", letterSpacing: "0.24em" }}
                >
                  ◆ CHALLENGE A RIDER · LIVE
                </p>
                <h2 className="serif mt-1 text-2xl" style={{ color: "#f5f5f5" }}>
                  Real rider vs real rider
                </h2>
                <p className="mt-1 text-xs" style={{ color: "#c0c0c0" }}>
                  Send a challenge, both accept, synchronized green light, live GPS in both lanes.
                </p>
              </div>
              <span
                className="mono-caps text-[10px] font-black"
                style={{ color: "#050505", background: "#00c853", padding: "10px 14px" }}
              >
                ▶ RACE
              </span>
            </div>
          </Link>

          <Link
            to="/drag/race"
            className="tap mt-3 block overflow-hidden rounded-2xl border p-3"
            style={{ borderColor: "var(--color-hair)", background: "var(--color-graphite)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="mono-caps text-[10px] font-black"
                  style={{ color: "var(--color-silver)", letterSpacing: "0.24em" }}
                >
                  ◇ PRACTICE · SOLO
                </p>
                <p className="mt-1 text-sm font-bold" style={{ color: "var(--color-ink)" }}>
                  Race an AI ghost opponent
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--color-ink-3)" }}>
                  Christmas Tree · dual HUD · AI race analysis
                </p>
              </div>
              <span className="mono-caps text-[10px]" style={{ color: "var(--color-silver)" }}>
                PRACTICE
              </span>
            </div>
          </Link>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              to="/drag/leaderboards"
              search={{ kind: "motorcycle", metric: "quarter_mile_s" }}
              className="tap rounded-lg border p-4"
              style={{ borderColor: "var(--color-hair)", background: "var(--color-graphite)" }}
            >
              <p className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 9 }}>
                LEADERBOARD
              </p>
              <p className="mt-1 text-sm font-bold" style={{ color: "var(--color-ink)" }}>
                Motorcycles
              </p>
            </Link>
            <Link
              to="/drag/leaderboards"
              search={{ kind: "car", metric: "quarter_mile_s" }}
              className="tap rounded-lg border p-4"
              style={{ borderColor: "var(--color-hair)", background: "var(--color-graphite)" }}
            >
              <p className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 9 }}>
                LEADERBOARD
              </p>
              <p className="mt-1 text-sm font-bold" style={{ color: "var(--color-ink)" }}>
                Cars
              </p>
            </Link>
          </div>

          <h2
            className="mono-caps mt-6 text-[10px] font-black"
            style={{ color: "var(--color-silver)" }}
          >
            MY RUNS
          </h2>
          <div className="mt-2 space-y-2">
            {isLoading && (
              <div
                className="rounded-lg border border-dashed p-8 text-center text-sm"
                style={{ borderColor: "var(--color-hair-strong)", color: "var(--color-ink-3)" }}
              >
                Loading runs…
              </div>
            )}
            {error && !isLoading && (
              <div
                className="rounded-lg border border-dashed p-8 text-center text-sm"
                style={{ borderColor: "#ff4d4d55", color: "#ff8c8c" }}
              >
                {(error as Error)?.message ?? "Could not load runs"}
              </div>
            )}
            {!isLoading && !error && runs.length === 0 && (
              <div
                className="rounded-lg border border-dashed p-8 text-center text-sm"
                style={{ borderColor: "var(--color-hair-strong)", color: "var(--color-ink-3)" }}
              >
                No runs yet. Tap <b>NEW RUN</b> to record your first verified drag.
              </div>
            )}
            {runs.map((r: any) => {
              const s = STATUS[r.status] ?? STATUS.pending;
              return (
                <Link
                  key={r.id}
                  to="/drag/$id"
                  params={{ id: r.id }}
                  className="tap block rounded-lg border p-3"
                  style={{ borderColor: "var(--color-hair)", background: "var(--color-graphite)" }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>
                      {r.vehicle_name || (r.vehicle_kind === "motorcycle" ? "Motorcycle" : "Car")}
                    </p>
                    <span
                      className="mono-tag"
                      style={{ color: s.color, fontSize: 9, fontWeight: 800 }}
                    >
                      {s.label}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                    <Cell
                      label="1/4 MI"
                      value={r.quarter_mile_s ? `${Number(r.quarter_mile_s).toFixed(3)}s` : "—"}
                    />
                    <Cell
                      label="0-100"
                      value={
                        r.zero_to_100_kmh_s ? `${Number(r.zero_to_100_kmh_s).toFixed(2)}s` : "—"
                      }
                    />
                    <Cell
                      label="TOP"
                      value={r.top_speed_kmh ? `${Math.round(Number(r.top_speed_kmh))}` : "—"}
                    />
                    <Cell
                      label="SCORE"
                      value={
                        r.verification_score ? `${Math.round(Number(r.verification_score))}` : "—"
                      }
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </PullToRefresh>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mono-num text-sm font-bold" style={{ color: "var(--color-ink)" }}>
        {value}
      </p>
      <p className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 8 }}>
        {label}
      </p>
    </div>
  );
}
