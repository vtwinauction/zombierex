/**
 * Drag Race Mode — immersive dual-lane GPS drag racing.
 *
 * Flow: setup → stage → Christmas Tree → live race with dual HUD vs AI ghost
 * → finish + time slip + AI analysis + replay.
 *
 * GPS is streamed via navigator.geolocation.watchPosition for live speed and
 * distance. The Christmas Tree sequence controls launch timing; a launch
 * before green flags a foul. Player telemetry is submitted after the race
 * for server-side verification (reuses submitDragRun).
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { DragTree } from "@/components/DragTree";
import { RaceHUD, type LaneTelemetry } from "@/components/RaceHUD";
import { useChristmasTree, type TreeMode } from "@/lib/christmas-tree";
import { Ghost, GHOST_PRESETS, type GhostPreset } from "@/lib/ghost-racer";
import { submitDragRun, coachDragRun } from "@/lib/drag.functions";
import { haptic } from "@/lib/native";

export const Route = createFileRoute("/_authenticated/drag/race")({
  head: () => ({
    meta: [
      { title: "Race Mode · Live GPS Drag · ZOMBIEREX" },
      { name: "description", content: "Immersive drag strip experience — Christmas Tree start, dual live HUD, AI ghost opponent and race analysis." },
      { property: "og:title", content: "Race Mode · Live GPS Drag · ZOMBIEREX" },
      { property: "og:description", content: "Christmas Tree start, dual live speedometer HUD, AI ghost opponent and race analysis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RacePage,
});

type Phase = "setup" | "stage" | "racing" | "finish";

// --- helpers -----------------------------------------------------------------

const R = 6371000;
const toRad = (d: number) => (d * Math.PI) / 180;
function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

type Point = { t_ms: number; lat: number; lng: number; speed_kmh: number; accuracy_m: number | null };
type StripMode = "gps" | "sim";

const SIM_BASE = { lat: 25.2048, lng: 55.2708 };

function simulatedPass(ms: number): { speedKmh: number; distanceM: number; point: Point } {
  const t = Math.max(0, ms / 1000);
  const vMax = 72;
  const k = 0.95;
  const speedMs = vMax * (1 - Math.exp(-k * t));
  const distanceM = Math.max(0, vMax * t + (vMax / k) * (Math.exp(-k * t) - 1));
  const lngMeters = 111_111 * Math.cos(toRad(SIM_BASE.lat));
  const lngOffset = distanceM / Math.max(1, lngMeters);

  return {
    speedKmh: speedMs * 3.6,
    distanceM,
    point: {
      t_ms: ms,
      lat: SIM_BASE.lat,
      lng: SIM_BASE.lng + lngOffset,
      speed_kmh: speedMs * 3.6,
      accuracy_m: 1,
    },
  };
}

function interpTimeAtDistance(points: Point[], target: number): { t: number; trap: number } | null {
  let cum = 0;
  for (let i = 1; i < points.length; i++) {
    const step = haversine(points[i - 1], points[i]);
    const next = cum + step;
    if (next >= target) {
      const frac = (target - cum) / Math.max(0.001, step);
      const t = (points[i - 1].t_ms + frac * (points[i].t_ms - points[i - 1].t_ms)) / 1000;
      const trap = points[i - 1].speed_kmh + frac * (points[i].speed_kmh - points[i - 1].speed_kmh);
      return { t, trap };
    }
    cum = next;
  }
  return null;
}

function interpTimeAtSpeed(points: Point[], targetKmh: number): number | null {
  for (let i = 1; i < points.length; i++) {
    if (points[i].speed_kmh >= targetKmh) {
      const a = points[i - 1], b = points[i];
      if (b.speed_kmh === a.speed_kmh) return b.t_ms / 1000;
      const frac = (targetKmh - a.speed_kmh) / (b.speed_kmh - a.speed_kmh);
      return (a.t_ms + frac * (b.t_ms - a.t_ms)) / 1000;
    }
  }
  return null;
}

// -----------------------------------------------------------------------------

function RacePage() {
  const nav = useNavigate();
  const [phase, setPhase] = useState<Phase>("setup");
  const [mode, setMode] = useState<TreeMode>("sportsman");
  const [preset, setPreset] = useState<GhostPreset>(GHOST_PRESETS[1]);
  const [vehicleName, setVehicleName] = useState("");
  const [vehicleKind, setVehicleKind] = useState<"motorcycle" | "car">("motorcycle");
  const [stripMode, setStripMode] = useState<StripMode>("gps");

  const tree = useChristmasTree(mode);
  const ghost = useMemo(() => new Ghost(preset), [preset]);

  // Live GPS state
  const watchRef = useRef<number | null>(null);
  const rawRef = useRef<Point[]>([]);
  const launchRef = useRef<{ t_ms: number; lat: number; lng: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  const [gpsKmh, setGpsKmh] = useState(0);
  const [gpsAcc, setGpsAcc] = useState<number | null>(null);
  const [gpsOk, setGpsOk] = useState<boolean>(true);
  const [playerTel, setPlayerTel] = useState<LaneTelemetry>(emptyLane("You", "#00c853"));
  const [ghostTel, setGhostTel] = useState<LaneTelemetry>(emptyLane(preset.label, "#f6d84f", true));
  const [elapsedMs, setElapsedMs] = useState(0);
  const [finish, setFinish] = useState<{ winner: "player" | "ghost" | "foul"; margin: number } | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [submitInfo, setSubmitInfo] = useState<{ id?: string; status?: string } | null>(null);

  const submit = useServerFn(submitDragRun);
  const coach = useServerFn(coachDragRun);

  // Refs mirroring reactive state for tight animation loop
  const treeRef = useRef(tree.state);
  useEffect(() => { treeRef.current = tree.state; }, [tree.state]);
  const launchStateRef = useRef<{ launchedAt: number | null; foul: boolean; greenAt: number | null }>({ launchedAt: null, foul: false, greenAt: null });
  useEffect(() => {
    launchStateRef.current = {
      launchedAt: tree.state.launchedAt,
      foul: tree.state.foul,
      greenAt: tree.state.greenAt,
    };
  }, [tree.state]);

  // Haptic pulses on tree phase changes (native on device, vibrate on web).
  const prevPhaseRef = useRef(tree.state.phase);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    const cur = tree.state.phase;
    if (cur !== prev) {
      if (cur === "amber1" || cur === "amber2" || cur === "amber3") void haptic("light");
      else if (cur === "green") void haptic("heavy");
      else if (cur === "foul") void haptic("error");
      else if (cur === "done") void haptic("success");
      prevPhaseRef.current = cur;
    }
  }, [tree.state.phase]);

  // --- GPS lifecycle ---------------------------------------------------------
  const startGps = useCallback(() => {
    if (stripMode === "sim") {
      setGpsOk(true);
      setGpsAcc(1);
      return;
    }
    if (!("geolocation" in navigator)) { setStripMode("sim"); setGpsOk(false); return; }
    if (watchRef.current != null) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const spd = Math.max(0, (pos.coords.speed ?? 0) * 3.6);
        const acc = pos.coords.accuracy ?? null;
        setGpsKmh(spd);
        setGpsAcc(acc);
        setGpsOk(acc == null ? true : acc < 30);

        const now = pos.timestamp || Date.now();
        // Launch detection: cross 6 km/h once armed
        if (launchRef.current == null) {
          if (spd > 6 && (treeRef.current.phase === "armed" || treeRef.current.phase === "amber1" || treeRef.current.phase === "amber2" || treeRef.current.phase === "amber3" || treeRef.current.phase === "green")) {
            launchRef.current = { t_ms: now, lat: pos.coords.latitude, lng: pos.coords.longitude };
            tree.reportLaunch();
          } else if (spd > 6 && (treeRef.current.phase === "prestage" || treeRef.current.phase === "stage")) {
            // pre-green movement = foul
            launchRef.current = { t_ms: now, lat: pos.coords.latitude, lng: pos.coords.longitude };
            tree.reportLaunch();
          }
        }

        if (launchRef.current != null) {
          const p: Point = {
            t_ms: now - launchRef.current.t_ms,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speed_kmh: spd,
            accuracy_m: acc,
          };
          rawRef.current.push(p);
        }
      },
      () => { setGpsOk(false); setStripMode("sim"); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );
  }, [stripMode, tree]);

  const stopGps = useCallback(() => {
    if (watchRef.current != null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchRef.current);
    }
    watchRef.current = null;
  }, []);

  useEffect(() => () => { stopGps(); if (rafRef.current) cancelAnimationFrame(rafRef.current); }, [stopGps]);

  // --- Animation / race loop -------------------------------------------------
  useEffect(() => {
    if (phase !== "stage" && phase !== "racing") return;
    let running = true;
    const loop = () => {
      if (!running) return;
      const st = launchStateRef.current;
      const now = performance.now();

      // Compute elapsed since GREEN
      const elapsed = st.greenAt != null ? now - st.greenAt : 0;
      setElapsedMs(Math.max(0, elapsed));

      if (stripMode === "sim" && st.greenAt != null) {
        const simMs = Math.max(0, now - st.greenAt - 180);
        if (simMs > 0) {
          if (st.launchedAt == null) tree.reportLaunch();
          const sim = simulatedPass(simMs);
          const last = rawRef.current[rawRef.current.length - 1];
          if (!last || sim.point.t_ms - last.t_ms >= 80) rawRef.current.push(sim.point);
          setGpsKmh(sim.speedKmh);
          setGpsAcc(1);
          setGpsOk(true);
        }
      }

      // Player telemetry from raw points
      const pts = rawRef.current;
      let dist = 0;
      let peak = 0;
      for (let i = 1; i < pts.length; i++) {
        dist += haversine(pts[i - 1], pts[i]);
        if (pts[i].speed_kmh > peak) peak = pts[i].speed_kmh;
      }
      const rt = st.launchedAt != null && st.greenAt != null ? st.launchedAt - st.greenAt : null;

      const s60 = interpTimeAtDistance(pts, 18.288);
      const s330 = interpTimeAtDistance(pts, 100.584);
      const s1000 = interpTimeAtDistance(pts, 304.8);
      const eighth = interpTimeAtDistance(pts, 201.168);
      const quarter = interpTimeAtDistance(pts, 402.336);

      setPlayerTel({
        name: vehicleName || "You",
        color: "#00c853",
        kmh: gpsKmh,
        peakKmh: Math.max(peak, gpsKmh),
        distanceM: dist,
        reactionMs: rt,
        gpsAccuracyM: gpsAcc,
        splits: {
          s60ft: s60?.t ?? null,
          s330ft: s330?.t ?? null,
          s1000ft: s1000?.t ?? null,
          eighthS: eighth?.t ?? null,
          eighthTrap: eighth?.trap ?? null,
          quarterS: quarter?.t ?? null,
          quarterTrap: quarter?.trap ?? null,
        },
      });

      // Ghost telemetry
      const gk = ghost.speedKmh(elapsed);
      const gd = ghost.distanceM(elapsed);
      const gEighth = elapsed > ghost.timeAtDistanceMs(201.168) ? { t: ghost.timeAtDistanceMs(201.168) / 1000, trap: ghost.speedKmh(ghost.timeAtDistanceMs(201.168)) } : null;
      const gQuarter = elapsed > ghost.timeAtDistanceMs(402.336) ? { t: ghost.timeAtDistanceMs(402.336) / 1000, trap: ghost.speedKmh(ghost.timeAtDistanceMs(402.336)) } : null;
      setGhostTel({
        name: preset.label,
        color: "#f6d84f",
        isGhost: true,
        kmh: gk,
        peakKmh: Math.max(gk, ghostTel.peakKmh),
        distanceM: gd,
        reactionMs: preset.reactionMs,
        splits: {
          s60ft: elapsed > ghost.timeAtDistanceMs(18.288) ? ghost.timeAtDistanceMs(18.288) / 1000 : null,
          s330ft: elapsed > ghost.timeAtDistanceMs(100.584) ? ghost.timeAtDistanceMs(100.584) / 1000 : null,
          s1000ft: elapsed > ghost.timeAtDistanceMs(304.8) ? ghost.timeAtDistanceMs(304.8) / 1000 : null,
          eighthS: gEighth?.t ?? null,
          eighthTrap: gEighth?.trap ?? null,
          quarterS: gQuarter?.t ?? null,
          quarterTrap: gQuarter?.trap ?? null,
        },
      });

      // Phase transition
      if (phase === "stage" && st.greenAt != null) setPhase("racing");
      if (phase === "racing") {
        const playerFinished = dist >= 402.336;
        const ghostFinished = elapsed >= ghost.timeAtDistanceMs(402.336);
        if (st.foul) {
          setFinish({ winner: "foul", margin: 0 });
          setPhase("finish");
          stopGps();
          return;
        }
        if (playerFinished || ghostFinished || elapsed > 45000) {
          const pWin = playerFinished && (!ghostFinished || (quarter && quarter.t < ghost.timeAtDistanceMs(402.336) / 1000));
          const margin = quarter ? Math.abs((quarter.t * 1000) - ghost.timeAtDistanceMs(402.336)) / 1000 : 0;
          setFinish({ winner: pWin ? "player" : "ghost", margin });
          setPhase("finish");
          stopGps();
          return;
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { running = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, ghost, preset, vehicleName, gpsKmh, gpsAcc, stripMode, tree]);

  // --- Actions --------------------------------------------------------------
  const beginStage = useCallback(() => {
    rawRef.current = [];
    launchRef.current = null;
    setFinish(null);
    setAnalysis(null);
    setSubmitInfo(null);
    setPlayerTel(emptyLane(vehicleName || "You", "#00c853"));
    setGhostTel(emptyLane(preset.label, "#f6d84f", true));
    tree.reset();
    startGps();
    setPhase("stage");
    // small delay so GPS warms up
    window.setTimeout(() => tree.start(), 1500);
  }, [preset, startGps, tree, vehicleName]);

  const cancel = useCallback(() => {
    tree.reset();
    stopGps();
    setPhase("setup");
  }, [tree, stopGps]);

  // Submit + AI analysis after finish
  useEffect(() => {
    if (phase !== "finish" || !finish || finish.winner === "foul") return;
    if (rawRef.current.length < 10) return;
    let cancelled = false;
    (async () => {
      try {
        setAnalysisLoading(true);
        const res: any = await submit({ data: {
          vehicle_kind: vehicleKind,
          vehicle_name: vehicleName || null,
          visibility: "public",
          points: rawRef.current.map((p) => ({
            t_ms: p.t_ms, lat: p.lat, lng: p.lng,
            speed_kmh: p.speed_kmh, accuracy_m: p.accuracy_m,
          })),
          started_at: new Date(Date.now() - (rawRef.current.at(-1)?.t_ms ?? 0)).toISOString(),
          ended_at: new Date().toISOString(),
        } });
        if (cancelled) return;
        setSubmitInfo({ id: res.id, status: res.status });
        try {
          const c = await coach({ data: { id: res.id } });
          if (!cancelled) setAnalysis(c);
        } catch {}
      } catch (e) {
        console.warn("Race submit failed", e);
      } finally {
        if (!cancelled) setAnalysisLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, finish]);

  // --- Render ----------------------------------------------------------------
  return (
    <div className="min-h-svh pb-24" style={{ background: "linear-gradient(180deg,#050505,#0a0a0a 60%,#080808)" }}>

      {phase === "setup" && (
        <div className="px-4 pt-4">
          <h1 className="serif text-3xl" style={{ color: "#f5f5f5" }}>Race Mode</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-ink-3)" }}>
            Christmas Tree start · live dual HUD · AI ghost opponent · GPS-verified time slip.
          </p>

          <div className="mt-4">
            <p className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 9 }}>VEHICLE</p>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(["motorcycle","car"] as const).map((k) => (
                <button key={k} onClick={() => setVehicleKind(k)}
                  className="tap rounded-lg border p-3 text-sm font-bold"
                  style={{
                    borderColor: vehicleKind === k ? "#00c853" : "rgba(255,255,255,0.08)",
                    background: vehicleKind === k ? "rgba(0,200,83,0.10)" : "rgba(255,255,255,0.02)",
                    color: "#f0f0f0",
                  }}>
                  {k === "motorcycle" ? "Motorcycle" : "Car"}
                </button>
              ))}
            </div>
            <input value={vehicleName} onChange={(e) => setVehicleName(e.target.value)} placeholder="Yamaha R1 2024"
              className="mt-2 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              style={{ borderColor: "rgba(255,255,255,0.12)", color: "#f0f0f0" }} />
          </div>

          <div className="mt-4">
            <p className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 9 }}>TREE MODE</p>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(["sportsman","pro"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className="tap rounded-lg border p-3 text-sm font-bold"
                  style={{
                    borderColor: mode === m ? "#00c853" : "rgba(255,255,255,0.08)",
                    background: mode === m ? "rgba(0,200,83,0.10)" : "rgba(255,255,255,0.02)",
                    color: "#f0f0f0",
                  }}>
                  {m === "pro" ? "Pro Tree" : "Sportsman"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 9 }}>TIMING SOURCE</p>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(["gps", "sim"] as const).map((m) => (
                <button key={m} onClick={() => setStripMode(m)}
                  className="tap rounded-lg border p-3 text-sm font-bold"
                  style={{
                    borderColor: stripMode === m ? "var(--color-neon)" : "rgba(255,255,255,0.08)",
                    background: stripMode === m ? "rgba(0,200,83,0.10)" : "rgba(255,255,255,0.02)",
                    color: "#f0f0f0",
                  }}>
                  {m === "gps" ? "Live GPS" : "Strip Demo"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 9 }}>AI GHOST OPPONENT</p>
            <div className="mt-1 grid gap-2">
              {GHOST_PRESETS.map((g) => (
                <button key={g.id} onClick={() => setPreset(g)}
                  className="tap flex items-center justify-between rounded-lg border p-3 text-left"
                  style={{
                    borderColor: preset.id === g.id ? "#f6d84f" : "rgba(255,255,255,0.08)",
                    background: preset.id === g.id ? "rgba(246,216,79,0.10)" : "rgba(255,255,255,0.02)",
                  }}>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "#f5f5f5" }}>{g.label}</p>
                    <p className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 9 }}>
                      TRAP ~{g.trapKmh} km/h · RT {(g.reactionMs / 1000).toFixed(2)}s
                    </p>
                  </div>
                  {preset.id === g.id && <span className="mono-caps text-[10px] font-black" style={{ color: "#f6d84f" }}>SELECTED</span>}
                </button>
              ))}
            </div>
          </div>

          <button onClick={beginStage}
            className="tap mt-6 w-full rounded-lg py-4 mono-caps text-sm font-black"
            style={{ background: "#00c853", color: "#050505", letterSpacing: "0.24em", boxShadow: "0 12px 32px rgba(0,200,83,0.35)" }}>
            ▶ STAGE UP
          </button>

          <p className="mt-3 text-center text-[10px]" style={{ color: "var(--color-ink-3)" }}>
            For safety, use only on closed courses. GPS accuracy verified before publishing.
          </p>
        </div>
      )}

      {(phase === "stage" || phase === "racing") && (
        <div className="px-3 pt-3">
          <div className="flex items-center justify-between">
            <span className="mono-caps text-[10px] font-black" style={{ color: gpsOk ? "#00c853" : "#ff8c1a", letterSpacing: "0.24em" }}>
              ● {stripMode === "sim" ? "STRIP DEMO" : gpsOk ? "GPS LOCK" : "GPS WEAK"} {gpsAcc != null && `· ±${gpsAcc.toFixed(0)}m`}
            </span>
            <span className="mono-num tabular-nums" style={{ color: "#fff", fontSize: 12 }}>
              {(elapsedMs / 1000).toFixed(2)}s
            </span>
            <button onClick={cancel} className="mono-caps text-[10px] font-black" style={{ color: "#ff8c1a" }}>ABORT</button>
          </div>

          <div className="mt-3 flex items-start justify-center gap-3">
            <DragTree state={tree.state} />
          </div>

          <StripTrack player={playerTel} ghost={ghostTel} />

          <div className="mt-3">
            <RaceHUD player={playerTel} ghost={ghostTel} elapsedMs={elapsedMs} finished={false} />
          </div>

          {tree.state.phase === "foul" && (
            <div className="mt-3 rounded-lg border p-3 text-center" style={{ borderColor: "#ff2b2b", background: "rgba(255,43,43,0.08)" }}>
              <p className="mono-caps text-sm font-black" style={{ color: "#ff2b2b" }}>◆ RED LIGHT · FOUL START</p>
              <p className="mt-1 text-xs" style={{ color: "#ffaaaa" }}>Auto disqualification. Reset the strip and try again.</p>
              <button onClick={cancel} className="tap mt-2 rounded px-4 py-2 mono-caps text-[10px] font-black" style={{ background: "#fff", color: "#050505" }}>RESET STRIP</button>
            </div>
          )}
        </div>
      )}

      {phase === "finish" && finish && (
        <div className="px-4 pt-4">
          <p className="mono-caps text-[10px] font-black" style={{ color: "var(--color-silver)", letterSpacing: "0.24em" }}>OFFICIAL TIME SLIP</p>
          <h1 className="serif mt-1 text-4xl" style={{ color: finish.winner === "foul" ? "#ff2b2b" : finish.winner === "player" ? "#00c853" : "#f6d84f" }}>
            {finish.winner === "foul" ? "DQ · Red Light" : finish.winner === "player" ? "WIN" : "LOSS"}
          </h1>
          {finish.winner !== "foul" && (
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-3)" }}>
              Margin {finish.margin.toFixed(3)}s vs {preset.label}
            </p>
          )}

          <TimeSlip player={playerTel} ghost={ghostTel} />

          <ReplayPanel points={rawRef.current} ghost={ghost} />

          <div className="mt-4 rounded-lg border p-4" style={{ borderColor: "rgba(0,200,83,0.4)", background: "rgba(0,200,83,0.05)" }}>
            <div className="flex items-center justify-between">
              <p className="mono-caps text-[10px] font-black" style={{ color: "#00c853" }}>◆ AI RACE ANALYSIS · REX</p>
              {analysis?.grade && (<span className="mono-num text-2xl font-black" style={{ color: "#00c853" }}>{analysis.grade}</span>)}
            </div>
            {analysisLoading && <p className="mt-2 text-sm" style={{ color: "var(--color-ink-3)" }}>Analyzing telemetry…</p>}
            {!analysisLoading && !analysis && <p className="mt-2 text-sm" style={{ color: "var(--color-ink-3)" }}>AI analysis unavailable.</p>}
            {analysis && (
              <div className="mt-2 space-y-2 text-[13px]" style={{ color: "#e8e8e8" }}>
                <p className="serif text-base italic">{analysis.headline}</p>
                <Row label="Launch" v={analysis.launch} />
                <Row label="Shift" v={analysis.shift} />
                <Row label="Weakness" v={analysis.weakness} />
                <Row label="Next target" v={analysis.next_target} />
                {Array.isArray(analysis.tips) && (
                  <ul className="mt-2 list-disc pl-5" style={{ color: "#c0c0c0" }}>
                    {analysis.tips.map((t: string, i: number) => <li key={i}>{t}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={beginStage} className="tap rounded-lg py-3 mono-caps text-[10px] font-black" style={{ background: "#00c853", color: "#050505", letterSpacing: "0.24em" }}>
              REMATCH
            </button>
            {submitInfo?.id ? (
              <button onClick={() => { const id = submitInfo.id; if (!id) return; nav({ to: "/drag/$id", params: { id } }); }}
                className="tap rounded-lg py-3 mono-caps text-[10px] font-black" style={{ background: "#fff", color: "#050505", letterSpacing: "0.24em" }}>
                VIEW RECORD
              </button>
            ) : (
              <button onClick={() => nav({ to: "/drag" })} className="tap rounded-lg py-3 mono-caps text-[10px] font-black" style={{ background: "rgba(255,255,255,0.08)", color: "#f0f0f0", letterSpacing: "0.24em" }}>
                DRAG HUB
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function emptyLane(name: string, color: string, isGhost = false): LaneTelemetry {
  return {
    name, color, isGhost,
    kmh: 0, peakKmh: 0, distanceM: 0, reactionMs: null, gpsAccuracyM: null,
    splits: {},
  };
}

function TimeSlip({ player, ghost }: { player: LaneTelemetry; ghost: LaneTelemetry }) {
  const rows: [string, string, string][] = [
    ["Reaction", fmtRT(player.reactionMs), fmtRT(ghost.reactionMs)],
    ["60 ft", fmt(player.splits.s60ft), fmt(ghost.splits.s60ft)],
    ["330 ft", fmt(player.splits.s330ft), fmt(ghost.splits.s330ft)],
    ["1/8 mi", fmt(player.splits.eighthS), fmt(ghost.splits.eighthS)],
    ["1/8 trap", fmtSp(player.splits.eighthTrap), fmtSp(ghost.splits.eighthTrap)],
    ["1000 ft", fmt(player.splits.s1000ft), fmt(ghost.splits.s1000ft)],
    ["1/4 mi", fmt(player.splits.quarterS), fmt(ghost.splits.quarterS)],
    ["1/4 trap", fmtSp(player.splits.quarterTrap), fmtSp(ghost.splits.quarterTrap)],
    ["Top speed", `${player.peakKmh.toFixed(0)} km/h`, `${ghost.peakKmh.toFixed(0)} km/h`],
  ];
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border" style={{ borderColor: "rgba(255,255,255,0.12)", background: "linear-gradient(180deg,#0a0a0a,#141414)" }}>
      <div className="grid grid-cols-3 text-[10px] mono-caps px-3 py-2" style={{ background: "rgba(255,255,255,0.04)", color: "var(--color-silver)", letterSpacing: "0.2em" }}>
        <span>METRIC</span>
        <span style={{ color: "#00c853" }}>{player.name.toUpperCase()}</span>
        <span style={{ color: "#f6d84f" }}>{ghost.name.toUpperCase()}</span>
      </div>
      {rows.map(([k, a, b]) => (
        <div key={k} className="grid grid-cols-3 items-center border-t px-3 py-2 text-xs" style={{ borderColor: "rgba(255,255,255,0.06)", color: "#eaeaea" }}>
          <span style={{ color: "var(--color-silver)" }}>{k}</span>
          <span className="mono-num tabular-nums font-bold">{a}</span>
          <span className="mono-num tabular-nums font-bold">{b}</span>
        </div>
      ))}
    </div>
  );
}

function StripTrack({ player, ghost }: { player: LaneTelemetry; ghost: LaneTelemetry }) {
  const playerPct = Math.min(100, (player.distanceM / 402.336) * 100);
  const ghostPct = Math.min(100, (ghost.distanceM / 402.336) * 100);

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border" style={{ borderColor: "rgba(255,255,255,0.10)", background: "linear-gradient(180deg,#050505,#111)" }}>
      <div className="relative h-24"
        style={{
          background:
            "linear-gradient(90deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 11.1%, rgba(255,255,255,0.06) 11.1% calc(11.1% + 1px), transparent calc(11.1% + 1px) 22.2%), linear-gradient(180deg,#171717 0%,#0b0b0b 48%,#171717 52%,#090909 100%)",
          backgroundSize: "36px 100%, 100% 100%",
        }}>
        <div className="absolute left-0 right-0 top-1/2 h-px bg-white/20" />
        <div className="absolute bottom-0 top-0 w-3" style={{ right: 0, background: "repeating-linear-gradient(0deg,#fff 0 5px,#050505 5px 10px)" }} />
        <LaneMarker pct={playerPct} top="22%" color="var(--color-neon)" label="YOU" />
        <LaneMarker pct={ghostPct} top="68%" color="#f6d84f" label="AI" />
      </div>
    </div>
  );
}

function LaneMarker({ pct, top, color, label }: { pct: number; top: string; color: string; label: string }) {
  return (
    <div className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2" style={{ left: `${pct}%`, top, color }}>
      <div style={{ width: 26, height: 12, clipPath: "polygon(18% 0, 86% 0, 100% 50%, 86% 100%, 18% 100%, 0 50%)", background: color, boxShadow: `0 0 18px ${color}` }} />
      <span className="mono-caps text-[9px] font-black" style={{ color }}>{label}</span>
    </div>
  );
}

function ReplayPanel({ points, ghost }: { points: Point[]; ghost: Ghost }) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);

  const maxMs = Math.max(points.at(-1)?.t_ms ?? 0, ghost.timeAtDistanceMs(402.336));

  useEffect(() => {
    if (!playing) return;
    lastRef.current = performance.now();
    const step = (now: number) => {
      const dt = (now - lastRef.current) * rate;
      lastRef.current = now;
      setT((prev) => {
        const next = prev + dt;
        if (next >= maxMs) { setPlaying(false); return maxMs; }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, rate, maxMs]);

  // Interp player state at t
  const pState = useMemo(() => {
    if (!points.length) return { kmh: 0, dist: 0 };
    let dist = 0;
    let kmh = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i].t_ms > t) {
        const a = points[i - 1], b = points[i];
        const frac = (t - a.t_ms) / Math.max(1, b.t_ms - a.t_ms);
        kmh = a.speed_kmh + frac * (b.speed_kmh - a.speed_kmh);
        dist += haversine(a, b) * frac;
        return { kmh, dist };
      }
      if (i > 0) dist += haversine(points[i - 1], points[i]);
      kmh = points[i].speed_kmh;
    }
    return { kmh, dist };
  }, [t, points]);

  const gk = ghost.speedKmh(t);
  const gd = ghost.distanceM(t);

  return (
    <div className="mt-4 rounded-2xl border p-3" style={{ borderColor: "rgba(255,255,255,0.12)", background: "linear-gradient(180deg,#0a0a0a,#141414)" }}>
      <div className="flex items-center justify-between">
        <p className="mono-caps text-[10px] font-black" style={{ color: "var(--color-silver)", letterSpacing: "0.24em" }}>REPLAY</p>
        <div className="flex items-center gap-1">
          {[0.25, 0.5, 1, 2].map((r) => (
            <button key={r} onClick={() => setRate(r)}
              className="tap rounded px-2 py-1 mono-tag"
              style={{
                fontSize: 9,
                background: rate === r ? "#00c853" : "rgba(255,255,255,0.06)",
                color: rate === r ? "#050505" : "#c0c0c0",
              }}>{r}×</button>
          ))}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-3">
        <ReplayLane color="#00c853" name="YOU" kmh={pState.kmh} dist={pState.dist} />
        <ReplayLane color="#f6d84f" name="GHOST" kmh={gk} dist={gd} />
      </div>

      {/* Track visualization */}
      <div className="mt-3">
        <div className="relative h-6 rounded-lg" style={{ background: "linear-gradient(90deg,#1a1a1a,#0f0f0f)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ position: "absolute", left: `${Math.min(100, (pState.dist / 402.336) * 100)}%`, top: 2, transform: "translateX(-50%)", width: 4, height: 20, background: "#00c853", borderRadius: 2, boxShadow: "0 0 8px #00c853" }} />
          <div style={{ position: "absolute", left: `${Math.min(100, (gd / 402.336) * 100)}%`, top: 2, transform: "translateX(-50%)", width: 4, height: 20, background: "#f6d84f", borderRadius: 2, boxShadow: "0 0 8px #f6d84f" }} />
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 4, background: "repeating-linear-gradient(0deg,#fff 0 3px,#000 3px 6px)" }} />
        </div>
        <input type="range" min={0} max={Math.max(1, maxMs)} value={t} onChange={(e) => setT(Number(e.target.value))}
          className="mt-2 w-full accent-[#00c853]" />
        <div className="mt-1 flex items-center justify-between text-[10px] mono-tag" style={{ color: "var(--color-silver)" }}>
          <span>{(t / 1000).toFixed(2)}s</span>
          <button onClick={() => setPlaying((p) => !p)} className="tap rounded px-3 py-1 mono-caps font-black" style={{ fontSize: 10, background: "#fff", color: "#050505" }}>
            {playing ? "❚❚ PAUSE" : "▶ PLAY"}
          </button>
          <span>{(maxMs / 1000).toFixed(2)}s</span>
        </div>
      </div>
    </div>
  );
}

