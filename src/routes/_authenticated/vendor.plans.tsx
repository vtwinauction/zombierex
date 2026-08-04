import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listPlans, subscribeVendor, getMyVendor, getMySubscription } from "@/lib/vendor.functions";
import { startCheckout } from "@/lib/payments.functions";

const plansQuery = queryOptions({ queryKey: ["plans"], queryFn: () => listPlans() });
const vendorQuery = queryOptions({ queryKey: ["my-vendor"], queryFn: () => getMyVendor() });
const subQuery = queryOptions({
  queryKey: ["my-subscription"],
  queryFn: () => getMySubscription(),
});

export const Route = createFileRoute("/_authenticated/vendor/plans")({
  head: () => ({
    meta: [
      { title: "Plans · ZOMBIEREX" },
      {
        name: "description",
        content: "Choose the subscription plan that fits your business — from Free to Enterprise.",
      },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(plansQuery),
      context.queryClient.ensureQueryData(vendorQuery),
      context.queryClient.ensureQueryData(subQuery),
    ]),
  component: PlansPage,
});

function PlansPage() {
  const { data: plans } = useSuspenseQuery(plansQuery);
  const { data: vendor } = useSuspenseQuery(vendorQuery);
  const { data: sub } = useSuspenseQuery(subQuery);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const subscribeFn = useServerFn(subscribeVendor);
  const checkoutFn = useServerFn(startCheckout);
  const qc = useQueryClient();
  const nav = useNavigate();

  const currentCode = (sub as any)?.plan?.code as string | undefined;

  async function pick(code: string) {
    if (!vendor) {
      nav({ to: "/vendor/apply" });
      return;
    }
    setBusy(code);
    setErr(null);
    try {
      const newSub: any = await subscribeFn({
        data: { vendor_id: vendor.id, plan_code: code, billing_interval: "month" },
      });
      await qc.invalidateQueries({ queryKey: ["my-subscription"] });

      const plan = (plans as any[]).find((p) => p.code === code);
      if (plan && plan.price_cents > 0 && newSub?.id) {
        const co = await checkoutFn({ data: { subscription_id: newSub.id } });
        nav({ to: "/checkout/payment/$paymentId", params: { paymentId: co.payment_id } });
      } else {
        nav({ to: "/vendor" });
      }
    } catch (e: any) {
      setErr(e?.message ?? "Subscription failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="px-5">
      <p className="mono-tag" style={{ color: "var(--color-silver)" }}>
        SUBSCRIPTION · TIERS
      </p>
      <h2 className="serif mt-2 text-3xl leading-tight" style={{ color: "var(--color-ink)" }}>
        Pick your{" "}
        <span className="italic" style={{ color: "var(--color-neon)" }}>
          gear
        </span>
        .
      </h2>
      <p className="mt-1 text-[12px]" style={{ color: "var(--color-silver)" }}>
        Paid plans include a 14-day free trial. Cancel anytime.
      </p>

      {err && (
        <div
          className="mt-4 rounded px-3 py-2 text-[12px]"
          style={{ background: "rgba(220,60,60,0.1)", border: "1px solid rgba(220,60,60,0.4)" }}
        >
          {err}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {plans.map((p: any) => {
          const isCurrent = currentCode === p.code;
          const featured = p.code === "professional";
          const f = p.features ?? {};
          return (
            <article
              key={p.id}
              className="lift-1 relative overflow-hidden p-5"
              style={{
                borderRadius: 10,
                background: featured ? "var(--color-obsidian)" : "var(--color-surface-1)",
                color: featured ? "var(--color-ink-invert, #f2efe7)" : "var(--color-ink)",
                border: featured
                  ? "1px solid var(--color-obsidian)"
                  : "1px solid var(--color-hair-strong)",
              }}
            >
              {featured && (
                <span
                  className="mono-tag absolute right-3 top-3"
                  style={{ color: "var(--color-neon)" }}
                >
                  ◆ POPULAR
                </span>
              )}
              <p
                className="mono-tag"
                style={{ color: featured ? "var(--color-neon)" : "var(--color-silver)" }}
              >
                {p.code.toUpperCase()}
              </p>
              <h3 className="serif mt-1 text-3xl italic leading-tight">{p.name}</h3>
              <p className="mt-2">
                <span
                  className="serif text-4xl"
                  style={{ color: featured ? "var(--color-neon)" : "var(--color-ink)" }}
                >
                  ${(p.price_cents / 100).toFixed(0)}
                </span>
                <span className="ml-1 text-[11px] opacity-70">/ {p.interval}</span>
              </p>
              <ul
                className="mt-4 space-y-1.5 text-[12px]"
                style={{ color: featured ? "rgba(242,239,231,0.85)" : "var(--color-silver)" }}
              >
                <Feat label={`${fmt(f.products)} products`} />
                <Feat label={`${fmt(f.services)} services`} />
                <Feat label={`${fmt(f.staff)} staff accounts`} />
                <Feat label={`${(f.storage_mb ?? 0) / 1000}GB storage`} />
                <Feat label={`${fmt(f.ad_credits)} ad credits / mo`} />
                <Feat label={`${cap(String(f.visibility ?? "standard"))} marketplace visibility`} />
                <Feat label={`${cap(String(f.analytics ?? "basic"))} analytics`} />
                {f.sla && <Feat label="99.9% SLA + dedicated support" />}
              </ul>
              <button
                disabled={isCurrent || busy === p.code}
                onClick={() => pick(p.code)}
                className="tap mt-5 w-full py-3 text-[12px]"
                style={{
                  borderRadius: 999,
                  background: isCurrent
                    ? "transparent"
                    : featured
                      ? "var(--color-neon)"
                      : "var(--color-obsidian)",
                  color: isCurrent
                    ? featured
                      ? "var(--color-neon)"
                      : "var(--color-ink)"
                    : featured
                      ? "var(--color-obsidian)"
                      : "var(--color-neon)",
                  border: isCurrent ? "1px solid currentColor" : "none",
                  opacity: busy === p.code ? 0.6 : 1,
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                {isCurrent
                  ? "Current plan"
                  : busy === p.code
                    ? "Activating…"
                    : p.price_cents === 0
                      ? "Start free"
                      : "Start 14-day trial"}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Feat({ label }: { label: string }) {
  return (
    <li className="flex items-start gap-2">
      <span style={{ color: "var(--color-neon)" }}>✓</span>
      {label}
    </li>
  );
}
function fmt(n: unknown) {
  return n === -1 ? "Unlimited" : typeof n === "number" ? n.toLocaleString() : "—";
}
function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
