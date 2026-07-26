# Phase 0 — Build Stabilization Status

Tracker for the Phase 0 items defined in the ZOMBIEREX Mobile Build brief
(§3). One PR per phase per Appendix B; this file records what has landed
and what remains before Phase 1 (Capacitor shell) begins.

## ✅ Done this turn

### C1 — Auth gate race
`src/routes/_authenticated/route.tsx` no longer calls `supabase.auth.getUser()`
(which requires a network round-trip and can race the persisted session
restore on mobile). It now:

1. Calls `supabase.auth.getSession()` — synchronous read from the storage
   adapter.
2. If no session yet, subscribes to `onAuthStateChange` and waits for the
   first `INITIAL_SESSION` / `SIGNED_IN` / `TOKEN_REFRESHED` event.
3. Falls through to `/auth` redirect only after a 1500ms hard timeout, so a
   broken/absent storage adapter can never wedge the app on
   "AUTHENTICATING".

This is safe on web today and is the correct precondition for swapping the
storage adapter to `@capacitor/preferences` in Phase 1 without further
route changes.

### Type extraction (mock-data.ts decoupling, step 1 of 2)
New `src/lib/types.ts` owns all shared UI types (`User`, `Post`, `Reel`,
`Story`, `Vehicle`, `EventItem`, `Listing`, `Club`, `Chat`, `Achievement`,
`WorkshopEntry`). Three components no longer drag `mock-data.ts` into their
bundle for type-only reasons:

- `src/components/Reel.tsx`
- `src/components/TelemetryPost.tsx`
- `src/components/StoriesRail.tsx` (still uses `storiesV2` runtime — see below)

### C2 — Vite config
Audited `vite.config.ts`. **No-op:** the config currently only sets
`optimizeDeps.exclude: ["@tanstack/start-server-core"]` and env `define`
entries — no `cacheDir` override, no `optimizeDeps.force`. The C2 finding
in `docs/ENGINEERING_RECOVERY_AUDIT.md` is stale.

### C3 — Drag "CONTINUE"
Depends on C2. C2 is a no-op so no action required; confirm on-device in
the Phase 1 shell smoke test.

## 🔜 Remaining before Phase 0 is fully closed

### M2 — Delete `src/lib/mock-data.ts` (data substitution)
Six files still pull **runtime values** (not just types) from mock-data.
Each needs its rendering swapped to the real server-fn data before the
file can be deleted. Grouped by risk:

| File | Mock imports | Replacement plan |
|---|---|---|
| `src/routes/index.tsx` | `reels`, `storiesV2`, `posts`, `chats`, `users`, `clubs` | Wire to `getFeed`, `listReels`, `listMyConversations`, `searchAll`, `listClubs`. Home is the highest-visibility surface — verify all rails render with real data + empty states. |
| `src/routes/profile.tsx` | `me`, `myVehicles`, `rider`, `achievements`, `workshopHistory`, `reels` | Wire to `getMyProfile`, vehicles fn, `gamification.functions`, workshop history fn (may need to create). |
| `src/routes/reels.tsx` | `reels` | Wire to a reels list server fn (feed.functions). |
| `src/routes/communities.index.tsx` | `clubs as mockClubs` | Wire to `listCommunities` from `communities.functions`. |
| `src/routes/notifications.tsx` | `users` | Wire to `listNotifications`. |
| `src/components/StatusHUD.tsx` | `rider` | Accept as prop from caller, or call a small `getRiderStats` server fn. |
| `src/components/StoriesRail.tsx` | `storiesV2` | Wire to a stories server fn or accept as prop. |

**Why this wasn't done this turn:** the brief's constraint #1 (design
lock) requires per-screen before/after visual verification of every route
touched. Substituting real data on 6 primary routes with empty + loading
+ error states must be its own PR with screenshot evidence, per Appendix
B ("one PR per phase, each with regression evidence attached").

### Session persistence adapter
The Supabase client at `src/integrations/supabase/client.ts` is
auto-generated and today uses `localStorage`. Swap to
`@capacitor/preferences` happens as part of Phase 1 (Capacitor shell) via
a custom storage wrapper injected through the generated client's storage
option — do NOT edit the generated file directly.

## Definition of Phase 0 done

- [x] Auth gate no longer races persisted session restore
- [x] Component type imports decoupled from mock-data
- [x] Vite config verified clean
- [ ] All runtime mock-data imports replaced with real server-fn data
- [ ] `src/lib/mock-data.ts` deleted
- [ ] Session storage adapter swap-ready (Phase 1)

Next turn should execute the data-substitution table above in a single
focused pass with screenshots per route.
