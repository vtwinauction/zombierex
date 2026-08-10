import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listBuyerFinance } from "@/lib/finance.functions";
import { formatMoney } from "@/lib/commission";

export const Route = createFileRoute("/_authenticated/owner/finance/buyers")({
  head: () => ({
    meta: [
      { title: "Buyer Insights — ZOMBIEREX Owner" },
      { name: "description", content: "Buyer spend, order volume and refund behaviour across the marketplace." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Buyer Insights — ZOMBIEREX Owner" },
      { property: "og:description", content: "Buyer spend, order volume and refund behaviour across the marketplace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BuyersPage,
});

function BuyersPage() {
  const load = useServerFn(listBuyerFinance);
  const [q, setQ] = useState("");
  const buyers = useQuery({
    queryKey: ["finance", "buyers", q],
    queryFn: () => load({ data: { q: q || undefined } }),
  });

  return (
    <div className="space-y-4 p-5">
      <input
        className="zx-input"
        placeholder="Search buyers…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {buyers.isLoading && <p className="text-sm opacity-60">Loading buyers…</p>}
      {buyers.data?.length === 0 && <p className="text-xs opacity-50">No buyer activity yet.</p>}
      {(buyers.data ?? []).map((b: any) => (
        <div key={b.buyer_id} className="card-surface p-4">
          <div className="flex items-baseline justify-between">
            <p className="text-sm">{b.display_name}</p>
            <span className="mono-tag text-[10px] opacity-50">
              {b.handle ? `@${b.handle}` : ""}
            </span>
          </div>
          <p className="mono-tag mt-1 text-[10px] opacity-60">
            {b.orders} purchases · spent {formatMoney(b.spent)} · refunded {formatMoney(b.refunded)}
          </p>
          <p className="mt-0.5 text-[10px] opacity-40">
            Last activity {new Date(b.last).toLocaleString()}
          </p>
          <p className="mt-2 text-[10px] opacity-40">
            Refunds and disputes are issued from the Transactions tab against the specific payment.
          </p>
        </div>
      ))}
    </div>
  );
}
