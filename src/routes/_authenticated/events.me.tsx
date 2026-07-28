import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Calendar, MapPin, Users, Crown } from "lucide-react";
import { listMyEvents } from "@/lib/events.functions";
import { PullToRefresh } from "@/components/PullToRefresh";

export const Route = createFileRoute("/_authenticated/events/me")({
  head: () => ({
    meta: [
      { title: "My Events · ZOMBIEREX" },
      { name: "description", content: "Events you're hosting or attending on ZOMBIEREX." },
    ],
  }),
  component: MyEventsPage,
});

const TABS = [
  { id: "upcoming", label: "UPCOMING" },
  { id: "hosting", label: "HOSTING" },
  { id: "past", label: "PAST" },
] as const;

function MyEventsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("upcoming");
  const list = useServerFn(listMyEvents);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-events", tab],
    queryFn: () => list({ data: { scope: tab, limit: 50 } }),
  });

  const events = data ?? [];

  return (
    <PullToRefresh onRefresh={() => refetch()}>
      <div className="pb-24">
        <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 hairline-b" style={{ background: "var(--color-bone)" }}>
          <Link to="/events" className="inline-flex h-9 w-9 items-center justify-center -ml-2" aria-label="Back">
            <ArrowLeft size={20} />
          </Link>
          <p className="mono-tag">MY EVENTS</p>
        </div>

        <div className="px-4 pt-6">
          <h1 className="serif text-3xl italic" style={{ color: "var(--color-ink)" }}>Your Calendar</h1>
          <p className="mono-tag mt-1" style={{ color: "var(--color-titanium)" }}>HOSTING · ATTENDING · HISTORY</p>
        </div>

        <div className="mt-4 flex gap-2 px-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="mono-tag tap rounded border px-3 py-2 text-xs font-bold"
              style={{
                borderColor: "var(--color-hair-strong)",
                background: tab === t.id ? "var(--color-ink)" : "transparent",
                color: tab === t.id ? "var(--color-canvas)" : "var(--color-ink)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="px-4 pt-6 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 w-full animate-pulse hairline" style={{ background: "var(--color-mist)" }} />
            ))}
          </div>
        )}

        {!isLoading && events.length === 0 && (
          <div className="mx-4 mt-6 border border-dashed p-8 text-center" style={{ borderColor: "var(--color-hair-strong)" }}>
            <Calendar size={32} className="mx-auto" style={{ color: "var(--color-neon)" }} />
            <p className="mono-tag mt-3" style={{ color: "var(--color-titanium)" }}>NO EVENTS HERE</p>
            <p className="mt-2 text-sm" style={{ color: "var(--color-ash)" }}>Browse events or host your own.</p>
            <Link to="/events" className="btn-neon mt-4 inline-block" style={{ padding: "10px 14px", fontSize: 11 }}>
              DISCOVER EVENTS ▸
            </Link>
          </div>
        )}

        <div className="mt-4 space-y-3 px-4 pb-8">
          {events.map((e: any) => (
            <Link
              key={e.id}
              to="/events/$id"
              params={{ id: e.id }}
              className="tap flex gap-3 border p-3"
              style={{ borderColor: "var(--color-hair-strong)", background: "rgba(255,255,255,0.02)" }}
            >
              <div className="h-20 w-20 shrink-0 overflow-hidden" style={{ background: "var(--color-mist)" }}>
                {e.cover_url ? (
                  <img src={e.cover_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center" style={{ color: "var(--color-ash)" }}>
                    <Calendar size={20} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-bold" style={{ color: "var(--color-ink)" }}>{e.title}</p>
                  {e.is_host && <Crown size={14} style={{ color: "var(--color-neon)" }} />}
                </div>
                <p className="mono-tag mt-1" style={{ color: "var(--color-titanium)" }}>
                  {formatDate(e.starts_at)}
                </p>
                {e.location && (
                  <p className="mt-1 flex items-center gap-1 truncate text-xs" style={{ color: "var(--color-ash)" }}>
                    <MapPin size={12} /> {e.location}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-3 text-xs" style={{ color: "var(--color-ash)" }}>
                  <span className="flex items-center gap-1"><Users size={12} /> {e.rsvp_count ?? 0}</span>
                  {e.my_rsvp && (
                    <span className="mono-tag rounded px-1.5 py-0.5" style={{ background: "rgba(0,200,83,0.12)", color: "var(--color-neon)" }}>
                      {e.my_rsvp.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </PullToRefresh>
  );
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}
