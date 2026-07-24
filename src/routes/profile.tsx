import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Phone, Share2, Settings as SettingsIcon } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { StatusBar } from "@/components/StatusBar";
import { me, myVehicles, rider, achievements, workshopHistory, reels } from "@/lib/mock-data";
import { getMyProfileMetrics, upsertMyVehicle } from "@/lib/profile.functions";
import { listMyPosts } from "@/lib/feed.functions";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Digital Garage · ZOMBIEREX" },
      { name: "description", content: "The rider's digital garage — live telemetry, machine, trophies and workshop log." },
      { property: "og:title", content: "Digital Garage · ZOMBIEREX" },
      { property: "og:description", content: "The rider's digital garage — live telemetry, machine, trophies and workshop log." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

const TABS = ["REELS", "GARAGE", "TROPHIES", "LOG"] as const;
type Tab = typeof TABS[number];

const RARITY: Record<string, { hue: string; label: string }> = {
  common:    { hue: "#7c7c86", label: "COMMON" },
  bronze:    { hue: "#c98a4b", label: "BRONZE" },
  rare:      { hue: "#2e9bff", label: "RARE" },
  silver:    { hue: "#b8bcc4", label: "SILVER" },
  gold:      { hue: "#ffb547", label: "GOLD" },
  legendary: { hue: "#ff9500", label: "LEGENDARY" },
  platinum:  { hue: "#8be8ff", label: "PLATINUM" },
};

// DB level formula: level = 1 + floor(sqrt(xp/100)) → threshold for `lvl` = (lvl-1)^2 * 100
const xpForLevel = (lvl: number) => Math.max(0, lvl - 1) ** 2 * 100;
function estimateHp(spec: Record<string, unknown> | null | undefined, kind: string): number {
  if (!spec) return kind === "car" ? 220 : 110;
  const s = spec as Record<string, number | string>;
  const raw = s.hp ?? s.horsepower ?? s.power_hp;
  const hp = typeof raw === "string" ? parseFloat(raw) : raw;
  if (typeof hp === "number" && !isNaN(hp) && hp > 0) return Math.round(hp);
  const cc = typeof s.displacement === "number" ? s.displacement : typeof s.cc === "number" ? s.cc : null;
  if (cc) return Math.round(cc * (kind === "car" ? 0.1 : 0.12));
  return kind === "car" ? 240 : 110;
}

function ProfilePage() {
  const [tab, setTab] = useState<Tab>("REELS");
  const [contactOpen, setContactOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [coverBroken, setCoverBroken] = useState(false);
  const fetchMetrics = useServerFn(getMyProfileMetrics);
  const metricsQuery = useQuery({
    queryKey: ["profile", "metrics"],
    queryFn: () => fetchMetrics(),
    retry: false,
    staleTime: 30_000,
  });
  const fetchMyPosts = useServerFn(listMyPosts);
  const myPostsQuery = useQuery({
    queryKey: ["profile", "my-posts"],
    queryFn: () => fetchMyPosts(),
    retry: false,
    staleTime: 30_000,
  });
  const myPosts = (myPostsQuery.data ?? []) as Array<{ id: string; kind: string; caption: string | null; media_url: string | null; thumbnail_url: string | null; likes_count: number; comments_count: number; created_at: string }>;

  const live = metricsQuery.data;
  const p = live?.profile;
  const v = live?.vehicle;
  const mockBike = myVehicles[0];

  const bike = {
    id: v?.id ?? mockBike.id,
    name: v ? (v.nickname || `${v.year ?? ""} ${v.make} ${v.model}`.trim()) : mockBike.name,
    year: v?.year ?? mockBike.year,
    type: v ? (v.kind === "car" ? "Car" : "Motorcycle") : mockBike.type,
    cover: v?.hero_image_url || mockBike.cover,
    hp: v ? estimateHp(v.spec as Record<string, unknown>, v.kind) : mockBike.hp,
  };
  const profileCover = p?.cover_url || "";
  const heroImage = coverBroken || !profileCover ? bike.cover : profileCover;

  useEffect(() => {
    setCoverBroken(false);
  }, [profileCover]);

  const level = p?.level ?? rider.level;
  const xp = p?.xp_total ?? rider.xp;
  const xpFloor = p ? xpForLevel(level) : 0;
  const xpNext = p ? xpForLevel(level + 1) : rider.xpToNext;
  const xpSpan = Math.max(1, xpNext - xpFloor);
  const xpPct = Math.max(0, Math.min(100, Math.round(((xp - xpFloor) / xpSpan) * 100)));
  const xpDisplay = p ? Math.max(0, xp - xpFloor) : rider.xp;
  const xpNextDisplay = p ? Math.max(1, xpNext - xpFloor) : rider.xpToNext;

  const totalAch = live?.totalAchievements ?? achievements.length;
  const earnedCount = live?.earnedCount ?? achievements.filter((a) => a.earned).length;
  const achList = (live?.achievements?.length
    ? live.achievements.map((a) => ({ id: a.slug, title: a.title, detail: a.detail, rarity: a.tier, earned: a.earned }))
    : achievements.map((a) => ({ id: a.id, title: a.title, detail: a.detail, rarity: a.rarity, earned: a.earned })));

  const followers = p?.followers_count ?? 12_400;
  const postsCount = p?.posts_count ?? 47;
  const listingsCount = p?.listings_count ?? 0;

  const topSpeed = bike.hp + 45;
  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));

  const displayName = p?.display_name || p?.handle || me.handle.replace("@", "");
  const location = p?.location || me.location;
  const title = p ? `LEVEL ${level} · ${(p.tier || "ROOKIE").toString().toUpperCase()}` : rider.title.toUpperCase();
  const idLabel = (p?.id ?? me.id).slice(0, 8).toUpperCase();

  const showToast = (message: string) => {
    setToast(message);
    sonnerToast(message);
    window.setTimeout(() => setToast(null), 1800);
  };

  const copyProfileLink = async (url: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }
    if (typeof document === "undefined") return false;
    const input = document.createElement("textarea");
    input.value = url;
    input.setAttribute("readonly", "true");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(input);
    return copied;
  };

  const handleShareProfile = async () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/profile`;
    const shareData = {
      title: `${displayName} · ZOMBIEREX`,
      text: `Check out ${displayName} on ZOMBIEREX`,
      url,
    };

    try {
      const canNativeShare =
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        (typeof navigator.canShare !== "function" || navigator.canShare(shareData));

      if (canNativeShare) {
        await navigator.share(shareData);
        showToast("Share opened");
        return;
      }
    } catch {
      // Some mobile preview/browser contexts expose native share but block it.
    }

    const copied = await copyProfileLink(url);
    showToast(copied ? "Profile link copied" : "Copy this profile link: /profile");
  };

  return (
    <div className="pb-24" style={{ background: "var(--color-paper-1)" }}>
      <StatusBar index="05" section="GARAGE · OPERATOR" />

      {/* ============ HERO — VEHICLE ============ */}
      <section className="px-4 pt-4">
        <div
          className="relative overflow-hidden rounded-3xl animate-fade-in"
          style={{
            border: "1px solid var(--color-line)",
            boxShadow: "0 1px 2px rgba(15,15,15,0.04), 0 22px 44px -22px rgba(15,15,15,0.22)",
            aspectRatio: "16/10",
          }}
        >
          {/* Blurred backdrop so any image aspect fits the banner cleanly */}
          <img
            src={heroImage}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            style={{ filter: "blur(28px) saturate(1.1)", transform: "scale(1.15)" }}
          />
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.35)" }} />
          <img
            src={heroImage}
            alt={bike.name}
            className="relative h-full w-full object-cover"
            onError={() => setCoverBroken(true)}
          />

          {/* subtle bottom gradient — image stays the focal point */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)",
            }}
          />
          {/* neon accent hairline */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
            style={{
              background:
                "linear-gradient(90deg, #00e5ff, var(--color-neon) 45%, #ff9500 78%, #ff3d5a)",
            }}
          />
          {/* Only ACTIVE status remains on the hero */}
          <div className="absolute inset-x-3 top-3 flex items-center">
            <StatusBadge tone="live">
              <span className="signal-pulse block h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-neon)", boxShadow: "0 0 8px var(--color-neon)" }} />
              ACTIVE
            </StatusBadge>
          </div>
        </div>

        {/* Section: VEHICLE — designation + name */}
        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="mono-tag" style={{ color: "var(--color-ink-3)", fontSize: 9, letterSpacing: "0.24em" }}>
              VEHICLE · UNIT V·{bike.id.toUpperCase()}
            </p>
            <h2 className="serif mt-1 truncate text-[26px] leading-[0.95]" style={{ color: "var(--color-ink-0)", letterSpacing: "-0.02em" }}>
              {bike.name}
            </h2>
          </div>
          <RenameVehicleButton currentName={bike.name} />
        </div>

      </section>

      {/* ============ PROFILE — OPERATOR ============ */}
      <section className="mt-4 px-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="mono-tag" style={{ color: "var(--color-ink-3)", fontSize: 9 }}>PROFILE</span>
          <span className="etch flex-1" />
        </div>
        <div
          className="rounded-2xl p-4 animate-fade-in"
          style={{ background: "var(--color-paper-0)", border: "1px solid var(--color-line)" }}
        >
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
            <div
              className="shrink-0 rounded-full p-[2px]"
              style={{ background: "var(--color-line)" }}
            >
              <img src={p?.avatar_url || me.avatar} alt="" className="h-16 w-16 rounded-full object-contain" style={{ border: "2px solid var(--color-paper-0)", background: "var(--color-paper-1)" }} />
            </div>

            <div className="min-w-0">
              <p className="truncate text-[16px] font-semibold" style={{ color: "var(--color-ink-0)", letterSpacing: "-0.01em" }}>
                {displayName}
              </p>
              <p className="mono-tag mt-1 truncate" style={{ color: "var(--color-ink-3)", fontSize: 9 }}>
                {title} · ◎ {location}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <div
                className="inline-flex items-baseline gap-1 rounded-lg px-2.5 py-1"
                style={{
                  background: "linear-gradient(135deg, var(--color-neon), #7ee01c)",
                  color: "var(--color-ink-0)",
                  boxShadow: "0 6px 18px -8px rgba(0,200,83,0.55)",
                }}
              >
                <span className="mono-tag" style={{ fontSize: 8, letterSpacing: "0.18em" }}>LVL</span>
                <span className="mono-num text-[15px] font-bold leading-none">{level}</span>
              </div>
            </div>
          </div>

          {p?.bio && (
            <p className="mt-3 text-[13px] leading-relaxed" style={{ color: "var(--color-ink-1)" }}>
              {p.bio}
            </p>
          )}

          {/* Quick stats — 3 up, consistent */}
          <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-xl" style={{ border: "1px solid var(--color-line)" }}>
            <StatCell k="POSTS" v={fmt(postsCount)} />
            <StatCell k="FOLLOWERS" v={fmt(followers)} border />
            <StatCell k="TROPHIES" v={`${earnedCount}/${totalAch}`} border />
          </div>

          {/* XP bar */}
          <div className="mt-4 space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="mono-tag" style={{ color: "var(--color-ink-3)", fontSize: 9 }}>EXPERIENCE · NEXT TIER</span>
              <span className="mono-num text-[11px] font-semibold" style={{ color: "var(--color-ink-0)" }}>
                {xpDisplay.toLocaleString()} / {xpNextDisplay.toLocaleString()} XP
              </span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--color-paper-2)" }}>
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-[1400ms] ease-out"
                style={{
                  width: `${xpPct}%`,
                  background: "linear-gradient(90deg, #00e5ff, var(--color-neon) 55%, #ff9500)",
                  boxShadow: "0 0 12px rgba(0,229,255,0.35)",
                }}
              />
            </div>
          </div>

          {/* Actions — edge-to-edge, uniform height, icons + labels */}
          <div className="mt-4 grid grid-cols-3 items-stretch overflow-hidden rounded-xl"
            style={{ border: "1px solid var(--color-line)", background: "var(--color-paper-0)" }}>
            <ActionBtn onClick={() => setContactOpen(true)} icon={<Phone className="h-4 w-4" />} label="Contact" accent />
            <ActionBtn onClick={handleShareProfile} icon={<Share2 className="h-4 w-4" />} label="Share" />
            <ActionBtn as={Link} to="/settings" icon={<SettingsIcon className="h-4 w-4" />} label="Settings" />
          </div>
        </div>
      </section>

      {/* ============ GAUGE CLUSTER ============ */}
      <section className="mt-4 px-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="mono-tag" style={{ color: "var(--color-ink-3)", fontSize: 9 }}>LIVE TELEMETRY</span>
          <span className="etch flex-1" />
          <span className="mono-tag" style={{ color: "var(--color-ink-3)", fontSize: 9 }}>UNIT V·{bike.id.toUpperCase()}</span>
        </div>

        <div
          className="on-dark relative overflow-hidden rounded-3xl p-4"
          style={{
            background:
              "radial-gradient(1200px 300px at 50% -20%, rgba(0,229,255,0.10), transparent 60%), linear-gradient(180deg, #0a0a0a, #141418)",
            border: "1px solid #1c1c22",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 22px 44px -22px rgba(0,0,0,0.55)",
          }}
        >
          {/* corner ticks */}
          <span className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l border-t" style={{ borderColor: "var(--color-neon)" }} />
          <span className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r border-t" style={{ borderColor: "var(--color-neon)" }} />

          {/* Primary speedo */}
          <BigSpeedo topSpeed={topSpeed} />

          {/* Sub gauges */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <MiniGauge
              label="POWER"
              unit="HP"
              value={bike.hp}
              max={250}
              accent="#ff3d5a"
              trackStops={["#00e5ff", "#ff3d5a"]}
            />
            <MiniGauge
              label="TACH"
              unit="RPM×1K"
              value={Math.round((bike.hp / 250) * 12)}
              max={14}
              accent="#ff9500"
              trackStops={["var(--color-neon)", "#ff9500", "#ff3d5a"]}
              redzoneFrom={11}
            />
          </div>

          {/* Ledger row */}
          <div className="mt-3 grid grid-cols-4 gap-2">
            <Ledger k="NET"     v={fmt(followers)} dot="#00e5ff" />
            <Ledger k="SORTIES" v={fmt(postsCount)} dot="var(--color-neon)" />
            <Ledger k="LISTINGS" v={fmt(listingsCount)} dot="#ff9500" />
            <Ledger k="TROPHY"  v={`${earnedCount}/${totalAch}`} dot="#ff3d5a" />

          </div>
        </div>
      </section>

      {/* ============ ACHIEVEMENT RIBBON ============ */}
      <section className="mt-5 px-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="mono-tag" style={{ color: "var(--color-ink-3)", fontSize: 9 }}>BADGES</span>
          <span className="etch flex-1" />
          <span className="mono-tag" style={{ color: "var(--color-ink-3)", fontSize: 9 }}>{earnedCount} EARNED</span>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {achList.map((a) => {
            const meta = RARITY[a.rarity] ?? RARITY.common;
            const on = a.earned;
            return (
              <div
                key={a.id}
                className="flex flex-none items-center gap-2 rounded-full px-3 py-1.5"
                style={{
                  background: on ? "var(--color-paper-0)" : "var(--color-paper-2)",
                  border: `1px solid ${on ? "var(--color-line)" : "var(--color-line)"}`,
                  opacity: on ? 1 : 0.5,
                  boxShadow: on ? `0 0 0 1px ${meta.hue}22, 0 8px 22px -14px ${meta.hue}66` : "none",
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: meta.hue, boxShadow: on ? `0 0 8px ${meta.hue}` : "none" }} />
                <span className="text-[12px] font-semibold" style={{ color: "var(--color-ink-0)" }}>{a.title}</span>
                <span className="mono-tag" style={{ color: meta.hue, fontSize: 8, letterSpacing: "0.18em" }}>{meta.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============ TABS ============ */}
      <nav className="mt-5 flex px-2" style={{ borderBottom: "1px solid var(--color-line)" }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="tap flex-1 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors"
            style={{
              borderBottom: `2px solid ${tab === t ? "var(--color-ink-0)" : "transparent"}`,
              color: tab === t ? "var(--color-ink-0)" : "var(--color-ink-3)",
            }}
          >
            {t}
          </button>
        ))}
      </nav>

      {/* ============ TAB CONTENT ============ */}
      <div className="px-4 pt-4" style={{ background: "var(--color-paper-1)" }}>
        {tab === "REELS" && (
          <div className="grid grid-cols-3 gap-1.5">
            <Link to="/post/new" className="tap flex aspect-[3/4] items-center justify-center rounded-lg border border-dashed" style={{ borderColor: "var(--color-line-2)", background: "var(--color-paper-0)" }}>
              <div className="text-center">
                <div className="text-2xl font-thin" style={{ color: "var(--color-neon)" }}>+</div>
                <span className="mono-tag" style={{ color: "var(--color-ink-3)", fontSize: 8.5 }}>UPLOAD</span>
              </div>
            </Link>
            {myPosts.map((mp) => {
              const cover = mp.media_url || mp.thumbnail_url;
              return (
                <Link key={mp.id} to="/post/$id/edit" params={{ id: mp.id }} className="relative aspect-[3/4] overflow-hidden rounded-lg" style={{ background: "var(--color-paper-2)" }}>
                  {cover ? (
                    <img src={cover} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center p-2 text-center text-[11px]" style={{ color: "var(--color-ink-0)" }}>
                      {mp.caption?.slice(0, 80) || "Post"}
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-neon)" }} />
                    <span className="mono-num text-[10px] font-bold text-white">{mp.likes_count}</span>
                  </div>
                </Link>
              );
            })}
            {myPosts.length === 0 && reels.map((r, i) => (
              <div key={r.id} className="relative aspect-[3/4] overflow-hidden rounded-lg" style={{ background: "var(--color-paper-2)" }}>
                <img src={r.poster} alt="" className="h-full w-full object-cover" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-neon)" }} />
                  <span className="mono-num text-[10px] font-bold text-white">{r.views}</span>
                </div>
                <div className="absolute right-1 top-1 rounded px-1 py-0.5 text-[8px] font-bold tracking-wider text-white" style={{ background: "rgba(0,0,0,0.65)" }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
              </div>
            ))}
          </div>
        )}


        {tab === "GARAGE" && (
          <div className="space-y-3">
            {myVehicles.map((v) => (
              <article key={v.id} className="overflow-hidden rounded-2xl" style={{ background: "var(--color-paper-0)", border: "1px solid var(--color-line)" }}>
                <div className="relative h-44 w-full">
                  <img src={v.cover} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-2 left-3">
                    <p className="mono-tag" style={{ color: "var(--color-neon)", fontSize: 9 }}>UNIT V·{v.id.toUpperCase()}</p>
                    <p className="serif text-lg text-white" style={{ letterSpacing: "-0.02em" }}>{v.name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-px" style={{ background: "var(--color-line)" }}>
                  <SubCell k="YEAR"  v={String(v.year)} dot="#00e5ff" />
                  <SubCell k="POWER" v={String(v.hp)} u="hp" dot="var(--color-neon)" />
                  <SubCell k="MODS"  v={String(v.mods.length)} dot="#ff9500" />
                </div>
                <ul>
                  {v.mods.map((m, i) => (
                    <li key={m} className="flex items-center gap-3 border-t px-3 py-2.5" style={{ borderColor: "var(--color-line)" }}>
                      <span className="mono-tag" style={{ color: "var(--color-ink-3)", fontSize: 9 }}>M·{String(i + 1).padStart(2, "0")}</span>
                      <span className="text-[13px]" style={{ color: "var(--color-ink-0)" }}>{m}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}

        {tab === "TROPHIES" && (
          <div className="grid grid-cols-2 gap-2">
            {achList.map((a, i) => {
              const meta = RARITY[a.rarity] ?? RARITY.common;
              return (
                <div
                  key={a.id}
                  className="relative overflow-hidden rounded-2xl p-3"
                  style={{
                    background: "var(--color-paper-0)",
                    border: "1px solid var(--color-line)",
                    opacity: a.earned ? 1 : 0.5,
                  }}
                >
                  <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: meta.hue, opacity: a.earned ? 1 : 0.4 }} />
                  <div className="flex items-center justify-between">
                    <span className="mono-tag" style={{ color: "var(--color-ink-3)", fontSize: 9 }}>T·{String(i + 1).padStart(2, "0")}</span>
                    <span className="mono-tag" style={{ color: meta.hue, fontSize: 8.5, letterSpacing: "0.18em" }}>{meta.label}</span>
                  </div>
                  <p className="serif mt-3 text-[15px] leading-tight" style={{ color: "var(--color-ink-0)", letterSpacing: "-0.01em" }}>{a.title}</p>
                  <p className="mt-1 text-[11px]" style={{ color: "var(--color-ink-3)" }}>{a.detail}</p>
                </div>
              );
            })}
          </div>
        )}

        {tab === "LOG" && (
          <ul className="overflow-hidden rounded-2xl" style={{ background: "var(--color-paper-0)", border: "1px solid var(--color-line)" }}>
            {workshopHistory.map((w, i) => (
              <li key={w.id} className="grid grid-cols-[38px_1fr_auto] items-start gap-3 px-4 py-3" style={{ borderTop: i === 0 ? "none" : "1px solid var(--color-line)" }}>
                <div>
                  <span className="serif text-lg" style={{ color: "var(--color-ink-3)" }}>{String(i + 1).padStart(2, "0")}</span>
                  <p className="mono-tag" style={{ color: "var(--color-ink-3)", fontSize: 9 }}>{w.date}</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium" style={{ color: "var(--color-ink-0)" }}>{w.title}</p>
                  <p className="mono-tag mt-0.5" style={{ color: "var(--color-ink-3)", fontSize: 9 }}>{w.shop} · {w.mileage}</p>
                </div>
                <div className="text-right">
                  <p className="mono-num text-[13px] font-bold" style={{ color: "var(--color-ink-0)" }}>{w.cost}</p>
                  <p className="mono-tag mt-0.5" style={{
                    color: w.status === "upcoming" ? "#ff9500" : "var(--color-neon-deep)",
                    fontSize: 8.5,
                    letterSpacing: "0.18em",
                  }}>{w.status.toUpperCase()}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {contactOpen && (
        <ContactModal profile={p} onClose={() => setContactOpen(false)} />
      )}
      {toast && (
        <div className="fixed inset-x-0 z-[60] flex justify-center" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 90px)" }}>
          <div className="rounded-full px-4 py-2 text-[12px] font-semibold"
            style={{ background: "var(--color-ink-0)", color: "var(--color-paper-0)", boxShadow: "0 10px 30px -8px rgba(0,0,0,0.35)" }}>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

function ContactModal({ profile, onClose }: { profile: any; onClose: () => void }) {
  const phone = profile?.contact_phone as string | null | undefined;
  const email = profile?.contact_email as string | null | undefined;
  const dm = profile?.contact_dm_enabled !== false;
  const isBiz = !!profile?.is_business;
  const address = profile?.business_address as string | null | undefined;
  const hasBusinessAddress = isBiz && !!address;
  const hasAny = !!(phone || email || hasBusinessAddress || dm);
  const rowBase = {
    background: "var(--color-paper-0)",
    border: "1px solid var(--color-line)",
    color: "var(--color-ink-0)",
  } as const;
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl p-4"
        style={{
          background: "var(--color-paper-1)",
          borderTop: "1px solid var(--color-line)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
          boxShadow: "0 -18px 60px -30px rgba(0,0,0,0.45)",
        }}
      >
        <div className="flex items-center justify-between">
          <h3 className="serif text-xl" style={{ color: "var(--color-ink-0)" }}>
            Contact {isBiz && <span className="mono-tag ml-2" style={{ color: "var(--color-neon-deep)", fontSize: 9 }}>BUSINESS</span>}
          </h3>
          <button onClick={onClose} className="mono-tag" style={{ color: "var(--color-ink-3)" }}>CLOSE ✕</button>
        </div>

        {!hasAny && (
          <p className="mt-4 text-[13px]" style={{ color: "var(--color-ink-3)" }}>
            No contact info yet. Add it from Edit profile.
          </p>
        )}

        <div className="mt-4 space-y-2">
          {phone && (
            <a href={`tel:${phone}`} className="tap flex items-center justify-between rounded-xl px-3 py-3 text-[13px]" style={rowBase}>
              <span>📞 {phone}</span>
              <span className="mono-tag" style={{ color: "var(--color-neon-deep)", fontSize: 10 }}>CALL</span>
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className="tap flex items-center justify-between rounded-xl px-3 py-3 text-[13px]" style={rowBase}>
              <span>✉️ {email}</span>
              <span className="mono-tag" style={{ color: "var(--color-neon-deep)", fontSize: 10 }}>EMAIL</span>
            </a>
          )}
          {dm && (
            <Link
              to="/messages"
              className="tap flex items-center justify-between rounded-xl px-3 py-3 text-[13px]"
              style={rowBase}
              onClick={onClose}
            >
              <span>💬 Direct message</span>
              <span className="mono-tag" style={{ color: "var(--color-neon-deep)", fontSize: 10 }}>OPEN</span>
            </Link>
          )}
          {isBiz && address && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
              target="_blank"
              rel="noreferrer"
              className="tap flex items-center justify-between rounded-xl px-3 py-3 text-[13px]"
              style={rowBase}
            >
              <span>📍 {address}</span>
              <span className="mono-tag" style={{ color: "var(--color-neon-deep)", fontSize: 10 }}>MAP</span>
            </a>
          )}
        </div>

        <Link
          to="/profile/edit"
          onClick={onClose}
          className="tap mt-4 block rounded-xl py-3 text-center text-[13px] font-semibold"
          style={{ background: "var(--color-neon)", color: "var(--color-ink-0)", border: "1px solid var(--color-neon-deep)" }}
        >
          {hasAny ? "Edit contact info" : "Add contact info"}
        </Link>
      </div>
    </div>
  );
}

/* ==========================================================
   Sub-cells / mini widgets
   ========================================================== */
function SubCell({ k, v, u, dot }: { k: string; v: string; u?: string; dot?: string }) {
  return (
    <div className="p-2.5 text-center" style={{ background: "var(--color-paper-0)" }}>
      <div className="mb-1 flex items-center justify-center gap-1">
        {dot && <span className="h-1 w-1 rounded-full" style={{ background: dot }} />}
        <p className="mono-tag" style={{ color: "var(--color-ink-3)", fontSize: 8.5 }}>{k}</p>
      </div>
      <p className="serif text-lg leading-none" style={{ color: "var(--color-ink-0)", letterSpacing: "-0.01em" }}>
        {v}
        {u && <span className="mono ml-1 text-[10px]" style={{ color: "var(--color-ink-3)" }}>{u}</span>}
      </p>
    </div>
  );
}

function Ledger({ k, v, u, dot }: { k: string; v: string; u?: string; dot: string }) {
  return (
    <div
      className="rounded-xl px-2.5 py-2"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot, boxShadow: `0 0 6px ${dot}` }} />
        <p className="mono-tag" style={{ color: "rgba(255,255,255,0.55)", fontSize: 8.5 }}>{k}</p>
      </div>
      <p className="mono-num mt-1 text-[15px] font-bold leading-none tabular-nums" style={{ color: "#fff" }}>
        {v}
        {u && <span className="mono ml-1 text-[9px] font-normal" style={{ color: "rgba(255,255,255,0.45)" }}>{u}</span>}
      </p>
    </div>
  );
}

function StatusBadge({ children, tone = "light" }: { children: ReactNode; tone?: "light" | "dark" | "live" }) {
  const styles =
    tone === "dark"
      ? { background: "rgba(0,0,0,0.55)", color: "#fff", border: "1px solid rgba(255,255,255,0.14)", backdropFilter: "blur(8px)" }
      : tone === "live"
      ? { background: "rgba(255,255,255,0.9)", color: "var(--color-ink-0)", border: "1px solid var(--color-line)", backdropFilter: "blur(8px)" }
      : { background: "var(--color-paper-0)", color: "var(--color-ink-0)", border: "1px solid var(--color-line)" };
  return (
    <span
      className="mono-tag inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
      style={{ ...styles, fontSize: 9, letterSpacing: "0.18em" }}
    >
      {children}
    </span>
  );
}

function StatCell({ k, v, border }: { k: string; v: string; border?: boolean }) {
  return (
    <div
      className="px-2 py-2.5 text-center"
      style={{ background: "var(--color-paper-0)", borderLeft: border ? "1px solid var(--color-line)" : "none" }}
    >
      <p className="mono-num text-[15px] font-bold leading-none tabular-nums" style={{ color: "var(--color-ink-0)" }}>
        {v}
      </p>
      <p className="mono-tag mt-1" style={{ color: "var(--color-ink-3)", fontSize: 9, letterSpacing: "0.18em" }}>{k}</p>
    </div>
  );
}

type ActionBtnProps = {
  icon: ReactNode;
  label: string;
  primary?: boolean;
  accent?: boolean;
  onClick?: () => void;
  as?: typeof Link;
  to?: string;
};
function ActionBtn({ icon, label, primary, accent, onClick, as: As, to }: ActionBtnProps) {
  const style: CSSProperties = primary
    ? { background: "var(--color-ink-0)", color: "var(--color-paper-0)" }
    : accent
    ? { background: "var(--color-neon)", color: "#000", borderLeft: "1px solid var(--color-line)" }
    : { color: "var(--color-ink-0)", borderLeft: "1px solid var(--color-line)" };
  const cls = "tap flex h-12 items-center justify-center gap-1.5 text-[12px] font-semibold transition-transform active:scale-[0.97]";
  if (As && to) {
    return (
      <As to={to} className={cls} style={style}>
        {icon}
        <span>{label}</span>
      </As>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} style={style}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

/* ==========================================================
   BIG SPEEDO — half-circle, multi-stop rainbow track
   ========================================================== */
function BigSpeedo({ topSpeed }: { topSpeed: number }) {
  const MAX = 300;
  const [value, setValue] = useState(0);

  useEffect(() => {
    const t = requestAnimationFrame(() => setValue(topSpeed));
    return () => cancelAnimationFrame(t);
  }, [topSpeed]);

  const pct = Math.min(1, value / MAX);
  const angle = -90 + pct * 180;

  const cx = 130, cy = 130, r = 108;
  const arcLen = Math.PI * r;

  const ticks = useMemo(
    () =>
      Array.from({ length: 31 }, (_, i) => {
        const a = -90 + (i / 30) * 180;
        const major = i % 5 === 0;
        return { a, major, label: major ? String(Math.round((i / 30) * MAX)) : null };
      }),
    []
  );

  return (
    <div className="relative">
      <svg viewBox="0 0 260 160" className="mx-auto block h-[140px] w-full max-w-[300px]" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="arcTrackBig" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="1" stopColor="rgba(255,255,255,0.14)" />
          </linearGradient>
          <linearGradient id="arcFillBig" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0"    stopColor="#00e5ff" />
            <stop offset="0.35" stopColor="#00ff88" />
            <stop offset="0.65" stopColor="#c6ff3d" />
            <stop offset="0.85" stopColor="#ff9500" />
            <stop offset="1"    stopColor="#ff3d5a" />
          </linearGradient>
          <filter id="glowBig" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Track */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="url(#arcTrackBig)" strokeWidth="14" strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="url(#arcFillBig)" strokeWidth="14" strokeLinecap="round"
          strokeDasharray={`${arcLen}`}
          strokeDashoffset={`${arcLen * (1 - pct)}`}
          style={{ transition: "stroke-dashoffset 1800ms cubic-bezier(.2,.7,.15,1)" }}
          filter="url(#glowBig)"
        />

        {/* Ticks */}
        {ticks.map((t, i) => {
          const rad = (t.a * Math.PI) / 180;
          const r1 = r - (t.major ? 20 : 10);
          const r2 = r - 4;
          const x1 = cx + Math.cos(rad) * r1;
          const y1 = cy + Math.sin(rad) * r1;
          const x2 = cx + Math.cos(rad) * r2;
          const y2 = cy + Math.sin(rad) * r2;
          const stroke = t.major ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.22)";
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={t.major ? 1.5 : 1} />
              {t.label && (
                <text
                  x={cx + Math.cos(rad) * (r - 32)}
                  y={cy + Math.sin(rad) * (r - 32) + 3}
                  textAnchor="middle"
                  fontSize="9"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  fill="rgba(255,255,255,0.55)"
                >
                  {t.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Needle */}
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${cx}px ${cy}px`, transition: "transform 1800ms cubic-bezier(.2,.7,.15,1)" }}>
          <line x1={cx} y1={cy + 8} x2={cx} y2={cy - r + 12} stroke="#fff" strokeWidth="2.6" strokeLinecap="round" filter="url(#glowBig)" />
          <circle cx={cx} cy={cy - r + 14} r="4" fill="#fff" />
        </g>
        {/* Hub */}
        <circle cx={cx} cy={cy} r="12" fill="#0a0a0a" stroke="rgba(255,255,255,0.25)" />
        <circle cx={cx} cy={cy} r="4" fill="var(--color-neon)" />
      </svg>

      {/* Digital readout centered under gauge */}
      <div className="-mt-8 flex flex-col items-center pb-1">
        <p className="mono-num text-[38px] font-bold leading-none tabular-nums" style={{ color: "#fff", letterSpacing: "-0.02em", textShadow: "0 0 22px rgba(0,229,255,0.35)" }}>
          {Math.round(value)}
        </p>
        <p className="mono-tag mt-1" style={{ color: "rgba(255,255,255,0.55)", fontSize: 8.5, letterSpacing: "0.24em" }}>
          MPH · TOP SPEED
        </p>
      </div>
    </div>
  );
}

