import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCreators, CREATOR_CATEGORIES } from "@/lib/creator.functions";
import { PullToRefresh } from "@/components/PullToRefresh";

export const Route = createFileRoute("/creators")({
  head: () => ({
    meta: [
      { title: "Creators · ZOMBIEREX" },
      { name: "description", content: "Trending builders, racers, photographers and clubs on ZOMBIEREX." },
    ],
  }),
  component: CreatorsPage,
});

const SCOPES = [
  { id: "trending", label: "Trending" },
  { id: "rising", label: "Rising" },
  { id: "featured", label: "Featured" },
  { id: "recommended", label: "Recommended" },
  { id: "top", label: "Top" },
  { id: "local", label: "Local" },
] as const;

const CATEGORY_LABEL: Record<string, string> = {
  motorcycle_builder: "Bike Builders",
  custom_bike_builder: "Custom Bikes",
  car_builder: "Car Builders",
  racer: "Racers",
  drifter: "Drift",
  drag_racer: "Drag",
  detailer: "Detailers",
  photographer: "Photo",
  videographer: "Video",
  mechanic: "Mechanics",
  reviewer: "Reviewers",
  club: "Clubs",
  event_organizer: "Organizers",
  influencer: "Influencers",
  other: "Other",
};

function CreatorsPage() {
  const [scope, setScope] = useState<(typeof SCOPES)[number]["id"]>("trending");
  const [category, setCategory] = useState<string | undefined>();
  const [search, setSearch] = useState("");

  const list = useServerFn(listCreators);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["creators", scope, category, search],
    queryFn: () => list({ data: { scope, category: category as any, search: search || undefined } }),
  });

  const featured = useMemo(() => (data ?? [])[0], [data]);

  return (
    <PullToRefresh onRefresh={() => refetch()}>
    <div className="pb-24">


      <div className="flex items-end justify-between px-4 pt-6">
        <div>
          <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>{(data ?? []).length} PROFILES</p>
          <h1 className="serif mt-2 text-4xl italic" style={{ color: "var(--color-ink)" }}>Creators</h1>
        </div>
        <Link to="/creator/apply" className="btn-neon" style={{ padding: "10px 14px", fontSize: 10 }}>
          + APPLY
        </Link>
      </div>

      <div className="px-4 pt-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search creators…"
          className="w-full border px-3 py-3 text-sm"
          style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }}
        />
      </div>

      <div className="no-scrollbar mt-4 flex overflow-x-auto border-y" style={{ borderColor: "var(--color-hair)" }}>
        {SCOPES.map((s) => {
          const active = scope === s.id;
          return (
            <button key={s.id} onClick={() => setScope(s.id)}
              className="tap relative shrink-0 border-r px-4 py-3 mono-tag font-bold"
              style={{
                borderColor: "var(--color-hair)",
                color: active ? "var(--color-ink)" : "var(--color-titanium)",
                background: active ? "rgba(255,255,255,0.03)" : "transparent",
              }}>
              {s.label.toUpperCase()}
              {active && <span className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: "var(--color-neon)" }} />}
            </button>
          );
        })}
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3 border-b" style={{ borderColor: "var(--color-hair)" }}>
        <button onClick={() => setCategory(undefined)}
          className="tap shrink-0 border px-3 py-1.5 mono-tag font-bold"
          style={{
            borderColor: "var(--color-hair-strong)",
            background: !category ? "var(--color-neon)" : "transparent",
            color: !category ? "#0a0a0a" : "var(--color-ink)",
          }}>ALL</button>
        {CREATOR_CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategory(c === category ? undefined : c)}
            className="tap shrink-0 border px-3 py-1.5 mono-tag font-bold"
            style={{
              borderColor: "var(--color-hair-strong)",
              background: category === c ? "var(--color-neon)" : "transparent",
              color: category === c ? "#0a0a0a" : "var(--color-ink)",
            }}>
            {(CATEGORY_LABEL[c] ?? c).toUpperCase()}
          </button>
        ))}
      </div>

      {featured && (
        <Link to="/creator/$id" params={{ id: featured.user_id }} className="block px-4 pt-4">
          <div className="relative overflow-hidden border" style={{ borderColor: "var(--color-hair-strong)" }}>
            <div className="relative h-52 w-full">
              {featured.profiles?.avatar_url ? (
                <img src={featured.profiles.avatar_url} alt="" className="h-full w-full object-cover" style={{ filter: "grayscale(0.25) contrast(1.1)" }} />
              ) : (
                <div className="h-full w-full" style={{ background: "var(--color-slate)" }} />
              )}
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.9) 100%)" }} />
              <span className="absolute left-3 top-3 mono-tag font-bold" style={{ background: "var(--color-neon)", color: "#0a0a0a", padding: "4px 8px" }}>
                FEATURED CREATOR
              </span>
              <div className="absolute inset-x-3 bottom-3">
                <p className="mono-tag font-bold" style={{ color: "var(--color-neon)" }}>
                  {(CATEGORY_LABEL[featured.category] ?? featured.category).toUpperCase()}
                </p>
                <h2 className="serif mt-1 text-2xl italic leading-tight" style={{ color: "var(--color-ink)" }}>
                  {featured.profiles?.display_name ?? featured.profiles?.handle}
                </h2>
                {featured.tagline && <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>{featured.tagline}</p>}
              </div>
            </div>
          </div>
        </Link>
      )}

      <div className="px-4 pt-4 space-y-3">
        {isLoading && <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>LOADING…</p>}
        {!isLoading && (data ?? []).length === 0 && (
          <div className="border border-dashed p-6 text-center" style={{ borderColor: "var(--color-hair-strong)" }}>
            <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>NO CREATORS YET</p>
            <p className="mt-2 text-sm font-bold" style={{ color: "var(--color-ink)" }}>Be the first to apply</p>
            <Link to="/creator/apply" className="btn-neon mt-4 inline-block" style={{ padding: "8px 12px", fontSize: 10 }}>
              APPLY AS CREATOR ▸
            </Link>
          </div>
        )}
        {(data ?? []).filter((c: any) => c.id !== featured?.id).map((c: any) => (
          <CreatorRow key={c.id} c={c} />
        ))}
      </div>
    </div>
  );
}

