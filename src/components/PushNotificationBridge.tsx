import { useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";

type PushPayload = {
  title?: string;
  body?: string;
  data?: Record<string, unknown> & { url?: string; path?: string };
  notification?: {
    title?: string;
    body?: string;
    data?: Record<string, unknown> & { url?: string; path?: string };
  };
};

function extract(detail: unknown): { title: string; body: string; path?: string } {
  const p = (detail ?? {}) as PushPayload;
  const n = p.notification ?? {};
  const data = p.data ?? n.data ?? {};
  const rawPath = (data.path ?? data.url ?? "") as string;
  let path: string | undefined;
  if (rawPath) {
    try {
      // Accept absolute URLs and normalize to path
      const u = new URL(rawPath, window.location.origin);
      path = u.pathname + u.search + u.hash;
    } catch {
      path = rawPath.startsWith("/") ? rawPath : undefined;
    }
  }
  return {
    title: (p.title ?? n.title ?? "ZOMBIEREX") as string,
    body: (p.body ?? n.body ?? "") as string,
    path,
  };
}

/**
 * Bridges native push events (`zx:push`, `zx:push-tap`) to Sonner toasts
 * and router navigation. Mount once at the root.
 */
export function PushNotificationBridge() {
  const router = useRouter();

  useEffect(() => {
    const onReceived = (e: Event) => {
      const { title, body, path } = extract((e as CustomEvent).detail);
      toast(title, {
        description: body || undefined,
        action: path
          ? { label: "Open", onClick: () => router.navigate({ to: path }) }
          : undefined,
      });
    };

    const onTapped = (e: Event) => {
      const { path } = extract((e as CustomEvent).detail);
      if (path) router.navigate({ to: path });
    };

    window.addEventListener("zx:push", onReceived as EventListener);
    window.addEventListener("zx:push-tap", onTapped as EventListener);
    return () => {
      window.removeEventListener("zx:push", onReceived as EventListener);
      window.removeEventListener("zx:push-tap", onTapped as EventListener);
    };
  }, [router]);

  return null;
}
