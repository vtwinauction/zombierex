import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCreatorDashboard, listMyTiers } from "@/lib/creator.functions";
import { PullToRefresh } from "@/components/PullToRefresh";

export const Route = createFileRoute("/_authenticated/creator/dashboard")({
  head: () => ({ meta: [{ title: "Creator Dashboard · ZOMBIEREX" }] }),
  component: DashboardPage,
});

function fmtUSD(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtNum(n: number) {
  return n.toLocaleString();
}
function fmtPct(x: number) {
  return `${(x * 100).toFixed(1)}%`;
}

function DashboardPage() {
  const getDash = useServerFn(getCreatorDashboard);
  const listTiers = useServerFn(listMyTiers);
  const {
    data: dash,
    isLoading,
    refetch: refetchDash,
  } = useQuery({ queryKey: ["creator-dashboard"], queryFn: () => getDash() });
  const { data: tiers, refetch: refetchTiers } = useQuery({
    queryKey: ["my-tiers"],
    queryFn: () => listTiers(),
  });

  return (
    <PullToRefresh
      onRefresh={async () => {
        await Promise.all([refetchDash(), refetchTiers()]);
      }}
    >
      <div className="pb-24">
        <div className="flex items-end justify-between px-4 pt-6">
          <div>
            <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
              LAST 30 DAYS
            </p>
            <h1 className="serif mt-2 text-4xl italic" style={{ color: "var(--color-ink)" }}>
              Dashboard
            </h1>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Link
              to="/creator/analytics"
              className="btn-neon"
              style={{ padding: "10px 12px", fontSize: 10 }}
            >
              ANALYTICS ▸
            </Link>
            <Link
              to="/creator/payouts"
              className="btn-neon"
              style={{ padding: "10px 12px", fontSize: 10 }}
            >
              PAYOUTS ▸
            </Link>
            <Link
              to="/creator/scheduled"
              className="btn-neon"
              style={{ padding: "10px 12px", fontSize: 10 }}
            >
              QUEUE ▸
            </Link>
            <Link
              to="/creator/collabs"
              className="btn-neon"
              style={{ padding: "10px 12px", fontSize: 10 }}
            >
              INBOX ▸
            </Link>
          </div>
        </div>

        {isLoading && (
          <p className="px-4 pt-6 mono-tag" style={{ color: "var(--color-titanium)" }}>
            LOADING…
          </p>
        )}

        {!isLoading && !dash && (
          <div
            className="mx-4 mt-6 border border-dashed p-6 text-center"
            style={{ borderColor: "var(--color-hair-strong)" }}
          >
            <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
              NOT A CREATOR YET
            </p>
            <Link
              to="/creator/apply"
              className="btn-neon mt-4 inline-block"
              style={{ padding: "10px 14px", fontSize: 11 }}
            >
              APPLY NOW ▸
            </Link>
          </div>
        )}

        {dash && (
          <>
            {(dash as any).profile.status !== "approved" && (
              <div
                className="mx-4 mt-4 border p-3"
                style={{
                  borderColor: "var(--color-hair-strong)",
                  background: "rgba(255,200,0,0.05)",
                }}
              >
                <p className="mono-tag font-bold" style={{ color: "#ffc800" }}>
                  STATUS · {String((dash as any).profile.status).toUpperCase()} — Some features
                  locked until approved.
                </p>
              </div>
            )}

            <div
              className="grid grid-cols-2 gap-px mx-4 mt-6 border"
              style={{ borderColor: "var(--color-hair-strong)", background: "var(--color-hair)" }}
            >
              <Stat label="EARNINGS · TIPS" value={fmtUSD((dash as any).tips_cents_last_30d)} />
              <Stat
                label="LIFETIME TIPS"
                value={fmtUSD((dash as any).profile.tips_total_cents ?? 0)}
              />
              <Stat label="NEW SUBSCRIBERS" value={fmtNum((dash as any).new_subscribers)} />
              <Stat
                label="ACTIVE SUBS"
                value={fmtNum((dash as any).profile.subscribers_count ?? 0)}
              />
              <Stat label="VIEWS" value={fmtNum((dash as any).total_views)} />
              <Stat label="ENGAGEMENT" value={fmtPct((dash as any).engagement_rate)} />
              <Stat label="LIKES" value={fmtNum((dash as any).total_likes)} />
              <Stat label="COMMENTS" value={fmtNum((dash as any).total_comments)} />
            </div>

            <div className="px-4 pt-6">
              <p className="mono-tag font-bold" style={{ color: "var(--color-titanium)" }}>
                INSIGHTS
              </p>
              <div
                className="mt-2 border p-4 space-y-2 text-sm"
                style={{
                  borderColor: "var(--color-hair-strong)",
                  background: "rgba(255,255,255,0.02)",
                  color: "var(--color-ink)",
                }}
              >
                <p>
                  Best posting hour (UTC):{" "}
                  <span className="mono-num font-bold" style={{ color: "var(--color-neon)" }}>
                    {(dash as any).best_hour_utc !== null
                      ? `${String((dash as any).best_hour_utc).padStart(2, "0")}:00`
                      : "—"}
                  </span>
                </p>
                <p>
                  Posts in period:{" "}
                  <span className="mono-num font-bold">
                    {fmtNum((dash as any).recent_post_count)}
                  </span>
                </p>
                <p>
                  Collab inbox unread:{" "}
                  <span className="mono-num font-bold" style={{ color: "var(--color-neon)" }}>
                    {fmtNum((dash as any).collab_inbox_unread)}
                  </span>
                </p>
              </div>
            </div>

            <div className="px-4 pt-6">
              <div className="flex items-center justify-between">
                <p className="mono-tag font-bold" style={{ color: "var(--color-titanium)" }}>
                  SUBSCRIPTION TIERS
                </p>
                <Link
                  to="/creator/tiers"
                  className="mono-tag font-bold"
                  style={{ color: "var(--color-neon)" }}
                >
                  MANAGE ▸
                </Link>
              </div>
              <div className="mt-2 space-y-2">
                {(tiers ?? []).length === 0 && (
                  <div
                    className="border border-dashed p-3 text-center"
                    style={{ borderColor: "var(--color-hair-strong)" }}
                  >
                    <p className="text-xs" style={{ color: "var(--color-silver)" }}>
                      No tiers yet.
                    </p>
                  </div>
                )}
                {(tiers ?? []).map((t: any) => (
                  <div
                    key={t.id}
                    className="border p-3 flex items-center justify-between"
                    style={{
                      borderColor: "var(--color-hair-strong)",
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>
                        {t.name}
                      </p>
                      <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
                        {t.subscribers_count ?? 0} SUBS
                      </p>
                    </div>
                    <p className="mono-num font-bold" style={{ color: "var(--color-neon)" }}>
                      {fmtUSD(t.price_cents)}/mo
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-4 pt-6">
              <p className="mono-tag font-bold" style={{ color: "var(--color-titanium)" }}>
                TOP POSTS
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {((dash as any).top_posts as any[]).map((p) => (
                  <div
                    key={p.id}
                    className="border overflow-hidden"
                    style={{ borderColor: "var(--color-hair-strong)" }}
                  >
                    {p.cover_url ? (
                      <img
                        src={p.cover_url}
                        className="h-32 w-full object-cover"
                        style={{ filter: "grayscale(0.2)" }}
                      />
                    ) : (
                      <div className="h-32 w-full" style={{ background: "var(--color-slate)" }} />
                    )}
                    <div className="p-2">
                      <p className="text-xs truncate" style={{ color: "var(--color-ink)" }}>
                        {p.caption ?? "—"}
                      </p>
                      <p className="mono-tag mt-1" style={{ color: "var(--color-titanium)" }}>
                        {fmtNum(p.likes_count ?? 0)} ♥ · {fmtNum(p.views_count ?? 0)} ▶
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </PullToRefresh>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4">
      <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
        {label}
      </p>
      <p className="mono-num mt-1 text-xl font-bold" style={{ color: "var(--color-ink)" }}>
        {value}
      </p>
    </div>
  );
}
