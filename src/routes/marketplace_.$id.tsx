import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Heart,
  Share2,
  MessageCircle,
  Flag,
  ArrowRight,
  ChevronRight,
  BadgeCheck,
} from "lucide-react";
import {
  getListing,
  toggleSaveListing,
  reportListing,
  updateListing,
  deleteListing,
} from "@/lib/marketplace.functions";
import { startDirectMessage } from "@/lib/messages.functions";
import { addToCart } from "@/lib/cart.functions";
import { confirmDialog } from "@/lib/confirm";
import { toast } from "sonner";
import { ShareSheet } from "@/components/ShareSheet";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/marketplace_/$id")({
  head: ({ params }) => ({
    meta: [{ title: `Listing · ${params.id.slice(0, 8)} · ZOMBIEREX` }],
  }),
  component: ListingDetail,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-red-400">Failed: {String(error)}</div>
  ),
  notFoundComponent: () => <div className="p-6">Listing not found.</div>,
});

function fmtPrice(cents: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
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
  const addToCartFn = useServerFn(addToCart);
  const addCartMut = useMutation({
    mutationFn: (listingId: string) => addToCartFn({ data: { listingId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Added to cart");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to add to cart"),
  });
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
  const photos: any[] = l.photos?.length
    ? l.photos
    : l.hero_image_url
      ? [{ url: l.hero_image_url }]
      : [];
  const cur = photos[photoIdx];
  const curIsVideo = cur && (cur.is_video || /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(cur.url ?? ""));
  const [meRes] = [null];
  void meRes;

  const isMine = false; // simplified; owner actions gated by RLS anyway

  return (
    <div className="pb-32" style={{ background: "var(--color-bone, #F2F2F0)" }}>
      {/* Gallery */}
      <div
        className="relative aspect-[4/5] w-full overflow-hidden"
        style={{ background: "var(--color-slate)" }}
      >
        {curIsVideo ? (
          <video src={cur.url} controls playsInline className="h-full w-full object-cover" />
        ) : cur?.url ? (
          <img src={cur.url} alt={l.title} className="h-full w-full object-cover" />
        ) : null}

        {/* Verified tag */}
        <div className="absolute top-4 left-4">
          <span
            className="mono-tag font-bold px-2 py-1"
            style={{
              background: "var(--color-ink)",
              color: "var(--color-neon)",
              letterSpacing: "0.18em",
            }}
          >
            {l.is_featured ? "FEATURED" : l.status === "sold" ? "SOLD" : "VERIFIED LISTING"}
          </span>
        </div>

        {/* Gallery index */}
        {photos.length > 1 && (
          <div className="absolute bottom-6 inset-x-0 px-6 flex items-center justify-between">
            <div className="flex gap-1.5">
              {photos.slice(0, 5).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPhotoIdx(i)}
                  aria-label={`Photo ${i + 1}`}
                  className="h-[2px] w-8"
                  style={{
                    background:
                      i === photoIdx
                        ? "var(--color-ink)"
                        : "color-mix(in oklab, var(--color-ink) 20%, transparent)",
                  }}
                />
              ))}
            </div>
            <span className="mono-num text-[10px] font-bold" style={{ color: "var(--color-ink)" }}>
              {String(photoIdx + 1).padStart(2, "0")}{" "}
              <span style={{ opacity: 0.4 }}>/ {String(photos.length).padStart(2, "0")}</span>
            </span>
          </div>
        )}
      </div>

      {/* Content sheet */}
      <div
        className="relative z-10 -mt-6 rounded-t-3xl p-6 space-y-8"
        style={{ background: "var(--color-cream, #FFFFFF)" }}
      >
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <span
              className="mono-tag"
              style={{ color: "var(--color-titanium)", letterSpacing: "0.2em" }}
            >
              {String(l.category).toUpperCase()}
              {l.year && ` // ${l.year}`}
              {l.brand && ` // ${String(l.brand).toUpperCase()}`}
            </span>
            <ShareSheet
              type="listing"
              id={id}
              title={l.title}
              subtitle={l.city ? `${l.city}, ${l.country || ""}` : undefined}
            >
              <button
                className="shrink-0 -mt-1 -mr-1 p-1"
                aria-label="Share"
                style={{ color: "var(--color-ink)" }}
              >
                <Share2 className="h-[18px] w-[18px]" strokeWidth={1.5} />
              </button>
            </ShareSheet>
          </div>
          <h1
            className="serif italic leading-[1.05] text-[38px]"
            style={{ color: "var(--color-ink)" }}
          >
            {l.title}
          </h1>
          {l.model && (
            <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
              MODEL · {String(l.model).toUpperCase()}
            </p>
          )}
        </div>

        {/* Pricing + CTAs */}
        <div className="space-y-4">
          <div className="flex items-baseline flex-wrap gap-2">
            <span
              className="mono-num text-[28px] font-bold leading-none"
              style={{ color: "var(--color-neon)" }}
            >
              {fmtPrice(l.price_cents, l.currency)}
            </span>
            {l.is_negotiable && (
              <span
                className="mono-tag font-bold px-2 py-0.5"
                style={{ background: "var(--color-ink)", color: "var(--color-neon)" }}
              >
                OBO
              </span>
            )}
            {l.city && (
              <span className="mono-tag ml-auto" style={{ color: "var(--color-titanium)" }}>
                {[l.city, l.country].filter(Boolean).join(" · ").toUpperCase()}
              </span>
            )}
          </div>

          {l.status === "active" && (
            <div className="space-y-2.5">
              <button
                onClick={() => navigate({ to: "/checkout/order/$id", params: { id: l.id } })}
                className="tap group w-full flex items-center justify-between px-5 py-4"
                style={{ background: "var(--color-ink)", color: "#FFFFFF" }}
              >
                <span className="mono-tag font-bold" style={{ letterSpacing: "0.22em" }}>
                  BUY NOW
                </span>
                <ArrowRight
                  className="h-5 w-5 transition-transform group-hover:translate-x-1"
                  style={{ color: "var(--color-neon)" }}
                  strokeWidth={2}
                />
              </button>
              <button
                onClick={() => addCartMut.mutate(l.id)}
                disabled={addCartMut.isPending}
                className="tap w-full border py-4 mono-tag font-bold disabled:opacity-60"
                style={{
                  borderColor: "var(--color-ink)",
                  color: "var(--color-ink)",
                  letterSpacing: "0.22em",
                }}
              >
                {addCartMut.isPending ? "ADDING…" : "ADD TO CART"}
              </button>
            </div>
          )}
          {l.status === "sold" && (
            <div
              className="py-4 text-center mono-tag font-bold border"
              style={{ borderColor: "#ff3d3d", color: "#ff3d3d", letterSpacing: "0.22em" }}
            >
              SOLD OUT
            </div>
          )}
        </div>

        {/* Action row */}
        <div
          className="grid grid-cols-4 py-2 border-y"
          style={{ borderColor: "var(--color-hair)" }}
        >
          <IconAction
            icon={
              <Heart
                className="h-[18px] w-[18px]"
                strokeWidth={1.5}
                fill={l.saved_by_me ? "currentColor" : "none"}
              />
            }
            label={l.saved_by_me ? "SAVED" : "SAVE"}
            active={l.saved_by_me}
            onClick={() => saveMut.mutate()}
          />
          <ShareSheet
            type="listing"
            id={id}
            title={l.title}
            subtitle={l.city ? `${l.city}, ${l.country || ""}` : undefined}
          >
            <IconAction
              icon={<Share2 className="h-[18px] w-[18px]" strokeWidth={1.5} />}
              label="SHARE"
            />
          </ShareSheet>
          <IconAction
            icon={<MessageCircle className="h-[18px] w-[18px]" strokeWidth={1.5} />}
            label={dmPending ? "…" : "MESSAGE"}
            onClick={async () => {
              const { data: sess } = await supabase.auth.getSession();
              if (!sess.session) {
                navigate({ to: "/auth" });
                return;
              }
              if (!l.seller?.id) {
                navigate({ to: "/messages" });
                return;
              }
              if (sess.session.user.id === l.seller.id) {
                navigate({ to: "/messages" });
                return;
              }
              try {
                setDmPending(true);
                const res: any = await startDM({ data: { recipientId: l.seller.id } });
                navigate({ to: "/messages/$id", params: { id: res.id } });
              } catch (e: any) {
                toast.error(e?.message ?? "Could not open chat");
              } finally {
                setDmPending(false);
              }
            }}
          />
          <IconAction
            icon={<Flag className="h-[18px] w-[18px]" strokeWidth={1.5} />}
            label="REPORT"
            muted
            onClick={() => setReportOpen(true)}
          />
        </div>

        {/* Specs */}
        <div className="space-y-4">
          <SectionLabel>TECHNICAL SPECIFICATIONS</SectionLabel>
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            <SpecCell k="CONDITION" v={String(l.condition ?? "—").replace("_", " ")} />
            {l.mileage_km != null && (
              <SpecCell k="MILEAGE" v={`${l.mileage_km.toLocaleString()} KM`} />
            )}
            {l.engine_cc != null && <SpecCell k="ENGINE" v={`${l.engine_cc} CC`} />}
            {l.fuel_type && l.fuel_type !== "na" && (
              <SpecCell k="FUEL" v={String(l.fuel_type).toUpperCase()} />
            )}
            {l.transmission && l.transmission !== "na" && (
              <SpecCell k="TRANS." v={String(l.transmission).toUpperCase()} />
            )}
            {l.color && <SpecCell k="COLOR" v={String(l.color).toUpperCase()} />}
            {l.vin && <SpecCell k="VIN" v={l.vin} />}
          </div>
        </div>

        {/* Description */}
        {l.description && (
          <div className="space-y-3">
            <SectionLabel>DESCRIPTION</SectionLabel>
            <p
              className="text-[14px] leading-relaxed whitespace-pre-wrap"
              style={{ color: "color-mix(in oklab, var(--color-ink) 78%, transparent)" }}
            >
              {l.description}
            </p>
          </div>
        )}

        {/* Seller */}
        {l.seller && (
          <Link
            to="/marketplace/seller/$id"
            params={{ id: l.seller.id }}
            className="group flex items-center justify-between gap-3 border p-4"
            style={{
              borderColor: "var(--color-hair-strong)",
              background: "color-mix(in oklab, var(--color-ink) 3%, transparent)",
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              {l.seller.avatar_url ? (
                <img src={l.seller.avatar_url} className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <div
                  className="h-11 w-11 rounded-full flex items-center justify-center mono-tag font-bold"
                  style={{ background: "var(--color-ink)", color: "var(--color-neon)" }}
                >
                  {(l.seller.display_name ?? l.seller.handle ?? "?").slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold truncate" style={{ color: "var(--color-ink)" }}>
                    {l.seller.display_name ?? l.seller.handle}
                  </p>
                  <BadgeCheck
                    className="h-4 w-4 shrink-0"
                    style={{ color: "var(--color-neon)" }}
                    strokeWidth={2}
                  />
                </div>
                <p className="mono-tag mt-0.5" style={{ color: "var(--color-titanium)" }}>
                  ★ {Number(l.seller.seller_rating_avg ?? 0).toFixed(1)} ·{" "}
                  {l.seller.listings_count ?? 0} LISTINGS
                </p>
              </div>
            </div>
            <ChevronRight
              className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5"
              style={{ color: "var(--color-ink)" }}
              strokeWidth={1.5}
            />
          </Link>
        )}

        {/* Stats */}
        <div
          className="grid grid-cols-3 border"
          style={{ borderColor: "var(--color-hair-strong)" }}
        >
          <Stat k="VIEWS" v={l.views_count ?? 0} />
          <Stat k="SAVES" v={l.saves_count ?? 0} />
          <Stat k="PHOTOS" v={photos.length} />
        </div>

        {isMine && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => markSold.mutate()}
              className="tap border py-3 mono-tag font-bold"
              style={{ borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }}
            >
              MARK SOLD
            </button>
            <button
              onClick={async () => {
                if (
                  await confirmDialog({
                    title: "Delete listing?",
                    description: "This cannot be undone.",
                    destructive: true,
                    confirmLabel: "Delete",
                  })
                )
                  del2.mutate();
              }}
              className="tap border py-3 mono-tag font-bold"
              style={{ borderColor: "#ff3d3d", color: "#ff3d3d" }}
            >
              DELETE
            </button>
          </div>
        )}
      </div>

      {reportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setReportOpen(false)}
        >
          <div
            className="w-full max-w-md p-4"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--color-obsidian)",
              borderTop: "1px solid var(--color-hair-strong)",
            }}
          >
            <p className="mono-tag font-bold" style={{ color: "var(--color-neon)" }}>
              REPORT LISTING
            </p>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="mt-3 w-full border px-3 py-3 text-sm"
              style={{
                background: "rgba(255,255,255,0.03)",
                borderColor: "var(--color-hair-strong)",
                color: "var(--color-ink)",
              }}
            >
              {["Spam", "Scam / Fraud", "Prohibited item", "Misleading", "Offensive", "Other"].map(
                (r) => (
                  <option key={r}>{r}</option>
                ),
              )}
            </select>
            <button
              onClick={() => reportMut.mutate()}
              disabled={reportMut.isPending}
              className="btn-neon mt-3 w-full py-3"
              style={{ fontSize: 11 }}
            >
              {reportMut.isPending ? "SENDING…" : "SUBMIT REPORT ▸"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function IconAction({
  icon,
  label,
  onClick,
  active,
  muted,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap flex flex-col items-center gap-1.5 py-2"
      style={{
        color: active
          ? "var(--color-neon)"
          : muted
            ? "color-mix(in oklab, var(--color-ink) 45%, transparent)"
            : "var(--color-ink)",
      }}
    >
      {icon}
      <span
        className="mono-tag font-bold"
        style={{ fontSize: 9, letterSpacing: "0.18em", color: "var(--color-titanium)" }}
      >
        {label}
      </span>
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <span
        className="mono-tag font-bold"
        style={{ color: "var(--color-ink)", letterSpacing: "0.2em" }}
      >
        {children}
      </span>
      <div className="h-px flex-1" style={{ background: "var(--color-hair)" }} />
    </div>
  );
}

function SpecCell({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="space-y-1">
      <p
        className="mono-tag"
        style={{ color: "var(--color-titanium)", fontSize: 9, letterSpacing: "0.18em" }}
      >
        {k}
      </p>
      <p className="mono-num text-sm font-medium" style={{ color: "var(--color-ink)" }}>
        {v}
      </p>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: number }) {
  return (
    <div
      className="border-r py-3 text-center last:border-r-0"
      style={{ borderColor: "var(--color-hair)" }}
    >
      <p className="mono-num text-lg font-bold" style={{ color: "var(--color-ink)" }}>
        {v}
      </p>
      <p className="mono-tag mt-0.5" style={{ color: "var(--color-titanium)" }}>
        {k}
      </p>
    </div>
  );
}
