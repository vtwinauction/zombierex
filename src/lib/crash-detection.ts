/**
 * Crash detection — listens to DeviceMotion, flags an impact when the
 * total acceleration spikes past a threshold. Riders get a countdown to
 * cancel before the SOS auto-fires.
 *
 * Web sensors are noisy, so we look at the resultant magnitude of
 * accelerationIncludingGravity (m/s²) and require a hard, sudden spike.
 */

export type CrashOptions = {
  /** m/s² total-vector spike above which we consider a crash candidate. Default 40 (~4g). */
  threshold?: number;
  /** ms — window between an accepted event and the next. */
  cooldownMs?: number;
  /** Called when a candidate impact is detected. */
  onImpact: (peakG: number) => void;
};

export type CrashDetector = {
  start: () => Promise<"granted" | "denied" | "unsupported">;
  stop: () => void;
  isRunning: () => boolean;
};

export function createCrashDetector(opts: CrashOptions): CrashDetector {
  const threshold = opts.threshold ?? 40;
  const cooldown = opts.cooldownMs ?? 15_000;
  let running = false;
  let lastFire = 0;

  const handler = (ev: DeviceMotionEvent) => {
    const a = ev.accelerationIncludingGravity;
    if (!a) return;
    const x = a.x ?? 0,
      y = a.y ?? 0,
      z = a.z ?? 0;
    const mag = Math.sqrt(x * x + y * y + z * z);
    if (mag < threshold) return;
    const now = Date.now();
    if (now - lastFire < cooldown) return;
    lastFire = now;
    opts.onImpact(mag / 9.80665);
  };

  return {
    isRunning: () => running,
    stop: () => {
      if (typeof window === "undefined") return;
      window.removeEventListener("devicemotion", handler);
      running = false;
    },
    start: async () => {
      if (
        typeof window === "undefined" ||
        typeof (window as any).DeviceMotionEvent === "undefined"
      ) {
        return "unsupported";
      }
      const anyDM: any = (window as any).DeviceMotionEvent;
      if (typeof anyDM.requestPermission === "function") {
        try {
          const state = await anyDM.requestPermission();
          if (state !== "granted") return "denied";
        } catch {
          return "denied";
        }
      }
      window.addEventListener("devicemotion", handler, { passive: true });
      running = true;
      return "granted";
    },
  };
}
