import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Broadcast = {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  expires_at: string | null;
  created_at: string;
};

const STORAGE_KEY = "zx-dismissed-broadcasts";

function readDismissed(): Set<string> {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function writeDismissed(s: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...s]));
  } catch {}
}

export function OwnerBroadcastBanner() {
  const [items, setItems] = useState<Broadcast[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => readDismissed());

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data } = await supabase
        .from("owner_broadcasts")
        .select("id,title,body,severity,expires_at,created_at")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(5);
      if (!alive) return;
      const now = Date.now();
      setItems(
        ((data as any[]) ?? []).filter((r) => !r.expires_at || Date.parse(r.expires_at) > now),
      );
    }
    load();
    const ch = supabase
      .channel(`owner_broadcasts_live-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "owner_broadcasts" }, load)
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, []);

  const visible = items.filter((i) => !dismissed.has(i.id));
  if (visible.length === 0) return null;

  function close(id: string) {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    writeDismissed(next);
  }

  return (
    <div className="w-full space-y-1 px-3 pt-2">
      {visible.map((b) => {
        const bg =
          b.severity === "critical"
            ? "rgba(220,38,38,0.14)"
            : b.severity === "warning"
              ? "rgba(234,179,8,0.14)"
              : "rgba(0,200,83,0.12)";
        const border =
          b.severity === "critical"
            ? "rgba(220,38,38,0.55)"
            : b.severity === "warning"
              ? "rgba(234,179,8,0.55)"
              : "rgba(0,200,83,0.45)";
        return (
          <div
            key={b.id}
            className="flex items-start gap-3 rounded-md px-3 py-2 text-[12px]"
            style={{ background: bg, border: `1px solid ${border}`, color: "var(--color-ink)" }}
          >
            <div className="flex-1">
              <p className="text-[10px] tracking-widest opacity-70">
                {b.severity.toUpperCase()} · OWNER BROADCAST
              </p>
              <p className="mt-0.5 font-semibold">{b.title}</p>
              <p className="mt-0.5 opacity-80">{b.body}</p>
            </div>
            <button
              onClick={() => close(b.id)}
              className="opacity-60 hover:opacity-100"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
