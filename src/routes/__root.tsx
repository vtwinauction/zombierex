import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { BottomNav } from "@/components/BottomNav";
import { OwnerBroadcastBanner } from "@/components/OwnerBroadcastBanner";
import { GlobalStatusBar } from "@/components/GlobalStatusBar";
import { OfflineBanner } from "@/components/OfflineBanner";

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
  const pathname = router.state.location.pathname;
  const isImmersive = pathname.startsWith("/atlas/cockpit") || pathname.startsWith("/drag/race") || pathname === "/reels" || pathname.startsWith("/reels/");

  useEffect(() => {
    const onScroll = () => setIsTop(window.scrollY < 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (!import.meta.env.PROD) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

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

  // Hide while scrolling down; always visible at the top of the page.
  const navHidden = !isTop && scrollDir === "down";

  return (
    <QueryClientProvider client={queryClient}>
      <div className="relative min-h-[100svh] bg-background text-foreground">
        <main className={isImmersive ? "min-h-[100svh]" : "min-h-[100svh] pb-[calc(64px+env(safe-area-inset-bottom))]"}>
          {!isImmersive && <OwnerBroadcastBanner />}
          {!isImmersive && <GlobalStatusBar />}
          <Outlet />
        </main>
        {!isImmersive && <BottomNav hidden={navHidden} />}
      </div>

    </QueryClientProvider>
  );
}
