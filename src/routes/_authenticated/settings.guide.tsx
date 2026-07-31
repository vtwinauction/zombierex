import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SettingsScreen, Card } from "@/components/SettingsScreen";
import shotStart from "@/assets/app-profile.jpg";
import shotPages from "@/assets/app-atlas.jpg";
import shotSettings from "@/assets/app-search.jpg";
import shotOptions from "@/assets/app-marketplace.jpg";

export const Route = createFileRoute("/_authenticated/settings/guide")({
  head: () => ({
    meta: [
      { title: "How to use ZOMBIEREX · User Guide" },
      { name: "description", content: "A complete walkthrough of every ZOMBIEREX page, setting and option — feed, reels, atlas, marketplace, drag racing, AI judge and account controls." },
      { property: "og:title", content: "How to use ZOMBIEREX · User Guide" },
      { property: "og:description", content: "A complete walkthrough of every ZOMBIEREX page, setting and option." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GuidePage,
});

type Row = { label: string; body: string; to?: string };
type Group = { id: string; title: string; hint: string; image: string; rows: Row[] };

const GROUPS: Group[] = [
  {
    id: "start",
    image: shotStart,
    title: "Getting started",
    hint: "The first five minutes",
    rows: [
      { label: "1 · Build your garage", body: "Open Profile → Edit to add your photo, bio, location and the bikes or cars you own. A complete garage gets far more follows.", to: "/profile/edit" },
      { label: "2 · Post your first build", body: "Tap the + button, pick photos or video from your device, add filters, music and a caption, then publish.", to: "/post/new" },
      { label: "3 · Follow riders & shops", body: "Use Search to find riders, hashtags, communities and vendors near you.", to: "/search" },
      { label: "4 · Turn on notifications", body: "Settings → Notifications lets you choose exactly what pings you — likes, comments, ride invites or nothing at all.", to: "/settings/notifications" },
    ],
  },
  {
    id: "pages",
    image: shotPages,
    title: "The main pages",
    hint: "What each tab does",
    rows: [
      { label: "Feed", body: "Your home timeline of posts from riders you follow, plus recommended builds. Double-tap to like, swipe down to refresh.", to: "/feed" },
      { label: "Reels", body: "Full-screen vertical video. Swipe up for the next clip; videos autoplay muted — tap to unmute, like, save or follow from the side rail.", to: "/reels" },
      { label: "Atlas", body: "GPS route hub. Record a ride, save hotels, fuel stops and restaurants as points of interest, then share the route so others can use it on their next trip.", to: "/atlas" },
      { label: "Marketplace", body: "Buy and sell bikes, cars, parts and gear. Filter by brand, model, year, price and location; checkout is handled in-app with your cart.", to: "/marketplace" },
      { label: "Events", body: "Meets, track days and shows. Buy tickets, RSVP and see who else is going.", to: "/events" },
      { label: "Communities", body: "Topic and region based groups with their own posts, challenges and events.", to: "/communities" },
      { label: "Drag racing", body: "GPS-verified 0-60 and quarter-mile timing with a Christmas-tree launch, leaderboards and head-to-head challenges.", to: "/drag" },
      { label: "AI Judge", body: "Submit photos and video of a build; the AI scores paint, fitment, welds and detail, then returns a full report card.", to: "/judge" },
      { label: "Messages", body: "Direct messages with riders, sellers and shops. Ride plans, offers and part deals live here.", to: "/messages" },
      { label: "Saved", body: "Every post, route, listing and reel you bookmarked, organised into collections.", to: "/saved" },
      { label: "Menu", body: "The full index — creator tools, vendor tools, rewards, referrals and everything not on the bottom bar.", to: "/menu" },
    ],
  },
  {
    id: "settings",
    image: shotSettings,
    title: "Settings explained",
    hint: "Every switch, in plain language",
    rows: [
      { label: "Account", body: "Edit your profile, change the email you sign in with, update your password and manage connected Google or Apple accounts.", to: "/settings/email" },
      { label: "Privacy", body: "Make your account private so only approved followers see your posts, choose who can message you, and manage blocked or muted people.", to: "/settings/account-privacy" },
      { label: "Security", body: "App Lock (FaceID / fingerprint), two-step verification, the devices you're signed in on and recent sign-in activity.", to: "/settings/app-lock" },
      { label: "Notifications", body: "Separate switches for push and email, plus per-activity control over likes, comments, follows, orders and ride alerts.", to: "/settings/notifications" },
      { label: "Appearance & language", body: "Dark, light or match-device theme, app language (including Arabic with full right-to-left layout) and larger text.", to: "/settings/appearance" },
      { label: "Accessibility", body: "Reduce motion to calm animations, and high contrast for stronger separation between text and background.", to: "/settings/accessibility" },
      { label: "Data & storage", body: "Download quality, when videos autoplay (always, Wi-Fi only, never) and clearing cached media to free up space.", to: "/settings/data" },
      { label: "Your data", body: "Request a full copy of your ZOMBIEREX information, or permanently delete your account and everything in it.", to: "/settings/export" },
    ],
  },
  {
    id: "options",
    image: shotOptions,
    title: "Options & power features",
    hint: "Things people miss",
    rows: [
      { label: "Post editor studio", body: "Filters, crop, music from the library, tags, location and scheduling — all before you publish. Drafts save automatically.", to: "/post/new" },
      { label: "Route sharing & GPX", body: "Export any recorded route as GPX, or import one a friend sent you and navigate it turn by turn.", to: "/atlas/mine" },
      { label: "Group rides & SOS", body: "Start a group ride to see everyone live on one map, and trigger SOS to send your location to trusted contacts.", to: "/atlas/group" },
      { label: "Creator tools", body: "Analytics on reach and watch time, scheduled posts, collaborations, subscriber tiers and payouts.", to: "/creator/dashboard" },
      { label: "Vendor & business", body: "Shops apply for a verified vendor badge, list inventory, show contact details and run promoted placements.", to: "/vendor" },
      { label: "Rewards & referrals", body: "Earn XP and achievements for riding, posting and racing; invite friends for bonus rewards.", to: "/rewards" },
      { label: "Reporting & safety", body: "Every post and profile has a report option. Reports are reviewed by moderators, and blocking is instant and silent.", to: "/settings/report" },
    ],
  },
];

function GuidePage() {
  const [open, setOpen] = useState<string | null>("start");

  return (
    <SettingsScreen
      index="06.13"
      section="USER GUIDE"
      title="How to use ZOMBIEREX"
      subtitle="A short tour of every page, setting and option in the app."
    >
      <div className="space-y-2">
        {GROUPS.map((g) => {
          const isOpen = open === g.id;
          return (
            <section
              key={g.id}
              style={{ background: "var(--color-graphite)", border: "1px solid var(--color-hair)", borderRadius: 10 }}
            >
              <button
                onClick={() => setOpen(isOpen ? null : g.id)}
                className="tap flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span className="min-w-0">
                  <span className="serif block text-[16px] italic" style={{ color: "var(--color-ink)" }}>{g.title}</span>
                  <span className="mt-0.5 block text-[12px]" style={{ color: "var(--color-silver)" }}>{g.hint}</span>
                </span>
                <span className="mono-tag shrink-0" style={{ color: "var(--color-silver)" }}>{isOpen ? "−" : "+"}</span>
              </button>

              {isOpen && (
                <div className="px-4 pb-3">
                  <img
                    src={g.image}
                    alt={`${g.title} screen in the ZOMBIEREX app`}
                    loading="lazy"
                    className="h-40 w-full rounded-lg object-cover"
                    style={{ border: "1px solid var(--color-hair-strong)" }}
                  />
                </div>
              )}

              {isOpen && (
                <div className="divide-y" style={{ borderTop: "1px solid var(--color-hair)", borderColor: "var(--color-hair)" }}>
                  {g.rows.map((r) => (
                    <div key={r.label} className="px-4 py-3">
                      <p className="text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>{r.label}</p>
                      <p className="mt-1 text-[12px] leading-relaxed" style={{ color: "var(--color-silver)" }}>{r.body}</p>
                      {r.to && (
                        <Link
                          to={r.to as any}
                          className="mono-tag tap mt-2 inline-block rounded-full px-3 py-1"
                          style={{ border: "1px solid var(--color-hair-strong)", color: "var(--color-ink)" }}
                        >
                          Open →
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}

        <Card>
          <p className="text-[13px]" style={{ color: "var(--color-silver)" }}>
            Didn't find what you needed?
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link to="/settings/help" className="mono-tag tap rounded-full px-3 py-1.5"
              style={{ border: "1px solid var(--color-hair-strong)", color: "var(--color-ink)" }}>Help centre →</Link>
            <Link to="/settings/report" className="mono-tag tap rounded-full px-3 py-1.5"
              style={{ border: "1px solid var(--color-hair-strong)", color: "var(--color-ink)" }}>Report a problem →</Link>
          </div>
        </Card>
      </div>
    </SettingsScreen>
  );
}
