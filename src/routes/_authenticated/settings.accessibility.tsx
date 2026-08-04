import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SettingsScreen, Card } from "@/components/SettingsScreen";

type AccessibilityPrefs = { reducedMotion: boolean; highContrast: boolean };

const KEY = "zombierex.prefs.v1";
const DEFAULTS: AccessibilityPrefs = { reducedMotion: false, highContrast: false };

function loadPrefs(): AccessibilityPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return DEFAULTS;
  }
}

function savePrefs(next: AccessibilityPrefs) {
  if (typeof window === "undefined") return;
  try {
    const existing = JSON.parse(localStorage.getItem(KEY) || "{}");
    localStorage.setItem(KEY, JSON.stringify({ ...existing, ...next }));
  } catch {}
}

export const Route = createFileRoute("/_authenticated/settings/accessibility")({
  head: () => ({
    meta: [
      { title: "Accessibility · Settings · ZOMBIEREX" },
      {
        name: "description",
        content: "Set motion and contrast preferences for a more comfortable ZOMBIEREX experience.",
      },
      { property: "og:title", content: "Accessibility · Settings · ZOMBIEREX" },
      {
        property: "og:description",
        content: "Set motion and contrast preferences for a more comfortable ZOMBIEREX experience.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccessibilityPage,
});

function AccessibilityPage() {
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(DEFAULTS);
  useEffect(() => setPrefs(loadPrefs()), []);
  const update = (next: AccessibilityPrefs) => {
    setPrefs(next);
    savePrefs(next);
  };

  return (
    <SettingsScreen
      index="06.11"
      section="ACCESS"
      title="Accessibility"
      subtitle="Make ZOMBIEREX easier to use while riding, browsing, or reviewing media."
    >
      <div className="space-y-3">
        <PreferenceSwitch
          label="Reduce motion"
          hint="Minimise animations and transitions throughout the app."
          checked={prefs.reducedMotion}
          onChange={(reducedMotion) => update({ ...prefs, reducedMotion })}
        />
        <PreferenceSwitch
          label="High contrast"
          hint="Boost contrast on controls, labels, and key status indicators."
          checked={prefs.highContrast}
          onChange={(highContrast) => update({ ...prefs, highContrast })}
        />
      </div>
    </SettingsScreen>
  );
}

function PreferenceSwitch({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[14px]" style={{ color: "var(--color-ink)" }}>
            {label}
          </p>
          <p className="mt-1 text-[12px]" style={{ color: "var(--color-silver)" }}>
            {hint}
          </p>
        </div>
        <button
          onClick={() => onChange(!checked)}
          className="tap h-7 w-12 shrink-0 rounded-full transition-colors"
          style={{
            background: checked ? "var(--color-neon)" : "var(--color-hair-strong)",
            position: "relative",
          }}
          aria-pressed={checked}
        >
          <span
            style={{
              position: "absolute",
              top: 3,
              left: checked ? 24 : 3,
              height: 21,
              width: 21,
              borderRadius: 999,
              background: "#fff",
              transition: "left .16s ease",
            }}
          />
        </button>
      </div>
    </Card>
  );
}
