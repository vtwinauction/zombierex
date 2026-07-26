import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { haptic } from "@/lib/native";

const KEY = "zrex.follows.v1";

function read(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function write(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(Array.from(set)));
    window.dispatchEvent(new CustomEvent("zrex:follows-changed"));
  } catch {
    /* ignore */
  }
}

export function useFollow(id: string, label?: string) {
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    setFollowing(read().has(id));
    const sync = () => setFollowing(read().has(id));
    window.addEventListener("zrex:follows-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("zrex:follows-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, [id]);

  const toggle = useCallback(
    (e?: { stopPropagation?: () => void; preventDefault?: () => void }) => {
      e?.stopPropagation?.();
      e?.preventDefault?.();
      const set = read();
      const next = !set.has(id);
      if (next) set.add(id);
      else set.delete(id);
      write(set);
      setFollowing(next);
      toast.success(next ? `Following ${label ?? "rider"}` : `Unfollowed ${label ?? "rider"}`);
    },
    [id, label],
  );

  return { following, toggle };
}
