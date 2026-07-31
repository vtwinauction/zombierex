import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, lazy, Suspense, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { installCrashReporter, reportCrash } from "../lib/crash-reporter";
import { BottomNav } from "@/components/BottomNav";
import { useMarketingMode } from "@/lib/marketing-mode";
import { OwnerBroadcastBanner } from "@/components/OwnerBroadcastBanner";
import { MaintenanceGate } from "@/components/MaintenanceGate";
import { GlobalStatusBar } from "@/components/GlobalStatusBar";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PullToRefresh } from "@/components/PullToRefresh";
import { installAnalytics, track } from "@/lib/analytics";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmHost } from "@/lib/confirm";

// Lazy-loaded non-critical shell add-ons — not needed for first paint.
const PushNotificationBridge = lazy(() =>
  import("@/components/PushNotificationBridge").then((m) => ({ default: m.PushNotificationBridge })),
);
const PushPrimer = lazy(() =>
  import("@/components/PushPrimer").then((m) => ({ default: m.PushPrimer })),
);
const AppLockGate = lazy(() =>
  import("@/components/AppLockGate").then((m) => ({ default: m.AppLockGate })),
);
const FirstRunTour = lazy(() =>
  import("@/components/FirstRunTour").then((m) => ({ default: m.FirstRunTour })),
);

import { useScrollDirection } from "@/hooks/useScrollDirection";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="card-surface max-w-md p-8 text-center">
        <p className="mono-tag" style={{ color: "var(--color-heat)" }}>ERR·404 · SIGNAL LOST</p>
        <h1 className="mt-3 text-4xl display-xl">OFF THE MAP</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--color-ash)" }}>This coordinate returns nothing.</p>
        <Link to="/" className="btn-solid mt-6 inline-flex">Return home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
    void reportCrash(error, { mechanism: "react_error_boundary", context: { boundary: "root" } });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="card-surface max-w-md p-8 text-center">
        <p className="mono-tag" style={{ color: "var(--color-heat)" }}>ERR·500 · SYSTEM FAULT</p>
        <h1 className="mt-3 text-4xl display-xl">BACKFIRE</h1>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="btn-solid">Retry</button>
          <a href="/" className="btn-ghost">Home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#08090b" },
      { title: "ZOMBIEREX — Precision social for riders & drivers" },
      { name: "description", content: "The premium social platform engineered for motorcycle and automotive culture. Short-form video, garage, marketplace, events." },
      { name: "author", content: "ZOMBIEREX" },
      { property: "og:site_name", content: "ZOMBIEREX" },
      { property: "og:title", content: "ZOMBIEREX — Ride. Rev. Resurrect." },
      { property: "og:description", content: "Precision social for motorcycle & automotive culture." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@zombierex" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500;600&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const scrollDir = useScrollDirection(12);
  const [isTop, setIsTop] = useState(true);
  const [shellReady, setShellReady] = useState(false);
  const pathname = router.state.location.pathname;
  const marketing = useMarketingMode();
  const isImmersive = marketing || pathname.startsWith("/atlas/cockpit") || pathname.startsWith("/drag/race") || pathname === "/reels" || pathname.startsWith("/reels/");

  useEffect(() => {
    const onScroll = () => setIsTop(window.scrollY < 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // Defer non-critical shell add-ons until the browser is idle, keeping
    // their chunks out of the first-paint critical path.
    const w = window as unknown as { requestIdleCallback?: (cb: () => void) => number };
    if (typeof w.requestIdleCallback === "function") {
      w.requestIdleCallback(() => setShellReady(true));
      return;
    }
    const t = window.setTimeout(() => setShellReady(true), 400);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (!import.meta.env.PROD) return;
    let reloaded = false;
    const activate = (reg: ServiceWorkerRegistration) => {
      const w = reg.waiting;
      if (!w) return;
      try { w.postMessage({ type: "PURGE_CACHES" }); } catch { /* ignore */ }
      try { w.postMessage({ type: "SKIP_WAITING" }); } catch { /* ignore */ }
    };
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      if (reg.waiting) activate(reg);
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) activate(reg);
        });
      });
      // Poll for new versions every 30 minutes while app is open
      setInterval(() => { reg.update().catch(() => {}); }, 30 * 60 * 1000);
    }).catch(() => {});
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  }, []);

  // Wire global crash reporter — installs window error + unhandledrejection
  // listeners and forwards throttled, deduped reports to crash_reports.
  useEffect(() => {
    installCrashReporter();
    installAnalytics();
    // Apply saved appearance prefs (language/dir, large text)
    try {
      const raw = localStorage.getItem("zombierex.prefs.v1");
      if (raw) {
        const p = JSON.parse(raw) as { language?: string; largeText?: boolean; theme?: string };
        if (p.language) {
          document.documentElement.lang = p.language;
          document.documentElement.dir = p.language === "ar" ? "rtl" : "ltr";
        }
        if (p.largeText) document.documentElement.classList.add("text-large");
        if (p.theme) document.documentElement.dataset.theme = p.theme;
      }
    } catch { /* ignore */ }
  }, []);


  // Fire screen_view on every pathname change.
  useEffect(() => {
    track("screen_view", { path: pathname });
  }, [pathname]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  // Native shell bootstrap — no-op on web; hides splash, themes status
  // bar, wires Android back button, exposes keyboard height on native.
  useEffect(() => {
    let cancelled = false;
    void import("@/lib/native/bootstrap").then((m) => {
      if (!cancelled) void m.bootstrapNative(router);
    });
    return () => { cancelled = true; };
  }, [router]);

  // Refresh live data whenever the app returns to the foreground
  // (native `zx:appstate` from bootstrap, plus web visibility change).
  useEffect(() => {
    let lastRefresh = Date.now();
    const refresh = () => {
      if (Date.now() - lastRefresh < 5_000) return; // debounce
      lastRefresh = Date.now();
      queryClient.invalidateQueries();
    };
    const onAppState = (e: Event) => {
      const detail = (e as CustomEvent<{ isActive?: boolean }>).detail;
      if (detail?.isActive) refresh();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("zx:appstate", onAppState as EventListener);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("zx:appstate", onAppState as EventListener);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [queryClient]);

  // Hide while scrolling down; always visible at the top of the page.
  const navHidden = !isTop && scrollDir === "down";

  // Global pull-to-refresh — revalidates route loaders + all queries.
  // Pages with their own PullToRefresh claim the gesture first (nested guard).
  const globalRefresh = async () => {
    await Promise.all([router.invalidate(), queryClient.invalidateQueries()]);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="relative min-h-[100svh] bg-background text-foreground">
        <main className={isImmersive ? "min-h-[100svh]" : "min-h-[100svh] pb-[calc(64px+env(safe-area-inset-bottom))]"}>
          {!isImmersive && <OfflineBanner />}
          {!isImmersive && <OwnerBroadcastBanner />}
          {!isImmersive && <GlobalStatusBar />}
          <PullToRefresh onRefresh={globalRefresh} disabled={isImmersive}>
            <MaintenanceGate>
              <Outlet />
            </MaintenanceGate>
          </PullToRefresh>
        </main>
        {!isImmersive && <BottomNav hidden={navHidden} />}
        {shellReady && (
          <Suspense fallback={null}>
            <PushNotificationBridge />
            <PushPrimer />
            <AppLockGate />
            <FirstRunTour />
          </Suspense>
        )}
        <Toaster position="top-center" richColors closeButton />
        <ConfirmHost />
      </div>

    </QueryClientProvider>
  );
}
