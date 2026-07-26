import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { discoverCommunities, CATEGORIES } from "@/lib/communities.functions";

import { PullToRefresh } from "@/components/PullToRefresh";

export const Route = createFileRoute("/communities/")({
  head: () => ({
    meta: [
      { title: "Communities · ZOMBIEREX" },
      { name: "description", content: "Discover, join and create motorsport communities — sportbikes, JDM, drift, overland, custom builds and local car meets." },
      { property: "og:title", content: "Communities · ZOMBIEREX" },
      { property: "og:description", content: "Discover, join and create motorsport communities across the ZOMBIEREX network." },
    ],
  }),
  component: CommunitiesPage,
});

const CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  custom_builds: "Custom builds",
  harley: "Harley-Davidson",
  sport_bikes: "Sport bikes",
  cafe_racers: "Café racers",
  adventure_bikes: "Adventure bikes",
  cruisers: "Cruisers",
  choppers: "Choppers",
  drag_racing: "Drag racing",
  drifting: "Drifting",
  supercars: "Supercars",
  hypercars: "Hypercars",
  jdm: "JDM",
  american_muscle: "American muscle",
  european_performance: "Euro performance",
  classic_cars: "Classic cars",
  restorations: "Restorations",
  off_road: "Off-road",
  overlanding: "Overlanding",
  monster_trucks: "Monster trucks",
  rally: "Rally",
  circuit_racing: "Circuit racing",
  formula: "Formula",
  time_attack: "Time attack",
  car_audio: "Car audio",
  detailing: "Detailing",
  ev_performance: "EV performance",
  photography: "Photography",
  clubs: "Clubs",
  local_riders: "Local riders",
  local_meets: "Local meets",
};

const SORTS = [
  { id: "trending" as const, label: "Trending" },
  { id: "active" as const, label: "Active now" },
  { id: "popular" as const, label: "Popular" },
  { id: "recent" as const, label: "New" },
];

function CommunitiesPage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<(typeof SORTS)[number]["id"]>("trending");

  const discover = useServerFn(discoverCommunities);
  const { data, isPending, refetch } = useQuery({
    queryKey: ["communities", { q, category, sort }],
    queryFn: () => discover({
      data: {
        q: q || undefined,
        category: category === "all" ? undefined : category,
        sort,
        limit: 30,
      },
    }),
  });

  const items = data ?? [];

  return (
    <PullToRefresh onRefresh={() => refetch()}>
    <div className="pb-24">


      {/* Header */}
      <div className="px-4 pt-6">
        <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>Network · Communities</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <h1 className="serif text-[36px] italic leading-[0.95]" style={{ color: "var(--color-ink)" }}>
            Find your crew
          </h1>
          <Link
            to="/communities/create"
            className="tap shrink-0 rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-wider"
            style={{ background: "var(--color-neon)", color: "var(--color-obsidian)", letterSpacing: "0.14em" }}
          >
            + New
          </Link>
        </div>

        {/* Search */}
        <div
          className="mt-4 flex items-stretch overflow-hidden rounded-full"
          style={{ border: "1px solid var(--color-hair-strong)", background: "var(--color-graphite)" }}
        >
          <span className="grid place-items-center px-3 mono-tag" style={{ color: "var(--color-titanium)" }}>QRY</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="riders, tags, cities…"
            className="flex-1 bg-transparent py-2.5 pr-3 text-[13px] placeholder:text-titanium focus:outline-none"
            style={{ color: "var(--color-ink)" }}
          />
        </div>
      </div>

      {/* Category dropdown */}
      <div className="mt-4 px-4">
        <label className="mono-tag block mb-1.5" style={{ color: "var(--color-titanium)", letterSpacing: "0.18em" }}>
          CATEGORY
        </label>
        <div
          className="relative flex items-center overflow-hidden rounded-full"
          style={{ border: "1px solid var(--color-hair-strong)", background: "var(--color-graphite)" }}
        >
          <span className="pl-3.5 pr-2 mono-tag" style={{ color: "var(--color-neon)", letterSpacing: "0.14em" }}>
            ▸
          </span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="tap flex-1 appearance-none bg-transparent py-2.5 pr-9 text-[13px] font-semibold focus:outline-none"
            style={{ color: "var(--color-ink)" }}
          >
            {(["all", ...CATEGORIES] as const).map((c) => (
              <option key={c} value={c} style={{ background: "var(--color-graphite)", color: "var(--color-ink)" }}>
                {CATEGORY_LABELS[c] ?? c}
              </option>
            ))}
          </select>
          <span
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px]"
            style={{ color: "var(--color-titanium)" }}
          >
            ▼
          </span>
        </div>
      </div>


      {/* Sort tabs */}
      <div className="mt-3 flex gap-1 px-4">
        {SORTS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSort(s.id)}
            className="tap flex-1 rounded-md py-1.5 text-[11px] font-bold uppercase tracking-wider"
            style={{
              background: sort === s.id ? "var(--color-obsidian)" : "transparent",
              color: sort === s.id ? "var(--color-neon)" : "var(--color-titanium)",
              border: "1px solid var(--color-hair)",
              letterSpacing: "0.14em",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Featured */}
      {items[0] && (
        <FeaturedCard c={items[0]} />
      )}

      {/* Grid */}
      <div className="mt-4 grid grid-cols-2 gap-2 px-4">
        {items.slice(1).map((c) => (
          <CommunityCard key={c.id} c={c} />
        ))}
      </div>

      {isPending && (
        <p className="mono-tag mt-6 text-center" style={{ color: "var(--color-titanium)" }}>
          scanning frequencies…
        </p>
      )}
    </div>
    </PullToRefresh>
  );
}


