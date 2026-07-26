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

## 6. Permissions

Add usage strings before shipping. iOS `Info.plist`:

- `NSCameraUsageDescription`
- `NSPhotoLibraryUsageDescription`
- `NSLocationWhenInUseUsageDescription`
- `NSLocationAlwaysAndWhenInUseUsageDescription` (Atlas group ride)
- `NSMicrophoneUsageDescription` (Reels)

Android `AndroidManifest.xml` already gets these from installed plugins;
add `ACCESS_BACKGROUND_LOCATION` manually if group ride runs backgrounded.

## 7. Release checklist

- [ ] Real bundle ID + Team ID configured
- [ ] Icons + splash generated
- [ ] Permission strings written
- [ ] Deep-link intent filter + Info.plist entries added
- [ ] Push credentials uploaded (APNs key, FCM `google-services.json`)
- [ ] `bun run build && bunx cap sync` clean
- [ ] TestFlight / Internal Testing build validated on physical device
