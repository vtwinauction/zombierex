import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bluetooth, Gauge, Play, Square, AlertTriangle, Trash2, RefreshCw, Zap } from "lucide-react";
import { toast } from "sonner";
import { confirmDialog } from "@/lib/confirm";
import { ObdClient, PID_META, createDemoStream, isWebBluetoothSupported, type ObdPid, type ObdReading } from "@/lib/obd";

export const Route = createFileRoute("/_authenticated/atlas/diag")({
  head: () => ({
    meta: [
      { title: "Bike Diagnostics — Zombierex" },
      { name: "description", content: "Live OBD-II telemetry, trouble codes, and battery health over Web Bluetooth." },
      { property: "og:title", content: "Bike Diagnostics — Zombierex" },
      { property: "og:description", content: "Pair a BLE OBD-II dongle to stream live engine data and read fault codes." },
    ],
  }),
  component: DiagPage,
});

const PIDS: ObdPid[] = ["rpm", "speed", "coolant", "engine_load", "throttle", "intake_temp", "maf", "voltage"];

const RANGES: Record<ObdPid, { max: number; warn?: number }> = {
  rpm: { max: 12000, warn: 9500 },
  speed: { max: 220 },
  coolant: { max: 120, warn: 105 },
  engine_load: { max: 100, warn: 90 },
  throttle: { max: 100 },
  intake_temp: { max: 80, warn: 65 },
  maf: { max: 50 },
  voltage: { max: 15, warn: 11.8 },
};

function Tile({ pid, r }: { pid: ObdPid; r: ObdReading | null }) {
  const meta = PID_META[pid];
  const range = RANGES[pid];
  const v = r?.value ?? 0;
  const pct = Math.max(0, Math.min(100, (v / range.max) * 100));
  const warn = range.warn ? v >= range.warn : false;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-mono uppercase tracking-widest opacity-60">{meta.label}</div>
        {warn && <AlertTriangle size={12} className="text-red-500" />}
      </div>
      <div className="flex items-baseline gap-1">
        <div className="text-3xl font-black tabular-nums" style={{ color: warn ? "#dc2626" : "var(--color-ink-0)" }}>
          {r ? r.value : "—"}
        </div>
        <div className="text-xs font-mono opacity-60">{meta.unit}</div>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-border overflow-hidden">
        <div className="h-full transition-all" style={{
          width: `${pct}%`,
          background: warn ? "#dc2626" : "var(--color-neon, #00c853)"
        }} />
      </div>
    </div>
  );
}

