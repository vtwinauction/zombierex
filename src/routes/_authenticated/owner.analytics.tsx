import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { checkOwner, getOwnerAnalytics } from "@/lib/owner.functions";

export const Route = createFileRoute("/_authenticated/owner/analytics")({
  head: () => ({
    meta: [
      { title: "Owner Analytics · ZOMBIEREX" },
      { name: "description", content: "30-day platform analytics — event volume, top events, and daily trend." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Owner Analytics · ZOMBIEREX" },
      { property: "og:description", content: "Platform-wide 30-day analytics dashboard." },
    ],
  }),
  component: AnalyticsView,
});

function AnalyticsView() {
  const check = useServerFn(checkOwner);
  const fetchAnalytics = useServerFn(getOwnerAnalytics);

  const gate = useQuery({
    queryKey: ["owner", "gate"],
    queryFn: () => check({ data: undefined as any }),
    retry: false,
  });

  const analytics = useQuery({
    queryKey: ["owner", "analytics"],
    queryFn: () => fetchAnalytics({ data: undefined as any }),
    enabled: !!gate.data?.isOwner,
    refetchInterval: 60_000,
  });

  if (gate.isLoading) return <div className="p-6 text-sm opacity-60">Verifying…</div>;
  if (!gate.data?.isOwner) {
    return (
      <div className="p-8 text-center">
        <p className="mono-tag" style={{ color: "var(--color-heat)" }}>ERR·403</p>
        <h1 className="mt-2 text-2xl display-xl">OWNER CLEARANCE REQUIRED</h1>
        <Link to="/" className="btn-ghost mt-6 inline-flex">Return home</Link>
      </div>
    );
  }

  const d = analytics.data;
  const maxCount = d ? Math.max(1, ...d.series.map((p) => p.count)) : 1;

  return (
    <div className="pb-24">
      <div className="border-b px-5 py-4" style={{ borderColor: "var(--color-hair)" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="mono-tag" style={{ color: "#00c853" }}>ROOT · TELEMETRY</p>
            <h1 className="display-xl text-xl">Platform Analytics · 30d</h1>
          </div>
          <Link to="/owner" className="btn-ghost text-xs">← Owner</Link>
        </div>
      </div>

      {analytics.isLoading && <p className="p-6 text-sm opacity-60">Loading analytics…</p>}
      {analytics.isError && (
        <p className="p-6 text-sm" style={{ color: "var(--color-heat)" }}>
          Failed to load analytics: {(analytics.error as Error).message}
        </p>
      )}

      {d && (
        <div className="p-5 space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Total Events (30d)" value={d.totalEvents.toLocaleString()} />
            <KpiCard label="Unique Users (30d)" value={d.uniqueUsers.toLocaleString()} />
          </div>

          {/* Daily trend */}
          <section className="card-surface p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm tracking-widest opacity-70">DAILY EVENT VOLUME</h2>
              <span className="mono-tag text-[10px] opacity-50">
                Updated {new Date(d.generatedAt).toLocaleTimeString()}
              </span>
            </div>
            <div className="flex h-40 items-end gap-1">
              {d.series.map((p) => (
                <div key={p.day} className="group relative flex-1" title={`${p.day}: ${p.count}`}>
                  <div
                    className="w-full rounded-t transition-all"
                    style={{
                      height: `${(p.count / maxCount) * 100}%`,
                      minHeight: p.count > 0 ? 2 : 0,
                      background: "linear-gradient(to top, rgba(0,200,83,0.4), #00c853)",
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] opacity-40 mono-tag">
              <span>{d.series[0]?.day}</span>
              <span>{d.series[d.series.length - 1]?.day}</span>
            </div>
          </section>

          {/* Top events */}
          <section className="card-surface p-4">
            <h2 className="mb-3 text-sm tracking-widest opacity-70">TOP EVENTS</h2>
            {d.topEvents.length === 0 ? (
              <p className="text-xs opacity-50">No events captured in the last 30 days.</p>
            ) : (
              <ul className="space-y-2">
                {d.topEvents.map((e) => {
                  const pct = (e.count / d.topEvents[0].count) * 100;
                  return (
                    <li key={e.event}>
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="font-medium">{e.event}</span>
                        <span className="tabular-nums opacity-70">{e.count.toLocaleString()}</span>
                      </div>
                      <div
                        className="mt-1 h-1 rounded"
                        style={{ background: "rgba(0,200,83,0.1)" }}
                      >
                        <div
                          className="h-full rounded"
                          style={{ width: `${pct}%`, background: "#00c853" }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-surface p-4">
      <p className="mono-tag text-[10px] opacity-60">{label}</p>
      <p className="mt-1 display-xl text-2xl tabular-nums" style={{ color: "#00c853" }}>
        {value}
      </p>
    </div>
  );
}
