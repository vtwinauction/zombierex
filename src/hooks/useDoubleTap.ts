import { useCallback, useRef, useState } from "react";

/**
 * Instagram/TikTok-style double-tap detector.
 * Fires `onDoubleTap` (with pointer coords for burst placement) when
 * the same element is tapped twice within `delay` ms, and `onSingleTap`
 * only after the double-tap window has passed.
 */
export function useDoubleTap({
  delay = 260,
  onDoubleTap,
  onSingleTap,
}: {
  delay?: number;
  onDoubleTap?: (pt: { x: number; y: number }) => void;
  onSingleTap?: () => void;
}) {
  const timer = useRef<number | null>(null);
  const last = useRef(0);
  const [burstAt, setBurstAt] = useState<{ x: number; y: number; k: number } | null>(null);
  const kRef = useRef(0);

  const onClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const now = Date.now();
    const target = e.currentTarget.getBoundingClientRect();
    const pt = { x: e.clientX - target.left, y: e.clientY - target.top };
    if (now - last.current < delay) {
      last.current = 0;
      if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
      kRef.current += 1;
      setBurstAt({ ...pt, k: kRef.current });
      onDoubleTap?.(pt);
      return;
    }
    last.current = now;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      onSingleTap?.();
    }, delay);
  }, [delay, onDoubleTap, onSingleTap]);

  return { onClick, burstAt };
}
