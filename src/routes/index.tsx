import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { InteractionBar } from "@/components/InteractionBar";
import { CommentsSheet } from "@/components/CommentsSheet";
import { RiderMark } from "@/components/RiderBadge";
import {
  IconClaw,
  IconVisor,
  IconMechClaw,
  IconBoneMark,
} from "@/components/icons/RexIcons";
import { Bell, MessageCircle, Map, Store, CalendarDays, Users, Bluetooth, Gauge } from "lucide-react";
import brandLogo from "@/assets/zombierex-logo.png.asset.json";
import { reels, posts, chats, users, clubs } from "@/lib/mock-data";
import { StoriesRail } from "@/components/StoriesRail";
import { useFollow } from "@/hooks/useFollow";
import { SponsoredCard } from "@/components/SponsoredCard";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { listSponsoredCreatives } from "@/lib/ads.functions";
import { listFeed, listAuthedFeed } from "@/lib/feed.functions";
import { supabase } from "@/integrations/supabase/client";
import { PullToRefresh } from "@/components/PullToRefresh";
import { ReportBlockSheet, type ReportTargetKind } from "@/components/ReportBlockSheet";
import { AutoplayVideo, isVideoUrl } from "@/components/AutoplayVideo";
import { useDoubleTap } from "@/hooks/useDoubleTap";
import { Volume2, VolumeX, Heart } from "lucide-react";
import { Landing } from "@/components/marketing/Landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZOMBIEREX — The World's Automotive Social Network" },
      { name: "description", content: "Cars, motorcycles, drag racing, drifting and car shows in one app. Share builds, verify times, plan routes, buy and sell parts, and find your crew." },
      { property: "og:title", content: "ZOMBIEREX — The World's Automotive Social Network" },
      { property: "og:description", content: "Cars, motorcycles, drag racing, drifting and car shows in one app. Join 128,000+ riders and drivers worldwide." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RootEntry,
});

/**
 * Instagram/TikTok pattern: signed-out visitors get the public marketing
 * site at "/", signed-in members land straight in their feed.
 */
function hasCachedSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
        const v = window.localStorage.getItem(k);
        if (v && v.length > 20) return true;
      }
    }
  } catch { /* storage blocked — treat as signed out */ }
  return false;
}

