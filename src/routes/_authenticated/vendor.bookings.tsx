import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  addWorkMedia,
  listVendorBookings,
  sendQuote,
  updateBookingStatus,
} from "@/lib/bookings.functions";
import {
  BOOKING_STATUS_LABEL,
  OPEN_BOOKING_STATUSES,
  VENDOR_NEXT_STATUS,
} from "@/lib/garage-taxonomy";

export const Route = createFileRoute("/_authenticated/vendor/bookings")({
  head: () => ({
    meta: [
      { title: "Garage Bookings · ZOMBIEREX" },
      { name: "description", content: "Manage incoming service requests, send quotations and update job progress." },
      { property: "og:title", content: "Garage Bookings · ZOMBIEREX" },
      { property: "og:description", content: "Manage service requests, quotations and job progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VendorBookings,
});

function minorFactor(currency: string) {
  return ["BHD", "KWD", "OMR"].includes(currency) ? 1000 : 100;
}
function money(cents?: number | null, currency = "BHD") {
  if (cents == null) return null;
  const m = minorFactor(currency);
  return `${currency} ${(cents / m).toFixed(m === 1000 ? 3 : 2)}`;
}

function VendorBookings() {
  const qc = useQueryClient();
  const listFn = useServerFn(listVendorBookings);
  const [filter, setFilter] = useState<"open" | "all">("open");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["vendor", "bookings"],
    queryFn: () => listFn(),
    retry: false,
  });

  const bookings = ((data as any)?.bookings ?? []) as any[];
  const shown = filter === "open" ? bookings.filter((b) => OPEN_BOOKING_STATUSES.includes(b.status)) : bookings;
  const invalidate = () => qc.invalidateQueries({ queryKey: ["vendor", "bookings"] });

  if (isError)
    return (
      <div className="px-4 py-16 text-center">
        <p className="serif text-2xl italic">No business profile yet</p>
        <p className="mt-2 text-sm opacity-70">{(error as Error)?.message}</p>
        <Link to="/business" className="btn-neon mt-4 inline-block px-5 py-2">
          SET UP YOUR GARAGE
        </Link>
      </div>
    );

  return (
    <div className="px-4 pb-28 pt-6">
      <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
        GARAGE OPERATIONS
      </p>
      <h1 className="serif mt-2 text-4xl italic">Bookings</h1>
      <Link to="/vendor/garage" className="mono-tag mt-2 inline-block underline">
        GARAGE SETTINGS →
      </Link>

      <div className="mt-4 flex gap-2">
        {(["open", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="tap flex-1 border py-2 text-xs uppercase tracking-widest"
            style={{
              borderColor: filter === f ? "var(--color-signal, #00c853)" : "var(--color-line)",
              background: filter === f ? "rgba(0,200,83,0.06)" : "transparent",
            }}
          >
            {f === "open" ? "Active" : "All"}
          </button>
        ))}
      </div>

      {isLoading && <div className="mt-6 h-28 animate-pulse" style={{ background: "var(--color-line)" }} />}
      {!isLoading && shown.length === 0 && (
        <p className="mt-8 text-sm opacity-70">No {filter === "open" ? "active" : ""} bookings.</p>
      )}

      <div className="mt-4 space-y-3">
        {shown.map((b) => (
          <VendorBookingCard key={b.id} b={b} onChanged={invalidate} />
        ))}
      </div>
    </div>
  );
}

function VendorBookingCard({ b, onChanged }: { b: any; onChanged: () => void }) {
  const currency = b.currency ?? "BHD";
  const [open, setOpen] = useState(false);
  const [quote, setQuote] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const [mediaUrls, setMediaUrls] = useState("");

  const statusFn = useServerFn(updateBookingStatus);
  const quoteFn = useServerFn(sendQuote);
  const mediaFn = useServerFn(addWorkMedia);

  const setStatus = useMutation({
    mutationFn: (status: string) => statusFn({ data: { id: b.id, status: status as never } }),
    onSuccess: () => {
      toast.success("Booking updated");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const send = useMutation({
    mutationFn: () =>
      quoteFn({
        data: {
          id: b.id,
          quote_cents: Math.round(parseFloat(quote) * minorFactor(currency)),
          quote_notes: quoteNote || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Quotation sent");
      setQuote("");
      setQuoteNote("");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const upload = useMutation({
    mutationFn: () =>
      mediaFn({
        data: {
          id: b.id,
          urls: mediaUrls
            .split(/[\s,]+/)
            .map((s) => s.trim())
            .filter((s) => /^https?:\/\//.test(s))
            .slice(0, 8),
        },
      }),
    onSuccess: () => {
      toast.success("Work photos added");
      setMediaUrls("");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const when = new Date(b.scheduled_at);
  const next = VENDOR_NEXT_STATUS[b.status] ?? [];

  return (
    <div className="border" style={{ borderColor: "var(--color-line)" }}>
      <button onClick={() => setOpen((v) => !v)} className="tap flex w-full items-center gap-3 p-3 text-left">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{b.customer?.display_name ?? "Rider"}</p>
          <p className="mono-tag text-[10px] opacity-60">
            {when.toLocaleDateString(undefined, { day: "numeric", month: "short" })} ·{" "}
            {when.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            {b.vehicle ? ` · ${b.vehicle.make} ${b.vehicle.model}` : ""}
          </p>
          <p className="mt-0.5 truncate text-xs opacity-70">
            {b.services?.map((s: any) => s.name).join(", ") || b.problem_text || "Quotation request"}
          </p>
        </div>
        <span className="mono-tag shrink-0 text-[9px]" style={{ color: "var(--color-signal, #00c853)" }}>
          {(BOOKING_STATUS_LABEL[b.status] ?? b.status).toUpperCase()}
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t p-3" style={{ borderColor: "var(--color-line)" }}>
          {b.problem_text && <p className="text-sm opacity-85">{b.problem_text}</p>}
          {b.contact_phone && (
            <a href={`tel:${b.contact_phone}`} className="mono-tag block underline">
              CALL {b.contact_phone}
            </a>
          )}

          {(b.media ?? []).length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {b.media.map((m: any, i: number) => (
                <img key={i} src={typeof m === "string" ? m : m.url} alt="" className="aspect-square w-full object-cover" />
              ))}
            </div>
          )}

          {next.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {next.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus.mutate(s)}
                  disabled={setStatus.isPending}
                  className="tap border px-3 py-2 text-xs"
                  style={{ borderColor: "var(--color-line)" }}
                >
                  {BOOKING_STATUS_LABEL[s] ?? s}
                </button>
              ))}
            </div>
          )}

          <div>
            <p className="mono-tag mb-1 text-[10px] opacity-60">
              QUOTATION {b.quote_cents ? `· CURRENT ${money(b.quote_cents, currency)}` : ""}
            </p>
            <div className="flex gap-2">
              <input
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                inputMode="decimal"
                placeholder={`Amount (${currency})`}
                className="w-32 border px-2 py-2 text-sm"
                style={{ borderColor: "var(--color-line)", background: "transparent" }}
              />
              <input
                value={quoteNote}
                onChange={(e) => setQuoteNote(e.target.value)}
                placeholder="Notes (parts, labour…)"
                className="flex-1 border px-2 py-2 text-sm"
                style={{ borderColor: "var(--color-line)", background: "transparent" }}
              />
              <button
                onClick={() => send.mutate()}
                disabled={!quote || send.isPending}
                className="btn-neon px-3 py-2 text-xs"
                style={{ opacity: !quote || send.isPending ? 0.4 : 1 }}
              >
                SEND
              </button>
            </div>
          </div>

          <div>
            <p className="mono-tag mb-1 text-[10px] opacity-60">WORK PHOTOS (URLS)</p>
            <div className="flex gap-2">
              <input
                value={mediaUrls}
                onChange={(e) => setMediaUrls(e.target.value)}
                placeholder="https://…"
                className="flex-1 border px-2 py-2 text-sm"
                style={{ borderColor: "var(--color-line)", background: "transparent" }}
              />
              <button
                onClick={() => upload.mutate()}
                disabled={!mediaUrls || upload.isPending}
                className="tap border px-3 py-2 text-xs"
                style={{ borderColor: "var(--color-line)", opacity: !mediaUrls ? 0.4 : 1 }}
              >
                ADD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
