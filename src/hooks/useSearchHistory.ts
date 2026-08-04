import { useCallback, useEffect, useState } from "react";

const KEY = "zrex.search.recents.v1";
const MAX = 10;

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

function write(next: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next.slice(0, MAX)));
    window.dispatchEvent(new CustomEvent("zrex:search-recents-changed"));
  } catch {
    /* ignore */
  }
}

export function useSearchHistory() {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    setItems(read());
    const sync = () => setItems(read());
    window.addEventListener("zrex:search-recents-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("zrex:search-recents-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const push = useCallback((q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    const next = [
      trimmed,
      ...read().filter((s) => s.toLowerCase() !== trimmed.toLowerCase()),
    ].slice(0, MAX);
    write(next);
  }, []);

  const remove = useCallback((q: string) => {
    write(read().filter((s) => s !== q));
  }, []);

  const clear = useCallback(() => {
    write([]);
  }, []);

  return { items, push, remove, clear };
}
