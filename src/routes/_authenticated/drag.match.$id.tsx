/**
 * Drag Match — live head-to-head race between two real riders.
 *
 * Lobby → both riders mark READY → server stamps `green_at` → synchronized
 * countdown → live GPS streams into `drag_match_telemetry` → both lanes of
 * the HUD show a real rider (no AI ghost). Server finalises the winner.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getMatch,
  markMatchReady,
  pushMatchTelemetry,
  finalizeMatch,
} from "@/lib/drag-match.functions";
import { RaceHUD, type LaneTelemetry } from "@/components/RaceHUD";

export const Route = createFileRoute("/_authenticated/drag/match/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Live Drag Match · ZOMBIEREX` },
      {
        name: "description",
        content: `Live head-to-head drag race on ZOMBIEREX — match ${params.id}`,
      },
    ],
  }),
  component: MatchPage,
});

type Match = {
  id: string;
  rider_a: string;
  rider_b: string;
  status: "lobby" | "armed" | "countdown" | "live" | "finished" | "void";
  ready_a: boolean;
  ready_b: boolean;
  green_at: string | null;
  strip_mode: "eighth" | "quarter";
  tree_mode: "pro" | "sportsman";
  stake_xp: number;
  winner_id: string | null;
  margin_s: number | null;
  rider_a_profile: any;
  rider_b_profile: any;
  result_a: any;
  result_b: any;
};

type TelRow = {
  rider_id: string;
  t_ms: number;
  distance_m: number;
  speed_kmh: number;
  accuracy_m: number | null;
  lat?: number;
  lng?: number;
};


const LANE_A = "#00c853";
const LANE_B = "#f6d84f";

function MatchPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getMatch);
  const readyFn = useServerFn(markMatchReady);
  const pushFn = useServerFn(pushMatchTelemetry);
  const finalFn = useServerFn(finalizeMatch);

  const { data: matchRaw, refetch } = useQuery({
    queryKey: ["drag", "match", id],
    queryFn: () => getFn({ data: { id } }),
    refetchInterval: 5_000,
  });
  const match = matchRaw as Match | undefined;

  // Realtime match updates
  useEffect(() => {
    const ch = supabase
      .channel(`match:${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "drag_matches", filter: `id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["drag", "match", id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, qc]);

  // Live telemetry stream — both riders' points come in via realtime
  const [tel, setTel] = useState<TelRow[]>([]);
  useEffect(() => {
    setTel([]);
    if (!match) return;
    // Seed with historical rows so late joiners see the race so far
    supabase
      .from("drag_match_telemetry")
      .select("rider_id, t_ms, distance_m, speed_kmh, accuracy_m")
      .eq("match_id", id)
      .order("t_ms", { ascending: true })
      .limit(4000)
      .then(({ data }) => {
        if (data) setTel(data as any);
      });
    const ch = supabase
      .channel(`match-tel:${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "drag_match_telemetry",
          filter: `match_id=eq.${id}`,
        },
        (payload) => {
          setTel((prev) => [...prev, payload.new as TelRow]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, match?.id]);

  // Am I A or B?
  const meId = supabase.auth.getUser as unknown; // placeholder to satisfy TS
  const [meUid, setMeUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeUid(data.user?.id ?? null));
    void meId;
  }, []);
  const iAmA = !!meUid && match?.rider_a === meUid;
  const iAmB = !!meUid && match?.rider_b === meUid;
  const meReady = iAmA ? !!match?.ready_a : iAmB ? !!match?.ready_b : false;

  // GPS recording — activates when server stamps green_at
  const greenMs = match?.green_at ? new Date(match.green_at).getTime() : null;
  const watchRef = useRef<number | null>(null);
  const bufferRef = useRef<TelRow[]>([]);
  const lastPushRef = useRef<number>(0);
  const [liveKmh, setLiveKmh] = useState(0);
  const [gpsAcc, setGpsAcc] = useState<number | null>(null);
  const distRef = useRef<number>(0);
  const lastPtRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!greenMs || match?.status === "finished") return;
    if (!(iAmA || iAmB)) return;
    if (!("geolocation" in navigator)) return;

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = pos.timestamp;
        if (now < greenMs) return; // don't record before green
        const t_ms = now - greenMs;
        if (t_ms > 60_000) return;
        const spd = Math.max(0, (pos.coords.speed ?? 0) * 3.6);
        setLiveKmh(spd);
        setGpsAcc(pos.coords.accuracy ?? null);

        // Cumulative distance
        const pt = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (lastPtRef.current) distRef.current += haversine(lastPtRef.current, pt);
        lastPtRef.current = pt;

        bufferRef.current.push({
          rider_id: meUid!,
          t_ms,
          distance_m: distRef.current,
          speed_kmh: spd,
          accuracy_m: pos.coords.accuracy ?? null,
          lat: pt.lat,
          lng: pt.lng,
        });

        // Flush every 250ms
        const target = match?.strip_mode === "quarter" ? 402.336 : 201.168;
        if (now - lastPushRef.current > 250 && bufferRef.current.length) {
          const samples = bufferRef.current.splice(0);
          lastPushRef.current = now;
          pushFn({
            data: {
              match_id: id,
              // The server recomputes distance/speed from these GPS fixes.
              samples: samples
                .filter((s) => s.lat != null && s.lng != null)
                .map((s) => ({
                  t_ms: s.t_ms,
                  distance_m: Number(s.distance_m.toFixed(2)),
                  speed_kmh: Number(s.speed_kmh.toFixed(2)),
                  accuracy_m: s.accuracy_m ?? null,
                  lat: s.lat as number,
                  lng: s.lng as number,
                })),

            },
          }).catch(() => null);
        }


        if (distRef.current >= target) {
          finalFn({ data: { id } })
            .then(() => refetch())
            .catch(() => null);
        }
      },
      () => null,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10_000 },
    );

    return () => {
      if (watchRef.current != null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
      watchRef.current = null;
      bufferRef.current = [];
      lastPushRef.current = 0;
      distRef.current = 0;
      lastPtRef.current = null;
    };
  }, [greenMs, iAmA, iAmB, meUid, id, match?.strip_mode, match?.status, pushFn, finalFn, refetch]);

  // Build lane telemetry from streams
  const laneA = useMemo(
    () =>
      buildLane(
        match?.rider_a_profile,
        LANE_A,
        tel.filter((t) => t.rider_id === match?.rider_a),
      ),
    [match?.rider_a, match?.rider_a_profile, tel],
  );
  const laneB = useMemo(
    () =>
      buildLane(
        match?.rider_b_profile,
        LANE_B,
        tel.filter((t) => t.rider_id === match?.rider_b),
      ),
    [match?.rider_b, match?.rider_b_profile, tel],
  );

  // Sync countdown display
  const [countdown, setCountdown] = useState<number | null>(null);
  useEffect(() => {
    if (!greenMs || match?.status === "finished") {
      setCountdown(null);
      return;
    }
    const t = setInterval(() => {
      const remain = greenMs - Date.now();
      setCountdown(remain > -5000 ? remain : null);
    }, 100);
    return () => clearInterval(t);
  }, [greenMs, match?.status]);

  const ready = useMutation({
    mutationFn: (v: boolean) => readyFn({ data: { id, ready: v } }),
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () => refetch(),
  });

  if (!match) {
    return (
      <div className="min-h-svh p-6 text-sm" style={{ color: "var(--color-ink-3)" }}>
        Loading match…
      </div>
    );
  }

  const spectator = !iAmA && !iAmB;
  const finished = match.status === "finished";
  const green = greenMs != null && countdown != null && countdown <= 0;

  return (
    <div className="min-h-svh pb-24" style={{ background: "#050505" }}>
      <div className="px-4 pt-3 flex items-center justify-between">
        <Link
          to="/drag/challenge"
          className="tap mono-caps text-[10px]"
          style={{ color: "var(--color-silver)" }}
        >
          ← CHALLENGES
        </Link>
        <span className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 9 }}>
          {match.strip_mode === "quarter" ? "1/4 MI" : "1/8 MI"} · {match.tree_mode.toUpperCase()} ·
          STAKE {match.stake_xp}
        </span>
      </div>

      {/* Rider bar */}
      <div className="mx-4 mt-3 grid grid-cols-2 gap-3">
        <RiderPill p={match.rider_a_profile} color={LANE_A} ready={match.ready_a} you={iAmA} />
        <RiderPill p={match.rider_b_profile} color={LANE_B} ready={match.ready_b} you={iAmB} />
      </div>

      {/* Lobby / ready controls */}
      {!finished && !green && (
        <div
          className="mx-4 mt-4 rounded-2xl border p-4 text-center"
          style={{
            borderColor: "var(--color-hair-strong)",
            background: "linear-gradient(180deg,#0a0a0a,#141414)",
          }}
        >
          {countdown != null && countdown > 0 ? (
            <>
              <p
                className="mono-caps text-[10px] font-black"
                style={{ color: "#f6d84f", letterSpacing: "0.24em" }}
              >
                ◆ GREEN IN
              </p>
              <p className="mono-num text-6xl font-black tabular-nums" style={{ color: "#00c853" }}>
                {(countdown / 1000).toFixed(1)}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--color-ink-3)" }}>
                Both riders staged. Hold the line.
              </p>
            </>
          ) : (
            <>
              <p
                className="mono-caps text-[10px] font-black"
                style={{ color: "var(--color-silver)", letterSpacing: "0.24em" }}
              >
                ◆ LOBBY
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--color-ink)" }}>
                {match.ready_a && match.ready_b
                  ? "Locking in the green light…"
                  : "Waiting for both riders to be READY."}
              </p>
              {(iAmA || iAmB) && !spectator && (
                <button
                  disabled={ready.isPending}
                  onClick={() => ready.mutate(!meReady)}
                  className="tap mono-caps mt-3 text-[11px] font-black"
                  style={{
                    padding: "12px 20px",
                    background: meReady ? "#111" : "var(--color-neon)",
                    color: meReady ? "#f5f5f5" : "var(--color-obsidian)",
                    border: meReady ? "1px solid #333" : "none",
                  }}
                >
                  {meReady ? "◇ UN-READY" : "◆ I'M READY"}
                </button>
              )}
              {spectator && (
                <p className="mt-2 text-xs" style={{ color: "var(--color-ink-3)" }}>
                  Spectating this race.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Live HUD */}
      {(green || finished) && (
        <div className="mx-4 mt-4">
          <RaceHUD
            player={iAmB ? laneB : laneA}
            ghost={iAmB ? laneA : laneB}
            elapsedMs={greenMs ? Math.max(0, Date.now() - greenMs) : 0}
            finished={finished}
          />
        </div>
      )}

      {/* Finish */}
      {finished && (
        <div
          className="mx-4 mt-4 rounded-2xl border p-4 text-center"
          style={{
            borderColor: "rgba(0,200,83,0.4)",
            background: "linear-gradient(120deg,#050505,#0f2015)",
          }}
        >
          <p
            className="mono-caps text-[10px] font-black"
            style={{ color: "#00c853", letterSpacing: "0.24em" }}
          >
            ◆ RACE COMPLETE
          </p>
          {match.winner_id ? (
            <>
              <h2 className="serif mt-1 text-2xl" style={{ color: "#f5f5f5" }}>
                {match.winner_id === match.rider_a
                  ? match.rider_a_profile?.display_name || "Rider A"
                  : match.rider_b_profile?.display_name || "Rider B"}{" "}
                wins
              </h2>
              {match.margin_s != null && (
                <p className="mt-1 mono-num text-sm" style={{ color: "var(--color-silver)" }}>
                  Margin {Number(match.margin_s).toFixed(3)}s
                </p>
              )}
              {match.winner_id === meUid && (
                <p className="mt-2 text-sm" style={{ color: "#00c853" }}>
                  +{match.stake_xp} XP
                </p>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-3)" }}>
              No result — try again.
            </p>
          )}
          <button
            onClick={() => nav({ to: "/drag/challenge" })}
            className="tap mono-caps mt-4 text-[11px] font-black"
            style={{
              padding: "10px 16px",
              background: "var(--color-neon)",
              color: "var(--color-obsidian)",
            }}
          >
            NEW CHALLENGE
          </button>
        </div>
      )}

      {/* Live GPS status */}
      {(iAmA || iAmB) && green && !finished && (
        <div
          className="mx-4 mt-3 rounded-lg border p-2 text-center"
          style={{ borderColor: "var(--color-hair)", background: "#0a0a0a" }}
        >
          <span className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 9 }}>
            YOUR GPS · {liveKmh.toFixed(0)} km/h ·{" "}
            {gpsAcc != null ? `±${gpsAcc.toFixed(0)}m` : "acquiring"}
          </span>
        </div>
      )}
    </div>
  );
}

