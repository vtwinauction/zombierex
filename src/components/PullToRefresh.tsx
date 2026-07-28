import { useEffect, useRef, useState, type ReactNode } from "react";
import { haptic } from "@/lib/native";

/**
 * Native-feel pull-to-refresh. Wrap any scroll region. When the user
 * pulls down from scrollTop=0 past the threshold and releases, `onRefresh`
 * is called and the indicator shows a spinner until the returned Promise
 * settles.
 *
 * Silent on desktop pointer input (only triggers for touch/pen).
 */
export function PullToRefresh({
  onRefresh,
  threshold = 72,
  maxPull = 120,
  disabled = false,
  scrollTargetRef,
  children,
}: {
  onRefresh: () => Promise<unknown> | unknown;
  threshold?: number;
  maxPull?: number;
  disabled?: boolean;
  scrollTargetRef?: React.RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);
  const armed = useRef(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (disabled) return;
    const el = containerRef.current;
    if (!el) return;

    const atTop = () => {
      const t = scrollTargetRef?.current;
      if (t) return t.scrollTop <= 0;
      return (document.scrollingElement?.scrollTop ?? window.scrollY) <= 0;
    };

    const onStart = (e: TouchEvent) => {
      if (refreshing || !atTop()) return;
      startY.current = e.touches[0]?.clientY ?? null;
      pulling.current = true;
      armed.current = false;
    };
    const onMove = (e: TouchEvent) => {
      if (!pulling.current || startY.current == null) return;
      const dy = (e.touches[0]?.clientY ?? 0) - startY.current;
      if (dy <= 0) { setPull(0); return; }
      if (!atTop()) { setPull(0); pulling.current = false; return; }
      // Resistance curve
      const eased = Math.min(maxPull, dy * 0.55);
      setPull(eased);
      if (eased > 4 && e.cancelable) e.preventDefault();
      if (!armed.current && eased >= threshold) {
        armed.current = true;
        void haptic("light");
      } else if (armed.current && eased < threshold) {
        armed.current = false;
      }
    };
    const onEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      const shouldFire = armed.current;
      startY.current = null;
      if (shouldFire && !refreshing) {
        setRefreshing(true);
        setPull(threshold);
        void haptic("medium");
        try { await onRefresh(); } catch { /* ignore */ }
        setRefreshing(false);
        setPull(0);
      } else {
        setPull(0);
      }
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [onRefresh, threshold, maxPull, disabled, refreshing]);

  const progress = Math.min(1, pull / threshold);
  const rotation = progress * 270;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div
        aria-hidden={!pull && !refreshing}
        style={{
          position: "absolute", top: -56, left: 0, right: 0,
          height: 56, display: "grid", placeItems: "center",
          transform: `translateY(${pull}px)`,
          transition: pulling.current ? "none" : "transform .22s ease",
          pointerEvents: "none",
          zIndex: 5,
        }}
      >
        <div
          style={{
            width: 32, height: 32, borderRadius: 999,
            border: "1px solid var(--color-hair-strong, #2a2d33)",
            background: "var(--color-paper-0, #0f1113)",
            display: "grid", placeItems: "center",
            boxShadow: pull >= threshold || refreshing ? "0 0 18px rgba(0,200,83,0.35)" : "none",
            transition: "box-shadow .18s ease",
          }}
        >
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            style={{
              transform: refreshing ? undefined : `rotate(${rotation}deg)`,
              animation: refreshing ? "zx-spin 0.9s linear infinite" : undefined,
            }}
          >
            <path
              d="M21 12a9 9 0 1 1-3.2-6.9M21 4v5h-5"
              stroke="var(--color-neon, #00c853)"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      <div
        style={{
          transform: `translateY(${pull}px)`,
          transition: pulling.current ? "none" : "transform .22s ease",
          willChange: "transform",
        }}
      >
        {children}
      </div>
      <style>{`@keyframes zx-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
