import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { StatusBar } from "@/components/StatusBar";
import { getListing, toggleSaveListing, reportListing, updateListing, deleteListing } from "@/lib/marketplace.functions";
import { startDirectMessage } from "@/lib/messages.functions";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/marketplace/$id")({
  head: ({ params }) => ({
    meta: [{ title: `Listing · ${params.id.slice(0, 8)} · ZOMBIEREX` }],
  }),
  component: ListingDetail,
  errorComponent: ({ error }) => <div className="p-6 text-sm text-red-400">Failed: {String(error)}</div>,
  notFoundComponent: () => <div className="p-6">Listing not found.</div>,
});

function fmtPrice(cents: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
}

function ListingDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const get = useServerFn(getListing);
  const toggleSave = useServerFn(toggleSaveListing);
  const report = useServerFn(reportListing);
  const update = useServerFn(updateListing);
  const del = useServerFn(deleteListing);
  const startDM = useServerFn(startDirectMessage);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [dmPending, setDmPending] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Spam");

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => get({ data: { id } }),
  });

  const saveMut = useMutation({
    mutationFn: () => toggleSave({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["listing", id] }),
  });
  const reportMut = useMutation({
    mutationFn: () => report({ data: { id, reason: reportReason } }),
    onSuccess: () => setReportOpen(false),
  });
  const markSold = useMutation({
    mutationFn: () => update({ data: { id, patch: {}, status: "sold" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["listing", id] }),
  });
  const del2 = useMutation({
    mutationFn: () => del({ data: { id } }),
    onSuccess: () => navigate({ to: "/marketplace" }),
  });

  if (isLoading) return <div className="p-6 mono-tag">LOADING…</div>;
  if (!listing) return <div className="p-6">Not found.</div>;
  const l = listing as any;
  const photos: any[] = l.photos?.length ? l.photos : (l.hero_image_url ? [{ url: l.hero_image_url }] : []);
  const [meRes] = [null]; void meRes;

  const isMine = false; // simplified; owner actions gated by RLS anyway

  return (
    <div className="pb-32">
      <StatusBar index={l.category?.slice(0,3).toUpperCase() ?? "LST"} section={String(l.title).toUpperCase().slice(0, 24)} />

      {/* Gallery */}
      <div className="relative aspect-square w-full" style={{ background: "var(--color-slate)" }}>
        {photos[photoIdx]?.is_video ? (
          <video src={photos[photoIdx].url} controls className="h-full w-full object-cover" />
        ) : photos[photoIdx]?.url ? (
          <img src={photos[photoIdx].url} className="h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-x-0 bottom-0 flex gap-1 p-2 overflow-x-auto no-scrollbar">
          {photos.map((p, i) => (
            <button key={i} onClick={() => setPhotoIdx(i)}
              className="h-12 w-12 shrink-0 border-2"
              style={{ borderColor: i === photoIdx ? "var(--color-neon)" : "transparent" }}>
              <img src={p.thumbnail_url || p.url} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        <p className="mono-tag font-bold" style={{ color: "var(--color-neon)" }}>
          {String(l.category).toUpperCase()}{l.year && ` · ${l.year}`}{l.brand && ` · ${String(l.brand).toUpperCase()}`}{l.model && ` ${l.model.toUpperCase()}`}
        </p>
        <h1 className="serif mt-2 text-3xl italic leading-tight" style={{ color: "var(--color-ink)" }}>{l.title}</h1>
        <div className="mt-2 flex items-baseline justify-between">
          <p className="mono-num text-3xl font-bold" style={{ color: "var(--color-neon)" }}>
            {fmtPrice(l.price_cents, l.currency)}
            {l.is_negotiable && <span className="mono-tag ml-2" style={{ color: "var(--color-neon)" }}>OBO</span>}
          </p>
          {l.city && <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>{[l.city, l.region, l.country].filter(Boolean).join(" · ").toUpperCase()}</p>}
        </div>

        {/* Buy actions */}
        {l.status === "active" && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate({ to: "/checkout/$id", params: { id: l.id } })}
              className="tap py-4 mono-tag font-bold text-black"
              style={{ background: "var(--color-neon)", boxShadow: "0 0 24px rgba(0,200,83,0.45)" }}
            >
              BUY NOW ▸
            </button>
            <button
              onClick={() => navigate({ to: "/cart", search: { add: l.id } as any })}
              className="tap py-4 mono-tag font-bold border"
              style={{ borderColor: "var(--color-neon)", color: "var(--color-neon)" }}
            >
              ADD TO CART
            </button>
          </div>
        )}
        {l.status === "sold" && (
          <div className="mt-4 py-4 text-center mono-tag font-bold border" style={{ borderColor: "#ff3d3d", color: "#ff3d3d" }}>
            SOLD OUT
          </div>
        )}
      </div>




      {/* Actions */}
      <div className="mx-4 mt-4 grid grid-cols-4 gap-2">
        <ActionBtn onClick={() => saveMut.mutate()} active={l.saved_by_me}>
          {l.saved_by_me ? "SAVED" : "SAVE"}
        </ActionBtn>
        <ActionBtn onClick={async () => {
          const url = window.location.href;
          if (navigator.share) navigator.share({ title: l.title, url }).catch(() => {});
          else navigator.clipboard.writeText(url);
        }}>SHARE</ActionBtn>
        <ActionBtn onClick={async () => {
          const { data: sess } = await supabase.auth.getSession();
          if (!sess.session) { navigate({ to: "/auth" }); return; }
          if (!l.seller?.id) { navigate({ to: "/messages" }); return; }
          if (sess.session.user.id === l.seller.id) { navigate({ to: "/messages" }); return; }
          try {
            setDmPending(true);
            const res: any = await startDM({ data: { recipientId: l.seller.id } });
            navigate({ to: "/messages/$id", params: { id: res.id } });
          } catch (e: any) {
            alert(e?.message ?? "Could not open chat");
          } finally { setDmPending(false); }
        }}>{dmPending ? "…" : "MESSAGE"}</ActionBtn>

        <ActionBtn onClick={() => setReportOpen(true)}>REPORT</ActionBtn>
      </div>

      {/* Specs */}
      <div className="mx-4 mt-6 border" style={{ borderColor: "var(--color-hair-strong)" }}>
        <SpecRow k="CONDITION" v={String(l.condition ?? "—").replace("_"," ")} />
        {l.mileage_km != null && <SpecRow k="MILEAGE" v={`${l.mileage_km.toLocaleString()} km`} />}
        {l.engine_cc != null && <SpecRow k="ENGINE" v={`${l.engine_cc} cc`} />}
        {l.fuel_type && l.fuel_type !== "na" && <SpecRow k="FUEL" v={l.fuel_type} />}
        {l.transmission && l.transmission !== "na" && <SpecRow k="TRANS." v={l.transmission} />}
        {l.color && <SpecRow k="COLOR" v={l.color} />}
        {l.vin && <SpecRow k="VIN" v={l.vin} />}
      </div>

      {/* Description */}
      {l.description && (
        <div className="px-4 pt-6">
          <p className="mono-tag font-bold" style={{ color: "var(--color-titanium)" }}>DESCRIPTION</p>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-ink)" }}>
            {l.description}
          </p>
        </div>
      )}

      {/* Seller */}
      {l.seller && (
        <Link to="/marketplace/seller/$id" params={{ id: l.seller.id }} className="mx-4 mt-6 flex items-center gap-3 border p-3"
          style={{ borderColor: "var(--color-hair-strong)", background: "rgba(255,255,255,0.02)" }}>
          {l.seller.avatar_url
            ? <img src={l.seller.avatar_url} className="h-12 w-12 rounded-full object-cover" />
            : <div className="h-12 w-12 rounded-full" style={{ background: "var(--color-slate)" }} />}
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>{l.seller.display_name ?? l.seller.handle}</p>
            <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
              @{l.seller.handle} · ★ {Number(l.seller.seller_rating_avg ?? 0).toFixed(1)} · {l.seller.listings_count ?? 0} LISTINGS
            </p>
          </div>
          <span className="mono-tag font-bold" style={{ color: "var(--color-neon)" }}>VIEW ▸</span>
        </Link>
      )}

      {/* Stats */}
      <div className="mx-4 mt-4 grid grid-cols-3 border" style={{ borderColor: "var(--color-hair-strong)" }}>
        <Stat k="VIEWS" v={l.views_count ?? 0} />
        <Stat k="SAVES" v={l.saves_count ?? 0} />
        <Stat k="PHOTOS" v={photos.length} />
      </div>

      {isMine && (
        <div className="mx-4 mt-6 grid grid-cols-2 gap-2">
          <button onClick={() => markSold.mutate()} className="tap border py-3 mono-tag font-bold"
            style={{ borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }}>MARK SOLD</button>
          <button onClick={() => { if (confirm("Delete listing?")) del2.mutate(); }}
            className="tap border py-3 mono-tag font-bold"
            style={{ borderColor: "#ff3d3d", color: "#ff3d3d" }}>DELETE</button>
        </div>
      )}

      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setReportOpen(false)}>
          <div className="w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--color-obsidian)", borderTop: "1px solid var(--color-hair-strong)" }}>
            <p className="mono-tag font-bold" style={{ color: "var(--color-neon)" }}>REPORT LISTING</p>
            <select value={reportReason} onChange={(e) => setReportReason(e.target.value)}
              className="mt-3 w-full border px-3 py-3 text-sm"
              style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }}>
              {["Spam","Scam / Fraud","Prohibited item","Misleading","Offensive","Other"].map((r) => <option key={r}>{r}</option>)}
            </select>
            <button onClick={() => reportMut.mutate()} disabled={reportMut.isPending}
              className="btn-neon mt-3 w-full py-3" style={{ fontSize: 11 }}>
              {reportMut.isPending ? "SENDING…" : "SUBMIT REPORT ▸"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBtn({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} className="tap border py-3 mono-tag font-bold"
      style={{
        borderColor: active ? "var(--color-neon)" : "var(--color-hair-strong)",
        color: active ? "#0a0a0a" : "var(--color-ink)",
        background: active ? "var(--color-neon)" : "transparent",
      }}>{children}</button>
  );
}

function SpecRow({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="flex justify-between border-b px-3 py-2 last:border-b-0" style={{ borderColor: "var(--color-hair)" }}>
      <span className="mono-tag" style={{ color: "var(--color-titanium)" }}>{k}</span>
      <span className="mono-num text-sm" style={{ color: "var(--color-ink)" }}>{v}</span>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: number }) {
  return (
    <div className="border-r py-3 text-center last:border-r-0" style={{ borderColor: "var(--color-hair)" }}>
      <p className="mono-num text-lg font-bold" style={{ color: "var(--color-ink)" }}>{v}</p>
      <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>{k}</p>
    </div>
  );
}
