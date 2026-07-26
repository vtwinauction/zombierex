import type { CapacitorConfig } from "@capacitor/cli";

/**
 * ZOMBIEREX — native shell configuration.
 *
 * The web app remains the source of truth. Capacitor loads the built
 * static bundle from `dist/` into a WKWebView / Android WebView and
 * layers native APIs on top via `src/lib/native`.
 *
 * Bundle IDs are provisional; swap `com.zombierex.app` for the real
 * App Store / Play Console identifiers before submission.
 */
const config: CapacitorConfig = {
  appId: "com.zombierex.app",
  appName: "ZOMBIEREX",
  webDir: "dist",
  bundledWebRuntime: false,

  // Deep-link / OAuth return scheme. Also declare in
  // ios/App/App/Info.plist (CFBundleURLSchemes) and
  // android/app/src/main/AndroidManifest.xml (<intent-filter>).
  server: {
    androidScheme: "https",
    // For dev-on-device against the Lovable preview, override with:
    //   url: "https://id-preview--<project>.lovable.app",
    //   cleartext: false,
  },

  ios: {
    contentInset: "always",
    limitsNavigationsToAppBoundDomains: true,
    scheme: "ZOMBIEREX",
  },

  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: false, // we hide it in bootstrap() once React commits
      backgroundColor: "#08090b",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      overlaysWebView: false,
      style: "DARK",
      backgroundColor: "#08090b",
    },
    Keyboard: {
      resize: "native",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
