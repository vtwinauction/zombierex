import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/menu")({
  head: () => ({
    meta: [
      { title: "Menu · ZOMBIEREX" },
      { name: "description", content: "Everything you can do on ZOMBIEREX — create, ride, sell, explore and manage your garage." },
      { property: "og:title", content: "Menu · ZOMBIEREX" },
      { property: "og:description", content: "Everything you can do on ZOMBIEREX — create, ride, sell, explore and manage your garage." },
    ],
  }),
  component: MenuHub,
});

type Item = { to: string; label: string; hint?: string; glyph?: string };

const QUICK: Item[] = [
  { to: "/post/new", label: "New post", hint: "Photo · video", glyph: "＋" },
  { to: "/atlas/ride", label: "Ride Mode", hint: "Turn-by-turn", glyph: "◎" },
  { to: "/marketplace", label: "The Vault", hint: "Browse & sell", glyph: "◈" },
  { to: "/assistant", label: "Ask REX", hint: "AI companion", glyph: "✦" },
];

const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: "Create",
    items: [
      { to: "/post/new", label: "New post", hint: "Photo · video · telemetry" },
      { to: "/marketplace/new", label: "New listing", hint: "Sell in the Vault" },
      { to: "/communities/create", label: "New community", hint: "Start a crew" },
    ],
  },
  {
    title: "Sell",
    items: [
      { to: "/marketplace", label: "Vault (browse)" },
      { to: "/marketplace/dashboard", label: "My listings", hint: "Analytics · manage" },
    ],
  },
  {
    title: "Explore",
    items: [
      { to: "/", label: "Feed" },
      { to: "/reels", label: "Reels" },
      { to: "/communities", label: "Crews" },
      { to: "/events", label: "Events" },
      { to: "/marketplace", label: "Vault" },
      { to: "/search", label: "Search" },
    ],
  },
  {
    title: "Ride",
    items: [
      { to: "/atlas/ride", label: "Ride Mode", hint: "Turn-by-turn · voice · HUD" },
      { to: "/rides", label: "My rides", hint: "History · replay · GPX" },
      { to: "/atlas", label: "Atlas map", hint: "Plan · POIs · community" },
      { to: "/atlas/record", label: "Record route", hint: "Publish to the Atlas" },
      { to: "/atlas/mine", label: "My routes" },
      { to: "/drag", label: "Drag Racing", hint: "GPS-verified runs · leaderboards" },
    ],
  },
  {
    title: "AI · REX",
    items: [
      { to: "/assistant", label: "Ask REX", hint: "AI companion · chat" },
      { to: "/onboarding", label: "Personalize for me", hint: "AI picks crews · events · listings" },
      { to: "/judge", label: "AI Show Judge", hint: "Concours judging by algorithm" },
    ],
  },
  {
    title: "Rewards",
    items: [
      { to: "/rewards", label: "Rewards hub", hint: "XP · badges · challenges · leaderboards" },
      { to: "/rewards", label: "Go Premium", hint: "Apex · Legend tiers" },
    ],
  },
  {
    title: "You",
    items: [
      { to: "/profile", label: "Garage (profile)" },
      { to: "/saved", label: "Saved", hint: "Bookmarked posts · vault" },
      { to: "/notifications", label: "Notifications" },
      { to: "/messages", label: "Messages" },
      { to: "/settings", label: "Settings", hint: "Account · privacy · appearance" },
      { to: "/security", label: "Security Center", hint: "Devices · 2FA · data export" },
    ],
  },
  {
    title: "Business",
    items: [
      { to: "/business", label: "Business dashboard", hint: "Insights · engagement · reviews" },
      { to: "/business/showcase", label: "Edit showcase", hint: "Gallery · services · portfolio" },
      { to: "/ads", label: "Ads Manager", hint: "Campaigns · analytics" },
      { to: "/ads/new", label: "New campaign", hint: "Boost · promote · sponsor" },
      { to: "/vendor", label: "Vendor dashboard" },
      { to: "/vendor/apply", label: "Apply as vendor" },
      { to: "/vendor/plans", label: "Subscription plans" },
    ],
  },
  {
    title: "Admin",
    items: [
      { to: "/admin", label: "Admin console" },
      { to: "/admin/vendors", label: "Vendor verifications" },
      { to: "/admin/moderation", label: "Moderation queue", hint: "Reports · warnings · bans" },
      { to: "/admin/health", label: "Platform Health", hint: "Live stats · feature flags · maintenance" },
      { to: "/admin/judge", label: "AI Judge admin", hint: "Events · awards · publish" },
    ],
  },
];

