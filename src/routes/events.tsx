import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { StatusBar } from "@/components/StatusBar";
import { listEvents, EVENT_CATEGORIES } from "@/lib/events.functions";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events · ZOMBIEREX" },
      { name: "description", content: "Discover rides, meets, track days and motorsport events happening near you." },
    ],
  }),
  component: EventsPage,
});

const SCOPES = [
  { id: "upcoming", label: "Upcoming" },
  { id: "featured", label: "Featured" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "mine", label: "Hosting" },
  { id: "past", label: "Past" },
] as const;

const CATEGORY_LABEL: Record<string, string> = {
  ride: "Rides", bike_night: "Bike Nights", car_meet: "Car Meets", cars_coffee: "Cars & Coffee",
  drag: "Drag", drift: "Drift", track_day: "Track Days", rally: "Rally", off_road: "Off-Road",
  monster_truck: "Monster Trucks", bike_show: "Bike Shows", custom_bike_show: "Custom Bikes",
  classic_show: "Classics", supercar_meet: "Supercars", festival: "Festivals", charity: "Charity",
  launch: "Launches", workshop: "Workshops", other: "Other",
};

function EventsPage() {
  const [scope, setScope] = useState<(typeof SCOPES)[number]["id"]>("upcoming");
  const [category, setCategory] = useState<string | undefined>();
  const [search, setSearch] = useState("");

  const list = useServerFn(listEvents);
  const { data, isLoading } = useQuery({
    queryKey: ["events", scope, category, search],
    queryFn: () => list({ data: { scope, category: category as any, search: search || undefined } }),
  });

  const featured = useMemo(() => (data ?? []).find((e: any) => e.is_featured) ?? (data ?? [])[0], [data]);

  return (
    <div>
      <StatusBar index="06" section="EVENTS" />

      <div className="flex items-end justify-between px-4 pt-6">
        <div>
          <p className="mono-tag">{(data ?? []).length} EVENTS</p>
          <h1 className="mt-2 display-xl text-5xl uppercase">Events</h1>
        </div>
        <Link to="/events/new" className="btn-solid" style={{ padding: "10px 14px", fontSize: 10 }}>
          + HOST
        </Link>
      </div>

      <div className="px-4 pt-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events…"
          className="w-full hairline px-3 py-3 text-sm"
          style={{ background: "var(--color-mist)" }}
        />
      </div>

      <div className="no-scrollbar mt-4 flex overflow-x-auto hairline-t hairline-b">
        {SCOPES.map((s) => {
          const active = scope === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setScope(s.id)}
              className="tap relative shrink-0 border-r border-hair px-4 py-3 mono-caps"
              style={{
                color: active ? "var(--color-ink)" : "var(--color-ash)",
                background: active ? "var(--color-mist)" : "transparent",
              }}
            >
              {s.label}
              {active && <span className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: "var(--color-signal)" }} />}
            </button>
          );
        })}
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3 hairline-b">
        <button
          onClick={() => setCategory(undefined)}
          className="tap shrink-0 hairline px-3 py-1.5 mono-caps"
          style={{ background: !category ? "var(--color-ink)" : "transparent", color: !category ? "var(--color-bone)" : "var(--color-ink)" }}
        >
          ALL
        </button>
        {EVENT_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c === category ? undefined : c)}
            className="tap shrink-0 hairline px-3 py-1.5 mono-caps"
            style={{ background: category === c ? "var(--color-ink)" : "transparent", color: category === c ? "var(--color-bone)" : "var(--color-ink)" }}
          >
            {CATEGORY_LABEL[c] ?? c}
          </button>
        ))}
      </div>

      {featured && scope !== "past" && (
        <FeaturedCard event={featured} />
      )}

      <div className="px-4 pt-4 space-y-4 pb-24">
        {isLoading && <p className="mono-tag" style={{ color: "var(--color-ash)" }}>LOADING…</p>}
        {!isLoading && (data ?? []).length === 0 && (
          <div className="hairline border-dashed p-6 text-center">
            <p className="mono-tag" style={{ color: "var(--color-ash)" }}>NOTHING HERE</p>
            <p className="mt-2 text-sm font-bold">No events match this filter</p>
            <Link to="/events/new" className="btn-solid mt-4 inline-block" style={{ padding: "8px 12px", fontSize: 10 }}>
              + HOST THE FIRST ONE
            </Link>
          </div>
        )}
        {(data ?? []).filter((e: any) => e.id !== featured?.id).map((e: any) => (
          <EventRow key={e.id} event={e} />
        ))}
      </div>
    </div>
  );
}

