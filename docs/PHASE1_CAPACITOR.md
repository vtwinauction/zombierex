# Phase 1 — Capacitor Native Shell

Phase 1 wraps the existing ZOMBIEREX web app in a Capacitor 8 native
shell so it can ship to the App Store and Google Play. **No UI or design
changes** — the web bundle is the source of truth; native APIs are
layered on via a thin bridge with graceful web fallbacks.

## What landed this phase

### Dependencies
Runtime:
`@capacitor/core`, `@capacitor/preferences`, `@capacitor/status-bar`,
`@capacitor/splash-screen`, `@capacitor/app`, `@capacitor/haptics`,
`@capacitor/share`, `@capacitor/geolocation`, `@capacitor/network`,
`@capacitor/device`, `@capacitor/browser`, `@capacitor/keyboard`.

Dev: `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`.

### Files
- `capacitor.config.ts` — appId `com.zombierex.app`, `webDir: "dist"`,
  splash + status bar + keyboard config.
- `src/lib/native/index.ts` — bridge API: `isNative()`, `platform()`,
  `haptic()`, `share()`, `openExternal()`, `getNetworkStatus()`,
  `getDeviceInfo()`. Every function has a web fallback (Web Share API,
  `navigator.vibrate`, clipboard, `window.open`).
- `src/lib/native/bootstrap.ts` — `bootstrapNative(router)` — hides
  splash after React commits, themes status bar, wires Android back
  button to router history, forwards app-state events, and exposes
  `--kb-h` CSS var while the keyboard is open.
- `src/routes/__root.tsx` — dynamic-imports `bootstrapNative` from a
  `useEffect`. Zero cost on web (guarded by `isNative()` inside every
  bridge call; the plugin JS is only evaluated on native).

### npm scripts
```
bun run cap:add:ios       # first-time iOS platform bootstrap
bun run cap:add:android   # first-time Android platform bootstrap
bun run cap:sync          # rebuild web bundle and push to native projects
bun run cap:open:ios      # open Xcode
bun run cap:open:android  # open Android Studio
bun run cap:run:ios       # build + run on the selected iOS device / simulator
bun run cap:run:android   # build + run on the selected Android device / emulator
```

## Native build workflow (developer machine)

The Lovable sandbox cannot run Xcode or the Android SDK. Native builds
happen on a developer machine that has:

- macOS 14+ with Xcode 15+, CocoaPods, iOS 17 SDK  → for iOS
- Android Studio Hedgehog+, JDK 17, Android SDK 34 → for Android

### First-time setup
```bash
git clone <repo> && cd zombierex
bun install
bun run cap:add:ios       # generates ios/ (macOS only)
bun run cap:add:android   # generates android/
```

### Everyday workflow
```bash
bun run cap:sync          # after any web change
bun run cap:open:ios      # -> Xcode: Product > Run
bun run cap:open:android  # -> Android Studio: Run > Run 'app'
```

## Adopting native APIs in feature code

Import from `@/lib/native`. Never `import` a Capacitor plugin directly
in feature code — the bridge already dynamic-imports plugins inside
`isNative()` guards, keeping them out of the web bundle.

```ts
import { haptic, share } from "@/lib/native";

async function onLike() {
  await haptic("light");
}

async function onShareEvent(url: string) {
  await share({ title: "ZOMBIEREX event", url, dialogTitle: "Share event" });
}
```

## What's still on the Phase 1 whiteboard

These are wired for the next PR — the bridge is ready, callers just
need to be swapped:

1. **Supabase session persistence on native.** `client.ts` is
   auto-generated and uses `localStorage`. On native we should proxy
   through `@capacitor/preferences`. Approach: after `bootstrapNative`,
   detect `isNative()` and mirror any legacy `sb-*-auth-token`
   `localStorage` entry into Preferences, then patch `window.localStorage`
   with a Preferences-backed shim before Supabase client init. Ticket:
   NATIVE-SESSION-PERSIST.
2. **Sharing.** Swap direct `navigator.share(...)` calls in
   `events.$id.tsx`, `profile.tsx`, `marketplace_.$id.tsx`, `Reel.tsx`
   for `share()` from the bridge. Behavior is identical on web; native
   uses UIActivityViewController / ACTION_SEND.
3. **Haptics.** Add `haptic("light")` to like / save / follow /
   check-in / race-launch handlers.
4. **Geolocation.** Atlas GPS already uses `navigator.geolocation`,
   which Capacitor auto-shims — no changes needed, but we should call
   `Geolocation.requestPermissions()` on first Atlas visit for a
   clearer native permission prompt.
5. **App icons + splash assets.** Provide 1024×1024 icon + 2732×2732
   splash to `resources/`, then `bunx capacitor-assets generate`.

## Store submission checklist (Phase 7 preview)

- [ ] Bundle IDs match App Store Connect / Play Console records.
- [ ] Privacy manifest (`PrivacyInfo.xcprivacy`) declares location,
      camera, mic, photo library usage.
- [ ] `NSLocationWhenInUseUsageDescription`,
      `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`,
      `NSPhotoLibraryAddUsageDescription` in `Info.plist`.
- [ ] Android manifest declares `ACCESS_FINE_LOCATION`, `CAMERA`,
      `RECORD_AUDIO`, `POST_NOTIFICATIONS`.
- [ ] Deep-link universal links + intent filters registered.
- [ ] App icons + adaptive icons (Android) + all splash densities.
- [ ] Signed release builds pass App Store Connect and Play Console
      pre-flight checks.

## Design lock — verified

No design tokens, component styles, or route markup were touched in
this phase. The web preview renders identically before and after
Capacitor install; the bridge is inert on web.
