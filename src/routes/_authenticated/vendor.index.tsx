import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getVendorDashboardStats } from "@/lib/vendor.functions";
import { DEFAULT_CURRENCY, formatMoney } from "@/lib/money";

const statsQuery = queryOptions({
  queryKey: ["vendor-stats"],
  queryFn: () => getVendorDashboardStats(),
});

export const Route = createFileRoute("/_authenticated/vendor/")({
  head: () => ({
    meta: [
      { title: "Vendor Console · ZOMBIEREX" },
      { name: "description", content: "Manage your storefront, listings, and subscriptions." },
      { property: "og:title", content: "Vendor Console · ZOMBIEREX" },
      {
        property: "og:description",
        content: "Manage your storefront, listings, and subscriptions.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(statsQuery),
  component: VendorOverview,
});

function VendorOverview() {
  const { data: stats } = useSuspenseQuery(statsQuery);
  if (!stats) return null;

  const cards = [
    {
      k: "Revenue",
      v: formatMoney(stats.revenue_cents, DEFAULT_CURRENCY),
      sub: `${stats.orders} orders`,
      hi: true,
    },
    { k: "Bookings", v: String(stats.bookings), sub: "This period" },
    { k: "Products", v: String(stats.products), sub: "Listed" },
    { k: "Services", v: String(stats.services), sub: "Offered" },
    {
      k: "Reviews",
      v: String(stats.reviews),
      sub: stats.avg_rating ? `★ ${stats.avg_rating.toFixed(2)}` : "—",
    },
    { k: "Ad credits", v: "0", sub: "Boost a listing" },
  ];

  return (
    <div className="px-5">
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.k} className="surface-1 lift-1 p-4" style={{ borderRadius: 8 }}>
            <p className="mono-tag" style={{ color: "var(--color-silver)" }}>
              {c.k}
            </p>
            <p
              className="serif mt-2 text-3xl italic leading-none"
              style={{ color: c.hi ? "var(--color-neon)" : "var(--color-ink)" }}
            >
              {c.v}
            </p>
            <p className="mt-2 text-[11px]" style={{ color: "var(--color-silver)" }}>
              {c.sub}
            </p>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <p className="mono-tag" style={{ color: "var(--color-silver)" }}>
          QUICK ACTIONS
        </p>
        <div className="mt-3 space-y-2">
          {[
            "+ Add a product",
            "+ Add a service",
            "◎ Set operating hours",
            "★ Respond to reviews",
            "⚡ Boost with ad credits",
          ].map((label) => (
            <button
              key={label}
              className="w-full text-left px-4 py-3 text-[13px]"
              style={{
                background: "transparent",
                border: "1px solid var(--color-hair-strong)",
                borderRadius: 6,
                color: "var(--color-ink)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
