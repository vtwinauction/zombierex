import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { StatusBar } from "@/components/StatusBar";

type Entry = { test: (p: string) => boolean; index: string; section: string };

const ENTRIES: Entry[] = [
  // Admin / ops
  { test: (p) => p.startsWith("/admin/health"), index: "OPS/01", section: "Platform Health" },
  { test: (p) => p.startsWith("/admin/moderation"), index: "MOD/01", section: "Moderation Queue" },
  { test: (p) => p.startsWith("/admin"), index: "OPS", section: "ADMIN" },
  { test: (p) => p.startsWith("/owner"), index: "OWN", section: "OWNER" },
  { test: (p) => p.startsWith("/security"), index: "SEC/01", section: "Security Center" },

  // Atlas
  { test: (p) => p.startsWith("/atlas/mine"), index: "03", section: "ATLAS · MINE" },
  { test: (p) => p.startsWith("/atlas/new"), index: "03", section: "ATLAS · PLAN" },
  { test: (p) => p.startsWith("/atlas/record"), index: "03", section: "ATLAS · RECORD" },
  { test: (p) => p.startsWith("/atlas/group"), index: "03", section: "ATLAS · GROUP" },
  { test: (p) => p.startsWith("/atlas/ride"), index: "03", section: "ATLAS · RIDE" },
  { test: (p) => p.startsWith("/atlas/fuel"), index: "03", section: "ATLAS · FUEL" },
  { test: (p) => p.startsWith("/atlas/diag"), index: "03", section: "ATLAS · DIAG" },
  { test: (p) => p.startsWith("/atlas/voice"), index: "03", section: "ATLAS · VOICE" },
  { test: (p) => p.startsWith("/atlas/sos"), index: "03", section: "ATLAS · SOS" },
  { test: (p) => p.startsWith("/atlas/"), index: "03", section: "ATLAS · ROUTE" },
  { test: (p) => p === "/atlas", index: "03", section: "ATLAS" },

  // Communities
  {
    test: (p) => /^\/communities\/[^/]+\/challenges\/new/.test(p),
    index: "06",
    section: "COMPOSE · CHALLENGE",
  },
  {
    test: (p) => /^\/communities\/[^/]+\/events\/new/.test(p),
    index: "05",
    section: "COMPOSE · EVENT",
  },
  {
    test: (p) => /^\/communities\/[^/]+\/post\/new/.test(p),
    index: "04",
    section: "COMPOSE · POST",
  },
  {
    test: (p) => /^\/communities\/[^/]+\/manage/.test(p),
    index: "03",
    section: "COMMUNITY · MANAGE",
  },
  {
    test: (p) => /^\/communities\/[^/]+\/challenges\//.test(p),
    index: "03",
    section: "COMMUNITY · CHALLENGE",
  },
  { test: (p) => p === "/communities/create", index: "03", section: "COMMUNITY · CREATE" },
  { test: (p) => /^\/communities\/[^/]+/.test(p), index: "03", section: "COMMUNITY · LIVE" },
  { test: (p) => p.startsWith("/communities"), index: "03", section: "COMMUNITIES · DISCOVER" },

  // Creator
  { test: (p) => p.startsWith("/creator/apply"), index: "07", section: "CREATOR · APPLY" },
  { test: (p) => p.startsWith("/creator/collabs"), index: "07", section: "CREATOR · COLLAB INBOX" },
  { test: (p) => p.startsWith("/creator/dashboard"), index: "07", section: "CREATOR · DASHBOARD" },
  { test: (p) => p.startsWith("/creator/tiers"), index: "07", section: "CREATOR · TIERS" },
  { test: (p) => p.startsWith("/creator/"), index: "07", section: "CREATOR" },
  { test: (p) => p === "/creators", index: "07", section: "CREATORS" },

  // Drag
  { test: (p) => p.startsWith("/drag/leaderboards"), index: "07", section: "DRAG · LEADERBOARDS" },
  { test: (p) => p.startsWith("/drag/run"), index: "07", section: "DRAG · NEW RUN" },
  { test: (p) => p.startsWith("/drag/race"), index: "07", section: "DRAG · RACE MODE" },
  { test: (p) => p.startsWith("/drag/"), index: "07", section: "DRAG · RECORD" },
  { test: (p) => p === "/drag", index: "07", section: "DRAG · VERIFIED" },

  // Events
  { test: (p) => /^\/events\/[^/]+\/edit/.test(p), index: "06", section: "EVENTS · EDIT" },
  { test: (p) => p === "/events/new", index: "06", section: "EVENTS · NEW" },
  { test: (p) => /^\/events\/[^/]+/.test(p), index: "06", section: "EVENT" },
  { test: (p) => p.startsWith("/events"), index: "06", section: "EVENTS" },

  // Marketplace
  {
    test: (p) => p.startsWith("/marketplace/dashboard"),
    index: "DSH",
    section: "SELLER DASHBOARD",
  },
  { test: (p) => p.startsWith("/marketplace/new"), index: "09", section: "NEW LISTING" },
  { test: (p) => p.startsWith("/marketplace/seller/"), index: "SLR", section: "SELLER PROFILE" },
  { test: (p) => /^\/marketplace\/[^/]+/.test(p), index: "LST", section: "LISTING" },
  { test: (p) => p.startsWith("/marketplace"), index: "09", section: "MARKETPLACE" },

  // Cart / Checkout
  { test: (p) => p.startsWith("/cart"), index: "CRT", section: "SHOPPING CART" },
  { test: (p) => p.startsWith("/checkout"), index: "CHK", section: "CHECKOUT" },

  // Rides
  { test: (p) => /^\/rides\/[^/]+/.test(p), index: "04", section: "RIDES · DETAIL" },
  { test: (p) => p.startsWith("/rides"), index: "04", section: "RIDES · LOG" },

  // Posts
  { test: (p) => /^\/post\/[^/]+\/edit/.test(p), index: "05", section: "EDIT · POST" },
  { test: (p) => p === "/post/new", index: "04", section: "COMPOSE · POST" },
  { test: (p) => p === "/posts/mine", index: "05", section: "MY POSTS" },

  // Profile
  { test: (p) => p.startsWith("/profile/edit"), index: "05", section: "EDIT · PROFILE" },
  {
    test: (p) => p === "/profile" || p.startsWith("/profile/"),
    index: "05",
    section: "GARAGE · OPERATOR",
  },

  // Judge
  { test: (p) => p.startsWith("/judge/submit"), index: "JDG", section: "JUDGE · SUBMIT" },
  {
    test: (p) => p.startsWith("/judge/leaderboards"),
    index: "JDG",
    section: "JUDGE · LEADERBOARDS",
  },
  { test: (p) => p.startsWith("/judge/entries"), index: "JDG", section: "JUDGE · ENTRY" },
  { test: (p) => p.startsWith("/judge/events"), index: "JDG", section: "JUDGE · EVENT" },
  { test: (p) => p.startsWith("/judge"), index: "JDG", section: "AI JUDGE" },

  // Settings
  { test: (p) => p.startsWith("/settings"), index: "06", section: "SETTINGS" },

  // Vendor / business / ads
  { test: (p) => p.startsWith("/vendor"), index: "VND", section: "VENDOR" },
  { test: (p) => p.startsWith("/business"), index: "BIZ", section: "BUSINESS" },
  { test: (p) => p.startsWith("/ads"), index: "ADS", section: "ADS" },

  // Misc
  { test: (p) => p.startsWith("/messages"), index: "03", section: "COMMS · TRANSMISSIONS" },
  { test: (p) => p.startsWith("/notifications"), index: "07", section: "LOG · ACTIVITY" },
  { test: (p) => p.startsWith("/search"), index: "02", section: "SIGNAL · DISCOVER" },
  { test: (p) => p.startsWith("/assistant"), index: "AI", section: "ASSISTANT" },
  { test: (p) => p.startsWith("/rewards"), index: "XP", section: "REWARDS" },
  { test: (p) => p.startsWith("/menu"), index: "00", section: "MENU" },
  { test: (p) => p.startsWith("/onboarding"), index: "00", section: "ONBOARDING" },
  { test: (p) => p === "/" || p === "/index", index: "01", section: "HOME · TRANSMISSION" },
];

function resolve(pathname: string): { index: string; section: string } {
  for (const e of ENTRIES) if (e.test(pathname)) return { index: e.index, section: e.section };
  return { index: "00", section: "ZOMBIEREX" };
}

/**
 * Renders the global masthead (cart, search, +, notifications, menu) on
 * every non-immersive page. Immersive routes (reels, cockpit, race) are
 * excluded upstream in __root.
 *
 * The label is resolved only after hydration: auth-gated routes redirect on
 * the client, so the client's first pathname can differ from the one the
 * server rendered. Resolving post-mount keeps the first paint deterministic.
 */
export function GlobalStatusBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const { index, section } = hydrated ? resolve(pathname) : { index: "00", section: "ZOMBIEREX" };
  return <StatusBar index={index} section={section} />;
}
