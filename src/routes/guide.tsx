import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import shotStart from "@/assets/app-profile.jpg";
import shotPages from "@/assets/app-atlas.jpg";
import shotSettings from "@/assets/app-search.jpg";
import shotOptions from "@/assets/app-marketplace.jpg";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "How to Use ZOMBIEREX — App Guide" },
      { name: "description", content: "A complete walkthrough of every ZOMBIEREX page, setting and option: feed, reels, route atlas, marketplace, events, drag racing, AI judge and account controls." },
      { property: "og:title", content: "How to Use ZOMBIEREX — App Guide" },
      { property: "og:description", content: "See every page, setting and power feature inside the ZOMBIEREX app." },
      { property: "og:type", content: "article" },
    ],
  }),
  component: PublicGuidePage,
});

type Row = { label: string; body: string };
type Group = { id: string; title: string; hint: string; image: string; rows: Row[] };

const GROUPS: Group[] = [
  {
    id: "start",
    image: shotStart,
    title: "Getting started",
    hint: "The first five minutes",
    rows: [
      { label: "1 · Build your garage", body: "Open Profile → Edit to add your photo, bio, location and the bikes or cars you own. A complete garage gets far more follows." },
      { label: "2 · Post your first build", body: "Tap the + button, pick photos or video from your device, add filters, music and a caption, then publish." },
      { label: "3 · Follow riders & shops", body: "Use Search to find riders, hashtags, communities and vendors near you." },
      { label: "4 · Turn on notifications", body: "Settings → Notifications lets you choose exactly what pings you — likes, comments, ride invites or nothing at all." },
    ],
  },
  {
    id: "pages",
    image: shotPages,
    title: "The main pages",
    hint: "What each tab does",
    rows: [
      { label: "Feed", body: "Your home timeline of posts from riders you follow, plus recommended builds. Double-tap to like, swipe down to refresh." },
      { label: "Reels", body: "Full-screen vertical video. Swipe up for the next clip; videos autoplay muted — tap to unmute, like, save or follow from the side rail." },
      { label: "Atlas", body: "GPS route hub. Record a ride, save hotels, fuel stops and restaurants as points of interest, then share the route so others can use it on their next trip." },
      { label: "Marketplace", body: "Buy and sell bikes, cars, parts and gear. Filter by brand, model, year, price and location; checkout is handled in-app with your cart." },
      { label: "Events", body: "Meets, track days and shows. Buy tickets, RSVP and see who else is going." },
      { label: "Communities", body: "Topic and region based groups with their own posts, challenges and events." },
      { label: "Drag racing", body: "GPS-verified 0-60 and quarter-mile timing with a Christmas-tree launch, leaderboards and head-to-head challenges." },
      { label: "AI Judge", body: "Submit photos and video of a build; the AI scores paint, fitment, welds and detail, then returns a full report card." },
      { label: "Messages", body: "Direct messages with riders, sellers and shops. Ride plans, offers and part deals live here." },
      { label: "Saved", body: "Every post, route, listing and reel you bookmarked, organised into collections." },
      { label: "Menu", body: "The full index — creator tools, vendor tools, rewards, referrals and everything not on the bottom bar." },
    ],
  },
  {
    id: "settings",
    image: shotSettings,
    title: "Settings explained",
    hint: "Every switch, in plain language",
    rows: [
      { label: "Account", body: "Edit your profile, change the email you sign in with, update your password and manage connected Google or Apple accounts." },
      { label: "Privacy", body: "Make your account private so only approved followers see your posts, choose who can message you, and manage blocked or muted people." },
      { label: "Security", body: "App Lock (FaceID / fingerprint), two-step verification, the devices you're signed in on and recent sign-in activity." },
      { label: "Notifications", body: "Separate switches for push and email, plus per-activity control over likes, comments, follows, orders and ride alerts." },
      { label: "Appearance & language", body: "Dark, light or match-device theme, app language (including Arabic with full right-to-left layout) and larger text." },
      { label: "Accessibility", body: "Reduce motion to calm animations, and high contrast for stronger separation between text and background." },
      { label: "Data & storage", body: "Download quality, when videos autoplay (always, Wi-Fi only, never) and clearing cached media to free up space." },
      { label: "Your data", body: "Request a full copy of your ZOMBIEREX information, or permanently delete your account and everything in it." },
    ],
  },
  {
    id: "options",
    image: shotOptions,
    title: "Options & power features",
    hint: "Things people miss",
    rows: [
      { label: "Post editor studio", body: "Filters, crop, music from the library, tags, location and scheduling — all before you publish. Drafts save automatically." },
      { label: "Route sharing & GPX", body: "Export any recorded route as GPX, or import one a friend sent you and navigate it turn by turn." },
      { label: "Group rides & SOS", body: "Start a group ride to see everyone live on one map, and trigger SOS to send your location to trusted contacts." },
      { label: "Creator tools", body: "Analytics on reach and watch time, scheduled posts, collaborations, subscriber tiers and payouts." },
      { label: "Vendor & business", body: "Shops apply for a verified vendor badge, list inventory, show contact details and run promoted placements." },
      { label: "Rewards & referrals", body: "Earn XP and achievements for riding, posting and racing; invite friends for bonus rewards." },
      { label: "Reporting & safety", body: "Every post and profile has a report option. Reports are reviewed by moderators, and blocking is instant and silent." },
    ],
  },
];

