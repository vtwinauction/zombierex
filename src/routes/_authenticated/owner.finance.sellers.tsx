import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listSellerFinance,
  updateSellerFinance,
  checkFinanceAccess,
} from "@/lib/finance.functions";
import { formatMoney } from "@/lib/commission";
import { DEFAULT_CURRENCY, toDecimalString, toMinorUnits } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/owner/finance/sellers")({
  head: () => ({
    meta: [
      { title: "Seller Earnings — ZOMBIEREX Owner" },
      { name: "description", content: "Seller revenue, fees withheld and payout status." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Seller Earnings — ZOMBIEREX Owner" },
      { property: "og:description", content: "Seller revenue, fees withheld and payout status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SellersPage,
});

function SellersPage() {
  const qc = useQueryClient();
  const load = useServerFn(listSellerFinance);
  const update = useServerFn(updateSellerFinance);
  const access = useServerFn(checkFinanceAccess);

  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const gate = useQuery({
    queryKey: ["finance", "access"],
    queryFn: () => access({ data: undefined as any }),
  });
  const sellers = useQuery({
    queryKey: ["finance", "sellers", q],
    queryFn: () => load({ data: { q: q || undefined } }),
  });
  const canWrite = !!gate.data?.canWrite;

  async function patch(seller_id: string, changes: Record<string, unknown>) {
    setErr(null);
    try {
      await update({ data: { seller_id, ...changes } as any });
      await qc.invalidateQueries({ queryKey: ["finance", "sellers"] });
    } catch (e: any) {
      setErr(e?.message ?? "Update failed");
    }
  }

  return (
    <div className="space-y-4 p-5">
      <input
        className="zx-input"
        placeholder="Search sellers…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {err && (
        <div
          className="rounded px-3 py-2 text-[12px]"
          style={{ background: "rgba(220,60,60,0.1)" }}
        >
          {err}
        </div>
      )}
      {sellers.isLoading && <p className="text-sm opacity-60">Loading sellers…</p>}
      {sellers.data?.length === 0 && (
        <p className="text-xs opacity-50">No sellers with transactions yet.</p>
      )}

      {(sellers.data ?? []).map((s: any) => (
        <div key={s.seller_id} className="card-surface p-4">
          <div className="flex items-baseline justify-between">
            <p className="text-sm">{s.display_name}</p>
            <span className="mono-tag text-[10px] opacity-50">
              {s.handle ? `@${s.handle}` : s.seller_type}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
            <Stat label="Sales" value={String(s.sales)} />
            <Stat label="Gross" value={formatMoney(s.gross_cents)} />
            <Stat label="Commission kept" value={formatMoney(s.commission_cents)} accent />
            <Stat label="Payable balance" value={formatMoney(s.balance_cents)} />
          </div>
          <p className="mono-tag mt-2 text-[10px] opacity-50">
            {s.approved ? "APPROVED" : "UNAPPROVED"} · {s.suspended ? "SUSPENDED" : "ACTIVE"} ·{" "}
            {s.seller_type} · min withdrawal {formatMoney(s.min_withdrawal_cents)} ·{" "}
            {s.payout_schedule}
          </p>
          {canWrite && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="btn-ghost text-[10px]"
                onClick={() => patch(s.seller_id, { approved: !s.approved })}
              >
                {s.approved ? "Unapprove" : "Approve"}
              </button>
              <button
                className="btn-ghost text-[10px]"
                onClick={() => patch(s.seller_id, { suspended: !s.suspended })}
              >
                {s.suspended ? "Reinstate" : "Suspend"}
              </button>
              <button
                className="btn-ghost text-[10px]"
                onClick={() => {
                  const t = prompt(
                    "Seller type (standard, pro, subscribed, partner)",
                    s.seller_type,
                  );
                  if (t) patch(s.seller_id, { seller_type: t.trim().toLowerCase() });
                }}
              >
                Seller type
              </button>
              <button
                className="btn-ghost text-[10px]"
                onClick={() => {
                  const v = prompt(
                    `Minimum withdrawal in ${DEFAULT_CURRENCY}`,
                    toDecimalString(s.min_withdrawal_cents, DEFAULT_CURRENCY),
                  );
                  if (v)
                    patch(s.seller_id, {
                      min_withdrawal_cents: toMinorUnits(parseFloat(v) || 0, DEFAULT_CURRENCY),
                    });
                }}
              >
                Withdrawal limit
              </button>
              <button
                className="btn-ghost text-[10px]"
                onClick={() => {
                  const v = prompt(
                    "Payout schedule (daily, weekly, biweekly, monthly, manual)",
                    s.payout_schedule,
                  );
                  if (v) patch(s.seller_id, { payout_schedule: v.trim().toLowerCase() });
                }}
              >
                Schedule
              </button>
            </div>
          )}
          <p className="mt-2 text-[10px] opacity-40">
            Custom commission for this seller: create a rule scoped to{" "}
            <span className="mono-tag">seller:{s.seller_id}</span> in Commissions.
          </p>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="mono-tag text-[9px] opacity-50">{label}</p>
      <p className="tabular-nums" style={{ color: accent ? "#00c853" : undefined }}>
        {value}
      </p>
    </div>
  );
}
