import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyVendor, getMySubscription } from "@/lib/vendor.functions";

const vendorQuery = queryOptions({
  queryKey: ["my-vendor"],
  queryFn: () => getMyVendor(),
});
const subQuery = queryOptions({
  queryKey: ["my-subscription"],
  queryFn: () => getMySubscription(),
});

export const Route = createFileRoute("/_authenticated/vendor")({
  head: () => ({
    meta: [
      { title: "Vendor Console · ZOMBIEREX" },
      {
        name: "description",
        content:
          "Manage your ZOMBIEREX business — products, services, bookings, orders and subscription.",
      },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(vendorQuery),
      context.queryClient.ensureQueryData(subQuery),
    ]),
  component: VendorShell,
});

function VendorShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data: vendor } = useSuspenseQuery(vendorQuery);
  const { data: sub } = useSuspenseQuery(subQuery);

  // No vendor yet → onboarding CTA
  if (!vendor) {
    return (
      <div className="px-5 pt-10 pb-24">
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>
          VENDOR · GATEWAY
        </p>
        <h1 className="serif mt-2 text-[52px] leading-[0.9]" style={{ color: "var(--color-ink)" }}>
          Open your{" "}
          <span className="italic" style={{ color: "var(--color-neon)" }}>
            garage
          </span>{" "}
          to the world.
        </h1>
        <p className="mt-3 text-[13px] leading-snug" style={{ color: "var(--color-silver)" }}>
          Join thousands of workshops, dealerships, and builders selling to the ZOMBIEREX community.
          Verified businesses earn a metallic badge and priority placement.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <Bullet k="15" v="Business types" />
          <Bullet k="5" v="Subscription tiers" />
          <Bullet k="14d" v="Free Pro trial" />
          <Bullet k="0%" v="Setup fee" />
        </div>
        <Link to="/vendor/apply" className="btn-solid mt-8 inline-flex w-full justify-center">
          Start application →
        </Link>
        <Link to="/vendor/plans" className="btn-ghost mt-2 inline-flex w-full justify-center">
          View plans
        </Link>
      </div>
    );
  }

  const tabs: {
    to: "/vendor" | "/vendor/plans" | "/vendor/apply";
    label: string;
    exact?: boolean;
  }[] = [
    { to: "/vendor", label: "Overview", exact: true },
    { to: "/vendor/plans", label: "Plans" },
    { to: "/vendor/apply", label: "Profile" },
  ];

  return (
    <div className="pb-24">
      {/* Header */}
      <header className="px-5 pt-8">
        <p className="mono-tag" style={{ color: "var(--color-silver)" }}>
          VENDOR · {String(vendor.verification_status ?? "draft").toUpperCase()}
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <h1 className="serif text-4xl leading-tight" style={{ color: "var(--color-ink)" }}>
            {vendor.business_name}
          </h1>
          {vendor.is_verified && (
            <span className="mono-tag" style={{ color: "var(--color-neon)" }}>
              ◆ VERIFIED
            </span>
          )}
        </div>
        <p className="mt-1 text-[12px]" style={{ color: "var(--color-silver)" }}>
          {sub
            ? `${(sub as any).plan?.name ?? "Plan"} · ${sub.status}`
            : "No active plan — subscribe to unlock features"}
        </p>
        {vendor.verification_status === "pending" && (
          <div
            className="mt-4 rounded border border-hair px-3 py-2 text-[12px]"
            style={{ borderColor: "var(--color-hair-strong)", color: "var(--color-silver)" }}
          >
            ⏱ Application under review. We'll notify you within 48 hours.
          </div>
        )}
        {vendor.verification_status === "info_requested" && vendor.verification_notes && (
          <div
            className="mt-4 rounded px-3 py-2 text-[12px]"
            style={{
              background: "rgba(255,120,60,0.1)",
              border: "1px solid rgba(255,120,60,0.4)",
              color: "var(--color-ink)",
            }}
          >
            ⚠ Info requested: {vendor.verification_notes}
          </div>
        )}
      </header>

      {/* Tabs */}
      <nav className="no-scrollbar mt-6 flex gap-2 overflow-x-auto px-5">
        {tabs.map((t) => {
          const active = t.exact ? path === t.to : path.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className="chip shrink-0"
              style={{
                background: active ? "var(--color-obsidian)" : "transparent",
                color: active ? "var(--color-neon)" : "var(--color-silver)",
                borderColor: active ? "var(--color-obsidian)" : "var(--color-hair-strong)",
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4">
        <Outlet />
      </div>
    </div>
  );
}

function Bullet({ k, v }: { k: string; v: string }) {
  return (
    <div className="surface-1 lift-1 px-3 py-3" style={{ borderRadius: 6 }}>
      <p className="serif text-2xl italic" style={{ color: "var(--color-neon)" }}>
        {k}
      </p>
      <p className="mono-tag mt-1" style={{ color: "var(--color-silver)" }}>
        {v}
      </p>
    </div>
  );
}
