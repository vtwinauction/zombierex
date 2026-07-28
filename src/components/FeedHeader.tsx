import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import brandLogo from "@/assets/zombierex-logo.png.asset.json";
import { IconLens, IconEnginePulse, IconGauge } from "./icons/RexIcons";
import { ShoppingCart } from "lucide-react";
import { getInboxCounts } from "@/lib/inbox.functions";
import { supabase } from "@/integrations/supabase/client";

export function FeedHeader({ dark = false }: { dark?: boolean }) {
  const cls = dark ? "text-white" : "";
  const iconStyle = dark
    ? { background: "rgba(255,255,255,0.10)", color: "#fff", border: "1px solid rgba(255,255,255,0.14)" }
    : { background: "rgba(255,255,255,0.85)", color: "var(--color-matte)", border: "1px solid var(--color-hair)" };

  const chip = "tap grid h-9 w-9 place-items-center backdrop-blur-md relative";
  const clip = {
    clipPath:
      "polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)",
  };

  const qc = useQueryClient();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setSignedIn(!!data.user);
      setUid(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSignedIn(!!s?.user);
      setUid(s?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const fetchCounts = useServerFn(getInboxCounts);
  const counts = useQuery({
    queryKey: ["inbox-counts"],
    queryFn: () => fetchCounts({}) as Promise<{ notifications: number; messages: number }>,
    enabled: !!signedIn,
    staleTime: 20_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  // Realtime bump — new notification for me OR new message in any of my channels
  useEffect(() => {
    if (!uid) return;
    const bump = () => qc.invalidateQueries({ queryKey: ["inbox-counts"] });
    const ch = supabase.channel(`inbox-${uid}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
        bump,
      )
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: any) => { if (payload?.new?.sender_id !== uid) bump(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid, qc]);

  const notif = counts.data?.notifications ?? 0;
  const dm = counts.data?.messages ?? 0;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 flex items-center justify-between px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)] ${cls}`}
    >
      <div className="flex items-center gap-2">
        <div
          className="grid h-8 w-8 place-items-center overflow-hidden"
          style={{
            clipPath: "polygon(5px 0, calc(100% - 5px) 0, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px), 0 5px)",
            background: "#0e0f11",
            boxShadow: dark ? "0 0 0 1px rgba(255,255,255,0.15)" : "0 0 0 1px var(--color-hair)",
          }}
        >
          <img src={brandLogo.url} alt="ZOMBIEREX" className="h-full w-full object-cover" />
        </div>
        <div className="leading-tight">
          <p className={`font-display text-[15px] font-bold tracking-tight ${dark ? "text-white" : ""}`} style={dark ? {} : { color: "var(--color-matte)" }}>
            ZOMBIEREX
          </p>
          <p className="mono-tag" style={{ color: dark ? "rgba(255,255,255,0.65)" : "var(--color-titanium)", fontSize: 9, letterSpacing: "0.14em" }}>
            FOR·YOU · FOLLOWING · NEARBY
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link to="/search" className={chip} style={{ ...clip, ...iconStyle }} aria-label="Discover">
          <IconLens size={16} />
        </Link>
        <Link to="/cart" className={chip} style={{ ...clip, ...iconStyle }} aria-label="Cart">
          <ShoppingCart size={16} strokeWidth={1.75} />
        </Link>
        <Link to="/notifications" className={chip} style={{ ...clip, ...iconStyle }} aria-label={`Notifications${notif ? `, ${notif} unread` : ""}`}>
          <IconEnginePulse size={16} />
          {notif > 0 && <Badge count={notif} />}
        </Link>
        <Link to="/messages" className={chip} style={{ ...clip, ...iconStyle }} aria-label={`Messages${dm ? `, ${dm} unread` : ""}`}>
          <IconGauge size={16} />
          {dm > 0 && <Badge count={dm} />}
        </Link>
      </div>
    </header>
  );
}

function Badge({ count }: { count: number }) {
  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      aria-hidden
      className="absolute -right-1 -top-1 grid min-w-[16px] h-[16px] place-items-center rounded-full px-1 mono-num text-[9px] font-bold leading-none"
      style={{
        background: "var(--color-neon, #00c853)",
        color: "#0a0f08",
        boxShadow: "0 0 6px rgba(0,200,83,0.55), 0 0 0 1.5px #ffffff",
      }}
    >
      {label}
    </span>
  );
}

