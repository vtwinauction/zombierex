import { useEffect, useRef, useState } from "react";

/**
 * Detects window scroll direction with a small threshold so micro-bounces
 * don't constantly toggle the chrome. Returns "up" | "down" | null before
 * any scroll has happened.
 */
export function useScrollDirection(threshold = 12) {
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const lastY = useRef(0);
  const lastDelta = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    lastY.current = window.scrollY;

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        const delta = y - lastY.current;

        // Ignore tiny bounces and direction reversals below threshold.
        if (Math.abs(delta) < threshold) return;
        if (Math.sign(delta) === Math.sign(lastDelta.current) && Math.abs(delta) < threshold * 2)
          return;

        lastY.current = y;
        lastDelta.current = delta;
        setDirection(delta > 0 ? "down" : "up");
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [threshold]);

  return direction;
}
