import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listPayouts,
  runPayoutsNow,
  markPayoutPaid,
  checkFinanceAccess,
} from "@/lib/finance.functions";
import { formatMoney } from "@/lib/commission";

export const Route = createFileRoute("/_authenticated/owner/finance/payouts")({
  component: PayoutsPage,
});

function PayoutsPage() {
  const qc = useQueryClient();
  const load = useServerFn(listPayouts);
  const run = useServerFn(runPayoutsNow);
  const mark = useServerFn(markPayoutPaid);
  const access = useServerFn(checkFinanceAccess);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const gate = useQuery({
    queryKey: ["finance", "access"],
    queryFn: () => access({ data: undefined as any }),
  });
  const payouts = useQuery({
    queryKey: ["finance", "payouts"],
    queryFn: () => load({ data: undefined as any }),
  });
  const canWrite = !!gate.data?.canWrite;

  async function runBatch() {
    setBusy(true);
    setErr(null);
    try {
      const res = await run({ data: undefined as any });
      setNote(`Batch created: ${res.payouts} payouts · ${formatMoney(res.total_cents)}`);
      await qc.invalidateQueries({ queryKey: ["finance"] });
    } catch (e: any) {
      setErr(e?.message ?? "Batch failed");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: "paid" | "failed" | "cancelled") {
    setErr(null);
    try {
      await mark({ data: { id, status } });
      await qc.invalidateQueries({ queryKey: ["finance", "payouts"] });
    } catch (e: any) {
      setErr(e?.message ?? "Update failed");
    }
  }

  return (
    <div className="space-y-4 p-5">
      <div className="card-surface p-4">
        <p className="mono-tag text-[10px] opacity-60">SETTLEMENT</p>
        <p className="mt-1 text-[12px]" style={{ color: "var(--color-silver)" }}>
          A batch sweeps every seller whose payable balance clears their withdrawal minimum. Runs
          automatically on the configured schedule; you can also trigger one now.
        </p>
        {canWrite && (
          <button className="btn-solid mt-3 w-full" disabled={busy} onClick={runBatch}>
            {busy ? "Building batch…" : "Run payout batch now"}
          </button>
        )}
      </div>

      {note && (
        <div
          className="rounded px-3 py-2 text-[12px]"
          style={{ background: "rgba(0,200,83,0.12)" }}
        >
          {note}
        </div>
      )}
      {err && (
        <div
          className="rounded px-3 py-2 text-[12px]"
          style={{ background: "rgba(220,60,60,0.1)" }}
        >
          {err}
        </div>
      )}

      {payouts.isLoading && <p className="text-sm opacity-60">Loading payouts…</p>}
      {payouts.data?.length === 0 && <p className="text-xs opacity-50">No payouts yet.</p>}

      {((payouts.data ?? []) as any[]).map((p) => (
        <div key={p.id} className="card-surface p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm tabular-nums">{formatMoney(p.amount_cents, p.currency)}</span>
            <span
              className="mono-tag text-[10px]"
              style={{ color: p.status === "paid" ? "#00c853" : "var(--color-silver)" }}
            >
              {p.status.toUpperCase()}
            </span>
          </div>
          <p className="mono-tag mt-1 text-[10px] opacity-50">
            {p.scheduled_for ? new Date(p.scheduled_for).toLocaleDateString() : "unscheduled"} ·{" "}
            {p.method ?? "no method"}
          </p>
          {canWrite && p.status !== "paid" && (
            <div className="mt-2 flex gap-2">
              <button className="btn-ghost text-[10px]" onClick={() => setStatus(p.id, "paid")}>
                Mark paid
              </button>
              <button className="btn-ghost text-[10px]" onClick={() => setStatus(p.id, "failed")}>
                Mark failed
              </button>
              <button
                className="btn-ghost text-[10px]"
                onClick={() => setStatus(p.id, "cancelled")}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