type CardCommunity = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  category: string;
  location?: string | null;
  cover_url?: string | null;
  banner_url?: string | null;
  members_count: number;
  is_private: boolean;
  activity_score: number;
  hashtags: string[];
};

function FeaturedCard({ c }: { c: CardCommunity }) {
  const img = c.cover_url || c.banner_url || "";
  return (
    <Link
      to="/communities/$slug"
      params={{ slug: c.slug }}
      className="tap mx-4 mt-4 block overflow-hidden"
      style={{ borderRadius: 16, border: "1px solid var(--color-hair)" }}
    >
      <div className="relative aspect-[16/9]">
        {img && <img src={img} alt="" className="h-full w-full object-cover" />}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(8,9,11,0.1) 30%, rgba(8,9,11,0.9) 100%)" }} />
        <span
          className="absolute left-2.5 top-2.5 mono-tag rounded-full px-2 py-0.5"
          style={{ background: "var(--color-neon)", color: "var(--color-obsidian)", fontSize: 9, letterSpacing: "0.14em" }}
        >
          FEATURED
        </span>
        <div className="absolute inset-x-3 bottom-3 text-white">
          <p className="mono-tag" style={{ color: "rgba(255,255,255,0.8)", fontSize: 9 }}>
            {CATEGORY_LABELS[c.category] ?? c.category} · {c.location ?? "Worldwide"}
          </p>
          <p className="serif text-[22px] italic leading-tight">{c.name}</p>
          <p className="mt-1 text-[11px]" style={{ color: "rgba(255,255,255,0.85)" }}>
            {c.members_count.toLocaleString()} operators · activity {c.activity_score}
          </p>
        </div>
      </div>
    </Link>
  );
}

function CommunityCard({ c }: { c: CardCommunity }) {
  const img = c.cover_url || c.banner_url || "";
  return (
    <Link
      to="/communities/$slug"
      params={{ slug: c.slug }}
      className="tap overflow-hidden"
      style={{ borderRadius: 12, border: "1px solid var(--color-hair)", background: "var(--color-graphite)" }}
    >
      <div className="relative h-24">
        {img && <img src={img} alt="" className="h-full w-full object-cover" style={{ filter: "brightness(0.7)" }} />}
        {c.is_private && (
          <span
            className="absolute right-1.5 top-1.5 mono-tag rounded px-1.5 py-0.5"
            style={{ background: "rgba(8,9,11,0.7)", color: "var(--color-neon)", fontSize: 8 }}
          >
            PRIVATE
          </span>
        )}
      </div>
      <div className="px-2.5 py-2">
        <p className="mono-tag truncate" style={{ color: "var(--color-titanium)", fontSize: 8.5 }}>
          {CATEGORY_LABELS[c.category] ?? c.category}
        </p>
        <p className="mt-0.5 truncate text-[12.5px] font-semibold" style={{ color: "var(--color-ink)" }}>
          {c.name}
        </p>
        <p className="mono-num mt-1 text-[10px]" style={{ color: "var(--color-neon)" }}>
          {c.members_count.toLocaleString()} ops
        </p>
      </div>
    </Link>
  );
}
