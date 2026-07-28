import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, TrendingUp, Eye, Heart, MessageCircle, Share2, Users, DollarSign } from "lucide-react";
import { getCreatorAnalytics } from "@/lib/creator.functions";
import { PullToRefresh } from "@/components/PullToRefresh";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/creator/analytics")({
  head: () => ({ meta: [{ title: "Creator Analytics · ZOMBIEREX" }] }),
  component: AnalyticsPage,
});

const PERIODS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

function fmtUSD(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtNum(n: number) { return n.toLocaleString(); }

function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const getAnalytics = useServerFn(getCreatorAnalytics);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["creator-analytics", days],
    queryFn: () => getAnalytics({ data: { days } }),
  });

  return (
    <PullToRefresh onRefresh={async () => { await refetch(); }}>
      <div className="pb-24">
        <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 hairline-b" style={{ background: "var(--color-bone)" }}>
          <Link to="/creator/dashboard" className="inline-flex h-9 w-9 items-center justify-center -ml-2" aria-label="Back">
            <ArrowLeft size={20} />
          </Link>
          <p className="mono-tag">ANALYTICS</p>
        </div>

        <div className="px-4 pt-6">
          <h1 className="serif text-3xl italic" style={{ color: "var(--color-ink)" }}>Audience Engine</h1>
          <p className="mono-tag mt-1" style={{ color: "var(--color-titanium)" }}>PERFORMANCE INTELLIGENCE</p>
        </div>

        <div className="px-4 pt-4">
          <div className="flex gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => setDays(p.days)}
                className="mono-tag tap rounded border px-3 py-2 text-xs font-bold"
                style={{
                  borderColor: "var(--color-hair-strong)",
                  background: days === p.days ? "var(--color-neon)" : "transparent",
                  color: days === p.days ? "#000" : "var(--color-ink)",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading && <p className="px-4 pt-6 mono-tag" style={{ color: "var(--color-titanium)" }}>LOADING…</p>}

        {!isLoading && !data && (
          <div className="mx-4 mt-6 border border-dashed p-6 text-center" style={{ borderColor: "var(--color-hair-strong)" }}>
            <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>CREATOR DATA NOT AVAILABLE</p>
            <Link to="/creator/apply" className="btn-neon mt-4 inline-block" style={{ padding: "10px 14px", fontSize: 11 }}>
              APPLY NOW ▸
            </Link>
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 gap-px mx-4 mt-6 border" style={{ borderColor: "var(--color-hair-strong)", background: "var(--color-hair)" }}>
              <Stat icon={<Eye size={14} />} label="VIEWS" value={fmtNum(data.totals.views)} />
              <Stat icon={<Heart size={14} />} label="LIKES" value={fmtNum(data.totals.likes)} />
              <Stat icon={<MessageCircle size={14} />} label="COMMENTS" value={fmtNum(data.totals.comments)} />
              <Stat icon={<Share2 size={14} />} label="SHARES" value={fmtNum(data.totals.shares)} />
              <Stat icon={<Users size={14} />} label="NEW SUBS" value={fmtNum(data.totals.subs)} />
              <Stat icon={<DollarSign size={14} />} label="TIPS" value={fmtUSD(data.totals.tips)} />
            </div>

            <Section title="ENGAGEMENT VELOCITY">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-neon)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="var(--color-neon)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--color-hair)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "var(--color-titanium)", fontSize: 10 }} tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--color-titanium)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "var(--color-paper-0)", border: "1px solid var(--color-hair-strong)", borderRadius: 8 }} itemStyle={{ color: "var(--color-ink)" }} />
                    <Area type="monotone" dataKey="views" stroke="var(--color-neon)" strokeWidth={2} fillOpacity={1} fill="url(#colorViews)" />
                    <Area type="monotone" dataKey="likes" stroke="#ff3b30" strokeWidth={2} fillOpacity={0} fill="transparent" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Section>

            <Section title="CONTENT & REVENUE">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="var(--color-hair)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "var(--color-titanium)", fontSize: 10 }} tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fill: "var(--color-titanium)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: "var(--color-titanium)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "var(--color-paper-0)", border: "1px solid var(--color-hair-strong)", borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 10, color: "var(--color-titanium)" }} />
                    <Bar yAxisId="left" dataKey="posts" name="Posts" fill="var(--color-titanium)" radius={[2,2,0,0]} />
                    <Bar yAxisId="right" dataKey="subs" name="Subs" fill="var(--color-neon)" radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>

            <Section title="TOP PERFORMING CONTENT">
              <div className="space-y-2">
                {data.top_posts.map((p: any, idx: number) => (
                  <div key={p.id} className="flex items-center gap-3 border p-2" style={{ borderColor: "var(--color-hair-strong)" }}>
                    <span className="mono-num w-6 text-center font-bold" style={{ color: "var(--color-neon)" }}>{idx + 1}</span>
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt="" className="h-12 w-12 rounded object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded" style={{ background: "var(--color-slate)" }} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm" style={{ color: "var(--color-ink)" }}>{p.caption || "Untitled"}</p>
                      <p className="mono-tag mt-0.5" style={{ color: "var(--color-titanium)" }}>
                        {fmtNum(p.views)} views · {fmtNum(p.likes)} likes · {fmtNum(p.comments)} comments
                      </p>
                    </div>
                  </div>
                ))}
                {data.top_posts.length === 0 && (
                  <p className="py-4 text-center text-xs" style={{ color: "var(--color-titanium)" }}>No posts in this period.</p>
                )}
              </div>
            </Section>

            <div className="mx-4 mt-6 border p-4" style={{ borderColor: "var(--color-hair-strong)", background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-center gap-2">
                <TrendingUp size={16} style={{ color: "var(--color-neon)" }} />
                <p className="mono-tag font-bold" style={{ color: "var(--color-titanium)" }}>LIFETIME METRICS</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>ALL-TIME POSTS</p>
                  <p className="mono-num text-xl font-bold" style={{ color: "var(--color-ink)" }}>{fmtNum(data.all_time_posts)}</p>
                </div>
                <div>
                  <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>CURRENT SUBSCRIBERS</p>
                  <p className="mono-num text-xl font-bold" style={{ color: "var(--color-ink)" }}>{fmtNum(data.profile.subscribers_count ?? 0)}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </PullToRefresh>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 pt-6">
      <p className="mono-tag font-bold" style={{ color: "var(--color-titanium)" }}>{title}</p>
      <div className="mt-2 border p-3" style={{ borderColor: "var(--color-hair-strong)", background: "rgba(255,255,255,0.02)" }}>
        {children}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-4">
      <div className="flex items-center gap-1.5" style={{ color: "var(--color-titanium)" }}>
        {icon}
        <p className="mono-tag">{label}</p>
      </div>
      <p className="mono-num mt-1 text-xl font-bold" style={{ color: "var(--color-ink)" }}>{value}</p>
    </div>
  );
}
