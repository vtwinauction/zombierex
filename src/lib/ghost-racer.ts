/**
 * GhostRacer — deterministic AI opponent generator.
 *
 * Given a target 1/4 mile ET, produces a speed(t) curve using a simple
 * traction-limited model: exponential rise to terminal speed, tuned so
 * distance_at(targetET) ≈ 402.336 m. Provides live speed/distance at any t.
 */

export type GhostPreset = {
  id: string;
  label: string;
  targetEtS: number; // 1/4 mile
  trapKmh: number; // ~ trap
  reactionMs: number; // AI reaction
};

export const GHOST_PRESETS: GhostPreset[] = [
  { id: "street", label: "STREET · 14.5s", targetEtS: 14.5, trapKmh: 155, reactionMs: 320 },
  { id: "sport", label: "SPORT · 12.0s", targetEtS: 12.0, trapKmh: 190, reactionMs: 260 },
  { id: "super", label: "SUPERSPORT · 10.5s", targetEtS: 10.5, trapKmh: 220, reactionMs: 220 },
  { id: "pro", label: "PRO · 9.2s", targetEtS: 9.2, trapKmh: 250, reactionMs: 180 },
  { id: "hyper", label: "HYPER · 8.0s", targetEtS: 8.0, trapKmh: 280, reactionMs: 150 },
];

/**
 * v(t) = vMax * (1 - exp(-k * t))
 * d(t) = vMax * t + (vMax/k) * (exp(-k * t) - 1)
 *
 * Solve for k so that d(ET) = 402.336m given vMax = trap (m/s).
 */
export class Ghost {
  readonly vMax: number; // m/s
  readonly k: number;
  readonly reactionMs: number;
  readonly preset: GhostPreset;

  constructor(preset: GhostPreset) {
    this.preset = preset;
    this.vMax = preset.trapKmh / 3.6;
    this.reactionMs = preset.reactionMs;
    // Binary search k in [0.05, 3.0]
    const target = 402.336;
    const et = preset.targetEtS;
    let lo = 0.05,
      hi = 3.0;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      const d = this.vMax * et + (this.vMax / mid) * (Math.exp(-mid * et) - 1);
      if (d > target) lo = mid;
      else hi = mid;
    }
    this.k = (lo + hi) / 2;
  }

  /** Seconds elapsed since GREEN. Returns 0 during reaction window. */
  speedKmh(tSinceGreenMs: number): number {
    const tLaunch = (tSinceGreenMs - this.reactionMs) / 1000;
    if (tLaunch <= 0) return 0;
    return this.vMax * (1 - Math.exp(-this.k * tLaunch)) * 3.6;
  }

  distanceM(tSinceGreenMs: number): number {
    const tLaunch = (tSinceGreenMs - this.reactionMs) / 1000;
    if (tLaunch <= 0) return 0;
    return this.vMax * tLaunch + (this.vMax / this.k) * (Math.exp(-this.k * tLaunch) - 1);
  }

  /** Time (ms from GREEN) at which cumulative distance passes `targetM`. */
  timeAtDistanceMs(targetM: number): number {
    // Simple bisection on t
    let lo = 0,
      hi = 60;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (this.distanceM(mid * 1000 + this.reactionMs) < targetM) lo = mid;
      else hi = mid;
    }
    return this.reactionMs + ((lo + hi) / 2) * 1000;
  }
}
