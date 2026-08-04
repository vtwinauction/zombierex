import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Mic,
  MicOff,
  Fuel,
  AlertTriangle,
  Users,
  Music,
  Phone,
  Navigation,
  Sun,
  Moon,
  Maximize,
  Minimize,
  X,
} from "lucide-react";
import { HeyRex } from "@/lib/hey-rex";
import { speak } from "@/lib/voice";

export const Route = createFileRoute("/_authenticated/atlas/cockpit")({
  head: () => ({
    meta: [
      { title: "Cockpit — Ride Mode" },
      {
        name: "description",
        content: "Full-screen glanceable HUD for helmet, handlebar mount, and phone mirroring.",
      },
      { property: "og:title", content: "Cockpit — Zombierex Ride Mode" },
      {
        property: "og:description",
        content:
          "High-contrast HUD with speed, next turn, fuel, group, and voice — designed for gloved hands.",
      },
    ],
  }),
  component: CockpitPage,
});

/** Optional Screen Wake Lock — no-op on unsupported browsers */
function useWakeLock(active: boolean) {
  const lockRef = useRef<any>(null);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const request = async () => {
      try {
        const nav: any = navigator;
        if (nav.wakeLock?.request) lockRef.current = await nav.wakeLock.request("screen");
      } catch {
        /* ignore */
      }
    };
    request();
    const onVis = () => {
      if (document.visibilityState === "visible") request();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      try {
        lockRef.current?.release?.();
      } catch {}
      lockRef.current = null;
    };
  }, [active]);
}

function useGeoSpeed() {
  const [kmh, setKmh] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [ok, setOk] = useState<boolean>(false);
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setOk(true);
        setKmh(p.coords.speed != null ? Math.max(0, p.coords.speed * 3.6) : null);
        if (p.coords.heading != null && !Number.isNaN(p.coords.heading))
          setHeading(p.coords.heading);
      },
      () => setOk(false),
      { enableHighAccuracy: true, maximumAge: 500, timeout: 8000 },
    );
    return () => {
      try {
        navigator.geolocation.clearWatch(id);
      } catch {}
    };
  }, []);
  return { kmh, heading, ok };
}

function useClock() {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(i);
  }, []);
  return now;
}

