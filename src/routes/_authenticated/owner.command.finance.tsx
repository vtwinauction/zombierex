import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  financeInvoices,
  financeSetInvoiceStatus,
  financeTransactions,
  getRevenueDashboard,
} from "@/lib/command.functions";
import { Bars, Empty, Metric, Panel, Pill, Split, Table, Td, money, num, statusTone, when } from "@/components/command/ui";

export const Route = createFileRoute("/_authenticated/owner/command/finance")({
  head: () => ({
    meta: [
      { title: "Finance · Mission Control · ZOMBIEREX" },
      { name: "description", content: "Revenue analytics, transactions, invoices and settlement control." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Finance · Mission Control" },
      { property: "og:description", content: "ZOMBIEREX revenue and accounting console." },
    ],
  }),
  component: FinancePage,
});

const RANGES = ["today", "yesterday", "7d", "30d", "month", "year"] as const;

function FinancePage() {
  const qc = useQueryClient();
  const rev = useServerFn(getRevenueDashboard);
  const txFn = useServerFn(financeTransactions);
  const invFn = useServerFn(financeInvoices);
  const setInv = useServerFn(financeSetInvoiceStatus);
  const [range, setRange] = useState<(typeof RANGES)[number]>("30d");

  const dash = useQuery({ queryKey: ["command", "revenue", range], queryFn: () => rev({ data: { range } }), retry: false });
  const tx = useQuery({ queryKey: ["command", "tx"], queryFn: () => txFn({ data: { status: "all", limit: 100 } }), retry: false });
  const inv = useQuery({ queryKey: ["command", "invoices"], queryFn: () => invFn({ data: { status: "all", limit: 100 } }), retry: false });

  const m = useMutation({
    mutationFn: (v: { id: string; status: "draft" | "issued" | "paid" | "void" }) => setInv({ data: v }),
    onSuccess: () => {
      toast.success("Invoice updated");
      qc.invalidateQueries({ queryKey: ["command", "invoices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const t = dash.data?.totals;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mono-tag" style={{ color: "var(--color-neon)" }}>◆ FINANCE & ACCOUNTING</p>
          <h1 className="text-2xl font-semibold">Revenue control</h1>
        </div>
        <Link to="/owner/finance" className="btn-ghost text-xs">Commission engine →</Link>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {RANGES.map((r) => (
          <button key={r} className="chip" onClick={() => setRange(r)}
            style={{
              background: range === r ? "rgba(0,200,83,0.14)" : "transparent",
              color: range === r ? "var(--color-neon)" : "var(--color-silver)",
              borderColor: "var(--color-hair-strong)",
            }}>{r}</button>
        ))}
      </div>

      {dash.error && <p className="text-sm" style={{ color: "var(--color-heat)" }}>{String((dash.error as Error).message)}</p>}

      {t && (
        <Panel tag="TOTALS" title={`Range · ${range}`}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Metric label="Gross revenue" value={money(t.gross)} hi />
            <Metric label="Platform fees" value={money(t.platformFees)} />
            <Metric label="Processor fees" value={money(t.processorFees)} />
            <Metric label="Refunds" value={money(t.refunds)} />
            <Metric label="Net" value={money(t.gross - t.processorFees - t.refunds)} />
            <Metric label="Transactions" value={num(t.transactions)} sub={`${t.failed} failed · ${t.pending} pending`} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mono-tag mb-2" style={{ color: "var(--color-silver)" }}>DAILY GROSS</p>
              <Bars data={dash.data!.series} />
            </div>
            <div>
              <p className="mono-tag mb-2" style={{ color: "var(--color-silver)" }}>REVENUE BY SOURCE</p>
              <Split data={dash.data!.bySource} />
            </div>
          </div>
        </Panel>
      )}

      <Panel tag="LEDGER" title="Recent transactions">
        {tx.isLoading && <p className="text-sm opacity-60">Loading…</p>}
        {tx.data && (tx.data.length === 0 ? <Empty /> : (
          <Table head={["Date", "Kind", "Gross", "Platform fee", "Provider", "Status"]}>
            {(tx.data as any[]).map((r) => (
              <tr key={r.id}>
                <Td><span className="text-[11px]">{when(r.created_at)}</span></Td>
                <Td><span className="mono-tag text-[10px]">{r.kind}</span></Td>
                <Td className="tabular-nums">{money(r.gross_cents, r.currency)}</Td>
                <Td className="tabular-nums">{money(r.platform_fee_cents, r.currency)}</Td>
                <Td>{r.provider ?? "—"}</Td>
                <Td><Pill tone={statusTone(r.status)}>{r.status}</Pill></Td>
              </tr>
            ))}
          </Table>
        ))}
      </Panel>

      <Panel tag="INVOICING" title="Invoices">
        {inv.isLoading && <p className="text-sm opacity-60">Loading…</p>}
        {inv.data && (inv.data.length === 0 ? <Empty label="No invoices issued yet" /> : (
          <Table head={["Number", "Customer", "Total", "Status", "Issued", "Actions"]}>
            {(inv.data as any[]).map((r) => (
              <tr key={r.id}>
                <Td><span className="mono-tag text-[11px]">{r.number}</span></Td>
                <Td><span className="truncate text-[12px]">{r.customer_name ?? r.customer_email ?? "—"}</span></Td>
                <Td className="tabular-nums">{money(r.total_cents, r.currency)}</Td>
                <Td><Pill tone={statusTone(r.status)}>{r.status}</Pill></Td>
                <Td><span className="text-[11px]">{when(r.issued_at)}</span></Td>
                <Td>
                  <div className="flex gap-1">
                    <button className="btn-ghost text-[11px]" disabled={m.isPending} onClick={() => m.mutate({ id: r.id, status: "paid" })}>Mark paid</button>
                    <button className="btn-ghost text-[11px]" disabled={m.isPending} onClick={() => m.mutate({ id: r.id, status: "void" })}>Void</button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        ))}
      </Panel>
    </div>
  );
}
