import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyTiers, upsertTier } from "@/lib/creator.functions";

export const Route = createFileRoute("/_authenticated/creator/tiers")({
  head: () => ({ meta: [{ title: "Tiers · ZOMBIEREX" }] }),
  component: TiersPage,
});

function fmtUSD(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

function TiersPage() {
  const qc = useQueryClient();
  const list = useServerFn(listMyTiers);
  const upsert = useServerFn(upsertTier);
  const { data } = useQuery({ queryKey: ["my-tiers"], queryFn: () => list() });

  const [name, setName] = useState("");
  const [price, setPrice] = useState(500);
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await upsert({ data: { name, price_cents: price, description: desc || null, currency: "USD", is_active: true } });
      setName(""); setPrice(500); setDesc("");
      qc.invalidateQueries({ queryKey: ["my-tiers"] });
    } catch (e: any) { setErr(e?.message ?? "Failed"); } finally { setBusy(false); }
  }

  return (
    <div className="pb-24">
      <div className="px-4 pt-6">
        <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>{(data ?? []).length} TIERS</p>
        <h1 className="serif mt-2 text-4xl italic" style={{ color: "var(--color-ink)" }}>Tiers</h1>
      </div>

      <div className="px-4 pt-4 space-y-2">
        {(data ?? []).map((t: any) => (
          <div key={t.id} className="border p-3" style={{ borderColor: "var(--color-hair-strong)", background: "rgba(255,255,255,0.02)" }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>{t.name}</p>
              <p className="mono-num font-bold" style={{ color: "var(--color-neon)" }}>{fmtUSD(t.price_cents)}/mo</p>
            </div>
            {t.description && <p className="mt-1 text-xs" style={{ color: "var(--color-silver)" }}>{t.description}</p>}
            <p className="mt-2 mono-tag" style={{ color: "var(--color-titanium)" }}>{t.subscribers_count ?? 0} SUBS</p>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="px-4 pt-6 space-y-3">
        <p className="mono-tag font-bold" style={{ color: "var(--color-titanium)" }}>NEW TIER</p>
        <input placeholder="Name (e.g. Garage Pass)" value={name} onChange={(e) => setName(e.target.value)}
          className="w-full border px-3 py-2 text-sm" style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }} required />
        <input type="number" min={100} step={100} value={price} onChange={(e) => setPrice(Number(e.target.value))}
          className="w-full border px-3 py-2 text-sm" style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }} />
        <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>PRICE · {fmtUSD(price)}/MO</p>
        <textarea placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3}
          className="w-full border px-3 py-2 text-sm" style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }} />
        {err && <p className="mono-tag" style={{ color: "#ff3d3d" }}>{err}</p>}
        <button disabled={busy || !name.trim()} className="btn-neon w-full" style={{ padding: "12px", fontSize: 11 }}>
          {busy ? "SAVING…" : "CREATE TIER ▸"}
        </button>
      </form>
    </div>
  );
}
