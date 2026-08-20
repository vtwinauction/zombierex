import { formatMoney } from "@/lib/money";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getBusinessDashboard } from "@/lib/business.functions";

export const Route = createFileRoute("/_authenticated/business/")({
  head: () => ({ meta: [{ title: "Business dashboard · ZOMBIEREX" }] }),
  component: BusinessDashboard,
});

function BusinessDashboard() {
  const fn = useServerFn(getBusinessDashboard);
  const q = useQuery({ queryKey: ["business", "dashboard"], queryFn: () => fn() });

  if (q.isLoading)
    return (
      <p className="p-8 mono-tag" style={{ color: "var(--color-silver)" }}>
        Loading…
      </p>
    );
  if (!q.data?.vendor) {
    return (
      <div className="px-5 pt-16 text-center">
        <h1 className="serif text-2xl" style={{ color: "var(--color-ink)" }}>
          No business profile yet
        </h1>
        <p className="mt-2 text-[13px]" style={{ color: "var(--color-silver)" }}>
          Apply as a vendor to unlock analytics, showcase, and ads.
        </p>
        <Link
          to="/vendor/apply"
          className="tap mt-6 inline-block px-4 py-2 text-[12px]"
          style={{
            background: "var(--color-neon)",
            color: "#000",
            borderRadius: 10,
            fontWeight: 600,
          }}
        >
          Apply as vendor
        </Link>
      </div>
    );
  }

  const { vendor, insights, ads, recent_activity } = q.data;
  const ctr = ads.impressions > 0 ? (ads.clicks / ads.impressions) * 100 : 0;
  const spent = formatMoney(ads.spent_cents);
  const budget = formatMoney(ads.budget_cents);

  return (
    <div className="pb-32">
      <header className="px-5 pt-8">
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>
          ◆ BUSINESS
        </p>
        <h1 className="serif mt-2 text-3xl" style={{ color: "var(--color-ink)" }}>
          {vendor.business_name}
        </h1>
        <p className="mono-tag mt-1" style={{ color: "var(--color-silver)" }}>
          {vendor.is_verified ? "VERIFIED" : "PENDING"} ·{" "}
          {vendor.is_premium ? "PREMIUM" : "STANDARD"}
        </p>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 px-5">
        {[
          { k: "Followers", v: insights.followers },
          { k: "Profile views", v: insights.profile_views },
          { k: "Reviews", v: `${insights.review_count} · ${insights.avg_rating || "–"}★` },
          { k: "Engagement", v: insights.post_engagement },
        ].map((s) => (
          <div
            key={s.k}
            className="p-4"
            style={{
              background: "var(--color-graphite)",
              border: "1px solid var(--color-hair)",
              borderRadius: 12,
            }}
          >
            <p className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 9 }}>
              {s.k.toUpperCase()}
            </p>
            <p className="serif mt-1 text-2xl" style={{ color: "var(--color-ink)" }}>
              {s.v}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-6 px-5">
        <div className="flex items-center justify-between">
          <p className="mono-tag" style={{ color: "var(--color-silver)" }}>
            ADVERTISING
          </p>
          <Link to="/ads" className="mono-tag" style={{ color: "var(--color-neon)", fontSize: 10 }}>
            MANAGE →
          </Link>
        </div>
        <div
          className="mt-2 p-4"
          style={{
            background: "var(--color-graphite)",
            border: "1px solid var(--color-hair)",
            borderRadius: 12,
          }}
        >
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { k: "Active", v: ads.active },
              { k: "Impr.", v: ads.impressions },
              { k: "CTR", v: `${ctr.toFixed(1)}%` },
              { k: "Spent", v: `$${spent}/${budget}` },
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
          {recent_activity.length > 0 && (
            <div className="mt-3 flex h-16 items-end gap-1">
              {recent_activity.slice(-20).map((d, i) => {
                const max = Math.max(...recent_activity.map((r) => r.count), 1);
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${(d.count / max) * 100}%`,
                      background: "var(--color-neon)",
                      opacity: 0.6,
                      borderRadius: 2,
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 space-y-2 px-5">
        <Link
          to="/business/showcase"
          className="tap block px-4 py-3 text-[13px]"
          style={{
            background: "var(--color-graphite)",
            border: "1px solid var(--color-hair)",
            borderRadius: 10,
            color: "var(--color-ink)",
          }}
        >
          Edit showcase & contact
        </Link>
        <Link
          to="/ads/new"
          className="tap block px-4 py-3 text-[13px]"
          style={{
            background: "var(--color-neon)",
            color: "#000",
            borderRadius: 10,
            fontWeight: 600,
          }}
        >
          Boost a post or promote
        </Link>
      </section>
    </div>
  );
}