function ReplayLane({ color, name, kmh, dist }: { color: string; name: string; kmh: number; dist: number }) {
  return (
    <div className="rounded-lg border p-2" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
      <p className="mono-caps text-[9px] font-black" style={{ color, letterSpacing: "0.24em" }}>{name}</p>
      <p className="mono-num mt-1 text-2xl font-black tabular-nums" style={{ color: "#fff" }}>{kmh.toFixed(0)}<span className="mono-caps ml-1" style={{ fontSize: 9, color: "var(--color-silver)" }}>km/h</span></p>
      <p className="mono-tag mt-1" style={{ color: "var(--color-silver)", fontSize: 9 }}>{dist.toFixed(1)} m</p>
    </div>
  );
}

function Row({ label, v }: { label: string; v?: string }) {
  if (!v) return null;
  return (
    <div>
      <span className="mono-tag mr-2" style={{ color: "var(--color-silver)", fontSize: 9 }}>{label.toUpperCase()}</span>
      <span>{v}</span>
    </div>
  );
}

function fmt(v: number | null | undefined) { return v != null ? `${v.toFixed(3)}s` : "—"; }
function fmtSp(v: number | null | undefined) { return v != null ? `${v.toFixed(0)} km/h` : "—"; }
function fmtRT(v: number | null | undefined) { return v != null ? `${(v / 1000).toFixed(3)}s` : "—"; }
