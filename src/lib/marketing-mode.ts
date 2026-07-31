import { useSyncExternalStore } from "react";

/**
 * Tracks whether a public marketing page is mounted, so the app shell
 * (bottom nav, pull-to-refresh, banners) can step out of the way.
 */
let active = false;
const listeners = new Set<() => void>();

export function setMarketingMode(next: boolean) {
  if (active === next) return;
  active = next;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useMarketingMode() {
  return useSyncExternalStore(subscribe, () => active, () => false);
}
