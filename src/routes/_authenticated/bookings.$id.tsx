import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { cancelBooking, getBooking, respondToQuote } from "@/lib/bookings.functions";
import { BOOKING_STATUS_LABEL } from "@/lib/garage-taxonomy";

export const Route = createFileRoute("/_authenticated/bookings/$id")({
  head: () => ({
    meta: [
      { title: "Booking Detail · ZOMBIEREX" },
      { name: "description", content: "Your workshop appointment: status timeline, quotation and work photos." },
      { property: "og:title", content: "Booking Detail · ZOMBIEREX" },
      { property: "og:description", content: "Status timeline, quotation and work photos for your service." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BookingDetail,
});

function money(cents?: number | null, currency = "BHD") {
  if (cents == null) return null;
  const minor = ["BHD", "KWD", "OMR"].includes(currency) ? 1000 : 100;
  return `${currency} ${(cents / minor).toFixed(minor === 1000 ? 3 : 2)}`;
}

function BookingDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const getFn = useServerFn(getBooking);
  const quoteFn = useServerFn(respondToQuote);
  const cancelFn = useServerFn(cancelBooking);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["booking", id] });
    qc.invalidateQueries({ queryKey: ["bookings", "mine"] });
  };

  const decide = useMutation({
    mutationFn: (accept: boolean) => quoteFn({ data: { id, accept } }),
    onSuccess: (_r, accept) => {
      toast.success(accept ? "Quotation accepted" : "Quotation declined");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: () => cancelFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Booking cancelled");
      invalidate();
      navigate({ to: "/bookings" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="m-4 h-40 animate-pulse" style={{ background: "var(--color-line)" }} />;
  if (isError || !data)
    return (
      <div className="px-4 py-16 text-center">
        <p className="serif text-2xl italic">Booking not found.</p>
        <Link to="/bookings" className="mono-tag mt-3 inline-block underline">
          BACK
        </Link>
      </div>
    );

  const b = data as any;
  const when = new Date(b.scheduled_at);
  const currency = b.currency ?? "BHD";
  const canCancel = !["completed", "cancelled"].includes(b.status);

  return (
    <div className="px-4 pb-28 pt-6">
      <Link to="/bookings" className="mono-tag opacity-60">
        ← BOOKINGS
      </Link>
      <p className="mono-tag mt-4" style={{ color: "var(--color-signal, #00c853)" }}>
        {(BOOKING_STATUS_LABEL[b.status] ?? b.status).toUpperCase()}
      </p>
      <h1 className="serif mt-1 text-3xl italic">{b.garage?.business_name ?? "Workshop"}</h1>
      <p className="mt-1 text-sm opacity-70">
        {when.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })} ·{" "}
        {when.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
      </p>
      {b.garage?.slug && (
        <Link to="/w/$slug" params={{ slug: b.garage.slug }} className="mono-tag mt-1 inline-block underline">
          VIEW WORKSHOP →
        </Link>
      )}

      {b.status === "quotation_sent" && (
        <div className="mt-5 border p-4" style={{ borderColor: "var(--color-signal, #00c853)" }}>
          <p className="mono-tag text-[10px] opacity-60">QUOTATION</p>
          <p className="mono-num mt-1 text-2xl">{money(b.quote_cents, currency) ?? "—"}</p>
          {b.quote_notes && <p className="mt-1 text-sm opacity-80">{b.quote_notes}</p>}
          <div className="mt-3 flex gap-2">
            <button onClick={() => decide.mutate(true)} disabled={decide.isPending} className="btn-neon flex-1 py-2">
              ACCEPT
            </button>
            <button
              onClick={() => decide.mutate(false)}
              disabled={decide.isPending}
              className="tap flex-1 border py-2 text-sm"
              style={{ borderColor: "var(--color-line)" }}
            >
              Decline
            </button>
          </div>
        </div>
      )}

      <Block title="Service">
        <p className="text-sm">
          {b.services?.map((s: any) => s.name).join(", ") || "Quotation requested"}
        </p>
        {b.problem_text && <p className="mt-2 text-sm opacity-80">{b.problem_text}</p>}
      </Block>

      {b.vehicle && (
        <Block title="Vehicle">
          <p className="text-sm">
            {b.vehicle.nickname || `${b.vehicle.make} ${b.vehicle.model}`}
            {b.vehicle.year ? ` · ${b.vehicle.year}` : ""}
          </p>
        </Block>
      )}

      {(b.media ?? []).length > 0 && (
        <Block title="Your photos">
          <div className="grid grid-cols-3 gap-2">
            {b.media.map((m: any, i: number) => (
              <img key={i} src={typeof m === "string" ? m : m.url} alt="" className="aspect-square w-full object-cover" />
            ))}
          </div>
        </Block>
      )}

      {(b.work_media ?? []).length > 0 && (
        <Block title="Work updates from the garage">
          <div className="grid grid-cols-3 gap-2">
            {b.work_media.map((m: any, i: number) => (
              <img key={i} src={m.url} alt={m.caption ?? ""} className="aspect-square w-full object-cover" />
            ))}
          </div>
        </Block>
      )}

      <Block title="Timeline">
        <ol className="space-y-2">
          {(b.status_history ?? []).map((h: any, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0" style={{ background: "var(--color-signal, #00c853)" }} />
              <span>
                {BOOKING_STATUS_LABEL[h.status] ?? h.status}
                {h.note ? ` — ${h.note}` : ""}
                <span className="mono-tag ml-2 text-[9px] opacity-50">
                  {new Date(h.at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </span>
            </li>
          ))}
          {(b.status_history ?? []).length === 0 && <li className="text-sm opacity-60">No updates yet.</li>}
        </ol>
      </Block>

      {b.garage?.phone && (
        <a href={`tel:${b.garage.phone}`} className="tap mt-4 block border py-3 text-center text-sm" style={{ borderColor: "var(--color-line)" }}>
          Call the garage
        </a>
      )}

      {canCancel && (
        <button
          onClick={() => cancel.mutate()}
          disabled={cancel.isPending}
          className="tap mt-3 w-full border py-3 text-sm"
          style={{ borderColor: "#b0483c", color: "#b0483c" }}
        >
          Cancel booking
        </button>
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 border p-4" style={{ borderColor: "var(--color-line)" }}>
      <h2 className="mono-tag mb-2 text-[10px] opacity-60">{title.toUpperCase()}</h2>
      {children}
    </section>
  );
}