/* ==========================================================
   MINI GAUGE — small colorful arc + digital readout
   ========================================================== */
function MiniGauge({
  label, unit, value, max, accent, trackStops, redzoneFrom,
}: {
  label: string;
  unit: string;
  value: number;
  max: number;
  accent: string;
  trackStops: string[];
  redzoneFrom?: number;
}) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setV(value));
    return () => cancelAnimationFrame(id);
  }, [value]);

  const pct = Math.min(1, v / max);
  const cx = 60, cy = 58, r = 46;
  const arcLen = Math.PI * r;
  const angle = -90 + pct * 180;
  const gradId = `mg-${label}`;

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-3"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent, boxShadow: `0 0 6px ${accent}` }} />
          <p className="mono-tag" style={{ color: "rgba(255,255,255,0.55)", fontSize: 8.5 }}>{label}</p>
        </div>
        <p className="mono-tag" style={{ color: "rgba(255,255,255,0.35)", fontSize: 8 }}>{unit}</p>
      </div>

      <div className="flex items-center gap-3">
        <svg viewBox="0 0 120 78" className="h-16 w-[120px]">
          <defs>
            <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="0">
              {trackStops.map((c, i) => (
                <stop key={i} offset={`${(i / (trackStops.length - 1)) * 100}%`} stopColor={c} />
              ))}
            </linearGradient>
          </defs>
          {/* track */}
          <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" strokeLinecap="round" />
          {/* fill */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none" stroke={`url(#${gradId})`} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={`${arcLen}`}
            strokeDashoffset={`${arcLen * (1 - pct)}`}
            style={{ transition: "stroke-dashoffset 1400ms cubic-bezier(.2,.7,.15,1)" }}
          />
          {/* redzone marker */}
          {redzoneFrom != null && (() => {
            const rzAngle = -90 + (redzoneFrom / max) * 180;
            const rad = (rzAngle * Math.PI) / 180;
            return (
              <line
                x1={cx + Math.cos(rad) * (r - 8)}
                y1={cy + Math.sin(rad) * (r - 8)}
                x2={cx + Math.cos(rad) * (r + 4)}
                y2={cy + Math.sin(rad) * (r + 4)}
                stroke="#ff3d5a"
                strokeWidth="1.4"
              />
            );
          })()}
          {/* needle */}
          <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${cx}px ${cy}px`, transition: "transform 1400ms cubic-bezier(.2,.7,.15,1)" }}>
            <line x1={cx} y1={cy + 4} x2={cx} y2={cy - r + 6} stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          </g>
          <circle cx={cx} cy={cy} r="5" fill="#0a0a0a" stroke="rgba(255,255,255,0.25)" />
          <circle cx={cx} cy={cy} r="1.8" fill={accent} />
        </svg>

        <div className="flex flex-col items-end">
          <p className="mono-num text-[22px] font-bold leading-none tabular-nums" style={{ color: "#fff", letterSpacing: "-0.02em" }}>
            {Math.round(v)}
          </p>
          <p className="mono-tag mt-0.5" style={{ color: accent, fontSize: 8, letterSpacing: "0.2em" }}>
            {Math.round(pct * 100)}%
          </p>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================
   Inline vehicle rename — upserts caller's primary vehicle
   ========================================================== */
function RenameVehicleButton({ currentName }: { currentName: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();
  const upsert = useServerFn(upsertMyVehicle);
  const m = useMutation({
    mutationFn: (nickname: string) => upsert({ data: { nickname } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      setOpen(false);
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Save failed"),
  });

  return (
    <>
      <button
        type="button"
        aria-label="Rename vehicle"
        title="Rename vehicle"
        onClick={() => { setValue(currentName); setError(null); setOpen(true); }}
        className="tap flex shrink-0 items-center justify-center rounded-md"
        style={{
          width: 32,
          height: 32,
          background: "#e5253d",
          color: "#000",
          border: "1px solid #b81a2e",
        }}
      >
        <Pencil size={16} strokeWidth={2.2} />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4"
          onClick={() => !m.isPending && setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl p-4"
            style={{ background: "var(--color-paper-0)", border: "1px solid var(--color-line)" }}
          >
            <p className="mono-tag" style={{ color: "var(--color-ink-3)", fontSize: 9, letterSpacing: "0.24em" }}>
              RENAME VEHICLE
            </p>
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={80}
              placeholder="e.g. Nightshade MT-09"
              className="mt-3 w-full rounded-xl px-3 py-3 text-[15px] outline-none"
              style={{
                background: "var(--color-paper-2)",
                color: "var(--color-ink-0)",
                border: "1px solid var(--color-line)",
              }}
            />
            {error && <p className="mt-2 text-[12px]" style={{ color: "#ff3d5a" }}>{error}</p>}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={m.isPending}
                className="tap rounded-xl py-2.5 text-[13px] font-semibold"
                style={{ background: "var(--color-paper-2)", color: "var(--color-ink-0)", border: "1px solid var(--color-line)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const v = value.trim();
                  if (!v) { setError("Name is required"); return; }
                  m.mutate(v);
                }}
                disabled={m.isPending}
                className="tap rounded-xl py-2.5 text-[13px] font-bold"
                style={{ background: "#e5253d", color: "#000", border: "1px solid #b81a2e", opacity: 1 }}
              >
                {m.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
