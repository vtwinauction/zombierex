import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SettingsScreen, Card } from "@/components/SettingsScreen";
import { setLocale, type Locale } from "@/lib/i18n";


type AppearancePrefs = {
  theme: "dark" | "light" | "system";
  language: "en" | "es" | "fr" | "de" | "pt" | "ar";
  largeText: boolean;
};

const KEY = "zombierex.prefs.v1";
const DEFAULTS: AppearancePrefs = { theme: "dark", language: "en", largeText: false };

function loadPrefs(): AppearancePrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
  catch { return DEFAULTS; }
}

function savePrefs(next: AppearancePrefs) {
  if (typeof window === "undefined") return;
  try {
    const existing = JSON.parse(localStorage.getItem(KEY) || "{}");
    localStorage.setItem(KEY, JSON.stringify({ ...existing, ...next }));
  } catch {}
}

export const Route = createFileRoute("/_authenticated/settings/appearance")({
  head: () => ({ meta: [
    { title: "Appearance · Settings · ZOMBIEREX" },
    { name: "description", content: "Adjust theme, language, and text size preferences for ZOMBIEREX." },
    { property: "og:title", content: "Appearance · Settings · ZOMBIEREX" },
    { property: "og:description", content: "Adjust theme, language, and text size preferences for ZOMBIEREX." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AppearancePage,
});

function AppearancePage() {
  const [prefs, setPrefs] = useState<AppearancePrefs>(DEFAULTS);
  useEffect(() => {
    const loaded = loadPrefs();
    setPrefs(loaded);
    applyPrefs(loaded);
  }, []);
  const update = (next: AppearancePrefs) => { setPrefs(next); savePrefs(next); applyPrefs(next); };


  return (
    <SettingsScreen index="06.10" section="DISPLAY" title="Appearance & language" subtitle="Tune the interface for your device and reading preference.">
      <div className="space-y-3">
        <Card>
          <OptionGroup
            label="Theme"
            value={prefs.theme}
            options={[["dark", "Dark"], ["light", "Light"], ["system", "System"]]}
            onChange={(theme) => update({ ...prefs, theme: theme as AppearancePrefs["theme"] })}
          />
        </Card>
        <Card>
          <OptionGroup
            label="Language"
            value={prefs.language}
            options={[["en", "English"], ["es", "Español"], ["fr", "Français"], ["de", "Deutsch"], ["pt", "Português"], ["ar", "العربية"]]}
            onChange={(language) => update({ ...prefs, language: language as AppearancePrefs["language"] })}
          />
        </Card>
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[14px]" style={{ color: "var(--color-ink)" }}>Larger text</p>
              <p className="mt-1 text-[12px]" style={{ color: "var(--color-silver)" }}>Increase UI text size for easier reading.</p>
            </div>
            <Switch checked={prefs.largeText} onChange={(largeText) => update({ ...prefs, largeText })} />
          </div>
        </Card>
      </div>
    </SettingsScreen>
  );
}

function OptionGroup({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return (
    <div>
      <p className="mono-tag mb-3" style={{ color: "var(--color-silver)" }}>{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(([id, text]) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="mono-tag tap rounded-full px-3 py-2"
            style={{
              background: value === id ? "var(--color-neon)" : "transparent",
              color: value === id ? "#000" : "var(--color-ink)",
              border: "1px solid var(--color-hair-strong)",
            }}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className="tap h-7 w-12 shrink-0 rounded-full transition-colors" style={{ background: checked ? "var(--color-neon)" : "var(--color-hair-strong)", position: "relative" }} aria-pressed={checked}>
      <span style={{ position: "absolute", top: 3, left: checked ? 24 : 3, height: 21, width: 21, borderRadius: 999, background: "#fff", transition: "left .16s ease" }} />
    </button>
  );
}