function MenuHub() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const sections = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return SECTIONS;
    return SECTIONS.map((s) => ({
      ...s,
      items: s.items.filter(
        (i) => i.label.toLowerCase().includes(term) || (i.hint ?? "").toLowerCase().includes(term),
      ),
    })).filter((s) => s.items.length > 0);
  }, [q]);

  return (
    <div className="pb-32">
      <header className="px-5 pt-8">
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>◆ MENU</p>
        <h1 className="serif mt-2 text-4xl leading-[1.05] tracking-tight" style={{ color: "var(--color-ink)" }}>
          Everything <span className="italic" style={{ color: "var(--color-neon)" }}>you can do</span>
        </h1>

        <div
          className="mt-5 flex items-center gap-2 px-3"
          style={{
            background: "var(--color-graphite)",
            border: "1px solid var(--color-hair)",
            borderRadius: 12,
          }}
        >
          <span aria-hidden className="text-[13px]" style={{ color: "var(--color-titanium)" }}>⌕</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search the app…"
            aria-label="Search menu"
            className="w-full bg-transparent py-3 text-[13px] outline-none"
            style={{ color: "var(--color-ink)" }}
          />
          {q && (
            <button
              onClick={() => setQ("")}
              aria-label="Clear search"
              className="tap text-[12px]"
              style={{ color: "var(--color-titanium)" }}
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {!q && (
        <div className="mt-6 grid grid-cols-2 gap-2.5 px-5">
          {QUICK.map((it) => (
            <Link
              key={it.label}
              to={it.to as any}
              className="tap relative overflow-hidden p-4"
              style={{
                background: "var(--color-graphite)",
                border: "1px solid var(--color-hair-strong)",
                borderRadius: 14,
                color: "var(--color-ink)",
              }}
            >
              <span
                aria-hidden
                className="absolute right-3 top-3 text-[18px] leading-none"
                style={{ color: "var(--color-neon)" }}
              >
                {it.glyph}
              </span>
              <span className="block pt-6 text-[14px] font-medium">{it.label}</span>
              {it.hint && (
                <span className="mono-tag mt-1 block" style={{ color: "var(--color-silver)", fontSize: 9 }}>
                  {it.hint}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 space-y-8 px-5">
        {sections.map((s) => (
          <section key={s.title}>
            <div className="mb-2.5 flex items-center gap-3">
              <p className="mono-tag" style={{ color: "var(--color-silver)" }}>{s.title.toUpperCase()}</p>
              <span className="h-px flex-1" style={{ background: "var(--color-hair)" }} />
            </div>
            <div
              className="overflow-hidden"
              style={{ border: "1px solid var(--color-hair)", borderRadius: 14, background: "var(--color-graphite)" }}
            >
              {s.items.map((it, idx) => (
                <Link
                  key={`${it.to}-${it.label}`}
                  to={it.to as any}
                  className="tap flex items-center gap-3 px-4 py-3.5"
                  style={{
                    borderTop: idx === 0 ? "none" : "1px solid var(--color-hair-soft)",
                    color: "var(--color-ink)",
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px]">{it.label}</span>
                    {it.hint && (
                      <span className="mono-tag mt-0.5 block truncate" style={{ color: "var(--color-silver)", fontSize: 9 }}>
                        {it.hint}
                      </span>
                    )}
                  </span>
                  <span aria-hidden className="ml-auto text-[13px]" style={{ color: "var(--color-titanium)" }}>›</span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {sections.length === 0 && (
          <p className="py-10 text-center text-[13px]" style={{ color: "var(--color-titanium)" }}>
            Nothing matches “{q}”.
          </p>
        )}

        <section>
          <p className="mono-tag mb-2" style={{ color: "var(--color-silver)" }}>ACCOUNT</p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth", replace: true });
            }}
            className="tap w-full px-4 py-3.5 text-left text-[13px]"
            style={{
              background: "transparent",
              border: "1px solid rgba(220,38,38,0.35)",
              borderRadius: 12,
              color: "#dc2626",
            }}
          >
            Sign out
          </button>
        </section>
      </div>
    </div>
  );
}
