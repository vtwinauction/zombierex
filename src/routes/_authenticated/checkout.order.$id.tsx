import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getListing } from "@/lib/marketplace.functions";
import { getEscrowPolicy } from "@/lib/payments.functions";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/checkout/order/$id")({
  head: () => ({ meta: [{ title: "Checkout · ZOMBIEREX" }] }),
  component: Checkout,
});


function Checkout() {
  const { id } = Route.useParams();
  const get = useServerFn(getListing);
  const { data: l } = useQuery({ queryKey: ["listing", id], queryFn: () => get({ data: { id } }) });
  const policyFn = useServerFn(getEscrowPolicy);
  const { data: policy } = useQuery({
    queryKey: ["escrow-policy"],
    queryFn: () => policyFn({ data: undefined as any }),
  });
  const holdDays = policy?.hold_days ?? 0;

  if (!l) return <div className="p-6 mono-tag">LOADING…</div>;
  const price = (l as any).price_cents ?? 0;
  const currency = (l as any).currency ?? "USD";
  const shippingEst = 0;
  const totalCents = price + shippingEst;

  return (
    <div className="pb-32">
      <div className="px-4 pt-4">
        <p className="mono-tag font-bold" style={{ color: "var(--color-neon)" }}>
          SECURE CHECKOUT
        </p>
        <h1 className="serif mt-2 text-3xl italic" style={{ color: "var(--color-ink)" }}>
          Review Order
        </h1>

        <div
          className="mt-4 flex gap-3 border p-3"
          style={{ borderColor: "var(--color-hair-strong)" }}
        >
          {(l as any).hero_image_url && (
            <img src={(l as any).hero_image_url} className="h-20 w-20 object-cover" alt="" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: "var(--color-ink)" }}>
              {(l as any).title}
            </p>
            <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
              {(l as any).brand} · {(l as any).model} · {(l as any).year ?? ""}
            </p>
            <p className="mono-num text-lg font-bold mt-1" style={{ color: "var(--color-neon)" }}>
              {formatMoney(price, currency)}
            </p>
          </div>
        </div>

        <div className="mt-6 border" style={{ borderColor: "var(--color-hair-strong)" }}>
          <Row k="ITEM PRICE" v={formatMoney(price, currency)} />
          <Row k="SHIPPING" v="Set by seller" />
          <Row k="ESTIMATED TOTAL" v={formatMoney(totalCents, currency)} strong />
        </div>

        <button
          disabled
          className="mt-6 w-full py-4 mono-tag font-bold text-black opacity-70"
          style={{ background: "var(--color-neon)" }}
        >
          PAY WITH STRIPE ▸ (ENABLING…)
        </button>
        <p className="mt-3 text-xs text-center" style={{ color: "var(--color-titanium)" }}>
          Online payments are not enabled yet. Once live, this button will process your purchase.{" "}
          {holdDays > 0
            ? `Your payment is held for ${holdDays} days and released to the seller if no dispute is opened.`
            : "Payment is passed to the seller when the order completes. Arrange delivery and returns directly with the seller."}
        </p>

        <Link
          to="/marketplace/$id"
          params={{ id }}
          className="mt-4 block text-center mono-tag"
          style={{ color: "var(--color-titanium)" }}
        >
          ← BACK TO LISTING
        </Link>
      </div>
    </div>
  );
}

function Row({ k, v, strong, muted }: { k: string; v: string; strong?: boolean; muted?: boolean }) {
  return (
    <div
      className="flex justify-between border-b px-3 py-3 last:border-b-0"
      style={{ borderColor: "var(--color-hair)" }}
    >
      <span className="mono-tag" style={{ color: "var(--color-titanium)" }}>
        {k}
      </span>
      <span
        className={strong ? "mono-num text-lg font-bold" : "mono-num text-sm"}
        style={{
          color: strong
            ? "var(--color-neon)"
            : muted
              ? "var(--color-titanium)"
              : "var(--color-ink)",
        }}
      >
        {v}
      </span>
    </div>
  );
}
