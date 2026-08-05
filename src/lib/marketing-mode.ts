import { useSyncExternalStore } from "react";

/**
 * Tracks whether a public marketing page is mounted, so the app shell
 * (bottom nav, pull-to-refresh, banners) can step out of the way.
 */
let active = false;
const listeners = new Set<() => void>();

export function setMarketingMode(next: boolean) {
  const changed = active !== next;
  active = next;
  // A marketing component can identify itself during render so the shell
  // never flashes app chrome. Notify subscribers in the next microtask to
  // avoid updating the root while a child render is still in progress.
  // Notify even when the value is unchanged: the render-time notification
  // can run before the root subscription is committed, while the effect-time
  // call happens after it and must be allowed to resynchronise the shell.
  if (!changed && listeners.size === 0) return;
  queueMicrotask(() => listeners.forEach((l) => l()));
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useMarketingMode() {
  return useSyncExternalStore(
    subscribe,
    () => active,
    () => false,
  );
}

/**
 * Public marketing surfaces, known synchronously from the URL so the app
 * chrome (status bar, bottom nav) never flashes over the website.
 * "/" is excluded — signed-in members get their feed there.
 */
const MARKETING_PREFIXES = ["/guide", "/download", "/contact", "/legal", "/features"];

export function isMarketingPath(pathname: string): boolean {
  return MARKETING_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
