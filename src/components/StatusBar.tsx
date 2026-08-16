import { Link, useRouter } from "@tanstack/react-router";
import { Bell, Search, Menu, Bluetooth, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CartIconLink } from "@/components/CartIconLink";
import { getInboxCounts } from "@/lib/inbox.functions";
import { getMyPreferences } from "@/lib/notifications.functions";
import { supabase } from "@/integrations/supabase/client";

/**
 * Editorial masthead — light glass, wordmark left, system actions right.
 * Section eyebrow (e.g. № 03 · ATLAS) sits under the wordmark.
 * Camera/Plus moved to the bottom-nav Create button.
 */
export function StatusBar({ index, section }: { index: string; section: string }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUid(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const fetchCounts = useServerFn(getInboxCounts);
  const fetchPrefs = useServerFn(getMyPreferences);
  const counts = useQuery({
    queryKey: ["inbox-counts"],
    queryFn: () => fetchCounts({}) as Promise<{ notifications: number; messages: number }>,
    enabled: !!uid,
    staleTime: 20_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const prefsQ = useQuery({
    queryKey: ["notifications", "preferences", "mine"],
    queryFn: async () => await fetchPrefs(),
    enabled: !!uid,
    staleTime: 60_000,
  });

  // Keep latest prefs/router in refs so the realtime effect only re-runs when
  // the user changes. Re-subscribing on every prefs change reused the same
  // channel topic and threw "cannot add postgres_changes callbacks after
  // subscribe()", which crashed the whole page via the error boundary.
  const prefsRef = useRef<Record<string, any>>({});
  prefsRef.current = (prefsQ.data ?? {}) as Record<string, any>;
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    if (!uid) return;
    const bump = () => qc.invalidateQueries({ queryKey: ["inbox-counts"] });
    const ch = supabase
      .channel(`statusbar-inbox-${uid}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
        (payload: any) => {
          bump();
          const r = routerRef.current;
          const path = r.state.location.pathname;
          if (path.startsWith("/notifications")) return;
          const row = payload?.new ?? {};
          if (!kindAllowed(row.kind, prefsRef.current)) return;
          const p = (row.payload ?? {}) as Record<string, unknown>;
          const actor = (p.actor_handle as string) || (p.actor_name as string) || "Someone";
          const verb = (p.text as string) || labelForKind(row.kind);
          toast(`@${actor} ${verb}`, {
            action: { label: "View", onClick: () => r.navigate({ to: "/notifications" }) },
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [uid, qc]);

  const notif = counts.data?.notifications ?? 0;

  return (
    <header
      className="sticky top-0 z-40"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        background: "var(--color-bone, #ffffff)",
        borderBottom: "1px solid var(--color-line)",
      }}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 overflow-hidden px-4 py-3">
        <Link to="/" className="tap flex min-w-0 flex-col leading-none">

          <span
            className="serif truncate text-[20px]"
            style={{
              color: "var(--color-ink-0)",
              letterSpacing: "-0.03em",
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            ZOMBIEREX
          </span>
          <span
            className="mono-tag mt-1.5 truncate"
            style={{
              fontSize: 9,
              letterSpacing: "0.28em",
              color: "var(--color-ink-1, #2a2a2a)",
              fontWeight: 600,
            }}
          >
            № {index} · {friendlyLabel(section)}
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-0.5">
          <BluetoothCell />
          <ActionCell to="/post/new" label="New post">
            <Plus size={19} strokeWidth={2} />
          </ActionCell>
          <ActionCell to="/search" label="Search">
            <Search size={17} strokeWidth={1.8} />
          </ActionCell>
          <CartIconLink />
          <ActionCell
            to="/notifications"
            label={`Notifications${notif ? `, ${notif} unread` : ""}`}
            badge={notif}
          >
            <Bell size={17} strokeWidth={1.8} />
          </ActionCell>
          <ActionCell to="/menu" label="Menu">
            <Menu size={18} strokeWidth={1.9} />
          </ActionCell>
        </div>
      </div>
    </header>
  );
}

function ActionCell({
  to,
  label,
  children,
  badge,
}: {
  to: string;
  label: string;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="tap relative grid h-9 w-8 place-items-center sm:w-9"
      style={{ color: "var(--color-ink-0)", borderRadius: 10 }}
    >
      {children}
      {badge && badge > 0 ? (
        <span
          className="mono-num absolute -right-0.5 -top-0.5 grid min-w-[16px] place-items-center rounded-full px-1"
          style={{
            height: 16,
            fontSize: 9,
            fontWeight: 800,
            background: "var(--color-neon, #00c853)",
            color: "#0a0f08",
            boxShadow: "0 0 0 2px #fff",
            lineHeight: 1,
          }}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

/**
 * Bluetooth pairing button — connects to action cameras / helmet cams via
 * Web Bluetooth so riders can trigger capture from the app. Falls back
 * gracefully when the API isn't available (iOS Safari, desktop Firefox).
 */
function BluetoothCell() {
  const [state, setState] = useState<"idle" | "scanning" | "linked" | "unsupported">("idle");

  async function onPair() {
    const nav =
      typeof navigator !== "undefined"
        ? (navigator as Navigator & {
            bluetooth?: { requestDevice: (opts: unknown) => Promise<{ name?: string }> };
          })
        : undefined;
    if (!nav?.bluetooth) {
      setState("unsupported");
      window.setTimeout(() => setState("idle"), 1800);
      return;
    }
    try {
      setState("scanning");
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["battery_service", "device_information"],
      });
      if (device) {
        setState("linked");
        try {
          sessionStorage.setItem(
            "zrex:btcam",
            JSON.stringify({ name: device.name ?? "Camera", at: Date.now() }),
          );
        } catch {
          /* noop */
        }
      } else {
        setState("idle");
      }
    } catch {
      setState("idle");
    }
  }

  const linked = state === "linked";
  return (
    <button
      type="button"
      onClick={onPair}
      aria-label={linked ? "Camera linked via Bluetooth" : "Pair camera via Bluetooth"}
      title={
        state === "unsupported"
          ? "Bluetooth not supported on this device"
          : linked
            ? "Camera linked"
            : "Pair action camera"
      }
      className="tap relative grid h-9 w-8 place-items-center sm:w-9"
      style={{
        color: linked ? "var(--color-neon, #7cff3f)" : "var(--color-ink-0)",
        borderRadius: 10,
        background: linked ? "rgba(124,255,63,0.10)" : "transparent",
      }}
    >
      <Bluetooth
        size={17}
        strokeWidth={2}
        style={
          state === "scanning"
            ? { animation: "pulse 1.2s ease-in-out infinite", color: "var(--color-neon, #7cff3f)" }
            : linked
              ? { filter: "drop-shadow(0 0 5px rgba(124,255,63,0.75))" }
              : undefined
        }
      />
      {linked && (
        <span
          className="absolute right-1.5 top-1.5 h-[7px] w-[7px] rounded-full"
          style={{ background: "var(--color-neon, #7cff3f)", boxShadow: "0 0 0 2px #fff" }}
        />
      )}
    </button>
  );
}

function labelForKind(kind?: string): string {
  switch (kind) {
    case "like":
      return "liked your post";
    case "comment":
      return "commented on your post";
    case "follow":
      return "started following you";
    case "mention":
      return "mentioned you";
    case "message":
      return "sent you a message";
    case "marketplace":
      return "activity on your listing";
    case "booking":
      return "booking update";
    case "order":
      return "order update";
    case "event":
      return "event update";
    default:
      return "sent you a signal";
  }
}

function kindAllowed(kind: string | undefined, prefs: Record<string, any>): boolean {
  if (prefs?.push_enabled === false) return false;
  const map: Record<string, string> = {
    like: "likes",
    comment: "comments",
    follow: "follows",
    mention: "mentions",
    message: "messages",
    marketplace: "marketplace",
    booking: "bookings",
    order: "orders",
    vendor_update: "vendor_updates",
    subscription: "subscriptions",
    event: "events",
  };
  const key = kind ? map[kind] : undefined;
  if (!key) return true;
  return prefs?.[key] !== false;
}

function friendlyLabel(section: string) {
  const map: Record<string, string> = {
    "HOME · TRANSMISSION": "Home",
    "VAULT · MARKETPLACE": "Marketplace",
    "GARAGE · PROFILE": "Profile",
    "GARAGE · OPERATOR": "Profile",
    "SIGNAL · SEARCH": "Search",
    "OPS · EVENTS": "Events",
    "COMMS · MESSAGES": "Messages",
    "LOG · NOTIFICATIONS": "Notifications",
    "03 · ATLAS": "Atlas",
  };
  return map[section] ?? section;
}
