import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyBookings } from "@/lib/bookings.functions";
import { BOOKING_STATUS_LABEL, OPEN_BOOKING_STATUSES } from "@/lib/garage-taxonomy";

export const Route = createFileRoute("/_authenticated/bookings/")({
  head: () => ({
    meta: [
      { title: "My Service Bookings · ZOMBIEREX" },
      { name: "description", content: "Track your workshop appointments, quotations and repair progress." },
      { property: "og:title", content: "My Service Bookings · ZOMBIEREX" },
      { property: "og:description", content: "Track workshop appointments, quotes and repair progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyBookings,
});

function MyBookings() {
  const fn = useServerFn(listMyBookings);
  const { data, isLoading } = useQuery({ queryKey: ["bookings", "mine"], queryFn: () => fn() });
  const rows = (data ?? []) as any[];
  const open = rows.filter((r) => OPEN_BOOKING_STATUSES.includes(r.status));
  const past = rows.filter((r) => !OPEN_BOOKING_STATUSES.includes(r.status));

  return (
    <div className="px-4 pb-28 pt-6">
      <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
        SERVICE
      </p>
      <h1 className="serif mt-2 text-4xl italic">My Bookings</h1>
      <Link to="/garages" className="mono-tag mt-2 inline-block underline">
        FIND A GARAGE →
      </Link>

      {isLoading && <div className="mt-6 h-24 animate-pulse" style={{ background: "var(--color-line)" }} />}

      {!isLoading && rows.length === 0 && (
        <div className="mt-8 border px-4 py-10 text-center" style={{ borderColor: "var(--color-line)" }}>
          <p className="serif text-xl italic">No bookings yet</p>
          <p className="mt-1 text-sm opacity-70">Find a workshop near you and book your first service.</p>
          <Link to="/garages" className="btn-neon mt-4 inline-block px-5 py-2">
            FIND A GARAGE
          </Link>
        </div>
      )}

      {open.length > 0 && (
        <>
          <h2 className="mono-tag mt-8 text-[10px] opacity-60">ACTIVE</h2>
          <div className="mt-2 space-y-2">
            {open.map((b) => (
              <BookingRow key={b.id} b={b} />
            ))}
          </div>
        </>
      )}
      {past.length > 0 && (
        <>
          <h2 className="mono-tag mt-8 text-[10px] opacity-60">HISTORY</h2>
          <div className="mt-2 space-y-2">
            {past.map((b) => (
              <BookingRow key={b.id} b={b} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function BookingRow({ b }: { b: any }) {
  const when = new Date(b.scheduled_at);
  return (
    <Link
      to="/bookings/$id"
      params={{ id: b.id }}
      className="tap flex items-center gap-3 border p-3"
      style={{ borderColor: "var(--color-line)" }}
    >
      <div
        className="h-14 w-14 shrink-0 bg-cover bg-center"
        style={{
          backgroundImage: b.garage?.logo_url ? `url(${b.garage.logo_url})` : undefined,
          background: b.garage?.logo_url ? undefined : "var(--color-line)",
        }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{b.garage?.business_name ?? "Workshop"}</p>
        <p className="mono-tag text-[10px] opacity-60">
          {when.toLocaleDateString(undefined, { day: "numeric", month: "short" })} ·{" "}
          {when.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="mt-0.5 truncate text-xs opacity-70">
          {b.services?.map((s: any) => s.name).join(", ") || b.problem_text || "Service request"}
        </p>
      </div>
      <span className="mono-tag shrink-0 text-[9px]" style={{ color: "var(--color-signal, #00c853)" }}>
        {(BOOKING_STATUS_LABEL[b.status] ?? b.status).toUpperCase()}
      </span>
    </Link>
  );
}
