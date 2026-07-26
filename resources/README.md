# ZOMBIEREX — Native Brand Assets

Source images consumed by `@capacitor/assets` to generate every required
iOS and Android icon and launch-screen size.

## Files

| File          | Size        | Purpose                                          |
| ------------- | ----------- | ------------------------------------------------ |
| `icon.png`    | 1024×1024   | App icon — titanium "Z" monogram, neon-green edge glow, obsidian bg |
| `splash.png`  | 1536×1536   | Splash screen — centered brand mark, safe zone padding             |

Keep both PNGs opaque (no transparency), sRGB, and centered inside their
safe zone (~30% margin) so cropping to circular/rounded icons never
clips the mark.

## Regenerate all native icons and splashes

After swapping either file, run once from the project root:

```bash
bun run cap:assets
```

This writes to `ios/App/App/Assets.xcassets/` and
`android/app/src/main/res/`, replacing every density variant. The
background colour (`#08090b`) matches the app's obsidian surface and
the `SplashScreen` config in `capacitor.config.ts`.

If `ios/` or `android/` don't exist yet, first run:

```bash
bun run cap:add:ios
bun run cap:add:android
```

then `bun run cap:assets`.

## Design tokens (must stay in sync)

- Background: `#08090b` (obsidian)
- Accent: `#00c853` (neon green)
- Mark: CNC titanium "Z" with green edge glow

If these change, also update:
- `capacitor.config.ts` → `plugins.SplashScreen.backgroundColor`
- `package.json` → `cap:assets` script flags