function CreatorRow({ c }: { c: any }) {
  return (
    <Link to="/creator/$id" params={{ id: c.user_id }} className="block">
      <article className="grid grid-cols-[64px_1fr_auto] items-center gap-3 border p-3"
        style={{ borderColor: "var(--color-hair-strong)", background: "rgba(255,255,255,0.02)" }}>
        {c.profiles?.avatar_url ? (
          <img src={c.profiles.avatar_url} alt="" className="h-16 w-16 object-cover" style={{ filter: "grayscale(0.2)" }} />
        ) : (
          <div className="h-16 w-16" style={{ background: "var(--color-slate)" }} />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold" style={{ color: "var(--color-ink)" }}>
              {c.profiles?.display_name ?? c.profiles?.handle}
            </p>
            {c.is_verified && (
              <span className="mono-tag font-bold px-1" style={{ background: "var(--color-neon)", color: "#0a0a0a" }}>VERIFIED</span>
            )}
          </div>
          <p className="mono-tag font-bold" style={{ color: "var(--color-neon)" }}>
            {(CATEGORY_LABEL[c.category] ?? c.category).toUpperCase()}
          </p>
          {c.tagline && <p className="mt-1 truncate text-xs" style={{ color: "var(--color-silver)" }}>{c.tagline}</p>}
        </div>
        <div className="text-right">
          <p className="mono-num text-sm font-bold" style={{ color: "var(--color-ink)" }}>{c.subscribers_count}</p>
          <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>SUBS</p>
        </div>
      </article>
    </Link>
  );
}