function RiderPill({
  p,
  color,
  ready,
  you,
}: {
  p: any;
  color: string;
  ready: boolean;
  you: boolean;
}) {
  return (
    <div
      className="rounded-xl border p-2 flex items-center gap-2"
      style={{
        borderColor: ready ? color : "var(--color-hair-strong)",
        background: "linear-gradient(180deg,#080808,#141414)",
        boxShadow: ready ? `0 0 18px ${color}44` : "none",
      }}
    >
      <div className="h-9 w-9 rounded-full overflow-hidden" style={{ background: "#222" }}>
        {p?.avatar_url && <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold truncate" style={{ color: "#f5f5f5" }}>
          {p?.display_name || p?.handle || "Rider"}
          {you && " · YOU"}
        </p>
        <p className="mono-tag" style={{ color, fontSize: 9, fontWeight: 800 }}>
          {ready ? "◆ READY" : "◇ WAITING"}
        </p>
      </div>
    </div>
  );
}

function buildLane(profile: any, color: string, rows: TelRow[]): LaneTelemetry {
  const last = rows[rows.length - 1];
  const peak = rows.reduce((m, r) => Math.max(m, Number(r.speed_kmh)), 0);
  return {
    name: profile?.display_name || profile?.handle || "Rider",
    color,
    kmh: last ? Number(last.speed_kmh) : 0,
    peakKmh: peak,
    distanceM: last ? Number(last.distance_m) : 0,
    reactionMs: null,
    splits: {},
    gpsAccuracyM: last?.accuracy_m ?? null,
    isGhost: false,
  };
}

// Haversine in meters
function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
