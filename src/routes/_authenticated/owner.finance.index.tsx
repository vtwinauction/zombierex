import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { getRevenueOverview } from "@/lib/finance.functions";
import { formatMoney } from "@/lib/commission";

export const Route = createFileRoute("/_authenticated/owner/finance/")({
  head: () => ({
    meta: [
      { title: "Finance Overview — ZOMBIEREX Owner" },
      { name: "description", content: "Revenue, commissions and ledger overview for the ZOMBIEREX platform." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Finance Overview — ZOMBIEREX Owner" },
      { property: "og:description", content: "Revenue, commissions and ledger overview for the ZOMBIEREX platform." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const fetchOverview = useServerFn(getRevenueOverview);
  const q = useQuery({
    queryKey: ["finance", "overview", 30],
    queryFn: () => fetchOverview({ data: { days: 30 } }),
    refetchInterval: 60_000,
  });

  if (q.isLoading) return <p className="p-6 text-sm opacity-60">Loading revenue…</p>;
  if (q.isError)
    return (
      <p className="p-6 text-sm" style={{ color: "var(--color-heat)" }}>
        {(q.error as Error).message}
      </p>
    );
  const d = q.data!;

  function exportCsv() {
    const header = "day,gmv_cents,commission_cents,transactions";
    const body = d.series.map((s) => `${s.day},${s.gross},${s.fees},${s.count}`).join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zombierex-revenue-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 p-5">
      <div className="grid grid-cols-2 gap-3">
        <Kpi
          label="Commission earned (all time)"
          value={formatMoney(d.totals.commission_cents)}
          accent
        />
        <Kpi label="Gross volume (GMV)" value={formatMoney(d.totals.gmv_cents)} />
        <Kpi label="Today's commission" value={formatMoney(d.today.commission_cents)} />
        <Kpi label="This month" value={formatMoney(d.month.commission_cents)} />
        <Kpi label="This year" value={formatMoney(d.year.commission_cents)} />
        <Kpi label="Avg per transaction" value={formatMoney(d.totals.avg_commission_cents)} />
        <Kpi
          label="Effective take rate"
          value={`${(d.totals.effective_take_bps / 100).toFixed(2)}%`}
        />
        <Kpi label="Payouts pending" value={formatMoney(d.totals.payouts_pending_cents)} />
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Mini label="OK" value={d.counts.succeeded} />
        <Mini label="PENDING" value={d.counts.pending} />
        <Mini label="FAILED" value={d.counts.failed} />
        <Mini label="REFUND" value={d.counts.refunded} />
      </div>

      <section className="card-surface p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm tracking-widest opacity-70">COMMISSION · 30 DAYS</h2>
          <button onClick={exportCsv} className="btn-ghost text-[10px]">
            Export CSV
          </button>
        </div>
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={d.series.map((s) => ({ ...s, fees: s.fees / 100, gross: s.gross / 100 }))}
            >
              <defs>
                <linearGradient id="feeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00c853" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#00c853" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="day" hide />
              <YAxis width={38} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
              <Tooltip
                contentStyle={{
                  background: "#0b0b0b",
                  border: "1px solid rgba(255,255,255,0.1)",
                  fontSize: 11,
                }}
                formatter={(v: any, n: any) => [
                  `$${Number(v).toFixed(2)}`,
                  n === "fees" ? "Commission" : "GMV",
                ]}
              />
              <Area
                type="monotone"
                dataKey="fees"
                stroke="#00c853"
                fill="url(#feeGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card-surface p-4">
        <h2 className="mb-3 text-sm tracking-widest opacity-70">REVENUE BY STREAM</h2>
        {d.byKind.length === 0 ? (
          <p className="text-xs opacity-50">No settled transactions yet.</p>
        ) : (
          <div style={{ height: 170 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.byKind.map((k) => ({ ...k, fees: k.fees / 100 }))}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="kind" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.5)" }} />
                <YAxis width={38} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
                <Tooltip
                  contentStyle={{
                    background: "#0b0b0b",
                    border: "1px solid rgba(255,255,255,0.1)",
                    fontSize: 11,
                  }}
                  formatter={(v: any) => [`$${Number(v).toFixed(2)}`, "Commission"]}
                />
                <Bar dataKey="fees" fill="#00c853" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <p className="mono-tag text-[10px] opacity-40">
        Updated {new Date(d.generatedAt).toLocaleTimeString()} · net to sellers{" "}
        {formatMoney(d.totals.net_to_sellers_cents)}
      </p>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card-surface p-4">
      <p className="mono-tag text-[10px] opacity-60">{label}</p>
      <p
        className="display-xl mt-1 text-2xl tabular-nums"
        style={{ color: accent ? "#00c853" : "var(--color-ink)" }}
      >
        {value}
      </p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="card-surface p-3 text-center">
      <p className="mono-tag text-[9px] opacity-50">{label}</p>
      <p className="mt-0.5 text-lg tabular-nums">{value}</p>
    </div>
  );
}