function DiagPage() {
  const [state, setState] = useState<"idle" | "connecting" | "ready" | "demo" | "error" | "disconnected">("idle");
  const [status, setStatus] = useState("");
  const [readings, setReadings] = useState<Partial<Record<ObdPid, ObdReading>>>({});
  const [dtcs, setDtcs] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const clientRef = useRef<ObdClient | null>(null);
  const demoStopRef = useRef<(() => void) | null>(null);
  const pollRef = useRef<any>(null);

  const supported = isWebBluetoothSupported();

  const appendLog = (l: string) => setLog((prev) => [`${new Date().toLocaleTimeString()}  ${l}`, ...prev].slice(0, 40));

  const stopEverything = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (demoStopRef.current) { demoStopRef.current(); demoStopRef.current = null; }
    if (clientRef.current) { clientRef.current.disconnect().catch(() => {}); clientRef.current = null; }
  };

  useEffect(() => () => stopEverything(), []);

  const startDemo = () => {
    stopEverything();
    setReadings({});
    demoStopRef.current = createDemoStream((r) => {
      setReadings((prev) => ({ ...prev, [r.pid]: r }));
    });
    setState("demo");
    setStatus("Simulated telemetry stream");
    appendLog("Demo stream started");
  };

  const connect = async () => {
    stopEverything();
    setReadings({});
    if (!supported) { toast.error("Web Bluetooth is not available on this browser"); startDemo(); return; }
    const c = new ObdClient();
    clientRef.current = c;
    c.on((e) => {
      if (e.type === "status") { setStatus(e.message || e.state); if (e.state === "ready" || e.state === "connecting" || e.state === "disconnected" || e.state === "error") setState(e.state as any); }
      if (e.type === "log") appendLog(e.line);
      if (e.type === "reading") setReadings((prev) => ({ ...prev, [e.reading.pid]: e.reading }));
      if (e.type === "dtc") setDtcs(e.codes);
    });
    try {
      await c.connect();
      pollRef.current = setInterval(() => {
        PIDS.forEach((p) => { c.readPid(p).catch(() => {}); });
      }, 900);
    } catch (err: any) {
      appendLog(`Connect failed: ${err?.message ?? err}`);
      toast.error(err?.message ?? "Failed to connect");
      setState("error");
    }
  };

  const scanDtcs = async () => {
    if (!clientRef.current) { toast.error("Connect a dongle first"); return; }
    appendLog("Reading DTCs…");
    try { const codes = await clientRef.current.readDtcs(); if (!codes.length) appendLog("No codes stored ✓"); } catch { toast.error("DTC read failed"); }
  };

  const clearDtcs = async () => {
    if (!clientRef.current) return;
    if (!confirm("Clear all trouble codes? This resets the check-engine light and freeze-frame data.")) return;
    await clientRef.current.clearDtcs();
    setDtcs([]);
    appendLog("DTCs cleared");
  };

  const connected = state === "ready" || state === "demo";

  return (
    <div className="min-h-svh bg-background text-foreground pb-24">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/atlas" className="tap grid h-10 w-10 place-items-center rounded-full border border-border">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1">
            <div className="text-[10px] font-mono uppercase tracking-widest opacity-60">Atlas / Diagnostics</div>
            <h1 className="text-xl font-black tracking-tight">Bike Telemetry</h1>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest">
            <span className="h-1.5 w-1.5 rounded-full" style={{
              background: connected ? "var(--color-neon, #00c853)" : state === "connecting" ? "#f59e0b" : "#94a3b8"
            }} />
            {state === "demo" ? "Demo" : state}
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bluetooth size={16} className="opacity-70" />
            <div className="text-sm font-semibold">OBD-II BLE Dongle</div>
          </div>
          <p className="text-xs opacity-70 mb-3">
            Compatible with Vgate iCar Pro BLE, VEEPEAK BLE+, LELink and other ELM327 BLE adapters. Classic-Bluetooth SPP dongles are not supported by the browser.
          </p>
          <div className="flex gap-2">
            {!connected ? (
              <button onClick={connect} className="tap flex-1 grid place-items-center rounded-xl py-3 font-semibold"
                style={{ background: "var(--color-neon, #00c853)", color: "var(--color-obsidian, #0f1115)" }}>
                <div className="flex items-center gap-2"><Play size={16} /> Pair &amp; Connect</div>
              </button>
            ) : (
              <button onClick={() => { stopEverything(); setState("disconnected"); setStatus("Disconnected"); appendLog("Session ended"); }}
                className="tap flex-1 grid place-items-center rounded-xl py-3 font-semibold border border-border">
                <div className="flex items-center gap-2"><Square size={16} /> Disconnect</div>
              </button>
            )}
            <button onClick={startDemo} className="tap grid place-items-center rounded-xl px-4 py-3 font-semibold border border-border">
              <div className="flex items-center gap-2"><Zap size={16} /> Demo</div>
            </button>
          </div>
          {status && <div className="mt-3 text-xs font-mono opacity-60">{status}</div>}
          {!supported && (
            <div className="mt-3 text-[11px] opacity-70">
              Web Bluetooth isn't available here (iOS Safari, some in-app browsers). Use Chrome, Edge, or Android WebView — or run Demo mode.
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {PIDS.map((p) => <Tile key={p} pid={p} r={readings[p] ?? null} />)}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="opacity-70" />
              <div className="text-sm font-semibold">Diagnostic Trouble Codes</div>
            </div>
            <div className="flex gap-2">
              <button onClick={scanDtcs} disabled={!connected || state === "demo"} className="tap grid place-items-center rounded-lg px-3 py-1.5 text-xs font-semibold border border-border disabled:opacity-40">
                <div className="flex items-center gap-1.5"><RefreshCw size={12} /> Scan</div>
              </button>
              <button onClick={clearDtcs} disabled={!dtcs.length || state === "demo"} className="tap grid place-items-center rounded-lg px-3 py-1.5 text-xs font-semibold border border-border disabled:opacity-40">
                <div className="flex items-center gap-1.5"><Trash2 size={12} /> Clear</div>
              </button>
            </div>
          </div>
          {dtcs.length === 0 ? (
            <div className="text-xs font-mono opacity-60">No codes read. Pair a dongle and tap Scan.</div>
          ) : (
            <ul className="space-y-1.5">
              {dtcs.map((c) => (
                <li key={c} className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2">
                  <span className="font-mono font-bold text-red-600">{c}</span>
                  <a href={`https://www.google.com/search?q=OBD+${c}`} target="_blank" rel="noreferrer" className="text-[11px] opacity-70 underline">Look up</a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Gauge size={14} className="opacity-70" />
            <div className="text-[10px] font-mono uppercase tracking-widest opacity-60">Session log</div>
          </div>
          <div className="max-h-48 overflow-auto font-mono text-[11px] leading-relaxed opacity-80">
            {log.length === 0 ? <div className="opacity-50">— idle —</div> : log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
