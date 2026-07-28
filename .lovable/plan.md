# ZOMBIEREX Audit Remediation Plan

## Summary of findings

The auditor rates the project **58/100 overall, 22/100 production-ready**. Backend hygiene is genuinely strong (RLS on 109/109 tables, 100% Zod coverage on 281 server fns, hardened webhook, correct role architecture). Three layers failed:

1. **Native shell is broken** — 12 Capacitor plugins referenced, 0 installed; `loadPlugin` uses `@vite-ignore` with variable specifiers (architecturally cannot resolve at runtime); splash never dismisses. App likely hangs on splash on device.
2. **Security holes at the column/anon boundary** — `GRANT SELECT profiles TO anon` + broad `profiles_public_read` exposes phone/email/address of every user. `GRANT UPDATE` with no column list lets any user self-set `is_verified`, `is_suspended`, `is_premium`, `tier`, seller rating, XP. Vendors can self-verify. Ex-premium users can reactivate premium.
3. **"Last mile" placebo features** — 4 settings screens write values nobody reads; push tokens collected but no sender; "sign out this device" only deletes a cosmetic row; Following tab filters mock data by array parity; home screen has fabricated Recent chats/suggested creators/trending counts (App Review rejection risk).

Docs (`production-readiness-report.md`) contradict reality on payments, mobile, push, feed, i18n, and Vite version.

## What I will apply now (safe, high-leverage, no device required)

### Phase A — SQL security & performance (pure migrations, zero build risk)

- **C-04 · Close anonymous PII read.** Revoke `SELECT ON profiles FROM anon`, drop `profiles_public_read`, add authenticated-only policy that honours `is_private` + followers, create `profiles_public` PII-free view granted to `anon`. Repoint public fns (`getProfileByHandlePublic`, `searchAll`, public feed reads) at the view.
- **C-05/C-06/C-07 · Column-level grants + guard trigger.** Replace blanket `GRANT UPDATE` on `profiles`/`vendors` with column-scoped grants; drop `pm_own_update` + revoke UPDATE on `premium_memberships`; drop dead `subs_owner_update`; add `tg_guard_profile_privileged` BEFORE UPDATE trigger as defence-in-depth.
- **H-01 · Signed URLs.** Cap `expires_in` at 900s in `createSignedReadUrl`, verify row visibility per bucket (not just `documents`).
- **H-04 · Foreign-key indexes.** Ship the 19 hot-path `CREATE INDEX CONCURRENTLY` from §4.4 plus a generator-produced batch for the rest.
- **H-03 · `(select auth.uid())` rewrite.** Mechanical migration converting all `auth.uid()` references in policy `USING`/`WITH CHECK` to the initplan-cached form.
- **H-08 · Real device revoke.** `revokeDevice` fetches session_id from the row and calls `supabase.auth.admin.signOut(userId, { scope: 'others' })` via admin client; dedupe `registerDevice`.
- **H-02 partial · Bucket definitions in a migration** with size + MIME limits so fresh envs have buckets.
- **M-07 · Rate-limit / restrict anonymous inserts** on `analytics_events` and `crash_reports`.

### Phase B — Frontend safety & polish (no native required)

- **C-10 · Strip fabricated content** from `routes/index.tsx`: remove `chats`/suggested creators/suggested clubs mocks, hardcoded trending counts, feed mock fallback, Following-tab parity filter. Replace with real empty states + real Following query (`author_id IN (following)`).
- **H-05 · QueryClient defaults**: `staleTime: 60s`, `refetchOnWindowFocus: false`, scope invalidations by key domain, drop blanket `invalidateQueries()` in `__root.tsx` and on `TOKEN_REFRESHED`/`INITIAL_SESSION`.
- **H-06 · Error surfaces.** Add `isError` fallbacks to the highest-traffic query call sites (feed, reels, marketplace, profile, communities, search).
- **H-12 · Router defaults.** `defaultPendingMs: 200`, `defaultPreloadStaleTime: 30s`; `DefaultError` renders a generic message, hides `error.message` behind DEV.
- **H-13 · Service worker.** Bump cache to build-hash name, add LRU cap, drop `/` navigation precache, skip SW registration inside Capacitor WebView.
- **H-10 · Feed pagination.** Composite `(created_at, id)` keyset cursor; only null `nextCursor` when the underlying page (not the filtered result) is short; move block-list filter server-side via helper function.
- **M-11 · Identity cleanup.** SITE_NAME → "ZOMBIEREX", robots sitemap URL, `your-site.com` placeholder.
- **M-13 · `node:crypto`** imports in `webhooks.payments.ts`.
- **M-15 · Server-side age gate** at signup via server fn checking DOB.
- Rewrite `docs/production-readiness-report.md` to match reality (or replace with a redirect to DEFERRED_INTEGRATIONS.md).