function PublicGuidePage() {
  const [open, setOpen] = useState<string | null>("start");

  return (
    <MarketingShell>
      <section className="mkt-section" style={{ borderTop: "none", paddingTop: 56 }}>
        <div className="mkt-wrap">
          <Link to="/" className="mkt-textlink" style={{ marginBottom: 24 }}>
            <ArrowLeft size={14} /> Back to home
          </Link>

          <div className="mkt-section-head" style={{ marginTop: 18 }}>
            <p className="mkt-eyebrow">App guide</p>
            <h1>How to use ZOMBIEREX.</h1>
            <p>A short tour of every page, setting and option inside the app — with screens from the real product.</p>
          </div>

          <div style={{ display: "grid", gap: 12, marginTop: 30 }}>
            {GROUPS.map((g) => {
              const isOpen = open === g.id;
              return (
                <section
                  key={g.id}
                  style={{
                    background: "var(--surface, rgba(255,255,255,0.03))",
                    border: "1px solid var(--line, rgba(255,255,255,0.09))",
                    borderRadius: 14,
                    overflow: "hidden",
                  }}
                >
                  <button
                    onClick={() => setOpen(isOpen ? null : g.id)}
                    aria-expanded={isOpen}
                    style={{
                      display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between",
                      gap: 12, padding: "16px 18px", textAlign: "left", background: "transparent",
                      color: "inherit", cursor: "pointer",
                    }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 17, fontWeight: 700, letterSpacing: "-0.015em" }}>{g.title}</span>
                      <span className="mkt-muted" style={{ display: "block", marginTop: 3, fontSize: 12.5 }}>{g.hint}</span>
                    </span>
                    <span style={{ color: "var(--neon)", fontSize: 20, lineHeight: 1 }}>{isOpen ? "−" : "+"}</span>
                  </button>

                  {isOpen && (
                    <div style={{ padding: "0 18px 16px" }}>
                      <img
                        src={g.image}
                        alt={`${g.title} in the ZOMBIEREX app`}
                        loading="lazy"
                        style={{
                          width: "100%", height: 220, objectFit: "cover", borderRadius: 12,
                          border: "1px solid var(--line, rgba(255,255,255,0.09))",
                        }}
                      />
                      <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
                        {g.rows.map((r) => (
                          <div key={r.label}>
                            <p style={{ fontSize: 13.5, fontWeight: 600 }}>{r.label}</p>
                            <p className="mkt-muted" style={{ fontSize: 13, lineHeight: 1.65, marginTop: 3 }}>{r.body}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          <div style={{ marginTop: 40, display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Link to="/download" className="mkt-btn mkt-btn-neon">Get the app</Link>
            <Link to="/contact" className="mkt-btn mkt-btn-ghost">Contact support</Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
