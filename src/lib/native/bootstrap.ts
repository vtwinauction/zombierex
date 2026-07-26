/**
 * Native shell bootstrap — call once from the root component's useEffect.
 * Safe on web (all calls no-op through isNative() guards).
 *
 * Responsibilities:
 *  - Hide the launch splash screen once React has committed.
 *  - Theme the native status bar to match the app.
 *  - Wire Android hardware back-button to the TanStack router history.
 *  - Fire app-lifecycle callbacks (foreground/background) so we can pause
 *    speech synthesis, GPS, etc.
 *  - Handle keyboard show/hide by exposing a CSS var for content padding.
 */
import type { Router } from "@tanstack/react-router";
import { isNative, platform } from "./index";

let started = false;

export async function bootstrapNative(router: Router<any, any>) {
  if (started) return;
  started = true;

  if (!isNative()) return;

  // Splash screen — hide once we're ready to paint.
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 250 });
  } catch { /* ignore */ }

  // Status bar theming (matches --color-background in styles.css).
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    if (platform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#08090b" });
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
  } catch { /* ignore */ }

  // Android back button — pop router history, or exit at the root.
  try {
    const { App } = await import("@capacitor/app");
    await App.addListener("backButton", async () => {
      if (window.history.length > 1) {
        router.history.back();
      } else {
        try { await App.exitApp(); } catch { /* ignore */ }
      }
    });

    // Foreground / background — pause anything expensive.
    await App.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) {
        try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
      }
      window.dispatchEvent(new CustomEvent("zx:appstate", { detail: { isActive } }));
    });
  } catch { /* ignore */ }

  // Keyboard — expose height as a CSS var so composers can lift above it.
  try {
    const { Keyboard } = await import("@capacitor/keyboard");
    await Keyboard.addListener("keyboardWillShow", (info) => {
      document.documentElement.style.setProperty("--kb-h", `${info.keyboardHeight}px`);
      document.documentElement.classList.add("kb-open");
    });
    await Keyboard.addListener("keyboardWillHide", () => {
      document.documentElement.style.setProperty("--kb-h", "0px");
      document.documentElement.classList.remove("kb-open");
    });
  } catch { /* ignore */ }
}
