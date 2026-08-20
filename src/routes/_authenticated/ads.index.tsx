import { formatMoney } from "@/lib/money";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listMyCampaigns, updateCampaignStatus } from "@/lib/ads.functions";
import { PullToRefresh } from "@/components/PullToRefresh";

export const Route = createFileRoute("/_authenticated/ads/")({
  head: () => ({ meta: [{ title: "Ads Manager · ZOMBIEREX" }] }),
  component: AdsManager,
});

function AdsManager() {
  const list = useServerFn(listMyCampaigns);
  const setStatus = useServerFn(updateCampaignStatus);
  const q = useQuery({ queryKey: ["ads", "my"], queryFn: () => list() });

  return (
    <PullToRefresh onRefresh={() => q.refetch()}>
      <div className="pb-32">
        <header className="flex items-start justify-between px-5 pt-8">
          <div>
            <p className="mono-tag" style={{ color: "var(--color-neon)" }}>
              ◆ ADS MANAGER
            </p>
            <h1 className="serif mt-2 text-3xl" style={{ color: "var(--color-ink)" }}>
              Campaigns
            </h1>
          </div>
          <Link
            to="/ads/new"
            className="tap px-4 py-2 text-[12px]"
            style={{
              background: "var(--color-neon)",
              color: "#000",
              borderRadius: 10,
              fontWeight: 600,
            }}
          >
            + New
          </Link>
        </header>

        <div className="mt-6 space-y-3 px-5">
          {q.isLoading && (
            <p className="mono-tag" style={{ color: "var(--color-silver)" }}>
              Loading…
            </p>
          )}
          {q.data?.length === 0 && (
            <div
              className="px-4 py-8 text-center"
              style={{
                background: "var(--color-graphite)",
                border: "1px solid var(--color-hair)",
                borderRadius: 12,
              }}
            >
              <p style={{ color: "var(--color-ink)" }}>No campaigns yet.</p>
              <p className="mono-tag mt-1" style={{ color: "var(--color-silver)" }}>
                Boost a post, promote a listing, or grow followers.
              </p>
            </div>
          )}
          {q.data?.map((c: any) => {
            const ctr = c.impressions_count > 0 ? (c.clicks_count / c.impressions_count) * 100 : 0;
            return (
              <article
                key={c.id}
                className="p-4"
                style={{
                  background: "var(--color-graphite)",
                  border: "1px solid var(--color-hair)",
                  borderRadius: 12,
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-[15px]" style={{ color: "var(--color-ink)" }}>
                      {c.name}
                    </h3>
                    <p
                      className="mono-tag mt-1"
                      style={{ color: "var(--color-silver)", fontSize: 9 }}
                    >
                      {c.objective.replace(/_/g, " ").toUpperCase()} ·{" "}
                      {(c.placements ?? []).join(" · ").toUpperCase()}
                    </p>
                  </div>
                  <span
                    className="mono-tag px-2 py-1"
                    style={{
                      color: c.status === "active" ? "var(--color-neon)" : "var(--color-silver)",
                      border: "1px solid var(--color-hair)",
                      borderRadius: 6,
                      fontSize: 9,
                    }}
                  >
                    {c.status.toUpperCase()}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  {[
                    { k: "Impr.", v: c.impressions_count ?? 0 },
                    { k: "Clicks", v: c.clicks_count ?? 0 },
                    { k: "CTR", v: `${ctr.toFixed(1)}%` },
                    { k: "Spent", v: formatMoney(c.spent_cents ?? 0) },
                  ].map((s) => (
                    <div
                      key={s.k}
                      className="py-2"
                      style={{ background: "var(--color-obsidian)", borderRadius: 8 }}
                    >
                      <p className="text-[13px]" style={{ color: "var(--color-ink)" }}>
                        {s.v}
                      </p>
                      <p className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 8 }}>
                        {s.k}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex gap-2">
                  {c.status === "active" ? (
                    <button
                      onClick={async () => {
                        await setStatus({ data: { id: c.id, status: "paused" } });
                        q.refetch();
                      }}
                      className="tap flex-1 px-3 py-2 text-[11px]"
                      style={{
                        border: "1px solid var(--color-hair)",
                        borderRadius: 8,
                        color: "var(--color-ink)",
                      }}
                    >
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        await setStatus({ data: { id: c.id, status: "active" } });
                        q.refetch();
                      }}
                      className="tap flex-1 px-3 py-2 text-[11px]"
                      style={{
                        background: "var(--color-neon)",
                        color: "#000",
                        borderRadius: 8,
                        fontWeight: 600,
                      }}
                    >
                      Activate
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      await setStatus({ data: { id: c.id, status: "completed" } });
                      q.refetch();
                    }}
                    className="tap flex-1 px-3 py-2 text-[11px]"
                    style={{
                      border: "1px solid var(--color-hair)",
                      borderRadius: 8,
                      color: "var(--color-silver)",
                    }}
                  >
                    Stop
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </PullToRefresh>
  );
}
