import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { StatusBar } from "@/components/StatusBar";
import { searchAll } from "@/lib/search.functions";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Signal · ZOMBIEREX" },
      { name: "description", content: "Discover riders, builds, crews and parts across the ZOMBIEREX network." },
    ],
  }),
  component: ExplorePage,
});

const CHIPS = ["ALL", "RIDERS", "POSTS", "CREWS", "PARTS", "EVENTS", "TAGS"] as const;
type Chip = (typeof CHIPS)[number];

function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function ExplorePage() {
  const [q, setQ] = useState("");
  const [chip, setChip] = useState<Chip>("ALL");
  const dq = useDebounced(q.trim(), 250);
  const run = useServerFn(searchAll);

  const active = dq.length >= 2;
  const { data, isFetching } = useQuery({
    queryKey: ["search", dq],
    queryFn: () => run({ data: { q: dq, limit: 12 } }),
    enabled: active,
    staleTime: 30_000,
  });

  const trending = useQuery({
    queryKey: ["search", "trending"],
    queryFn: () => run({ data: { q: "a", limit: 12 } }),
    staleTime: 60_000,
  });

  const showSection = (c: Chip) => chip === "ALL" || chip === c;

  return (
    <div>
      <StatusBar index="02" section="SIGNAL · DISCOVER" />

      <div className="px-4 pt-6">
        <p className="mono-tag">NETWORK · LIVE INDEX</p>
        <h1 className="mt-2 display-xl text-5xl uppercase">Signal</h1>

        <div className="mt-4 flex items-stretch hairline">
          <span className="grid place-items-center px-3 mono-tag" style={{ color: "var(--color-ash)" }}>QRY</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="riders · builds · parts · tags"
            className="flex-1 bg-transparent py-3 pr-3 text-sm placeholder:text-ash focus:outline-none"
            style={{ color: "var(--color-ink)" }}
            autoFocus
          />
          {q && (
            <button onClick={() => setQ("")} className="mono-tag border-l border-hair px-4" style={{ color: "var(--color-ash)" }}>
              CLR
            </button>
          )}
        </div>
        {active && (
          <p className="mono-tag mt-2" style={{ color: "var(--color-ash)" }}>
            {isFetching ? "SEARCHING…" : `RESULTS FOR "${dq}"`}
          </p>
        )}
      </div>

      <div className="no-scrollbar mt-4 flex overflow-x-auto hairline-t hairline-b">
        {CHIPS.map((c) => (
          <button
            key={c}
            onClick={() => setChip(c)}
            className="tap relative shrink-0 border-r border-hair px-4 py-3 mono-caps"
            style={{
              color: chip === c ? "var(--color-ink)" : "var(--color-ash)",
              background: chip === c ? "var(--color-mist)" : "transparent",
            }}
          >
            {c}
            {chip === c && (
              <span className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: "var(--color-signal)" }} />
            )}
          </button>
        ))}
      </div>

      <div className="space-y-8 px-4 pt-6 pb-24">
        {active ? (
          <ResultsView data={data} isFetching={isFetching} showSection={showSection} />
        ) : (
          <TrendingView data={trending.data} showSection={showSection} setQ={setQ} />
        )}
      </div>
    </div>
  );
}

// ---------- Results ----------
function ResultsView({
  data,
  isFetching,
  showSection,
}: {
  data: any;
  isFetching: boolean;
  showSection: (c: Chip) => boolean;
}) {
  if (!data && isFetching) return <Skeleton />;
  if (!data) return null;

  const empty =
    (data.profiles?.length ?? 0) +
      (data.posts?.length ?? 0) +
      (data.listings?.length ?? 0) +
      (data.clubs?.length ?? 0) +
      (data.events?.length ?? 0) +
      (data.hashtags?.length ?? 0) ===
    0;

  if (empty) {
    return (
      <div className="text-center py-16">
        <p className="mono-tag" style={{ color: "var(--color-ash)" }}>NO SIGNAL</p>
        <p className="mt-2 text-sm" style={{ color: "var(--color-ash)" }}>Try a different query.</p>
      </div>
    );
  }

  return (
    <>
      {showSection("RIDERS") && data.profiles?.length > 0 && (
        <ProfilesSection profiles={data.profiles} />
      )}
      {showSection("TAGS") && data.hashtags?.length > 0 && (
        <HashtagsSection hashtags={data.hashtags} />
      )}
      {showSection("CREWS") && data.clubs?.length > 0 && <ClubsSection clubs={data.clubs} />}
      {showSection("POSTS") && data.posts?.length > 0 && <PostsSection posts={data.posts} />}
      {showSection("PARTS") && data.listings?.length > 0 && (
        <ListingsSection listings={data.listings} />
      )}
      {showSection("EVENTS") && data.events?.length > 0 && <EventsSection events={data.events} />}
    </>
  );
}

