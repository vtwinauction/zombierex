/**
 * Order checkout — review screen.
 *
 * Every figure here comes from `getCheckoutQuote`, the same fee engine that
 * later writes the ledger, so the price a buyer reads and the split that gets
 * settled can never disagree. The buyer-protection copy is DERIVED from
 * `hold_days`: a guarantee is rendered only when a mechanism backs it.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getListing } from "@/lib/marketplace.functions";
import { getCheckoutQuote } from "@/lib/checkout.functions";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/checkout/order/$id")({
  head: () => ({
    meta: [
      { title: "Review Order · ZOMBIEREX Marketplace" },
      {
        name: "description",
        content: "Review your ZOMBIEREX marketplace order, pricing and payment terms.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Review Order · ZOMBIEREX Marketplace" },
      {
        property: "og:description",
        content: "Review your ZOMBIEREX marketplace order, pricing and payment terms.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Checkout,
});

function Checkout() {
  const { id } = Route.useParams();
  const get = useServerFn(getListing);
  const quoteFn = useServerFn(getCheckoutQuote);

  const { data: l } = useQuery({ queryKey: ["listing", id], queryFn: () => get({ data: { id } }) });
  const {
    data: quote,
    isLoading: quoteLoading,
    error: quoteError,
  } = useQuery({
    queryKey: ["checkout-quote", id],
    queryFn: () => quoteFn({ data: { listing_id: id } }),
    retry: false,
  });

  if (!l) return <div className="p-6 mono-tag">LOADING…</div>;
  const listing = l as Record<string, unknown>;

  return (
    <div className="pb-32">
      <div className="px-4 pt-4">
        <p className="mono-tag font-bold" style={{ color: "var(--color-signal-text)" }}>
          SECURE CHECKOUT
        </p>
        <h1 className="serif mt-2 text-3xl italic" style={{ color: "var(--color-ink)" }}>
          Review Order
        </h1>

        <div
          className="mt-4 flex gap-3 border p-3"
          style={{ borderColor: "var(--color-hair-strong)" }}
        >
          {typeof listing.hero_image_url === "string" && (
            <img src={listing.hero_image_url} className="h-20 w-20 object-cover" alt="" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: "var(--color-ink)" }}>
              {String(listing.title ?? "")}
            </p>
            <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
              {String(listing.brand ?? "")} · {String(listing.model ?? "")}{" "}
              {listing.year ? `· ${String(listing.year)}` : ""}
            </p>
            {quote && (
              <p className="mono-num text-lg font-bold mt-1" style={{ color: "var(--color-ink)" }}>
                {formatMoney(quote.item_cents, quote.currency)}
              </p>
            )}
          </div>
        </div>

        {quoteLoading && <p className="mt-6 mono-tag">PRICING…</p>}
        {quoteError && (
          <div
            className="mt-6 border p-3"
            style={{ borderColor: "var(--color-hair-strong)", color: "var(--color-heat)" }}
          >
            <p className="mono-tag font-bold">COULD NOT PRICE THIS ORDER</p>
            <p className="mt-1 text-xs" style={{ color: "var(--color-ink)" }}>
              {(quoteError as Error).message}
            </p>
          </div>
        )}

        {quote && (
          <>
            <div className="mt-6 border" style={{ borderColor: "var(--color-hair-strong)" }}>
              <Row k="ITEM PRICE" v={formatMoney(quote.item_cents, quote.currency)} />
              <Row
                k="SHIPPING"
                v={
                  quote.shipping_cents > 0
                    ? formatMoney(quote.shipping_cents, quote.currency)
                    : "Set by seller"
                }
              />
              <Row k="YOU PAY" v={formatMoney(quote.buyer_total_cents, quote.currency)} strong />
            </div>

            {/*
              The platform fee is charged to the SELLER. Listing it in the
              buyer's price table made a buyer believe they were paying it, so
              it lives in a separate, clearly-labelled note.
            */}
            <p className="mt-2 text-xs" style={{ color: "var(--color-titanium)" }}>
              {quote.fee_borne_by === "seller" ? (
                <>
                  The seller receives {formatMoney(quote.seller_net_cents, quote.currency)} after a{" "}
                  {(quote.fee_bps / 100).toFixed(2)}% platform fee. This is not added to your total.
                </>
              ) : (
                <>
                  Includes a {(quote.fee_bps / 100).toFixed(2)}% platform fee of{" "}
                  {formatMoney(quote.platform_fee_cents, quote.currency)}.
                </>
              )}
            </p>

            <div
              className="mt-6 border p-3"
              style={{
                borderColor: "var(--color-hair-strong)",
                background: "var(--color-paper-2)",
              }}
            >
              <p className="mono-tag font-bold" style={{ color: "var(--color-ink)" }}>
                ■ HOW PAYMENT WORKS
              </p>
              <ul className="mt-2 space-y-1.5 text-xs" style={{ color: "var(--color-ink)" }}>
                {quote.hold_days > 0 ? (
                  <>
                    <li>· Your payment is held for {quote.hold_days} days after the sale</li>
                    <li>· Released to the seller once the hold period ends with no dispute</li>
                    <li>· Open a dispute during the hold period to pause the release</li>
                  </>
                ) : (
                  <>
                    <li>· Payment is passed to the seller when the order completes</li>
                    <li>· Arrange delivery and returns directly with the seller</li>
                    <li>· Contact support if something goes wrong with an order</li>
                  </>
                )}
              </ul>
            </div>
          </>
        )}

        <button
          disabled
          className="mt-6 w-full py-4 mono-tag font-bold opacity-70"
          style={{ background: "var(--color-paper-3)", color: "var(--color-ink-2)" }}
        >
          PAYMENT NOT YET AVAILABLE
        </button>
        <p className="mt-3 text-xs text-center" style={{ color: "var(--color-titanium)" }}>
          Online payment is not enabled yet. Contact the seller to arrange this purchase.
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
            ? "var(--color-ink)"
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
