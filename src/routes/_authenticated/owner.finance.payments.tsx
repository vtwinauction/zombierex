import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getPaymentConfig, setPaymentConfig, checkFinanceAccess } from "@/lib/finance.functions";

export const Route = createFileRoute("/_authenticated/owner/finance/payments")({
  component: GatewayPage,
});

const LABELS: Record<string, string> = {
  gateways: "Payment gateways",
  methods: "Payment methods",
  currencies: "Currencies",
  tax: "Tax configuration",
  service_fees: "Buyer service fees",
  refunds: "Refund rules",
  withdrawals: "Withdrawal rules",
  settlement: "Settlement schedule",
};

function GatewayPage() {
  const qc = useQueryClient();
  const load = useServerFn(getPaymentConfig);
  const save = useServerFn(setPaymentConfig);
  const access = useServerFn(checkFinanceAccess);

  const gate = useQuery({
    queryKey: ["finance", "access"],
    queryFn: () => access({ data: undefined as any }),
  });
  const cfg = useQuery({
    queryKey: ["finance", "payment-config"],
    queryFn: () => load({ data: undefined as any }),
  });

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const canWrite = !!gate.data?.canWrite;

  useEffect(() => {
    if (!cfg.data) return;
    const next: Record<string, string> = {};
    for (const row of cfg.data as any[]) next[row.key] = JSON.stringify(row.value, null, 2);
    setDrafts(next);
  }, [cfg.data]);

  async function commit(key: string) {
    setBusy(key);
    setErr(null);
    try {
      const value = JSON.parse(drafts[key]);
      await save({ data: { key, value } });
      await qc.invalidateQueries({ queryKey: ["finance", "payment-config"] });
    } catch (e: any) {
      setErr(`${key}: ${e?.message ?? "Save failed"}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4 p-5">
      <div className="card-surface p-4">
        <p className="mono-tag text-[10px] opacity-60">LIVE CONFIGURATION</p>
        <p className="mt-1 text-[12px]" style={{ color: "var(--color-silver)" }}>
          These settings are read at transaction time. Saving takes effect immediately — no app
          release needed. Card data never touches this app; gateways are the record of card details.
        </p>
      </div>

      {err && (
        <div
          className="rounded px-3 py-2 text-[12px]"
          style={{ background: "rgba(220,60,60,0.1)" }}
        >
          {err}
        </div>
      )}
      {cfg.isLoading && <p className="text-sm opacity-60">Loading configuration…</p>}

      {(cfg.data as any[] | undefined)?.map((row) => (
        <div key={row.key} className="card-surface p-4">
          <div className="flex items-baseline justify-between">
            <p className="text-sm">{LABELS[row.key] ?? row.key}</p>
            <span className="mono-tag text-[10px] opacity-50">{row.key}</span>
          </div>
          {row.description && <p className="mt-0.5 text-[11px] opacity-50">{row.description}</p>}
          <textarea
            className="zx-input mt-2 font-mono"
            rows={Math.min(10, (drafts[row.key] ?? "").split("\n").length + 1)}
            value={drafts[row.key] ?? ""}
            onChange={(e) => setDrafts({ ...drafts, [row.key]: e.target.value })}
            disabled={!canWrite}
            spellCheck={false}
          />
          {canWrite && (
            <button
              className="btn-solid mt-2 w-full"
              disabled={busy === row.key}
              onClick={() => commit(row.key)}
            >
              {busy === row.key ? "Saving…" : "Save"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
