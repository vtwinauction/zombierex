import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listTransactions,
  getTransactionDetail,
  refundTransactionFn,
  cancelTransaction,
  adjustCommission,
  checkFinanceAccess,
} from "@/lib/finance.functions";
import { formatMoney } from "@/lib/commission";
import { DEFAULT_CURRENCY, toDecimal, toDecimalString } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/owner/finance/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — ZOMBIEREX Owner" },
      { name: "description", content: "Full ledger of marketplace transactions and fee splits." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Transactions — ZOMBIEREX Owner" },
      {
        property: "og:description",
        content: "Full ledger of marketplace transactions and fee splits.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TransactionsPage,
});

const STATUSES = [
  "",
  "pending",
  "succeeded",
  "failed",
  "refunded",
  "partially_refunded",
  "cancelled",
];
const KINDS = ["", "order", "tip", "creator_subscription", "plan", "ad", "other"];

function TransactionsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listTransactions);
  const detail = useServerFn(getTransactionDetail);
  const refund = useServerFn(refundTransactionFn);
  const cancel = useServerFn(cancelTransaction);
  const adjust = useServerFn(adjustCommission);
  const access = useServerFn(checkFinanceAccess);

  const [filters, setFilters] = useState({ q: "", status: "", kind: "", from: "", to: "" });
  const [openId, setOpenId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const gate = useQuery({
    queryKey: ["finance", "access"],
    queryFn: () => access({ data: undefined as any }),
  });
  const canWrite = !!gate.data?.canWrite;

  const q = useQuery({
    queryKey: ["finance", "txns", filters],
    queryFn: () =>
      list({
        data: {
          q: filters.q || undefined,
          status: filters.status || undefined,
          kind: filters.kind || undefined,
          from: filters.from ? new Date(filters.from).toISOString() : undefined,
          to: filters.to ? new Date(filters.to).toISOString() : undefined,
          limit: 100,
          offset: 0,
        },
      }),
  });

  const det = useQuery({
    queryKey: ["finance", "txn", openId],
    queryFn: () => detail({ data: { id: openId! } }),
    enabled: !!openId,
  });

  async function act(fn: () => Promise<unknown>) {
    setErr(null);
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: ["finance"] });
    } catch (e: any) {
      setErr(e?.message ?? "Action failed");
    }
  }

  function exportCsv() {
    const rows = q.data?.rows ?? [];
    const header = "id,date,kind,status,gross,commission,net,buyer,seller,provider,ref";
    const body = rows
      .map((r: any) =>
        [
          r.id,
          r.created_at,
          r.kind,
          r.status,
          toDecimal(r.gross_cents, r.currency),
          toDecimal(r.platform_fee_cents, r.currency),
          toDecimal(r.net_cents, r.currency),
          r.buyer_name ?? "",
          r.seller_name ?? "",
          r.provider,
          r.provider_ref ?? "",
        ].join(","),
      )
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zombierex-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 p-5">
      <div className="grid grid-cols-2 gap-2">
        <input
          className="zx-input col-span-2"
          placeholder="Search reference or category…"
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />
        <select
          className="zx-input"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s || "All statuses"}
            </option>
          ))}
        </select>
        <select
          className="zx-input"
          value={filters.kind}
          onChange={(e) => setFilters({ ...filters, kind: e.target.value })}
        >
          {KINDS.map((s) => (
            <option key={s} value={s}>
              {s || "All streams"}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="zx-input"
          value={filters.from}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
        />
        <input
          type="date"
          className="zx-input"
          value={filters.to}
          onChange={(e) => setFilters({ ...filters, to: e.target.value })}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="mono-tag text-[10px] opacity-60">{q.data?.total ?? 0} TRANSACTIONS</p>
        <button className="btn-ghost text-[10px]" onClick={exportCsv}>
          Export CSV
        </button>
      </div>

      {err && (
        <div
          className="rounded px-3 py-2 text-[12px]"
          style={{ background: "rgba(220,60,60,0.1)" }}
        >
          {err}
        </div>
      )}
      {q.isLoading && <p className="text-sm opacity-60">Loading…</p>}
      {q.data?.rows.length === 0 && (
        <p className="text-xs opacity-50">No transactions match these filters.</p>
      )}

      <div className="space-y-2">
        {(q.data?.rows ?? []).map((r: any) => (
          <div key={r.id} className="card-surface p-3">
            <button
              className="w-full text-left"
              onClick={() => setOpenId(openId === r.id ? null : r.id)}
            >
              <div className="flex items-baseline justify-between">
                <span className="text-sm">{formatMoney(r.gross_cents, r.currency)}</span>
                <span
                  className="mono-tag text-[10px]"
                  style={{ color: r.status === "succeeded" ? "#00c853" : "var(--color-silver)" }}
                >
                  {r.status.toUpperCase()}
                </span>
              </div>
              <p className="mono-tag mt-1 text-[10px] opacity-60">
                {new Date(r.created_at).toLocaleString()} · {r.kind} · fee{" "}
                {formatMoney(r.platform_fee_cents, r.currency)} · net{" "}
                {formatMoney(r.net_cents, r.currency)}
              </p>
              <p className="mt-0.5 text-[11px] opacity-50">
                {r.buyer_name ?? "—"} → {r.seller_name ?? "platform"} · {r.provider}
              </p>
            </button>

            {openId === r.id && (
              <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--color-hair)" }}>
                {det.isLoading && <p className="text-xs opacity-60">Loading ledger…</p>}
                {det.data && (
                  <>
                    <p className="mono-tag text-[10px] opacity-60">LEDGER</p>
                    <ul className="mt-1 space-y-1">
                      {(det.data.ledger as any[]).map((l) => (
                        <li key={l.id} className="flex justify-between text-[11px]">
                          <span>
                            {l.account} · {l.direction}
                          </span>
                          <span className="tabular-nums">
                            {formatMoney(l.amount_cents, l.currency)}
                          </span>
                        </li>
                      ))}
                      {(det.data.ledger as any[]).length === 0 && (
                        <li className="text-[11px] opacity-50">No ledger lines.</li>
                      )}
                    </ul>
                    {(det.data.refunds as any[]).length > 0 && (
                      <>
                        <p className="mono-tag mt-3 text-[10px] opacity-60">REFUNDS</p>
                        {(det.data.refunds as any[]).map((rf) => (
                          <p key={rf.id} className="text-[11px]">
                            {formatMoney(rf.amount_cents, rf.currency)} · {rf.reason ?? "no reason"}
                          </p>
                        ))}
                      </>
                    )}
                    {canWrite && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {r.status === "succeeded" || r.status === "partially_refunded" ? (
                          <button
                            className="btn-ghost text-[10px]"
                            onClick={() => {
                              const amt = prompt(
                                "Refund amount in dollars (blank = full remaining)",
                              );
                              if (amt === null) return;
                              const reason = prompt("Reason") ?? undefined;
                              act(() =>
                                refund({
                                  data: {
                                    transaction_id: r.id,
                                    amount_cents: amt
                                      ? Math.round(parseFloat(amt) * 100)
                                      : undefined,
                                    reason,
                                  },
                                }),
                              );
                            }}
                          >
                            Refund
                          </button>
                        ) : null}
                        {r.status === "pending" && (
                          <button
                            className="btn-ghost text-[10px]"
                            onClick={() => act(() => cancel({ data: { id: r.id } }))}
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          className="btn-ghost text-[10px]"
                          onClick={() => {
                            const fee = prompt(
                              `New commission in ${r.currency ?? DEFAULT_CURRENCY}`,
                              toDecimalString(r.platform_fee_cents, r.currency ?? DEFAULT_CURRENCY),
                            );
                            if (!fee) return;
                            const reason = prompt("Reason for adjustment") ?? "manual";
                            act(() =>
                              adjust({
                                data: {
                                  id: r.id,
                                  platform_fee_cents: Math.round(parseFloat(fee) * 100),
                                  reason,
                                },
                              }),
                            );
                          }}
                        >
                          Adjust commission
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
