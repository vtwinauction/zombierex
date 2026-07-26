# ZOMBIEREX — Mobile Build Guide (iOS + Android)

The web app is the source of truth. Capacitor 7 wraps the built `dist/`
bundle in a native shell and exposes device APIs through
`src/lib/native/*`.

## 1. One-time setup

```bash
bun install
bun run build                 # produces dist/
bunx cap add ios              # generates ios/  (macOS + Xcode required)
bunx cap add android          # generates android/ (Android Studio required)
```

Bundle ID / display name / splash color live in `capacitor.config.ts`.
Change `com.zombierex.app` to the real App Store / Play Console ID
**before** first `cap add`.

## 2. Iterating

```bash
bun run build && bunx cap sync
bunx cap open ios        # → run on simulator or device from Xcode
bunx cap open android    # → run from Android Studio
```

Every JS/TS change requires `bun run build && bunx cap sync`.

## 3. Native features already wired

| Capability     | File                                   | Notes                              |
| -------------- | -------------------------------------- | ---------------------------------- |
| Haptics        | `src/lib/native/index.ts`              | Used in follow / drag race / check-in |
| Share sheet    | `src/lib/native/index.ts`              | All `navigator.share` sites migrated |
| Geolocation    | `src/lib/native/geolocation-bridge.ts` | Overrides `navigator.geolocation`  |
| Camera         | `src/lib/native/camera.ts`             | Used by `MediaComposer`            |
| Push tokens    | `src/lib/native/push.ts`               | Persists to `public.device_tokens` |
| Splash         | `bootstrap.ts` + `capacitor.config.ts` | Fades out on React commit          |
| Status bar     | `bootstrap.ts`                         | Dark style, obsidian background    |
| Keyboard inset | `bootstrap.ts`                         | Exposes CSS var `--kb-h`           |
| Back button    | `bootstrap.ts`                         | Android hardware back → router     |
| Deep links     | `bootstrap.ts`                         | `appUrlOpen` → `router.navigate`   |
| Network        | `bootstrap.ts`                         | Toggles `.zx-offline` on `<html>`  |

## 4. Deep links

Custom scheme (iOS): `ZOMBIEREX://` — declared in
`capacitor.config.ts → ios.scheme`. After `cap add ios`, also add it to
`ios/App/App/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array><string>ZOMBIEREX</string></array>
  </dict>
</array>
```

Android intent filter — append to `android/app/src/main/AndroidManifest.xml`
inside the main `<activity>`:

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" android:host="zombierex.com" />
</intent-filter>
```

Universal Links (iOS) require an `apple-app-site-association` file
served from `https://zombierex.com/.well-known/`.

## 5. Icons and splash

Drop a 1024×1024 `resources/icon.png` and a 2732×2732
`resources/splash.png`, then:

```bash
bunx @capacitor/assets generate --iconBackgroundColor '#08090b' \
  --splashBackgroundColor '#08090b'
```

## 6. Permissions — copy/paste

### iOS — `ios/App/App/Info.plist`

App Store review rejects builds that request any of these APIs without a
human-readable usage string. Paste inside the top-level `<dict>`:

```xml
<key>NSCameraUsageDescription</key>
<string>ZOMBIEREX uses your camera to capture posts, reels, and vehicle inspections.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Attach photos and videos from your library to posts, reels, and listings.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Save reels and drag-race replays back to your photo library.</string>
<key>NSMicrophoneUsageDescription</key>
<string>Record audio for reels and voice notes.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Show your position on Atlas, verify drag-race runs, and tag posts with location.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Keep tracking your route during group rides even when the app is in the background.</string>
<key>NSMotionUsageDescription</key>
<string>Use motion sensors to detect launches and validate drag-race telemetry.</string>
<key>NSFaceIDUsageDescription</key>
<string>Unlock ZOMBIEREX and confirm sensitive actions with Face ID.</string>
```

### Android — `android/app/src/main/AndroidManifest.xml`

The installed Capacitor plugins declare most permissions automatically.
Add these manually only if the matching feature is enabled:

```xml
<!-- Background group-ride tracking on Atlas -->
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<!-- High-frequency GPS for drag racing -->
<uses-permission android:name="android.permission.HIGH_SAMPLING_RATE_SENSORS" />
<!-- Push notifications on Android 13+ -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

## 7. Assets

Regenerate every icon + splash density after editing `resources/icon.png`
or `resources/splash.png`:

```bash
bun run cap:assets
```

See `resources/README.md` for source-image constraints.

## 8. Release checklist

- [ ] Real bundle ID + Team ID configured in `capacitor.config.ts`
- [ ] `bun run cap:assets` run against final artwork
- [ ] All permission strings above pasted into `Info.plist`
- [ ] Deep-link intent filter + `CFBundleURLSchemes` entries added
- [ ] Push credentials uploaded (APNs `.p8` key, FCM `google-services.json`)
- [ ] `bun run build && bunx cap sync` finishes clean
- [ ] Smoke-test on a physical device via TestFlight / Internal Testing
- [ ] Offline banner appears when device is put in airplane mode
- [ ] Deep link `zombierex://post/<id>` opens the correct route
