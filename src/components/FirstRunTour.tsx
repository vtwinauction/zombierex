import { useEffect, useState } from "react";
import { haptic } from "@/lib/native";
import { useMarketingMode } from "@/lib/marketing-mode";

/**
 * Lightweight first-run coach tour. Shows a 4-step overlay introducing the
 * core ZOMBIEREX pillars. Stores completion in localStorage so it never
 * repeats. Users can skip at any time.
 */
const STORAGE_KEY = "zx:tour:v1:done";

const STEPS: Array<{
  tag: string;
  title: string;
  body: string;
  accent?: string;
}> = [
  {
    tag: "◆ WELCOME",
    title: "This is ZOMBIEREX.",
    body: "Precision social built for riders and drivers. Let's show you around — takes 20 seconds.",
  },
  {
    tag: "▸ FEED · REELS",
    title: "Your garage, in motion.",
    body: "Vertical reels, telemetry posts, and stories from the riders you follow. Long-press any post for report / mute / block.",
  },
  {
    tag: "▸ ATLAS · DRAG",
    title: "GPS-verified performance.",
    body: "Record routes, ride with a live group, or launch a verified drag run with a live Christmas tree and ghost racer.",
  },
  {
    tag: "▸ MARKETPLACE · COMMS",
    title: "Trade, talk, ride.",
    body: "Buy and sell bikes and parts in the Vault, DM other riders, and join communities. You're all set.",
    accent: "GET RIDING",
  },
];

export function FirstRunTour() {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  // Never interrupt a public marketing page with the in-app coach tour.
  const marketing = useMarketingMode();

  useEffect(() => {
    if (typeof window === "undefined" || marketing) return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        // Delay a beat so it doesn't fight initial hydration.
        const t = setTimeout(() => setOpen(true), 900);
        return () => clearTimeout(t);
      }
    } catch {
      /* ignore */
    }
  }, [marketing]);

  function finish() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
    void haptic("light");
  }

  function next() {
    if (i >= STEPS.length - 1) return finish();
    void haptic("light");
    setI(i + 1);
  }

  if (!open || marketing) return null;
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ZOMBIEREX product tour"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        background: "rgba(4,6,8,0.72)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "grid",
        placeItems: "end center",
        paddingBottom: "calc(96px + env(safe-area-inset-bottom))",
        paddingLeft: 16,
        paddingRight: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) finish();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--color-paper-0, #0f1113)",
          border: "1px solid var(--color-hair-strong, #2a2d33)",
          borderRadius: 14,
          padding: 20,
          boxShadow: "0 0 40px rgba(0,200,83,0.18)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p
            className="mono-tag"
            style={{ color: "var(--color-neon, #00c853)", letterSpacing: 1.4 }}
          >
            {step.tag}
          </p>
          <button
            onClick={finish}
            className="mono-tag"
            style={{ color: "var(--color-titanium, #8a8f97)", padding: 4 }}
            aria-label="Skip tour"
          >
            SKIP
          </button>
        </div>

        <h2
          className="serif"
          style={{
            marginTop: 10,
            fontSize: 22,
            lineHeight: 1.15,
            color: "var(--color-ink, #f4f5f6)",
          }}
        >
          {step.title}
        </h2>
        <p
          style={{
            marginTop: 10,
            fontSize: 13.5,
            lineHeight: 1.5,
            color: "var(--color-silver, #c8cbd0)",
          }}
        >
          {step.body}
        </p>

        <div style={{ marginTop: 16, display: "flex", gap: 6 }}>
          {STEPS.map((_, idx) => (
            <span
              key={idx}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background:
                  idx <= i ? "var(--color-neon, #00c853)" : "var(--color-hair-strong, #2a2d33)",
                transition: "background .2s ease",
              }}
            />
          ))}
        </div>

        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
          <button
            onClick={finish}
            className="tap"
            style={{
              padding: "12px 14px",
              border: "1px solid var(--color-hair-strong, #2a2d33)",
              color: "var(--color-ink, #f4f5f6)",
              borderRadius: 10,
              fontSize: 12,
              letterSpacing: 1.1,
              textTransform: "uppercase",
            }}
          >
            Dismiss
          </button>
          <button
            onClick={next}
            className="tap"
            style={{
              padding: "12px 18px",
              background: "var(--color-neon, #00c853)",
              color: "#04110a",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              boxShadow: "0 0 22px rgba(0,200,83,0.35)",
            }}
          >
            {last ? (step.accent ?? "Done") : `Next · ${i + 2}/${STEPS.length}`}
          </button>
        </div>
      </div>
    </div>
  );
}
