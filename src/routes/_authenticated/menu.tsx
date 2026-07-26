import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/menu")({
  head: () => ({ meta: [{ title: "Menu · ZOMBIEREX" }] }),
  component: MenuHub,
});

type Item = { to: string; label: string; hint?: string; params?: any };

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
      { to: "/drag", label: "🏁 Drag Racing", hint: "GPS-verified runs · leaderboards" },
    ],
  },
  {
    title: "AI · REX",
    items: [
      { to: "/assistant", label: "Ask REX", hint: "AI companion · chat" },
      { to: "/onboarding", label: "Personalize for me", hint: "AI picks crews · events · listings" },
      { to: "/judge", label: "🏆 AI Show Judge", hint: "Concours judging by algorithm" },
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
  return (
    <div className="pb-32">
      <header className="px-5 pt-8">
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>◆ MENU</p>
        <h1 className="serif mt-2 text-4xl leading-tight" style={{ color: "var(--color-ink)" }}>
          Everything <span className="italic" style={{ color: "var(--color-neon)" }}>you can do</span>
        </h1>
      </header>

      <div className="mt-6 space-y-8 px-5">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <p className="mono-tag mb-2" style={{ color: "var(--color-silver)" }}>{s.title.toUpperCase()}</p>
            <div className="space-y-1.5">
              {s.items.map((it) => (
                <Link
                  key={it.to}
                  to={it.to as any}
                  className="tap flex items-center justify-between px-4 py-3"
                  style={{
                    background: "var(--color-graphite)",
                    border: "1px solid var(--color-hair)",
                    borderRadius: 10,
                    color: "var(--color-ink)",
                  }}
                >
                  <span className="text-[13px]">{it.label}</span>
                  {it.hint && <span className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 9 }}>{it.hint}</span>}
                </Link>
              ))}
            </div>
          </section>
        ))}

        <section>
          <p className="mono-tag mb-2" style={{ color: "var(--color-silver)" }}>ACCOUNT</p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth", replace: true });
            }}
            className="tap w-full px-4 py-3 text-left text-[13px]"
            style={{
              background: "transparent",
              border: "1px solid rgba(255,80,80,0.4)",
              borderRadius: 10,
              color: "#ff8080",
            }}
          >
            Sign out
          </button>
        </section>
      </div>
    </div>
  );
}
