/**
 * DragTree — Christmas Tree drag light UI.
 * Renders the classic vertical stack: pre-stage, stage, 3 amber, green, red.
 */
import type { TreeState } from "@/lib/christmas-tree";

export function DragTree({ state, compact = false }: { state: TreeState; compact?: boolean }) {
  const p = state.phase;
  const amber1 =
    p === "amber1" || p === "amber2" || p === "amber3" || p === "green" || p === "done";
  const amber2 = p === "amber2" || p === "amber3" || p === "green" || p === "done";
  const amber3 = p === "amber3" || p === "green" || p === "done";
  const green = p === "green" || p === "done";
  const red = p === "foul";
  const preStage = p !== "idle";
  const stage = p !== "idle" && p !== "prestage";

  const size = compact ? 34 : 54;
  return (
    <div
      className="relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl p-4"
      style={{
        background:
          "linear-gradient(90deg,#4c4c55 0 10%,#5e5e69 10% 14%,#3a3a42 14% 86%,#5e5e69 86% 90%,#4c4c55 90% 100%)",
        boxShadow:
          "0 18px 44px rgba(20,20,25,0.28), inset 0 0 0 1px rgba(255,255,255,0.14), inset 0 18px 24px rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-10"
        style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.16),transparent)" }}
      />

      <TreeLabel text="PRE STAGE" />
      <Row>
        <Bulb size={size * 0.52} on={preStage} color="var(--color-paper-0)" />
        <Bulb size={size * 0.52} on={preStage} color="var(--color-paper-0)" />
      </Row>
      <TreeLabel text="STAGE" />
      <Row>
        <Bulb size={size * 0.52} on={stage} color="var(--color-paper-0)" />
        <Bulb size={size * 0.52} on={stage} color="var(--color-paper-0)" />
      </Row>
      <Bulb size={size} on={amber1} color="#ffb020" />
      <Bulb size={size} on={amber2} color="#ffb020" />
      <Bulb size={size} on={amber3} color="#ffb020" />
      <Bulb size={size * 1.1} on={green} color="#00c853" />
      <Bulb size={size * 1.1} on={red} color="#ff2b2b" />
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2">{children}</div>;
}

function TreeLabel({ text }: { text: string }) {
  return (
    <div
      className="mono-caps text-[7px] font-black"
      style={{ color: "rgba(255,255,255,0.38)", letterSpacing: "0.2em" }}
    >
      {text}
    </div>
  );
}

function Bulb({ on, color, size = 48 }: { on: boolean; color: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: on
          ? `radial-gradient(circle at 28% 25%, #fff 0 12%, ${color} 44%, color-mix(in oklab, ${color} 68%, #000) 100%)`
          : "radial-gradient(circle at 30% 24%, #333 0 10%, #111 52%, #040404 100%)",
        boxShadow: on
          ? `0 0 ${size * 0.72}px ${color}, 0 0 ${size * 0.26}px ${color} inset, 0 0 0 5px #050505, 0 0 0 7px rgba(255,255,255,0.16)`
          : "inset 0 0 0 2px rgba(255,255,255,0.05), 0 0 0 5px #050505, 0 0 0 7px rgba(255,255,255,0.08), 0 5px 12px rgba(0,0,0,0.65)",
        transition: "background 80ms linear, box-shadow 80ms linear",
      }}
    />
  );
}

export default DragTree;