function FeaturedCard({ event }: { event: any }) {
  const d = new Date(event.starts_at);
  return (
    <Link to="/events/$id" params={{ id: event.id }} className="block px-4 pt-4">
      <div className="hairline overflow-hidden">
        <div className="relative h-56">
          {event.cover_url ? (
            <img src={event.cover_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <EmptyCover category={event.category} />
          )}
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.85) 100%)" }} />

          <span className="absolute left-3 top-3 mono-tag text-white" style={{ background: "var(--color-signal)", color: "var(--color-bone)", padding: "4px 8px" }}>
            FEATURED
          </span>
          <div className="absolute inset-x-3 bottom-3 text-white">
            <p className="mono-tag" style={{ color: "rgba(255,255,255,0.85)" }}>
              {d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
            <h2 className="mt-1 display-xl text-2xl uppercase leading-tight">{event.title}</h2>
            {event.location && <p className="mono-tag mt-1" style={{ color: "rgba(255,255,255,0.75)" }}>◎ {event.location}</p>}
          </div>
        </div>
      </div>
    </Link>
  );
}

function EventRow({ event }: { event: any }) {
  const d = new Date(event.starts_at);
  const day = d.toLocaleDateString(undefined, { day: "2-digit" });
  const monthYear = d.toLocaleDateString(undefined, { month: "short" }).toUpperCase();
  return (
    <Link to="/events/$id" params={{ id: event.id }} className="block">
      <article className="hairline overflow-hidden">
        <div className="grid grid-cols-[76px_1fr]">
          <div className="border-r border-hair p-3 text-center" style={{ background: "var(--color-mist)" }}>
            <p className="mono-tag" style={{ color: "var(--color-ash)" }}>{CATEGORY_LABEL[event.category] ?? "EVENT"}</p>
            <p className="display-numeral mt-2 text-3xl" style={{ color: "var(--color-signal)" }}>{day}</p>
            <p className="mono-tag mt-1" style={{ color: "var(--color-ash)" }}>{monthYear}</p>
          </div>
          <div className="relative h-32">
            {event.cover_url ? (
              <img src={event.cover_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <EmptyCover category={event.category} compact />
            )}
            <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.85) 100%)" }} />

            <div className="absolute inset-x-3 bottom-2 text-white">
              <p className="mono-tag" style={{ color: "rgba(255,255,255,0.8)" }}>
                {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {event.location ? ` · ◎ ${event.location}` : ""}
              </p>
              <h3 className="mt-1 display-xl text-lg uppercase leading-tight">{event.title}</h3>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-hair hairline-t">
          <Cell k="GOING" v={String(event.rsvp_count ?? 0)} />
          <Cell k="TYPE" v={CATEGORY_LABEL[event.category] ?? event.category} />
          <Cell k="STATUS" v={(event.status ?? "scheduled").toUpperCase()} />
        </div>
      </article>
    </Link>
  );
}

function Cell({ k, v }: { k: string; v: string }) {
  return (
    <div className="p-3 text-center">
      <p className="mono-tag" style={{ color: "var(--color-ash)" }}>{k}</p>
      <p className="mono-num mt-1 text-sm font-bold">{v}</p>
    </div>
  );
}

function EmptyCover({ category, compact }: { category?: string; compact?: boolean }) {
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "radial-gradient(120% 80% at 50% 0%, #1a1a1a 0%, #0a0a0a 60%, #000 100%)" }}
    >
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,200,83,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,83,.2) 1px, transparent 1px)",
          backgroundSize: compact ? "18px 18px" : "26px 26px",
        }}
      />
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div style={{ color: "var(--color-signal)", fontSize: compact ? 28 : 44, lineHeight: 1 }}>◈</div>
          {!compact && (
            <p className="mono-tag mt-2" style={{ color: "rgba(255,255,255,0.5)" }}>
              {(category ?? "EVENT").toUpperCase()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