function CockpitPage() {
  const nav = useNavigate();
  const { kmh, heading, ok } = useGeoSpeed();
  const clock = useClock();
  const [night, setNight] = useState<boolean>(false);
  const [full, setFull] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const rexRef = useRef<HeyRex | null>(null);
  const [rexStatus, setRexStatus] = useState<string>("");

  useWakeLock(true);

  // Default to night mode after sunset
  useEffect(() => {
    const h = new Date().getHours();
    setNight(h >= 19 || h < 6);
  }, []);

  const rex = useMemo(
    () =>
      new HeyRex({
        navigate: (to) => nav({ to: to as any }),
        speak,
      }),
    [nav],
  );

  useEffect(() => {
    rexRef.current = rex;
    const off = rex.onChange((s) => setRexStatus(s.awake ? "Listening…" : s.status));
    return () => {
      off();
      rex.stop();
    };
  }, [rex]);

  const toggleMic = () => {
    if (micOn) {
      rex.stop();
      setMicOn(false);
    } else {
      rex.start();
      setMicOn(true);
    }
  };

  const toggleFull = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setFull(true);
      } else {
        await document.exitFullscreen();
        setFull(false);
      }
    } catch {
      /* ignore */
    }
  };

  // Try to lock landscape when entering full-screen (best-effort)
  useEffect(() => {
    if (!full) return;
    const so: any = (screen as any).orientation;
    if (so?.lock) so.lock("landscape").catch(() => {});
  }, [full]);

  const bg = night ? "#000" : "#0f1115";
  const ink = night ? "#e5e5e5" : "#fff";
  const dim = night ? "#7a7a7a" : "#9aa0a6";
  const neon = "var(--color-neon, #00c853)";
  const speedText = kmh == null ? "--" : Math.round(kmh);

  return (
    <div
      className="fixed inset-0 z-40 overflow-hidden select-none"
      style={{ background: bg, color: ink }}
    >
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 py-3 z-10">
        <Link
          to="/atlas"
          className="tap grid h-11 w-11 place-items-center rounded-full border"
          style={{ borderColor: dim, color: ink }}
        >
          <ArrowLeft size={20} />
        </Link>
        <div
          className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest"
          style={{ color: dim }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: ok ? neon : "#dc2626" }}
          />
          GPS · Cockpit
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNight((v) => !v)}
            className="tap grid h-11 w-11 place-items-center rounded-full border"
            style={{ borderColor: dim, color: ink }}
            aria-label="Toggle night mode"
          >
            {night ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={toggleFull}
            className="tap grid h-11 w-11 place-items-center rounded-full border"
            style={{ borderColor: dim, color: ink }}
            aria-label="Toggle fullscreen"
          >
            {full ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </div>

      {/* Central speed */}
      <div className="absolute inset-0 grid place-items-center pointer-events-none">
        <div className="text-center">
          <div
            className="tabular-nums font-black leading-none"
            style={{
              fontSize: "clamp(140px, 34vw, 340px)",
              color: ink,
              textShadow: night ? "0 0 24px rgba(0,200,83,0.35)" : "none",
            }}
          >
            {speedText}
          </div>
          <div className="mt-2 text-lg font-mono uppercase tracking-[0.4em]" style={{ color: dim }}>
            km/h
          </div>
          {heading != null && (
            <div
              className="mt-4 text-sm font-mono uppercase tracking-widest"
              style={{ color: dim }}
            >
              HDG {Math.round(heading)}°
            </div>
          )}
        </div>
      </div>

      {/* Clock */}
      <div
        className="absolute top-16 left-1/2 -translate-x-1/2 text-sm font-mono tabular-nums"
        style={{ color: dim }}
      >
        {clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </div>

      {/* Voice status */}
      {rexStatus && (
        <div
          className="absolute top-16 right-4 text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-full border"
          style={{ borderColor: dim, color: ink, background: "rgba(0,0,0,0.4)" }}
        >
          {rexStatus}
        </div>
      )}

      {/* Bottom action rail — huge gloved-hand tap targets */}
      <div
        className="absolute bottom-0 inset-x-0 px-3 pt-3 grid grid-cols-5 gap-2 z-10"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <CockpitButton
          label="Nav"
          onClick={() => nav({ to: "/atlas/ride" })}
          icon={<Navigation size={24} />}
          tint={ink}
          border={dim}
        />
        <CockpitButton
          label="Fuel"
          onClick={() => nav({ to: "/atlas/fuel" })}
          icon={<Fuel size={24} />}
          tint={ink}
          border={dim}
        />
        <CockpitButton
          label={micOn ? "Mic On" : "Mic"}
          onClick={toggleMic}
          icon={micOn ? <Mic size={26} /> : <MicOff size={24} />}
          tint={micOn ? "#0f1115" : ink}
          bg={micOn ? neon : undefined}
          border={dim}
        />
        <CockpitButton
          label="Group"
          onClick={() => nav({ to: "/atlas/group" })}
          icon={<Users size={24} />}
          tint={ink}
          border={dim}
        />
        <CockpitButton
          label="SOS"
          onClick={() => nav({ to: "/atlas/sos" })}
          icon={<AlertTriangle size={26} />}
          tint="#fff"
          bg="#dc2626"
          border="#dc2626"
        />
      </div>

      {/* Corner: Music placeholder (media session API hook-in point) */}
      <div
        className="absolute bottom-24 left-4 flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest"
        style={{ color: dim }}
      >
        <Music size={14} /> Media: use system controls
      </div>
    </div>
  );
}

function CockpitButton({
  label,
  icon,
  onClick,
  tint,
  bg,
  border,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  tint: string;
  bg?: string;
  border: string;
}) {
  return (
    <button
      onClick={onClick}
      className="tap grid place-items-center rounded-2xl py-4 font-semibold border transition active:scale-[0.97]"
      style={{
        background: bg ?? "rgba(255,255,255,0.04)",
        borderColor: border,
        color: tint,
        minHeight: 76,
      }}
    >
      <div className="grid place-items-center gap-1">
        {icon}
        <span className="text-xs uppercase tracking-widest">{label}</span>
      </div>
    </button>
  );
}
