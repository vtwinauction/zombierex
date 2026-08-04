/**
 * Christmas Tree — drag-strip start light state machine.
 *
 * Sequence (Pro Tree = all 3 amber together after 0.4s, then green 0.4s later.
 *           Sportsman Tree = amber cascade 0.5s each, then green 0.5s later.)
 *
 * Emits lightweight WebAudio beeps for pre-stage/stage/amber/green/foul.
 * Foul (jump start) fires if launch is detected before `greenAt`.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export type TreeMode = "pro" | "sportsman";
export type TreePhase =
  | "idle"
  | "prestage"
  | "stage"
  | "armed"
  | "amber1"
  | "amber2"
  | "amber3"
  | "green"
  | "foul"
  | "done";

export interface TreeState {
  phase: TreePhase;
  mode: TreeMode;
  greenAt: number | null; // performance.now() timestamp
  launchedAt: number | null;
  reactionMs: number | null; // launchedAt - greenAt (negative = foul)
  foul: boolean;
}

let audioCtx: AudioContext | null = null;
function beep(freq: number, dur = 0.09, gain = 0.14) {
  try {
    if (typeof window === "undefined") return;
    audioCtx ??= new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g).connect(ctx.destination);
    osc.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.stop(ctx.currentTime + dur + 0.02);
  } catch {}
}

export function useChristmasTree(mode: TreeMode = "sportsman") {
  const [state, setState] = useState<TreeState>({
    phase: "idle",
    mode,
    greenAt: null,
    launchedAt: null,
    reactionMs: null,
    foul: false,
  });
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setState({
      phase: "idle",
      mode,
      greenAt: null,
      launchedAt: null,
      reactionMs: null,
      foul: false,
    });
  }, [clearTimers, mode]);

  const start = useCallback(() => {
    clearTimers();
    setState((s) => ({
      ...s,
      phase: "prestage",
      greenAt: null,
      launchedAt: null,
      reactionMs: null,
      foul: false,
    }));
    beep(660);

    // Randomized delay before stage → 0.6–1.4s to prevent anticipation
    const stageDelay = 600 + Math.random() * 800;
    timers.current.push(
      window.setTimeout(() => {
        setState((s) => ({ ...s, phase: "stage" }));
        beep(660);
      }, 500),
    );
    timers.current.push(
      window.setTimeout(() => {
        setState((s) => ({ ...s, phase: "armed" }));
      }, 500 + stageDelay),
    );

    const gap = mode === "pro" ? 0 : 500;
    const base = 500 + stageDelay + 400;

    if (mode === "pro") {
      // Pro tree: all three amber at once
      timers.current.push(
        window.setTimeout(() => {
          setState((s) => ({ ...s, phase: "amber3" }));
          beep(880);
        }, base),
      );
      timers.current.push(
        window.setTimeout(() => {
          const t = performance.now();
          setState((s) => ({ ...s, phase: "green", greenAt: t }));
          beep(1320, 0.22, 0.2);
        }, base + 400),
      );
    } else {
      // Sportsman: cascade
      timers.current.push(
        window.setTimeout(() => {
          setState((s) => ({ ...s, phase: "amber1" }));
          beep(770);
        }, base),
      );
      timers.current.push(
        window.setTimeout(() => {
          setState((s) => ({ ...s, phase: "amber2" }));
          beep(880);
        }, base + gap),
      );
      timers.current.push(
        window.setTimeout(
          () => {
            setState((s) => ({ ...s, phase: "amber3" }));
            beep(990);
          },
          base + gap * 2,
        ),
      );
      timers.current.push(
        window.setTimeout(
          () => {
            const t = performance.now();
            setState((s) => ({ ...s, phase: "green", greenAt: t }));
            beep(1320, 0.22, 0.2);
          },
          base + gap * 3,
        ),
      );
    }
  }, [mode, clearTimers]);

  /** Report a launch (speed crossed threshold). */
  const reportLaunch = useCallback(() => {
    setState((s) => {
      if (s.launchedAt != null) return s;
      const now = performance.now();
      const green = s.greenAt;
      if (green == null) {
        beep(220, 0.6, 0.24);
        return { ...s, phase: "foul", launchedAt: now, reactionMs: null, foul: true };
      }
      return { ...s, launchedAt: now, reactionMs: now - green, foul: false };
    });
  }, []);

  const finish = useCallback(() => setState((s) => ({ ...s, phase: "done" })), []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return { state, start, reset, reportLaunch, finish };
}
