/**
 * Drag — New Run wizard. Collects vehicle info, then arms GPS recorder,
 * detects launch, captures full trace, and submits for server verification.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useDragRecorder } from "@/lib/drag-recorder";
import { submitDragRun, coachDragRun } from "@/lib/drag.functions";

export const Route = createFileRoute("/_authenticated/drag/run")({
  validateSearch: (search: Record<string, unknown>) => ({
    step: search.step === "record" ? "record" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "New GPS Drag Run · ZOMBIEREX" },
      { name: "description", content: "Record a GPS-verified drag run with vehicle setup, live timing, anti-cheat checks and a permanent performance record." },
      { property: "og:title", content: "New GPS Drag Run · ZOMBIEREX" },
      { property: "og:description", content: "Record a GPS-verified drag run with live timing and verification." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewRun,
});

type Step = "vehicle" | "record" | "submitting" | "done";

function NewRun() {
  const nav = useNavigate();
  const search = Route.useSearch();
  const [step, setStep] = useState<Step>(search.step === "record" ? "record" : "vehicle");
  const [vehicle, setVehicle] = useState({
    vehicle_kind: "motorcycle" as "motorcycle" | "car",
    vehicle_name: "",
    engine_cc: "" as string,
    aspiration: "na" as "na" | "turbo" | "supercharged" | "electric",
    fuel_type: "gasoline" as "gasoline" | "diesel" | "e85" | "electric" | "hybrid" | "other",
    weight_class: "",
    weight_kg: "" as string,
    modifications: "",
  });
  const rec = useDragRecorder();
  const submit = useServerFn(submitDragRun);
  const coach = useServerFn(coachDragRun);
  const [result, setResult] = useState<any>(null);
  const [coaching, setCoaching] = useState<any>(null);
  const [coachLoading, setCoachLoading] = useState(false);

  const mut = useMutation({
    mutationFn: async () => {
      return submit({ data: {
        vehicle_kind: vehicle.vehicle_kind,
        vehicle_name: vehicle.vehicle_name || null,
        engine_cc: vehicle.engine_cc ? Number(vehicle.engine_cc) : null,
        aspiration: vehicle.aspiration,
        fuel_type: vehicle.fuel_type,
        weight_class: vehicle.weight_class || null,
        weight_kg: vehicle.weight_kg ? Number(vehicle.weight_kg) : null,
        modifications: vehicle.modifications || null,
        visibility: "public",
        points: rec.points,
        started_at: new Date(Date.now() - (rec.points.at(-1)?.t_ms ?? 0)).toISOString(),
        ended_at: new Date().toISOString(),
      } });
    },
    onSuccess: async (r: any) => {
      setResult(r); setStep("done");
      setCoachLoading(true);
      try { setCoaching(await coach({ data: { id: r.id } })); }
      catch (e) { console.warn("Coach failed", e); }
      finally { setCoachLoading(false); }
    },
    onError: (e: any) => alert(e?.message ?? "Submit failed"),
  });

  return (
    <div className="min-h-svh pb-24">
      <div className="px-4 pt-4">
        {step === "vehicle" && (
          <>
            <h1 className="serif text-3xl" style={{ color: "var(--color-ink)" }}>Vehicle</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-3)" }}>
              Every verified run generates a permanent digital performance record.
            </p>
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {(["motorcycle", "car"] as const).map((k) => (
                  <button key={k} onClick={() => setVehicle((v) => ({ ...v, vehicle_kind: k }))}
                    className="tap rounded-lg border p-3 text-sm font-bold"
                    style={{
                      borderColor: vehicle.vehicle_kind === k ? "var(--color-neon)" : "var(--color-hair)",
                      background: vehicle.vehicle_kind === k ? "color-mix(in oklab, var(--color-neon) 12%, var(--color-graphite))" : "var(--color-graphite)",
                      color: "var(--color-ink)",
                    }}>
                    {k === "motorcycle" ? "Motorcycle" : "Car"}
                  </button>
                ))}
              </div>
              <Field label="Vehicle name" value={vehicle.vehicle_name} onChange={(v) => setVehicle((s) => ({ ...s, vehicle_name: v }))} placeholder="e.g. Yamaha R1 2024" />
              <Field label="Engine (cc)" value={vehicle.engine_cc} onChange={(v) => setVehicle((s) => ({ ...s, engine_cc: v.replace(/[^0-9]/g, "") }))} placeholder="998" inputMode="numeric" />
              <Select label="Aspiration" value={vehicle.aspiration} onChange={(v) => setVehicle((s) => ({ ...s, aspiration: v as any }))} options={[
                ["na", "Naturally Aspirated"], ["turbo", "Turbocharged"], ["supercharged", "Supercharged"], ["electric", "Electric"],
              ]} />
              <Select label="Fuel" value={vehicle.fuel_type} onChange={(v) => setVehicle((s) => ({ ...s, fuel_type: v as any }))} options={[
                ["gasoline", "Gasoline"], ["diesel", "Diesel"], ["e85", "E85"], ["electric", "Electric"], ["hybrid", "Hybrid"], ["other", "Other"],
              ]} />
              <div className="grid grid-cols-2 gap-2">
                <Field label="Weight class" value={vehicle.weight_class} onChange={(v) => setVehicle((s) => ({ ...s, weight_class: v }))} placeholder="Supersport" />
                <Field label="Weight (kg)" value={vehicle.weight_kg} onChange={(v) => setVehicle((s) => ({ ...s, weight_kg: v.replace(/[^0-9]/g, "") }))} placeholder="200" inputMode="numeric" />
              </div>
              <Field label="Modifications" value={vehicle.modifications} onChange={(v) => setVehicle((s) => ({ ...s, modifications: v }))} placeholder="Full exhaust, ECU flash…" />
            </div>
            <Link to="/drag/run" search={{ step: "record" }} onClick={() => setStep("record")}
              className="tap mt-6 inline-flex w-full justify-center rounded-lg py-3 mono-caps text-sm font-black"
              style={{ background: "var(--color-neon)", color: "var(--color-obsidian)" }}>
              CONTINUE → GPS TIMING
            </Link>
          </>
        )}

        {step === "record" && (
          <>
            <h1 className="serif text-3xl" style={{ color: "var(--color-ink)" }}>GPS Timing</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-3)" }}>
              Arm the timer, then launch. Run auto-detects on 8 km/h and auto-stops when you coast down.
            </p>
            <LiveGPSHUD kmh={rec.liveKmh} recording={rec.recording} armed={rec.armed} points={rec.points.length} />
            {rec.error && <div className="mt-3 border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-200">{rec.error}</div>}
            <div className="mt-4 flex gap-2">
              {!rec.armed && (
                <button onClick={rec.arm} className="tap flex-1 rounded-lg py-3 mono-caps text-sm font-black" style={{ background: "var(--color-neon)", color: "var(--color-obsidian)" }}>
                  ARM TIMER
                </button>
              )}
              {rec.armed && (
                <button onClick={rec.stop} className="tap flex-1 rounded-lg py-3 mono-caps text-sm font-black" style={{ background: "var(--color-heat)", color: "white" }}>
                  STOP
                </button>
              )}
              {rec.points.length > 10 && !rec.armed && (
                <button onClick={() => { setStep("submitting"); mut.mutate(); }} className="tap flex-1 rounded-lg py-3 mono-caps text-sm font-black" style={{ background: "var(--color-ink)", color: "white" }}>
                  SUBMIT & VERIFY
                </button>
              )}
            </div>
            <button onClick={rec.reset} className="tap mt-3 w-full text-xs" style={{ color: "var(--color-ink-3)" }}>
              Reset trace
            </button>
          </>
        )}

        {step === "submitting" && (
          <div className="py-16 text-center">
            <p className="mono-caps text-sm font-black" style={{ color: "var(--color-neon)" }}>VERIFYING…</p>
            <p className="mt-2 text-sm" style={{ color: "var(--color-ink-3)" }}>Recomputing splits from GPS trace and running anti-cheat checks.</p>
          </div>
        )}

        {step === "done" && result && (
          <div className="py-8">
            <p className="mono-caps text-[10px] font-black" style={{ color: "var(--color-silver)" }}>RESULT</p>
            <h1 className="serif text-3xl" style={{ color: "var(--color-ink)" }}>
              {result.status === "verified" ? "Verified ✓" : "Flagged for review"}
            </h1>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Split label="0–60 km/h" value={result.computed.zero_to_60_kmh_s} unit="s" />
              <Split label="0–100 km/h" value={result.computed.zero_to_100_kmh_s} unit="s" />
              <Split label="60–120 km/h" value={result.computed.sixty_to_120_kmh_s} unit="s" />
              <Split label="1/8 mile" value={result.computed.eighth_mile_s} unit="s" />
              <Split label="1/4 mile" value={result.computed.quarter_mile_s} unit="s" />
              <Split label="Top speed" value={result.computed.top_speed_kmh} unit="km/h" />
            </div>

            {/* AI Coach card */}
            <div className="mt-6 rounded-lg border p-4" style={{ borderColor: "var(--color-hair)", background: "var(--color-graphite)" }}>
              <div className="flex items-center justify-between">
                <p className="mono-caps text-[10px] font-black" style={{ color: "var(--color-neon)" }}>◆ AI COACH · REX</p>
                {coaching?.grade && (
                  <span className="mono-num text-xl font-black" style={{ color: "var(--color-neon)" }}>{coaching.grade}</span>
                )}
              </div>
              {coachLoading && <p className="mt-2 text-sm" style={{ color: "var(--color-ink-3)" }}>Analyzing your run…</p>}
              {!coachLoading && !coaching && <p className="mt-2 text-sm" style={{ color: "var(--color-ink-3)" }}>Coaching unavailable right now.</p>}
              {coaching && (
                <div className="mt-2 space-y-2 text-[13px]" style={{ color: "var(--color-ink)" }}>
                  <p className="serif text-base italic">{coaching.headline}</p>
                  <CoachRow label="Launch" text={coaching.launch} />
                  <CoachRow label="Shift" text={coaching.shift} />
                  <CoachRow label="Weakness" text={coaching.weakness} />
                  <CoachRow label="Next target" text={coaching.next_target} />
                  {Array.isArray(coaching.tips) && coaching.tips.length > 0 && (
                    <ul className="mt-2 list-disc pl-5" style={{ color: "var(--color-ink-2)" }}>
                      {coaching.tips.map((t: string, i: number) => <li key={i}>{t}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <button onClick={() => nav({ to: "/drag/$id", params: { id: result.id } })}
              className="tap mt-6 w-full rounded-lg py-3 mono-caps text-sm font-black"
              style={{ background: "var(--color-neon)", color: "var(--color-obsidian)" }}>
              VIEW PERFORMANCE RECORD
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, inputMode }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; inputMode?: "text" | "numeric" }) {
  return (
    <label className="block">
      <span className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 9 }}>{label.toUpperCase()}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} inputMode={inputMode}
        className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
        style={{ borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }} />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="block">
      <span className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 9 }}>{label.toUpperCase()}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
        style={{ borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function CoachRow({ label, text }: { label: string; text?: string }) {
  if (!text) return null;
  return (
    <div>
      <span className="mono-tag mr-2" style={{ color: "var(--color-silver)", fontSize: 9 }}>{label.toUpperCase()}</span>
      <span>{text}</span>
    </div>
  );
}

function LiveGPSHUD({ kmh, recording, armed, points }: { kmh: number; recording: boolean; armed: boolean; points: number }) {
  const state = recording ? "REC" : armed ? "ARMED" : "IDLE";
  const stateColor = recording ? "var(--color-heat, #ff3b30)" : armed ? "var(--color-neon)" : "var(--color-silver)";
  return (
    <div className="mt-4 rounded-2xl border p-5"
      style={{ borderColor: "var(--color-hair-strong)", background: "linear-gradient(180deg, #0a0a0a, #141414)" }}>
      <div className="flex items-center justify-between">
        <span className="mono-caps text-[10px] font-black" style={{ color: stateColor }}>
          ● {state} · GPS
        </span>
        <span className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 10 }}>{points} pts</span>
      </div>
      <div className="mt-2 flex items-end justify-center gap-2">
        <span className="mono-num font-black tabular-nums" style={{ fontSize: 96, lineHeight: 1, color: "#fff", textShadow: "0 0 24px rgba(0,200,83,0.35)" }}>
          {kmh.toFixed(0)}
        </span>
        <span className="mono-caps pb-3" style={{ color: "var(--color-silver)", fontSize: 12, letterSpacing: "0.3em" }}>km/h</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div style={{ width: `${Math.min(100, (kmh / 300) * 100)}%`, height: "100%", background: "var(--color-neon)", transition: "width 200ms ease-out" }} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-graphite p-2">
      <p className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 8 }}>{label}</p>
      <p className="mono-num text-sm font-bold" style={{ color: "var(--color-ink)" }}>{value}</p>
    </div>
  );
}

function Split({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: "var(--color-hair)", background: "var(--color-graphite)" }}>
      <p className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 9 }}>{label.toUpperCase()}</p>
      <p className="mono-num mt-1 text-lg font-bold" style={{ color: "var(--color-ink)" }}>
        {value != null ? `${Number(value).toFixed(unit === "s" ? 3 : 1)} ${unit}` : "—"}
      </p>
    </div>
  );
}
