/**
 * Rides — list my recorded rides.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listMyRides } from "@/lib/rides.functions";

const q = queryOptions({ queryKey: ["rides", "mine"], queryFn: () => listMyRides() });

export const Route = createFileRoute("/_authenticated/rides/")({
  head: () => ({
    meta: [
      { title: "My rides · ZOMBIEREX" },
      {
        name: "description",
        content: "Every ride you've recorded — distance, time, speed, elevation.",
      },
    ],
  }),
  component: RidesList,
});

function RidesList() {
  const { data } = useSuspenseQuery(q);
  return (
    <div className="min-h-svh pb-24">
      <div className="flex items-center justify-between px-4 pt-4">
        <h1 className="serif text-3xl" style={{ color: "var(--color-ink)" }}>
          My rides
        </h1>
        <Link
          to="/atlas/ride"
          className="tap mono-caps text-[10px] font-black"
          style={{
            padding: "8px 12px",
            background: "var(--color-neon)",
            color: "var(--color-obsidian)",
          }}
        >
          + RIDE MODE
        </Link>
      </div>
      <div className="mt-4 space-y-2 px-4">
        {data.length === 0 && (
          <div
            className="rounded-lg border border-dashed p-8 text-center text-sm"
            style={{ borderColor: "var(--color-hair-strong)", color: "var(--color-ink-3)" }}
          >
            No rides yet. Start Ride Mode to record your first one.
          </div>
        )}
        {data.map((r: any) => (
          <Link
            key={r.id}
            to="/rides/$id"
            params={{ id: r.id }}
            className="tap block rounded-lg border p-3"
            style={{ borderColor: "var(--color-hair)", background: "var(--color-graphite)" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>
                {r.title || new Date(r.started_at).toLocaleString()}
              </p>
              <span className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 9 }}>
                {r.visibility?.toUpperCase()}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2 text-center">
              <Cell label="KM" value={(r.distance_m / 1000).toFixed(1)} />
              <Cell label="MIN" value={String(Math.round(r.duration_s / 60))} />
              <Cell label="AVG" value={String(Math.round(r.avg_speed_kmh))} />
              <Cell label="MAX" value={String(Math.round(r.max_speed_kmh))} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mono-num text-sm font-bold" style={{ color: "var(--color-ink)" }}>
        {value}
      </p>
      <p className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 8 }}>
        {label}
      </p>
    </div>
  );
}