### Phase C — Native shell (does require device verification you must do)

I will ship the code changes; **device verification is your step** (auditor is explicit: none of this is verifiable without hardware).

- **C-01/C-02/C-03 · Install plugins + static imports.** Add 13 packages (`@capacitor/core`, `splash-screen`, `haptics`, `share`, `browser`, `network`, `device`, `push-notifications`, `camera`, `geolocation`, `status-bar`, `app`, `keyboard`, `@aparajita/capacitor-biometric-auth`). Replace variable `import(/* @vite-ignore */ name)` with static imports guarded by `isNative()`. Set `launchAutoHide: true`.
- **C-12 · Lockfile.** Keep bun (per `bunfig.toml`), delete `package-lock.json`, regenerate `bun.lock`.

## What I will not attempt in this pass (needs product/business input or is genuinely multi-week)

- **C-08/C-09 · Native OAuth + universal-link email redirect** (needs your Apple Team ID, Android signing SHA-256, and a public HTTPS domain for the association files).
- **C-11 · Push delivery** (needs FCM sender key + APNs auth key from you).
- **C-13 · Deep-link association files** (needs Team ID + SHA-256).
- **C-14 · StoreKit / Stripe Connect** (business decision, blocked on Bahrain-Stripe status).
- **H-09 · Ranked feed** (multi-week ML/eng work).
- **H-11 · Background location + native crash detection** (needs Android foreground service + iOS Info.plist justification + App Review submission).
- **H-07 · Making the 4 placebo settings real** (dark mode alone is a full theming pass — I will instead remove/hide the non-functional toggles to stop the false-advertising problem, and file the real work).
- **Accessibility sweep of 135 inputs** (I will hit the top offenders: `profile.edit`, `events.new`, `events_.$id.edit`, `ads.new`, `MediaComposer`, `auth` — the rest gets a follow-up).

## Order of operations

1. Phase A migrations (single squashed migration file, applied via `supabase--migration`).
2. Repoint server functions at `profiles_public` and update `revokeDevice`, `createSignedReadUrl`.
3. Phase B frontend edits in parallel batches.
4. Phase C native install + static imports; ask you to run `bun install`, `bun cap sync`, and test on a physical device.
5. Rewrite `production-readiness-report.md` last so it reflects the new state.

## Technical notes

- The `profiles_public` view is `security_invoker = off` so it runs as the view owner and the underlying table's per-row RLS is not consulted — the view's `WHERE` clause is the entire access control. I will keep it minimal-columns and grant it explicitly.
- The `tg_guard_profile_privileged` trigger uses `has_any_role(auth.uid(), …)` which already exists as STABLE SECURITY DEFINER, so it composes cleanly with the column grants.
- `H-03` rewrite: I will script the migration by enumerating `pg_policies` and emitting `ALTER POLICY` DDL rather than hand-editing 268 policies.
- `createSignedReadUrl` ownership verification for `posts`/`marketplace`/`vehicles` will use `requireSupabaseAuth`'s user-scoped client (RLS), so a row the user cannot read produces no signed URL — no admin bypass.
- SW skip on native: `if (window.Capacitor?.isNativePlatform?.()) return;` at the top of the registration path.

Approve and I'll ship Phase A + B in one pass, then hand you Phase C with the device checklist.
