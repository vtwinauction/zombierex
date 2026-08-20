import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { adsDecideRequest, adsUpsertPlacement, adsWorkspace } from "@/lib/command.functions";
import { Empty, Metric, Panel, Pill, Table, Td, inputStyle, money, num, statusTone, when } from "@/components/command/ui";
import { DEFAULT_CURRENCY, toDecimalString, toMinorUnits } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/owner/command/ads")({
  head: () => ({
    meta: [
      { title: "Advertising · Mission Control · ZOMBIEREX" },
      { name: "description", content: "Review advertising requests, price placements and track campaign performance." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Advertising · Mission Control" },
      { property: "og:description", content: "ZOMBIEREX advertising management." },
    ],
  }),
  component: AdsPage,
});

function AdsPage() {
  const qc = useQueryClient();
  const load = useServerFn(adsWorkspace);
  const decide = useServerFn(adsDecideRequest);
  const upsert = useServerFn(adsUpsertPlacement);

  const q = useQuery({ queryKey: ["command", "ads"], queryFn: () => load({ data: undefined as never }), retry: false });

  const [form, setForm] = useState({ key: "", label: "", price: "", days: "7" });

  const dm = useMutation({
    mutationFn: (v: { id: string; status: any; price_cents?: number; createInvoice?: boolean; admin_notes?: string }) =>
      decide({ data: { createInvoice: false, ...v } }),
    onSuccess: () => {
      toast.success("Advertising request updated");
      qc.invalidateQueries({ queryKey: ["command", "ads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pm = useMutation({
    mutationFn: () =>
      upsert({
        data: {
          key: form.key.trim(),
          label: form.label.trim(),
          price_cents: Math.round(Number(form.price) * 100),
          currency: "USD",
          duration_days: Number(form.days),
          is_available: true,
        },
      }),
    onSuccess: () => {
      toast.success("Placement saved");
      setForm({ key: "", label: "", price: "", days: "7" });
      qc.invalidateQueries({ queryKey: ["command", "ads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <p className="text-sm opacity-60">Loading advertising workspace…</p>;
  if (q.error) return <p className="text-sm" style={{ color: "var(--color-heat)" }}>{String((q.error as Error).message)}</p>;
  const d = q.data!;

  return (
    <div className="space-y-5">
      <div>
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>◆ ADVERTISING</p>
        <h1 className="text-2xl font-semibold">Ads management</h1>
      </div>

      <Panel tag="PERFORMANCE" title="Campaign analytics">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Metric label="Active campaigns" value={num(d.analytics.active)} hi />
          <Metric label="Impressions" value={num(d.analytics.impressions)} />
          <Metric label="Clicks" value={num(d.analytics.clicks)} />
          <Metric label="CTR" value={`${((d.analytics.clicks / Math.max(1, d.analytics.impressions)) * 100).toFixed(2)}%`} />
          <Metric label="Spend" value={money(d.analytics.spend)} />
        </div>
      </Panel>

      <Panel tag="INBOX" title={`Advertising requests (${d.requests.length})`}>
        {d.requests.length === 0 ? <Empty label="No advertising requests" /> : (
          <Table head={["Campaign", "Budget", "Window", "Placements", "Status", "Actions"]}>
            {(d.requests as any[]).map((r) => (
              <tr key={r.id}>
                <Td>
                  <p className="truncate text-[13px]">{r.campaign_name}</p>
                  <p className="mono-tag text-[10px]" style={{ color: "var(--color-silver)" }}>{r.objective}</p>
                </Td>
                <Td className="tabular-nums">{money(r.budget_cents, r.currency)}</Td>
                <Td><span className="text-[11px]">{r.start_date ?? "—"} → {r.end_date ?? "—"}</span></Td>
                <Td><span className="text-[11px]">{(r.placements ?? []).join(", ") || "—"}</span></Td>
                <Td><Pill tone={statusTone(r.status)}>{r.status}</Pill></Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    <button className="btn-ghost text-[11px]" disabled={dm.isPending}
                      onClick={() => {
                        const price = prompt(`Approved price in ${r.currency ?? DEFAULT_CURRENCY}?`, toDecimalString(r.budget_cents ?? 0, r.currency ?? DEFAULT_CURRENCY));
                        if (price === null) return;
                        dm.mutate({ id: r.id, status: "approved", price_cents: toMinorUnits(Number(price) || 0, r.currency ?? DEFAULT_CURRENCY), createInvoice: true });
                      }}>Approve + invoice</button>
                    <button className="btn-ghost text-[11px]" disabled={dm.isPending} onClick={() => dm.mutate({ id: r.id, status: "active" })}>Activate</button>
                    <button className="btn-ghost text-[11px]" disabled={dm.isPending} onClick={() => dm.mutate({ id: r.id, status: "paused" })}>Pause</button>
                    <button className="btn-ghost text-[11px]" disabled={dm.isPending}
                      onClick={() => {
                        const notes = prompt("Rejection reason?") ?? undefined;
                        if (notes) dm.mutate({ id: r.id, status: "rejected", admin_notes: notes });
                      }}>Reject</button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>

      <Panel tag="PRICING" title="Ad placements & rate card">
        <div className="grid gap-2 sm:grid-cols-5">
          <input style={inputStyle} placeholder="key (feed_top)" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
          <input style={inputStyle} placeholder="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <input style={inputStyle} type="number" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <input style={inputStyle} type="number" placeholder="Days" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} />
          <button className="btn-solid text-xs" disabled={pm.isPending || !form.key || !form.label} onClick={() => pm.mutate()}>Save placement</button>
        </div>
        <div className="mt-3">
          {d.placements.length === 0 ? <Empty label="No placements configured" /> : (
            <Table head={["Key", "Label", "Price", "Duration", "Available"]}>
              {(d.placements as any[]).map((p) => (
                <tr key={p.id}>
                  <Td><span className="mono-tag text-[11px]">{p.key}</span></Td>
                  <Td>{p.label}</Td>
                  <Td className="tabular-nums">{money(p.price_cents, p.currency)}</Td>
                  <Td>{p.duration_days}d</Td>
                  <Td><Pill tone={p.is_available ? "ok" : "muted"}>{p.is_available ? "LIVE" : "OFF"}</Pill></Td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </Panel>

      <Panel tag="CAMPAIGNS" title={`Running campaigns (${d.campaigns.length})`}>
        {d.campaigns.length === 0 ? <Empty /> : (
          <Table head={["Campaign", "Status", "Budget", "Spent", "Impr.", "Clicks", "Ends"]}>
            {(d.campaigns as any[]).map((c) => (
              <tr key={c.id}>
                <Td><span className="truncate text-[13px]">{c.name}</span></Td>
                <Td><Pill tone={statusTone(c.status)}>{c.status}</Pill></Td>
                <Td className="tabular-nums">{money(c.budget_total_cents, c.currency)}</Td>
                <Td className="tabular-nums">{money(c.spent_cents, c.currency)}</Td>
                <Td>{num(c.impressions_count)}</Td>
                <Td>{num(c.clicks_count)}</Td>
                <Td><span className="text-[11px]">{when(c.end_at)}</span></Td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </div>
  );
}