// ---------- Trending (idle state) ----------
function TrendingView({
  data,
  showSection,
  setQ,
}: {
  data: any;
  showSection: (c: Chip) => boolean;
  setQ: (v: string) => void;
}) {
  const tags = useMemo(
    () =>
      (data?.hashtags ?? []).slice(0, 12) as { id: string; tag: string; usage_count: number }[],
    [data],
  );

  return (
    <>
      {showSection("TAGS") && (
        <section>
          <SectionHeader index="A" title="Frequencies · Trending Tags" />
          {tags.length === 0 ? (
            <p className="mono-tag mt-3" style={{ color: "var(--color-ash)" }}>
              Start typing to search across riders, posts, crews, parts and events.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((t, i) => (
                <button key={t.id} onClick={() => setQ(t.tag)} className="chip">
                  <span style={{ color: "var(--color-ash)" }}>{String(i + 1).padStart(2, "0")}</span>
                  <span>#{t.tag}</span>
                  <span style={{ color: "var(--color-ash)" }}>{t.usage_count}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {showSection("RIDERS") && (data?.profiles?.length ?? 0) > 0 && (
        <ProfilesSection profiles={data.profiles} />
      )}
      {showSection("CREWS") && (data?.clubs?.length ?? 0) > 0 && <ClubsSection clubs={data.clubs} />}
      {showSection("PARTS") && (data?.listings?.length ?? 0) > 0 && (
        <ListingsSection listings={data.listings} />
      )}
      {showSection("EVENTS") && (data?.events?.length ?? 0) > 0 && (
        <EventsSection events={data.events} />
      )}
    </>
  );
}

// ---------- Sections ----------
function ProfilesSection({ profiles }: { profiles: any[] }) {
  return (
    <section>
      <SectionHeader index="R" title="Operators" />
      <ul className="mt-3 divide-y divide-hair hairline-t hairline-b">
        {profiles.map((u, i) => (
          <li key={u.id}>
            <Link
              to="/creator/$id"
              params={{ id: u.id }}
              className="tap flex items-center gap-3 py-3"
            >
              <span className="display-numeral w-6 text-lg" style={{ color: "var(--color-ash)" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <img
                src={u.avatar_url || "/placeholder.svg"}
                alt=""
                className="h-10 w-10 object-cover hairline"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold">{u.display_name || u.handle}</p>
                <p className="mono-tag mt-0.5 truncate" style={{ color: "var(--color-ash)" }}>
                  @{u.handle} {u.tier ? `· ${u.tier}` : ""}
                </p>
              </div>
              <span className="mono-tag" style={{ color: "var(--color-signal)" }}>VIEW →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HashtagsSection({ hashtags }: { hashtags: any[] }) {
  return (
    <section>
      <SectionHeader index="#" title="Tags" />
      <div className="mt-3 flex flex-wrap gap-2">
        {hashtags.map((t) => (
          <Link
            key={t.id}
            to="/search"
            search={{ q: t.tag } as any}
            className="chip"
          >
            <span>#{t.tag}</span>
            <span style={{ color: "var(--color-ash)" }}>{t.usage_count ?? 0}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ClubsSection({ clubs }: { clubs: any[] }) {
  return (
    <section>
      <SectionHeader index="C" title="Crews" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        {clubs.map((c, i) => (
          <Link
            key={c.id}
            to="/communities/$slug"
            params={{ slug: c.slug ?? c.id }}
            className="tap hairline overflow-hidden"
          >
            <div className="relative h-24 bg-mist">
              {c.banner_url && <img src={c.banner_url} alt="" className="h-full w-full object-cover" />}
              <span
                className="absolute left-2 top-2 mono-tag text-white"
                style={{ background: "rgba(0,0,0,0.55)", padding: "3px 6px" }}
              >
                CR·{String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <div className="p-3">
              <p className="line-clamp-1 text-sm font-bold">{c.name}</p>
              <p className="mono-tag mt-1" style={{ color: "var(--color-ash)" }}>OPEN →</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function PostsSection({ posts }: { posts: any[] }) {
  return (
    <section>
      <SectionHeader index="P" title="Posts" />
      <div className="mt-3 grid grid-cols-3 gap-0.5">
        {posts.map((p, i) => {
          const img = p.thumbnail_url || p.media_url;
          return (
            <Link
              key={p.id}
              to="/reels"
              search={{ post: p.id } as any}
              className="relative aspect-[3/4] overflow-hidden border border-hair bg-mist"
            >
              {img && <img src={img} alt="" className="h-full w-full object-cover" />}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
              <span
                className="absolute left-1.5 top-1.5 mono-tag"
                style={{ color: "rgba(255,255,255,0.8)" }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              {p.caption && (
                <span className="absolute bottom-1.5 left-1.5 right-1.5 line-clamp-2 text-[10px] font-bold text-white">
                  {p.caption}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ListingsSection({ listings }: { listings: any[] }) {
  return (
    <section>
      <SectionHeader index="L" title="Parts & Builds" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        {listings.map((l, i) => (
          <Link
            key={l.id}
            to="/marketplace/$id"
            params={{ id: l.id }}
            className="tap hairline overflow-hidden"
          >
            <div className="aspect-square w-full bg-mist">
              {l.hero_image_url && (
                <img src={l.hero_image_url} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="p-3">
              <p className="mono-tag" style={{ color: "var(--color-ash)" }}>
                LOT·{String(i + 1).padStart(3, "0")}
              </p>
              <p className="mt-1 line-clamp-1 text-[13px] font-bold">{l.title}</p>
              <p className="display-numeral mt-1 text-lg" style={{ color: "var(--color-signal)" }}>
                {formatMoney(l.price_cents, l.currency)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function EventsSection({ events }: { events: any[] }) {
  return (
    <section>
      <SectionHeader index="E" title="Events" />
      <ul className="mt-3 divide-y divide-hair hairline-t hairline-b">
        {events.map((e) => (
          <li key={e.id}>
            <Link
              to="/events/$id"
              params={{ id: e.id }}
              className="tap flex items-center gap-3 py-3"
            >
              <div className="h-12 w-12 shrink-0 bg-mist hairline overflow-hidden">
                {e.cover_url && <img src={e.cover_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold">{e.title}</p>
                <p className="mono-tag mt-0.5 truncate" style={{ color: "var(--color-ash)" }}>
                  {formatDate(e.starts_at)} {e.location ? `· ${e.location}` : ""}
                </p>
              </div>
              <span className="mono-tag" style={{ color: "var(--color-signal)" }}>OPEN →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------- primitives ----------
function SectionHeader({ title, index }: { title: string; index: string }) {
  return (
    <div className="flex items-baseline justify-between hairline-b pb-2">
      <div className="flex items-baseline gap-3">
        <span className="mono-tag" style={{ color: "var(--color-signal)" }}>{index}</span>
        <h2 className="display-xl text-xl uppercase">{title}</h2>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-14 w-full animate-pulse hairline" style={{ background: "var(--color-mist)" }} />
      ))}
    </div>
  );
}

function formatMoney(cents?: number | null, currency?: string | null) {
  if (cents == null) return "—";
  const value = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${value.toFixed(0)}`;
  }
}

function formatDate(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}