function RootEntry() {
  // Optimistic first paint: never leave the page blank while the auth
  // session resolves — that made "/" look frozen on slow networks.
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    setAuthed(hasCachedSession());
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setAuthed(!!data.session);
    }).catch(() => { if (alive) setAuthed(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  if (authed === null) {
    // Server render / first paint: show the public site (also best for SEO).
    return <Landing />;
  }
  return authed ? <HomePage /> : <Landing />;
}


const TRENDING_TAGS = [
  { tag: "#nightride", posts: "48.2K" },
  { tag: "#widebody", posts: "31.6K" },
  { tag: "#trackday", posts: "22.9K" },
  { tag: "#wrenchlife", posts: "18.4K" },
  { tag: "#jdm", posts: "72.1K" },
  { tag: "#turbolife", posts: "14.8K" },
];

const QUICK_ACTIONS = [
  { to: "/atlas" as const,        label: "Atlas",    icon: Map },
  { to: "/drag" as const,         label: "Drag",     icon: Gauge },
  { to: "/marketplace" as const,  label: "Vault",    icon: Store },
  { to: "/events" as const,       label: "Events",   icon: CalendarDays },
  { to: "/communities" as const,  label: "Crews",    icon: Users },
];

function PulseStat({ label, value, tone }: { label: string; value: string; tone?: "neon" }) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-2">
      <span
        className="mono-tag truncate"
        style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--color-ink-3)", lineHeight: 1 }}
      >
        {label}
      </span>
      <span
        className="display-numeral truncate text-[22px]"
        style={{
          color: tone === "neon" ? "var(--color-neon-deep)" : "var(--color-ink-0)",
          lineHeight: 1.05,
          maxWidth: "100%",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function HomePage() {
  const [tab, setTab] = useState<"for_you" | "following">("for_you");
  const [commentTarget, setCommentTarget] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<null | {
    kind: ReportTargetKind; id?: string; authorId?: string; handle?: string;
  }>(null);
  const featured = reels[1];
  const gridReels = [reels[0], reels[2], reels[3]];
  const suggestedCreators = users.slice(0, 6);
  const suggestedClubs = clubs.slice(0, 4);
  const listAds = useServerFn(listSponsoredCreatives);
  const sponsored = useQuery({
    queryKey: ["ads", "feed"],
    queryFn: () => listAds({ data: { placement: "feed", limit: 3 } }),
    staleTime: 5 * 60_000,
  });
  const fetchFeed = useServerFn(listFeed);
  const fetchAuthedFeed = useServerFn(listAuthedFeed);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => { if (alive) setSignedIn(!!data.user); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s?.user));
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);
  const liveFeed = useInfiniteQuery({
    queryKey: ["feed", "live", signedIn ? "authed" : "anon"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      signedIn
        ? fetchAuthedFeed({ data: { limit: 20, cursor: pageParam } })
        : fetchFeed({ data: { limit: 20, cursor: pageParam } }),
    getNextPageParam: (last: any) => last?.nextCursor ?? undefined,
    staleTime: 30_000,
  });
  const allItems = (liveFeed.data?.pages ?? []).flatMap((p: any) => p?.items ?? []);
  const realPosts = allItems.map((r: any) => {
    const a = r.author ?? {};
    const mins = Math.max(1, Math.round((Date.now() - new Date(r.created_at).getTime()) / 60000));
    const timeAgo = mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.round(mins/60)}h` : `${Math.round(mins/1440)}d`;
    const media = r.media_url || r.thumbnail_url || "";
    const isVid = r.kind === "video" || /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(media);
    return {
      id: `db:${r.id}`,
      dbId: r.id as string,
      authorId: (a.id ?? r.author_id) as string | undefined,
      user: {
        avatar: a.avatar_url || "https://api.dicebear.com/7.x/shapes/svg?seed=" + (a.id ?? r.author_id),
        handle: a.handle || a.display_name || "rider",
        verified: !!a.is_verified,
        location: a.location || "",
      },
      timeAgo,
      image: media,
      video: isVid ? r.media_url || "" : "",
      poster: r.thumbnail_url || (isVid ? undefined : media) || undefined,
      vehicle: null as any,
      likes: r.likes_count ?? 0,
      comments: r.comments_count ?? 0,
      caption: r.caption ?? "",
      tags: [] as string[],
    };
  }).filter((p: any) => p.image || p.caption);
  // C-10: no mock fallback. Empty feed shows real emptiness, not sample data.
  const feedPosts = realPosts;
  const feedIsEmpty = !liveFeed.isLoading && realPosts.length === 0;

  // IntersectionObserver sentinel — auto-load next page as user scrolls.
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && liveFeed.hasNextPage && !liveFeed.isFetchingNextPage) {
        liveFeed.fetchNextPage();
      }
    }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [liveFeed.hasNextPage, liveFeed.isFetchingNextPage, liveFeed.fetchNextPage]);





  const qc = useQueryClient();
  const onRefresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["feed", "live"] }),
      qc.invalidateQueries({ queryKey: ["ads", "feed"] }),
    ]);
  };

  return (
    <PullToRefresh onRefresh={onRefresh}>
    <div className="pb-24">
      {/* Masthead is provided globally by GlobalStatusBar in __root. */}


      {/* ==================================================
         DASHBOARD — Pulse + Quick actions (bento)
         ================================================== */}
      <section className="px-4 pt-4">
        <Link
          to="/rewards"
          className="grid grid-cols-3 gap-2 tap"
          style={{ borderRadius: 14, background: "var(--color-paper-0)", border: "1px solid var(--color-line)", padding: 12 }}
        >
          <PulseStat label="XP today" value="+184" tone="neon" />
          <PulseStat label="Streak"   value="12d" />
          <PulseStat label="Rides"    value="3" />
        </Link>

        <div className="mt-3 grid grid-cols-5 gap-2">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="tap flex flex-col items-center justify-center gap-1.5 py-3"
              style={{ background: "var(--color-paper-0)", border: "1px solid var(--color-line)", borderRadius: 12 }}
            >
              <span
                className="grid h-8 w-8 place-items-center"
                style={{ background: "var(--color-paper-2)", borderRadius: 8, color: "var(--color-ink-0)" }}
                aria-hidden
              >
                <a.icon size={16} strokeWidth={1.9} />
              </span>
              <span className="text-[11px] font-semibold" style={{ color: "var(--color-ink-1)" }}>{a.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ==================================================
         STORIES RAIL
         ================================================== */}
      <section className="mt-4">
        <StoriesRail />
        <div style={{ height: 1, background: "var(--color-line)" }} />
      </section>


      {/* ==================================================
         FEED TABS — For You / Following
         ================================================== */}
      <div
        className="sticky top-[calc(env(safe-area-inset-top)+58px)] z-30 flex items-center gap-1 px-4 py-2"
        style={{
          background: "color-mix(in oklab, #ffffff 90%, transparent)",
          backdropFilter: "blur(18px) saturate(160%)",
          borderBottom: "1px solid var(--color-line)",
        }}
      >
        {(["for_you", "following"] as const).map((k) => {
          const active = tab === k;
          return (
            <button
              key={k}
              onClick={() => setTab(k)}
              className="tap relative px-3 py-1.5 text-[13px] font-semibold"
              style={{ color: active ? "var(--color-ink-0)" : "var(--color-ink-3)" }}
            >
              {k === "for_you" ? "For you" : "Following"}
              {active && (
                <span
                  className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full"
                  style={{ height: 3, width: 22, background: "var(--color-ink-0)" }}
                />
              )}
            </button>
          );
        })}
        <span className="ml-auto mono-tag" style={{ color: "var(--color-ink-3)" }}>
          ● Live · {tab === "for_you" ? "personalized" : `${suggestedCreators.length} riders`}
        </span>
      </div>


      {/* ==================================================
         FEATURED REEL — TikTok DNA · tap → /reels
         ================================================== */}
      <section className="mt-4 px-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="mono-tag" style={{ color: "var(--color-neon)" }}>● Trending · Reels</p>
          <Link to="/reels" className="mono-tag" style={{ color: "var(--color-silver)" }}>Open reels →</Link>
        </div>
        <Link
          to="/reels"
          className="relative block overflow-hidden"
          style={{ aspectRatio: "9/14", borderRadius: 18, border: "1px solid var(--color-hair)" }}
        >

          {featured.poster ? (
            <img src={featured.poster} alt="" className="ken-burns h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ background: "var(--color-graphite)" }} />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 30%, rgba(0,0,0,0.85) 100%)" }} />

          {/* top row — user + follow */}
          <div className="absolute inset-x-3 top-3 flex items-center gap-2">
            <img src={featured.user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" style={{ boxShadow: "0 0 0 1.5px var(--color-neon)" }} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
                {featured.user.handle} <RiderMark tier="APEX_REX" />
              </p>
              <p className="mono-tag" style={{ color: "rgba(255,255,255,0.7)" }}>◎ {featured.location}</p>
            </div>
            <FollowButton
              id={featured.user.id}
              label={featured.user.handle}
              variant="ember"
            />

          </div>

          {/* TikTok-style right action rail */}
          <div className="absolute bottom-20 right-3 flex flex-col items-center gap-4 text-white">
            <RailBtn Icon={IconClaw} count={fmt(featured.likes)} active tint="var(--color-ember)" />
            <RailBtn Icon={IconVisor} count={fmt(featured.comments)} />
            <RailBtn Icon={IconBoneMark} count="Save" />
            <RailBtn Icon={IconMechClaw} count={fmt(featured.shares)} />
            <div className="mt-1 h-9 w-9 overflow-hidden rounded-full border-2 border-white" style={{ animation: "ken-burns 18s linear infinite" }}>
              <img src={featured.user.avatar} alt="" className="h-full w-full object-cover" />
            </div>
          </div>

          {/* caption + music ticker */}
          <div className="absolute inset-x-3 bottom-3 pr-16 text-white">
            <p className="text-[13px] leading-snug">
              {featured.caption}
            </p>
            <p className="mt-1.5 text-[11px]" style={{ color: "rgba(255,255,255,0.75)" }}>
              {featured.hashtags.slice(0, 3).join(" ")}
            </p>
            <div className="mt-2.5 flex items-center gap-2 overflow-hidden">
              <span
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px]"
                style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
              >
                ♫
              </span>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="marquee whitespace-nowrap text-[11px]" style={{ color: "rgba(255,255,255,0.9)" }}>
                  {featured.music.title} — {featured.music.artist} · original sound · {featured.views} views · &nbsp;
                  {featured.music.title} — {featured.music.artist} ·&nbsp;
                </p>
              </div>
            </div>
          </div>

          {/* play indicator */}
          <span className="absolute left-3 top-14 mono-tag" style={{ color: "rgba(255,255,255,0.75)" }}>
            ▶ Autoplay · {featured.duration}s
          </span>
        </Link>

      </section>

      {/* ==================================================
         QUICK CHATS — Snap-style horizontal chat strip
         ================================================== */}
      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between px-4">
          <div>
            <p className="mono-tag" style={{ color: "var(--color-silver)" }}>Comms</p>
            <h2 className="serif text-[20px] italic leading-none" style={{ color: "var(--color-ink)" }}>Recent chats</h2>
          </div>
          <Link to="/messages" className="mono-tag" style={{ color: "var(--color-neon)" }}>Open →</Link>
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
          {chats.map((c) => (
            <Link
              key={c.id}
              to="/messages"
              className="tap shrink-0"
              style={{ width: 168 }}
            >
              <div
                className="flex flex-col items-start gap-2 p-3"
                style={{
                  background: c.unread > 0 ? "linear-gradient(160deg, rgba(198,255,61,0.10), rgba(255,91,58,0.06))" : "var(--color-graphite)",
                  border: `1px solid ${c.unread > 0 ? "rgba(198,255,61,0.35)" : "var(--color-hair)"}`,
                  borderRadius: 14,
                }}
              >
                <div className="flex w-full items-center gap-2">
                  <div className="relative">
                    <img src={c.user.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                    {c.online && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full"
                        style={{ background: "var(--color-neon)", boxShadow: "0 0 0 2px var(--color-graphite)" }}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold" style={{ color: "var(--color-ink)" }}>
                      {c.user.name}
                    </p>
                    <p className="mono-tag" style={{ fontSize: 8.5, color: "var(--color-titanium)" }}>{c.timeAgo}</p>
                  </div>
                  {c.unread > 0 && (
                    <span
                      className="grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold"
                      style={{ background: "var(--color-ember)", color: "white" }}
                    >
                      {c.unread}
                    </span>
                  )}
                </div>
                <p className="line-clamp-2 text-[11.5px] leading-snug" style={{ color: "var(--color-silver)" }}>
                  {c.lastMessage}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ==================================================
         FEATURED CREATORS — horizontal card rail
         ================================================== */}
      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between px-4">
          <div>
            <p className="mono-tag" style={{ color: "var(--color-silver)" }}>Signal · Riders</p>
            <h2 className="serif text-[20px] italic leading-none" style={{ color: "var(--color-ink)" }}>Featured creators</h2>
          </div>
          <Link to="/search" className="mono-tag" style={{ color: "var(--color-neon)" }}>Discover →</Link>
        </div>
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
          {suggestedCreators.map((u, i) => {
            const tiers = ["APEX_REX", "LEGEND", "ELITE", "TURBO", "MASTER_BUILDER", "NITRO"] as const;
            const tier = tiers[i % tiers.length];
            return (
              <div
                key={u.id}
                className="shrink-0 overflow-hidden"
                style={{ width: 158, borderRadius: 14, border: "1px solid var(--color-hair)", background: "var(--color-graphite)" }}
              >
                <div className="relative h-20">
                  <img src={u.avatar} alt="" className="h-full w-full object-cover" style={{ filter: "brightness(0.55) saturate(1.1)" }} />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent, rgba(8,9,11,0.85))" }} />
                </div>
                <div className="-mt-8 px-3 pb-3">
                  <img src={u.avatar} alt="" className="h-12 w-12 rounded-full object-cover" style={{ boxShadow: "0 0 0 2px var(--color-graphite)" }} />
                  <p className="mt-1.5 flex items-center gap-1 truncate text-[12.5px] font-semibold" style={{ color: "var(--color-ink)" }}>
                    {u.name}
                    {u.verified && <RiderMark tier={tier} />}
                  </p>
                  <p className="mono-tag truncate" style={{ fontSize: 8.5, color: "var(--color-titanium)" }}>
                    {u.handle} · ◎ {u.location}
                  </p>
                  <FollowButton
                    id={u.id}
                    label={u.handle}
                    variant="neon"
                    fullWidth
                  />

                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ==================================================
         TRENDING HASHTAGS
         ================================================== */}
      <section className="mt-6 px-4">
        <div className="mb-2.5 flex items-end justify-between">
          <div>
            <p className="mono-tag" style={{ color: "var(--color-silver)" }}>Frequencies</p>
            <h2 className="serif text-[20px] italic leading-none" style={{ color: "var(--color-ink)" }}>Trending tags</h2>
          </div>
          <Link to="/search" className="mono-tag" style={{ color: "var(--color-neon)" }}>All →</Link>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TRENDING_TAGS.map((t, i) => (
            <Link
              key={t.tag}
              to="/search"
              className="tap flex items-center gap-2 rounded-full px-2.5 py-1.5"
              style={{ border: "1px solid var(--color-hair-strong)", background: "var(--color-graphite)" }}
            >
              <span className="mono-num text-[10px]" style={{ color: "var(--color-titanium)" }}>{String(i + 1).padStart(2, "0")}</span>
              <span className="text-[12px] font-semibold" style={{ color: "var(--color-ink)" }}>{t.tag}</span>
              <span className="mono-num text-[10px]" style={{ color: "var(--color-neon)" }}>{t.posts}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ==================================================
         SUGGESTED CREWS
         ================================================== */}
      <section className="mt-6 px-4">
        <div className="mb-2.5 flex items-end justify-between">
          <div>
            <p className="mono-tag" style={{ color: "var(--color-silver)" }}>Crews · Join</p>
            <h2 className="serif text-[20px] italic leading-none" style={{ color: "var(--color-ink)" }}>Suggested for you</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {suggestedClubs.map((c) => (
            <div key={c.id} className="overflow-hidden" style={{ borderRadius: 12, border: "1px solid var(--color-hair)" }}>
              <div className="relative h-20">
                <img src={c.cover} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent, rgba(8,9,11,0.7))" }} />
                <span className="absolute left-2 bottom-1.5 text-[12px] font-bold text-white">{c.name}</span>
              </div>
              <div className="flex items-center justify-between px-2.5 py-2" style={{ background: "var(--color-graphite)" }}>
                <span className="mono-tag" style={{ color: "var(--color-titanium)", fontSize: 9 }}>
                  {c.tag} · {c.members.toLocaleString()} ops
                </span>
                <button
                  className="tap rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: "var(--color-neon)", color: "var(--color-obsidian)", letterSpacing: "0.14em" }}
                >
                  Join
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ==================================================
         FEED — Instagram DNA
         Square media · caption · InteractionBar
         ================================================== */}
      <section className="mt-8 space-y-10">
        {feedPosts.map((p: any, idx: number) => (
          <div key={p.id}>
          <article className="rise" style={{ animationDelay: `${idx * 40}ms` }}>
            {/* post header — single baseline, 8pt rhythm, no crowding */}
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 pb-3">
              <div className="story-ring shrink-0">
                <div style={{ background: "var(--color-paper-0)", padding: 2, borderRadius: 999 }}>
                  <img src={p.user.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5">
                  <p className="truncate text-[13.5px] font-semibold" style={{ color: "var(--color-ink-0)" }}>
                    {p.user.handle}
                  </p>
                  {p.user.verified && <span className="shrink-0"><RiderMark tier="LEGEND" /></span>}
                </div>
                <p
                  className="mt-1 truncate text-[11px]"
                  style={{ color: "var(--color-ink-3)", letterSpacing: "0.02em" }}
                >
                  {p.user.location} · {p.timeAgo}
                </p>
              </div>
              <button
                aria-label="More"
                onClick={() => setReportTarget({
                  kind: "post",
                  id: (p as any).dbId,
                  authorId: (p as any).authorId,
                  handle: p.user.handle,
                })}
                className="tap grid h-9 w-9 shrink-0 place-items-center text-lg leading-none"
                style={{ color: "var(--color-ink-3)" }}
              >
                ⋯
              </button>
            </div>

            {/* square media — video autoplays in view, double-tap to like */}
            <FeedMedia
              image={p.image}
              video={p.video}
              poster={p.poster || p.image}
              alt={p.caption || "Post"}
              vehicle={p.vehicle}
              onDoubleTap={() => { /* optimistic like handled by InteractionBar tap; heart burst rendered inside */ }}
            />


            {/* interaction bar */}
            <div className="px-2 pt-4">
              <InteractionBar
                variant="dark"
                targetId={`post:${p.id}`}
                counts={{
                  likes: p.likes,
                  comments: p.comments,
                  shares: Math.round(p.likes * 0.08),
                }}
                onComment={() => setCommentTarget(`post:${p.id}`)}
              />
            </div>

            {/* caption */}
            <div className="mt-4 px-4">
              <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--color-ink-0)" }}>
                <span className="font-semibold">{p.user.handle}</span>{" "}
                {p.caption}
              </p>
              <p className="mt-2 text-[12.5px]" style={{ color: "var(--color-neon-deep)" }}>
                {p.tags.join(" ")}
              </p>
              {p.comments > 0 && (
                <button
                  onClick={() => setCommentTarget(`post:${p.id}`)}
                  className="mt-2 text-[12px]"
                  style={{ color: "var(--color-ink-3)" }}
                >
                  View all {p.comments} comments
                </button>
              )}
            </div>
          </article>
          {idx > 0 && idx % 3 === 0 && sponsored.data?.[Math.floor(idx / 3) % (sponsored.data?.length || 1)] && (
            <div className="mt-6 px-4">
              <SponsoredCard
                creative={sponsored.data[Math.floor(idx / 3) % sponsored.data.length] as any}
                placement="feed"
              />
            </div>
          )}
          </div>
        ))}
        {/* Infinite-scroll sentinel */}
        <div ref={loadMoreRef} className="h-8" aria-hidden />
        {liveFeed.isFetchingNextPage && (
          <p className="mono-tag pt-2 text-center" style={{ color: "var(--color-ink-3)" }}>
            Loading more…
          </p>
        )}
        {!liveFeed.hasNextPage && feedPosts.length > 0 && (
          <p className="mono-tag pt-2 text-center" style={{ color: "var(--color-ink-3)" }}>
            ● End of feed
          </p>
        )}
      </section>


      {/* ==================================================
         REEL GRID — TikTok "For You" tail
         ================================================== */}
      <section className="mt-10 px-4">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="mono-tag" style={{ color: "var(--color-silver)" }}>Discover</p>
            <h2 className="serif text-[20px] italic leading-none" style={{ color: "var(--color-ink)" }}>More reels</h2>
          </div>
          <Link to="/search" className="mono-tag" style={{ color: "var(--color-neon)" }}>Explore →</Link>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {gridReels.map((r) => (
            <Link key={r.id} to="/" className="tap relative block overflow-hidden" style={{ aspectRatio: "9/16", borderRadius: 8 }}>
              {r.poster ? (
                <img src={r.poster} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full" style={{ background: "var(--color-graphite)" }} />
              )}
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.85))" }} />
              <div className="absolute inset-x-1.5 bottom-1.5 text-white">
                <div className="flex items-center gap-1">
                  <IconClaw size={11} />
                  <span className="mono-num text-[10px]">{fmt(r.likes)}</span>
                </div>
              </div>
              <span className="absolute right-1.5 top-1.5 mono-tag" style={{ background: "rgba(0,0,0,0.55)", color: "white", padding: "1px 4px", fontSize: 8 }}>
                ▶ {r.duration}s
              </span>
            </Link>
          ))}
        </div>
      </section>

      <CommentsSheet
        open={!!commentTarget}
        targetId={commentTarget ?? "anon"}
        onClose={() => setCommentTarget(null)}
      />

      <ReportBlockSheet
        open={!!reportTarget}
        onClose={() => setReportTarget(null)}
        targetKind={reportTarget?.kind ?? "post"}
        targetId={reportTarget?.id}
        authorId={reportTarget?.authorId}
        authorHandle={reportTarget?.handle}
      />
    </div>
    </PullToRefresh>
  );
}

/* -------- helpers -------- */

function RailBtn({
  Icon,
  count,
  active,
  tint,
}: {
  Icon: React.ComponentType<{ size?: number }>;
  count: string;
  active?: boolean;
  tint?: string;
}) {
  return (
    <button className="tap flex flex-col items-center gap-1">
      <span
        className="grid h-11 w-11 place-items-center rounded-full"
        style={{
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.15)",
          color: active ? tint : "white",
        }}
      >
        <Icon size={20} />
      </span>
      <span className="mono-num text-[10.5px] font-semibold" style={{ color: "white" }}>{count}</span>
    </button>
  );
}

function IconChip({ children }: { children: React.ReactNode; label?: string }) {
  return (
    <button
      aria-label="Capture"
      className="tap grid h-9 w-9 place-items-center rounded-full"
      style={{
        background: "linear-gradient(140deg, var(--color-neon) 0%, var(--color-neon-deep) 55%, var(--color-ember) 130%)",
        color: "var(--color-obsidian)",
        boxShadow: "0 6px 18px -6px rgba(198,255,61,0.6)",
      }}
    >
      {children}
    </button>
  );
}

function IconLens18() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function FollowButton({
  id,
  label,
  variant,
  fullWidth,
}: {
  id: string;
  label?: string;
  variant: "neon" | "ember";
  fullWidth?: boolean;
}) {
  const { following, toggle } = useFollow(id, label);
  const isNeon = variant === "neon";
  const base = "tap rounded-full text-[11px] font-bold uppercase tracking-wider";
  const size = fullWidth ? "mt-2 w-full py-1.5 text-[10.5px]" : "px-3 py-1";
  const style: React.CSSProperties = following
    ? {
        background: "transparent",
        color: isNeon ? "var(--color-ink-0)" : "white",
        border: `1px solid ${isNeon ? "var(--color-hair)" : "rgba(255,255,255,0.55)"}`,
        letterSpacing: "0.14em",
      }
    : {
        background: isNeon ? "var(--color-neon)" : "var(--color-ember)",
        color: isNeon ? "var(--color-obsidian)" : "white",
        letterSpacing: "0.14em",
      };
  return (
    <button
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggle(); }}
      className={`${base} ${size}`}
      style={style}
      aria-pressed={following}
    >
      {following ? "Following ✓" : fullWidth ? "+ Follow" : "Follow"}
    </button>
  );
}

/**
 * BluetoothPill — masthead status chip for helmet cams / intercoms.
 * Persists a linked device across sessions and shows live state.
 * Falls back gracefully on browsers without Web Bluetooth (iOS Safari).
 */
function BluetoothPill() {
  const [state, setState] = useState<"idle" | "scanning" | "linked" | "unsupported">("idle");
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("zrex:bt");
      if (raw) {
        const d = JSON.parse(raw) as { name?: string };
        if (d?.name) { setName(d.name); setState("linked"); }
      }
    } catch { /* noop */ }
  }, []);

  async function onPair() {
    const n = typeof navigator !== "undefined" ? (navigator as Navigator & { bluetooth?: { requestDevice: (o: unknown) => Promise<{ name?: string }> } }) : undefined;
    if (!n?.bluetooth) {
      setState("unsupported");
      window.setTimeout(() => setState("idle"), 1600);
      return;
    }
    try {
      setState("scanning");
      const device = await n.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["battery_service", "device_information"],
      });
      const dn = device?.name ?? "Device";
      setName(dn);
      setState("linked");
      try { localStorage.setItem("zrex:bt", JSON.stringify({ name: dn, at: Date.now() })); } catch { /* noop */ }
    } catch {
      setState((prev) => (prev === "linked" ? "linked" : "idle"));
    }
  }

  const linked = state === "linked";
  const scanning = state === "scanning";
  return (
    <button
      type="button"
      onClick={onPair}
      aria-label={linked ? `Bluetooth: ${name ?? "linked"}` : "Pair Bluetooth device"}
      title={
        state === "unsupported" ? "Bluetooth not supported here"
        : linked ? `Linked · ${name ?? "device"}`
        : scanning ? "Scanning…"
        : "Pair helmet cam / intercom"
      }
      className="tap relative grid h-10 place-items-center gap-1 px-2"
      style={{
        color: linked ? "var(--color-neon-deep, #4b8f00)" : "var(--color-ink-0)",
        borderRadius: 999,
        background: linked ? "color-mix(in oklab, var(--color-neon) 18%, transparent)" : "transparent",
        display: "inline-flex",
      }}
    >
      <Bluetooth
        size={15}
        strokeWidth={2.1}
        style={
          scanning ? { animation: "pulse 1.1s ease-in-out infinite" }
          : linked ? { filter: "drop-shadow(0 0 5px rgba(124,255,63,0.6))" }
          : undefined
        }
      />
      <span className="mono-tag" style={{ fontSize: 9, letterSpacing: "0.16em" }}>
        {linked ? "ON" : scanning ? "…" : state === "unsupported" ? "N/A" : "BT"}
      </span>
    </button>
  );
}

/**
 * FeedMedia — IG-style square media surface.
 * - Renders `<video>` with muted autoplay when in view for video posts.
 * - Double-tap to like with a heart burst.
 * - Tap the mute chip to unmute video.
 */
function FeedMedia({
  image,
  video,
  poster,
  alt,
  vehicle,
  onDoubleTap,
}: {
  image?: string;
  video?: string;
  poster?: string;
  alt?: string;
  vehicle?: { name: string; hp: number } | null;
  onDoubleTap?: () => void;
}) {
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const hasVideo = isVideoUrl(video);
  const { onClick, burstAt } = useDoubleTap({
    onDoubleTap: () => { if (!liked) setLiked(true); onDoubleTap?.(); },
  });

  return (
    <div className="relative select-none" onClick={onClick}>
      {hasVideo ? (
        <AutoplayVideo
          src={video!}
          poster={poster}
          muted={muted}
          className="block aspect-square w-full object-cover"
        />
      ) : image ? (
        <img
          src={image}
          alt={alt ?? ""}
          className="block aspect-square w-full object-cover"
          draggable={false}
        />
      ) : null}

      {/* heart burst on double-tap */}
      {burstAt && (
        <span
          key={burstAt.k}
          className="pointer-events-none absolute z-10"
          style={{
            left: burstAt.x,
            top: burstAt.y,
            transform: "translate(-50%, -50%)",
            color: "var(--color-neon)",
            filter: "drop-shadow(0 8px 24px rgba(0,200,83,0.55))",
            animation: "heart-ping 620ms ease-out forwards",
          }}
        >
          <Heart size={96} fill="currentColor" strokeWidth={0} />
        </span>
      )}

      {hasVideo && (
        <button
          onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
          aria-label={muted ? "Unmute" : "Mute"}
          className="tap absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-full text-white"
          style={{
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
      )}

      {vehicle && (
        <div
          className="absolute right-3 top-3 flex max-w-[calc(100%-24px)] items-center gap-1.5 rounded-full px-2.5 py-1"
          style={{
            background: "rgba(10,10,10,0.55)",
            backdropFilter: "blur(14px) saturate(160%)",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          <Gauge size={12} className="shrink-0" style={{ color: "var(--color-neon)" }} strokeWidth={2.2} />
          <span className="truncate text-[11px] font-semibold text-white">{vehicle.name}</span>
          <span className="mono-num shrink-0 text-[10px]" style={{ color: "var(--color-neon)" }}>{vehicle.hp}hp</span>
        </div>
      )}
    </div>
  );
}

