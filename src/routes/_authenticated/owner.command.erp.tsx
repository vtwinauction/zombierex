import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { erpAdjustStock, erpOverview, erpUpsertStockItem } from "@/lib/command.functions";
import { Empty, Metric, Panel, Pill, Table, Td, inputStyle, money, num, when } from "@/components/command/ui";

export const Route = createFileRoute("/_authenticated/owner/command/erp")({
  head: () => ({
    meta: [
      { title: "ERP · Mission Control · ZOMBIEREX" },
      { name: "description", content: "Inventory, warehouses, suppliers and purchase orders." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "ERP · Mission Control" },
      { property: "og:description", content: "ZOMBIEREX inventory and supply operations." },
    ],
  }),
  component: ErpPage,
});

function ErpPage() {
  const qc = useQueryClient();
  const load = useServerFn(erpOverview);
  const upsert = useServerFn(erpUpsertStockItem);
  const adjust = useServerFn(erpAdjustStock);

  const q = useQuery({ queryKey: ["command", "erp"], queryFn: () => load({ data: undefined as never }), retry: false });
  const [form, setForm] = useState({ name: "", sku: "", qty: "", reorder: "", cost: "", price: "" });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["command", "erp"] });

  const addM = useMutation({
    mutationFn: () =>
      upsert({
        data: {
          name: form.name.trim(),
          sku: form.sku.trim() || undefined,
          qty_on_hand: Number(form.qty || 0),
          reorder_level: Number(form.reorder || 0),
          cost_cents: Math.round(Number(form.cost || 0) * 100),
          price_cents: Math.round(Number(form.price || 0) * 100),
          currency: "USD",
        },
      }),
    onSuccess: () => {
      toast.success("Stock item saved");
      setForm({ name: "", sku: "", qty: "", reorder: "", cost: "", price: "" });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const adjM = useMutation({
    mutationFn: (v: { stock_item_id: string; qty: number }) =>
      adjust({ data: { ...v, kind: "adjustment", reason: "Manual adjustment from Mission Control" } }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <p className="text-sm opacity-60">Loading ERP…</p>;
  if (q.error) return <p className="text-sm" style={{ color: "var(--color-heat)" }}>{String((q.error as Error).message)}</p>;
  const d = q.data!;

  return (
    <div className="space-y-5">
      <div>
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>◆ ERP</p>
        <h1 className="text-2xl font-semibold">Inventory & supply</h1>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Metric label="Stock items" value={num(d.stock.length)} />
        <Metric label="Stock value" value={money(d.stockValueCents)} hi />
        <Metric label="Low stock" value={num(d.lowStock.length)} />
        <Metric label="Suppliers" value={num(d.suppliers.length)} />
        <Metric label="Warehouses" value={num(d.warehouses.length)} />
      </div>

      <Panel tag="NEW ITEM" title="Add or update stock">
        <div className="grid gap-2 sm:grid-cols-7">
          <input style={inputStyle} placeholder="Item name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input style={inputStyle} placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <input style={inputStyle} type="number" placeholder="Qty" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
          <input style={inputStyle} type="number" placeholder="Reorder at" value={form.reorder} onChange={(e) => setForm({ ...form, reorder: e.target.value })} />
          <input style={inputStyle} type="number" placeholder="Cost" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          <input style={inputStyle} type="number" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <button className="btn-solid text-xs" disabled={!form.name.trim() || addM.isPending} onClick={() => addM.mutate()}>Save</button>
        </div>
      </Panel>

      <Panel tag="INVENTORY" title="Stock levels">
        {d.stock.length === 0 ? <Empty label="No stock items yet" /> : (
          <Table head={["Item", "SKU", "On hand", "Reorder", "Cost", "Price", "Adjust"]}>
            {(d.stock as any[]).map((s) => {
              const low = Number(s.qty_on_hand) <= Number(s.reorder_level);
              return (
                <tr key={s.id}>
                  <Td>
                    <span className="truncate text-[13px]">{s.name}</span>
                    {low && <span className="ml-2"><Pill tone="bad">LOW</Pill></span>}
                  </Td>
                  <Td><span className="mono-tag text-[10px]">{s.sku ?? "—"}</span></Td>
                  <Td className="tabular-nums">{num(s.qty_on_hand)}</Td>
                  <Td className="tabular-nums">{num(s.reorder_level)}</Td>
                  <Td className="tabular-nums">{money(s.cost_cents, s.currency)}</Td>
                  <Td className="tabular-nums">{money(s.price_cents, s.currency)}</Td>
                  <Td>
                    <div className="flex gap-1">
                      <button className="btn-ghost text-[11px]" onClick={() => adjM.mutate({ stock_item_id: s.id, qty: 1 })}>+1</button>
                      <button className="btn-ghost text-[11px]" onClick={() => adjM.mutate({ stock_item_id: s.id, qty: -1 })}>−1</button>
                      <button className="btn-ghost text-[11px]" onClick={() => {
                        const v = prompt("Adjust quantity by (use negative to remove):");
                        if (v) adjM.mutate({ stock_item_id: s.id, qty: Number(v) });
                      }}>Set</button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel tag="SUPPLIERS" title={`Suppliers (${d.suppliers.length})`}>
          {d.suppliers.length === 0 ? <Empty /> : (
            <ul className="space-y-2 text-[13px]">
              {(d.suppliers as any[]).map((s) => (
                <li key={s.id} className="flex justify-between"><span className="truncate">{s.name}</span><span className="text-[11px]" style={{ color: "var(--color-silver)" }}>{s.email ?? s.phone ?? "—"}</span></li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel tag="PROCUREMENT" title={`Purchase orders (${d.purchaseOrders.length})`}>
          {d.purchaseOrders.length === 0 ? <Empty /> : (
            <Table head={["Reference", "Status", "Total", "Created"]}>
              {(d.purchaseOrders as any[]).map((p) => (
                <tr key={p.id}>
                  <Td><span className="mono-tag text-[11px]">{p.reference ?? p.id.slice(0, 8)}</span></Td>
                  <Td><Pill>{p.status}</Pill></Td>
                  <Td className="tabular-nums">{money(p.total_cents, p.currency)}</Td>
                  <Td><span className="text-[11px]">{when(p.created_at)}</span></Td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>
      </div>
    </div>
  );
}
