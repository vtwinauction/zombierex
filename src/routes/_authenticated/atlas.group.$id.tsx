/**
 * Live Group Ride view — map with every member's live position, chat via realtime pings.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Copy, Radio, LogOut, Square, Users, Share2 } from "lucide-react";
import { toast } from "sonner";
import { confirmDialog } from "@/lib/confirm";
import { supabase } from "@/integrations/supabase/client";
import {
  getGroupRide, sendGroupPing, leaveGroupRide, endGroupRide,
} from "@/lib/group-rides.functions";

const RouteMap = lazy(() => import("@/components/RouteMap"));

export const Route = createFileRoute("/_authenticated/atlas/group/$id")({
  head: () => ({
    meta: [
      { title: "Live Ride · ZOMBIEREX" },
      { name: "description", content: "Follow your riding group live on the map." },
    ],
  }),
  component: GroupLive,
});

type Ping = { user_id: string; lat: number; lng: number; speed_kmh?: number | null; heading?: number | null; battery?: number | null; created_at: string };

function GroupLive() {
  const nav = useNavigate();
  const { id } = Route.useParams();
  const getFn = useServerFn(getGroupRide);
  const pingFn = useServerFn(sendGroupPing);
  const leaveFn = useServerFn(leaveGroupRide);
  const endFn = useServerFn(endGroupRide);

  const [me, setMe] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const q = useQuery({ queryKey: ["group-ride", id], queryFn: () => getFn({ data: { id } }), refetchInterval: 15_000 });
  const ride = q.data?.ride;
  const members = q.data?.members ?? [];

  const [pings, setPings] = useState<Record<string, Ping>>({});
  useEffect(() => {
    if (q.data?.latest) setPings((prev) => ({ ...prev, ...q.data.latest }));
  }, [q.data]);

  // Realtime subscription for new pings
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`group_ride_${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_ride_pings", filter: `group_ride_id=eq.${id}` },
        (payload) => {
          const p = payload.new as Ping;
          setPings((prev) => ({ ...prev, [p.user_id]: p }));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  // GPS ping loop while ride is active
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!ride || ride.status !== "active" || typeof navigator === "undefined" || !navigator.geolocation) return;
    let lastSent = 0;
    const watchId = navigator.geolocation.watchPosition(
      async (p) => {
        const lat = p.coords.latitude;
        const lng = p.coords.longitude;
        setMyPos({ lat, lng });
        const now = Date.now();
        if (now - lastSent < 8000) return; // 8s throttle
        lastSent = now;
        try {
          await pingFn({
            data: {
              group_ride_id: id,
              lat, lng,
              speed_kmh: p.coords.speed != null ? Math.max(0, p.coords.speed * 3.6) : null,
              heading: p.coords.heading != null ? Math.round(p.coords.heading) : null,
              battery: null,
            },
          });
        } catch { /* offline is fine */ }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [id, ride?.status, pingFn]);

  const isHost = me && ride?.host_id === me;

  const mapPois = useMemo(() => {
    return Object.values(pings).map((p) => {
      const m = members.find((x: any) => x.user_id === p.user_id);
      const name = m?.profiles?.display_name || m?.profiles?.username || "Rider";
      const isSelf = p.user_id === me;
      return { lat: p.lat, lng: p.lng, name: isSelf ? `You · ${Math.round(p.speed_kmh ?? 0)} km/h` : `${name} · ${Math.round(p.speed_kmh ?? 0)} km/h`, kind: isSelf ? "self" : "rider" };
    });
  }, [pings, members, me]);

  const center = useMemo(() => {
    if (myPos) return myPos;
    const any = Object.values(pings)[0];
    if (any) return { lat: any.lat, lng: any.lng };
    return ride?.meet_lat && ride?.meet_lng ? { lat: ride.meet_lat, lng: ride.meet_lng } : undefined;
  }, [myPos, pings, ride]);

  async function copyCode() {
    if (!ride) return;
    try {
      await navigator.clipboard.writeText(ride.join_code);
      toast.success("Code copied");
    } catch {}
  }
  async function shareLink() {
    if (!ride) return;
    const url = `${location.origin}/atlas/group?code=${ride.join_code}`;
    try {
      const { share: nativeShare } = await import("@/lib/native");
      const res = await nativeShare({ title: ride.title, text: `Join my ride: ${ride.join_code}`, url, dialogTitle: "Share ride" });
      if (!res.ok) { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch {}
  }
  async function onLeave() {
    await leaveFn({ data: { group_ride_id: id } });
    nav({ to: "/atlas/group" });
  }
  async function onEnd() {
    if (!(await confirmDialog({ title: "End this ride for everyone?", destructive: true, confirmLabel: "End ride" }))) return;
    try {
      await endFn({ data: { group_ride_id: id } });
      toast.success("Ride ended");
      q.refetch();
    } catch (e: any) { toast.error(e.message ?? "Could not end ride"); }
  }

  if (q.isLoading) return <div className="grid min-h-svh place-items-center text-sm text-ink-3">Loading ride…</div>;
  if (!ride) return <div className="grid min-h-svh place-items-center text-sm text-ink-3">Ride not found.</div>;

  return (
    <div className="relative min-h-svh">
      {/* Map */}
      <div className="fixed inset-0">
        <Suspense fallback={<div className="h-full w-full bg-paper-2" />}>
          <RouteMap
            pois={mapPois}
            center={center}
            zoom={13}
            interactive
            className="h-full w-full"
            theme="light"
            userLocation={myPos}
          />
        </Suspense>
      </div>

      {/* Top card */}
      <div className="absolute left-3 right-3 top-3 z-10 rounded-2xl border border-line bg-paper-0/95 p-3 shadow-lg backdrop-blur">
        <div className="flex items-center gap-2">
          <Link to="/atlas/group" className="tap grid h-8 w-8 place-items-center rounded-full bg-paper-2">
            <ArrowLeft size={16} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="truncate text-sm font-semibold" style={{ color: "var(--color-ink-0)" }}>{ride.title}</div>
            <div className="flex items-center gap-1.5 text-[11px] text-ink-3">
              <Radio size={10} className={ride.status === "active" ? "text-neon-deep" : ""} />
              {ride.status === "active" ? "Live" : "Ended"} · {members.length} rider{members.length === 1 ? "" : "s"}
            </div>
          </div>
          <button onClick={copyCode} className="tap flex items-center gap-1 rounded-full border border-line bg-paper-1 px-2.5 py-1 text-[11px] font-bold"
            style={{ fontFamily: "var(--font-mono)", color: "var(--color-ink-0)" }}>
            {ride.join_code}
            <Copy size={11} />
          </button>
          <button onClick={shareLink} className="tap grid h-8 w-8 place-items-center rounded-full bg-paper-2">
            <Share2 size={14} />
          </button>
        </div>
      </div>

      {/* Bottom sheet: members */}
      <div className="absolute inset-x-0 bottom-0 z-10 rounded-t-2xl border-t border-line bg-paper-0/95 p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
        <div className="mb-2 flex items-center gap-2">
          <Users size={14} className="text-ink-3" />
          <span className="mono-caps text-[10px] font-bold tracking-wider text-ink-3">RIDERS</span>
        </div>
        <ul className="max-h-40 space-y-1.5 overflow-y-auto">
          {members.map((m: any) => {
            const p = pings[m.user_id];
            const stale = p ? Date.now() - new Date(p.created_at).getTime() > 60_000 : true;
            return (
              <li key={m.user_id} className="flex items-center gap-2.5 rounded-lg bg-paper-1 px-2 py-1.5">
                <span className={`h-2 w-2 rounded-full`} style={{ background: p && !stale ? "var(--color-neon)" : "var(--color-ink-4)" }} />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-xs font-semibold" style={{ color: "var(--color-ink-0)" }}>
                    {m.profiles?.display_name || m.profiles?.username || "Rider"}
                    {m.role === "host" && <span className="ml-1 text-[9px] text-ink-3">· host</span>}
                    {m.user_id === me && <span className="ml-1 text-[9px] text-neon-deep">· you</span>}
                  </div>
                  <div className="text-[10px] text-ink-3" style={{ fontFamily: "var(--font-mono)" }}>
                    {p ? `${Math.round(p.speed_kmh ?? 0)} km/h · ${relTime(p.created_at)}` : "No signal yet"}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex gap-2">
          {isHost && ride.status === "active" ? (
            <button onClick={onEnd} className="tap flex-1 rounded-xl border border-line bg-paper-2 py-2.5 text-sm font-bold"
              style={{ color: "var(--color-ember)" }}>
              <Square size={14} className="mr-1 inline" /> End ride
            </button>
          ) : (
            <button onClick={onLeave} className="tap flex-1 rounded-xl border border-line bg-paper-2 py-2.5 text-sm font-bold"
              style={{ color: "var(--color-ink-0)" }}>
              <LogOut size={14} className="mr-1 inline" /> Leave
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function relTime(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 15) return "now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
