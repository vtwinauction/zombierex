import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SettingsScreen, Card, PrimaryButton } from "@/components/SettingsScreen";

type DataPrefs = {
  autoplay: "always" | "wifi" | "never";
  downloadQuality: "auto" | "high" | "data-saver";
};

const KEY = "zombierex.prefs.v1";
const DEFAULTS: DataPrefs = { autoplay: "wifi", downloadQuality: "auto" };

function loadPrefs(): DataPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return DEFAULTS;
  }
}

function savePrefs(next: DataPrefs) {
  if (typeof window === "undefined") return;
  try {
    const existing = JSON.parse(localStorage.getItem(KEY) || "{}");
    localStorage.setItem(KEY, JSON.stringify({ ...existing, ...next }));
  } catch {}
}

export const Route = createFileRoute("/_authenticated/settings/data")({
  head: () => ({
    meta: [
      { title: "Data & storage · Settings · ZOMBIEREX" },
      {
        name: "description",
        content: "Manage video autoplay, download quality, and local cache storage in ZOMBIEREX.",
      },
      { property: "og:title", content: "Data & storage · Settings · ZOMBIEREX" },
      {
        property: "og:description",
        content: "Manage video autoplay, download quality, and local cache storage in ZOMBIEREX.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DataPage,
});

function DataPage() {
  const [prefs, setPrefs] = useState<DataPrefs>(DEFAULTS);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => setPrefs(loadPrefs()), []);
  const update = (next: DataPrefs) => {
    setPrefs(next);
    savePrefs(next);
  };

  const clearCache = async () => {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      setMessage("Cache cleared.");
    } catch {
      setMessage("Cache cleared on this device where supported.");
    }
  };

  return (
    <SettingsScreen
      index="06.12"
      section="DATA"
      title="Data & storage"
      subtitle="Control how media loads and how much local storage ZOMBIEREX uses."
    >
      <div className="space-y-3">
        <Card>
          <OptionGroup
            label="Download quality"
            value={prefs.downloadQuality}
            options={[
              ["auto", "Auto"],
              ["high", "High"],
              ["data-saver", "Data saver"],
            ]}
            onChange={(downloadQuality) =>
              update({ ...prefs, downloadQuality: downloadQuality as DataPrefs["downloadQuality"] })
            }
          />
        </Card>
        <Card>
          <OptionGroup
            label="Video autoplay"
            value={prefs.autoplay}
            options={[
              ["always", "Always"],
              ["wifi", "Wi‑Fi only"],
              ["never", "Never"],
            ]}
            onChange={(autoplay) =>
              update({ ...prefs, autoplay: autoplay as DataPrefs["autoplay"] })
            }
          />
        </Card>
        <Card>
          <p className="text-[14px]" style={{ color: "var(--color-ink)" }}>
            Clear cache
          </p>
          <p className="mt-1 text-[12px]" style={{ color: "var(--color-silver)" }}>
            Remove temporary images and route data stored on this device.
          </p>
          <div className="mt-4">
            <PrimaryButton onClick={clearCache}>Clear cache</PrimaryButton>
          </div>
          {message && (
            <p className="mt-2 text-[12px]" style={{ color: "var(--color-neon)" }}>
              {message}
            </p>
          )}
        </Card>
      </div>
    </SettingsScreen>
  );
}

function OptionGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mono-tag mb-3" style={{ color: "var(--color-silver)" }}>
        {label}
      </p>
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
