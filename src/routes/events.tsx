import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listEvents, EVENT_CATEGORIES } from "@/lib/events.functions";
import { PullToRefresh } from "@/components/PullToRefresh";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useModule } from "@/hooks/usePlatform";
import { ModuleNotice } from "@/components/MaintenanceGate";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events · ZOMBIEREX" },
      {
        name: "description",
        content: "Discover rides, meets, track days and motorsport events happening near you.",
      },
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
  ride: "Rides",
  bike_night: "Bike Nights",
  car_meet: "Car Meets",
  cars_coffee: "Cars & Coffee",
  drag: "Drag",
  drift: "Drift",
  track_day: "Track Days",
  rally: "Rally",
  off_road: "Off-Road",
  monster_truck: "Monster Trucks",
  bike_show: "Bike Shows",
  custom_bike_show: "Custom Bikes",
  classic_show: "Classics",
  supercar_meet: "Supercars",
  festival: "Festivals",
  charity: "Charity",
  launch: "Launches",
  workshop: "Workshops",
  other: "Other",
};

function EventsPage() {
  const zxModule = useModule("events");
  if (!zxModule.loading && !zxModule.enabled)
    return <ModuleNotice status={zxModule} label="Events & Rides" />;
  return <EventsPageInner />;
}

function EventsPageInner() {
  const [scope, setScope] = useState<(typeof SCOPES)[number]["id"]>("upcoming");
  const [category, setCategory] = useState<string | undefined>();
  const [search, setSearch] = useState("");

  const list = useServerFn(listEvents);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["events", scope, category, search],
    queryFn: () =>
      list({ data: { scope, category: category as any, search: search || undefined } }),
  });

  const events = data ?? [];
  const featured = useMemo(() => events.find((e: any) => e.is_featured) ?? events[0], [events]);
  const rest = useMemo(() => events.filter((e: any) => e.id !== featured?.id), [events, featured]);

  return (
    <PullToRefresh onRefresh={() => refetch()}>
      <div className="pb-24 event-fade">
        {/* ── Page header ─────────────────────────────── */}
        <header className="px-4 pt-6">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="mono-tag" style={{ color: "var(--color-ash)" }}>
                {events.length.toString().padStart(2, "0")} · LISTED
              </p>
              <h1 className="mt-2 display-xl text-5xl uppercase leading-none">Events</h1>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link
                to="/events/me"
                className="btn-outline shrink-0"
                style={{ padding: "12px 16px", fontSize: 10, letterSpacing: "0.12em" }}
              >
                MY EVENTS
              </Link>
              <Link
                to="/events/new"
                className="btn-solid shrink-0"
                style={{ padding: "12px 16px", fontSize: 10, letterSpacing: "0.12em" }}
              >
                + HOST
              </Link>
            </div>
          </div>
        </header>

        {/* ── Toolbar: search ─────────────────────────── */}
        <div className="px-4 pt-4">
          <div
            className="hairline flex items-center gap-2 px-3"
            style={{ background: "var(--color-mist)" }}
          >
            <span style={{ color: "var(--color-ash)", fontSize: 14 }}>⌕</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events, cities, hosts…"
              className="w-full bg-transparent py-3 text-sm outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="tap mono-tag"
                style={{ color: "var(--color-ash)" }}
                aria-label="Clear"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── Filters: View + Category side by side ─── */}
        <div className="px-4 pt-3 hairline-b pb-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <label className="mono-tag shrink-0" style={{ color: "var(--color-ash)" }}>
                VIEW
              </label>
              <Select value={scope} onValueChange={(v) => setScope(v as any)}>
                <SelectTrigger
                  className="h-10 flex-1 min-w-0 hairline bg-transparent px-3 py-2 mono-caps text-xs [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:opacity-60"
                  style={{ color: "var(--color-ink)" }}
                >
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent
                  className="hairline bg-[var(--color-paper-0)] border-[var(--color-line)]"
                  position="popper"
                  sideOffset={4}
                >
                  {SCOPES.map((s) => (
                    <SelectItem
                      key={s.id}
                      value={s.id}
                      className="mono-caps text-xs data-[state=checked]:text-[var(--color-signal)] focus:bg-[var(--color-mist)] focus:text-[var(--color-ink)]"
                    >
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <label className="mono-tag shrink-0" style={{ color: "var(--color-ash)" }}>
                TYPE
              </label>
              <Select
                value={category ?? "__all"}
                onValueChange={(v) => setCategory(v === "__all" ? undefined : v)}
              >
                <SelectTrigger
                  className="h-10 flex-1 min-w-0 hairline bg-transparent px-3 py-2 mono-caps text-xs [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:opacity-60"
                  style={{ color: "var(--color-ink)" }}
                >
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent
                  className="hairline bg-[var(--color-paper-0)] border-[var(--color-line)] max-h-72"
                  position="popper"
                  sideOffset={4}
                >
                  <SelectItem
                    value="__all"
                    className="mono-caps text-xs data-[state=checked]:text-[var(--color-signal)] focus:bg-[var(--color-mist)] focus:text-[var(--color-ink)]"
                  >
                    All
                  </SelectItem>
                  {EVENT_CATEGORIES.map((c) => (
                    <SelectItem
                      key={c}
                      value={c}
                      className="mono-caps text-xs data-[state=checked]:text-[var(--color-signal)] focus:bg-[var(--color-mist)] focus:text-[var(--color-ink)]"
                    >
                      {CATEGORY_LABEL[c] ?? c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ── Loading skeletons ───────────────────────── */}
        {isLoading && (
          <div className="px-4 pt-4 space-y-4">
            <EventSkeleton featured />
            <EventSkeleton />
            <EventSkeleton />
          </div>
        )}

        {/* ── Empty state ─────────────────────────────── */}
        {!isLoading && events.length === 0 && (
          <div className="px-4 pt-6">
            <div className="hairline border-dashed p-8 text-center">
              <div style={{ color: "var(--color-signal)", fontSize: 40, lineHeight: 1 }}>◈</div>
              <p className="mono-tag mt-3" style={{ color: "var(--color-ash)" }}>
                NOTHING SCHEDULED
              </p>
              <p className="mt-2 text-sm font-bold">No events match this filter</p>
              <Link
                to="/events/new"
                className="btn-solid mt-5 inline-block"
                style={{ padding: "10px 14px", fontSize: 10 }}
              >
                + HOST THE FIRST ONE
              </Link>
            </div>
          </div>
        )}

        {/* ── Featured hero ───────────────────────────── */}
        {!isLoading && featured && scope !== "past" && <FeaturedCard event={featured} />}

        {/* ── Section label ───────────────────────────── */}
        {!isLoading && rest.length > 0 && (
          <div className="mt-6 flex items-baseline justify-between px-4">
            <p className="mono-tag" style={{ color: "var(--color-ash)" }}>
              UPCOMING · SCHEDULE
            </p>
            <p className="mono-num text-xs" style={{ color: "var(--color-ash)" }}>
              {rest.length.toString().padStart(2, "0")}
            </p>
          </div>
        )}

        {/* ── List ────────────────────────────────────── */}
        <div className="px-4 pt-3 space-y-3">
          {rest.map((e: any, i: number) => (
            <EventRow key={e.id} event={e} index={i} />
          ))}
        </div>
      </div>
    </PullToRefresh>
  );
}

function FeaturedCard({ event }: { event: any }) {
  const d = new Date(event.starts_at);
  const day = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <Link
      to="/events/$id"
      params={{ id: event.id }}
      className="block px-4 pt-4 event-section"
      style={{ animationDelay: "40ms" }}
    >
      <article className="hairline overflow-hidden transition-transform active:scale-[0.995]">
        {/* Cover — minimal overlays, only badges */}
        <div className="relative" style={{ aspectRatio: "16 / 10" }}>
          {event.cover_url ? (
            <img src={event.cover_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <EmptyCover category={event.category} />
          )}
          <div className="absolute inset-x-3 top-3 flex items-center justify-between">
            <span
              className="mono-tag"
              style={{
                background: "var(--color-signal)",
                color: "var(--color-bone)",
                padding: "4px 8px",
              }}
            >
              ★ FEATURED
            </span>
            <span
              className="mono-tag"
              style={{
                background: "rgba(0,0,0,0.55)",
                color: "rgba(255,255,255,0.9)",
                padding: "4px 8px",
                backdropFilter: "blur(6px)",
              }}
            >
              {CATEGORY_LABEL[event.category] ?? "EVENT"}
            </span>
          </div>
        </div>

        {/* Info section — below the cover */}
        <div className="px-4 pt-3.5 pb-4 hairline-b">
          <h2 className="display-xl text-2xl uppercase leading-tight tracking-tight">
            {event.title}
          </h2>
          <div className="mt-2.5 grid grid-cols-[16px_1fr] gap-x-2.5 gap-y-1.5 text-sm">
            <span aria-hidden style={{ color: "var(--color-signal)" }}>
              ◷
            </span>
            <p className="mono-tag" style={{ color: "var(--color-ash)" }}>
              {day} · {time}
            </p>
            {event.location && (
              <>
                <span aria-hidden style={{ color: "var(--color-signal)" }}>
                  ◎
                </span>
                <p className="mono-tag truncate" style={{ color: "var(--color-ash)" }}>
                  {event.location}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Meta strip */}
        <div className="grid grid-cols-3 divide-x divide-hair">
          <Cell k="GOING" v={String(event.rsvp_count ?? 0)} accent />
          <Cell k="STATUS" v={(event.status ?? "scheduled").toUpperCase()} />
          <Cell k="ACCESS" v={(event.visibility ?? "public").toUpperCase()} />
        </div>
      </article>
    </Link>
  );
}

function EventRow({ event, index = 0 }: { event: any; index?: number }) {
  const d = new Date(event.starts_at);
  const day = d.toLocaleDateString(undefined, { day: "2-digit" });
  const monthYear = d.toLocaleDateString(undefined, { month: "short" }).toUpperCase();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <Link
      to="/events/$id"
      params={{ id: event.id }}
      className="block event-section"
      style={{ animationDelay: `${80 + index * 40}ms` }}
    >
      <article className="hairline overflow-hidden transition-transform active:scale-[0.995]">
        <div className="grid grid-cols-[72px_1fr]">
          {/* Date column */}
          <div
            className="flex flex-col items-center justify-center border-r border-hair py-3"
            style={{ background: "var(--color-mist)" }}
          >
            <p className="mono-tag" style={{ color: "var(--color-ash)" }}>
              {monthYear}
            </p>
            <p
              className="display-numeral mt-1 text-3xl leading-none"
              style={{ color: "var(--color-signal)" }}
            >
              {day}
            </p>
            <p className="mono-tag mt-1" style={{ color: "var(--color-ash)" }}>
              {time}
            </p>
          </div>

          {/* Cover — clean, badge only */}
          <div className="relative h-28">
            {event.cover_url ? (
              <img src={event.cover_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <EmptyCover category={event.category} compact />
            )}
            {event.is_featured && (
              <span
                className="absolute right-2 top-2 mono-tag"
                style={{
                  background: "var(--color-signal)",
                  color: "var(--color-bone)",
                  padding: "3px 6px",
                }}
              >
                ★
              </span>
            )}
          </div>
        </div>

        {/* Info section — below cover */}
        <div className="px-3 py-3 hairline-t">
          <h3 className="display-xl text-base uppercase leading-tight line-clamp-1 tracking-tight">
            {event.title}
          </h3>
          {event.location && (
            <p className="mono-tag mt-1 truncate" style={{ color: "var(--color-ash)" }}>
              ◎ {event.location}
            </p>
          )}
        </div>

        {/* Meta */}
        <div className="grid grid-cols-3 divide-x divide-hair hairline-t">
          <Cell k="GOING" v={String(event.rsvp_count ?? 0)} accent />
          <Cell k="TYPE" v={CATEGORY_LABEL[event.category] ?? event.category} />
          <Cell k="STATUS" v={(event.status ?? "scheduled").toUpperCase()} />
        </div>
      </article>
    </Link>
  );
}

function Cell({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="p-3 text-center">
      <p className="mono-tag" style={{ color: "var(--color-ash)" }}>
        {k}
      </p>
      <p
        className="mono-num mt-1 text-sm font-bold truncate"
        style={{ color: accent ? "var(--color-signal)" : "var(--color-ink)" }}
      >
        {v}
      </p>
    </div>
  );
}

function EventSkeleton({ featured }: { featured?: boolean } = {}) {
  return (
    <div className="hairline overflow-hidden">
      <div
        className="w-full animate-pulse"
        style={{
          aspectRatio: featured ? "16 / 10" : undefined,
          height: featured ? undefined : 112,
          background:
            "linear-gradient(90deg, var(--color-mist) 0%, #ececec 50%, var(--color-mist) 100%)",
        }}
      />
      <div className="grid grid-cols-3 divide-x divide-hair hairline-t">
        {[0, 1, 2].map((i) => (
          <div key={i} className="p-3 text-center">
            <div
              className="mx-auto h-2 w-10 animate-pulse"
              style={{ background: "var(--color-mist)" }}
            />
            <div
              className="mx-auto mt-2 h-3 w-14 animate-pulse"
              style={{ background: "var(--color-mist)" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyCover({ category, compact }: { category?: string; compact?: boolean }) {
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: "radial-gradient(120% 80% at 50% 0%, #1a1a1a 0%, #0a0a0a 60%, #000 100%)",
      }}
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
          <div style={{ color: "var(--color-signal)", fontSize: compact ? 28 : 44, lineHeight: 1 }}>
            ◈
          </div>
          {!compact && (
            <p className="mono-tag mt-2" style={{ color: "rgba(255,255,255,0.55)" }}>
              {(category ?? "EVENT").toUpperCase()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
