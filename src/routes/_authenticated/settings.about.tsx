import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SettingsScreen, Card } from "@/components/SettingsScreen";
import { isNative, platform } from "@/lib/native";

export const Route = createFileRoute("/_authenticated/settings/about")({
  head: () => ({ meta: [{ title: "About · ZOMBIEREX" }, { name: "description", content: "App version, build and credits for ZOMBIEREX." }] }),
  component: AboutPage,
});

const APP_VERSION = "1.0.0";
const BUILD_NAME = "Signal";
const CHANNEL = "Stable";

type NativeInfo = {
  appVersion?: string;
  appBuild?: string;
  osVersion?: string;
  model?: string;
  manufacturer?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadPlugin<T = any>(name: string): Promise<T | null> {
  try { return (await import(/* @vite-ignore */ name)) as T; } catch { return null; }
}

function AboutPage() {
  const [native, setNative] = useState<NativeInfo | null>(null);
  const runtime = isNative() ? platform() : "web";

  useEffect(() => {
    let cancelled = false;
    if (!isNative()) return;
    (async () => {
      const info: NativeInfo = {};
      const appMod = await loadPlugin<{ App: { getInfo: () => Promise<{ version: string; build: string }> } }>("@capacitor/app");
      try {
        const a = await appMod?.App.getInfo();
        if (a) { info.appVersion = a.version; info.appBuild = a.build; }
      } catch { /* ignore */ }
      const devMod = await loadPlugin<{ Device: { getInfo: () => Promise<{ osVersion: string; model: string; manufacturer: string }> } }>("@capacitor/device");
      try {
        const d = await devMod?.Device.getInfo();
        if (d) { info.osVersion = d.osVersion; info.model = d.model; info.manufacturer = d.manufacturer; }
      } catch { /* ignore */ }
      if (!cancelled) setNative(info);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <SettingsScreen index="06.13" section="ABOUT" title="About ZOMBIEREX" subtitle="The world's premium platform for motorcycle and automotive culture.">
      <div className="space-y-3">
        <Card>
          <div className="grid grid-cols-2 gap-y-2 text-[13px]">
            <span style={{ color: "var(--color-silver)" }}>Version</span>
            <span style={{ color: "var(--color-ink)" }}>{native?.appVersion ?? APP_VERSION}</span>
            <span style={{ color: "var(--color-silver)" }}>Build</span>
            <span style={{ color: "var(--color-ink)" }}>{native?.appBuild ? `${BUILD_NAME} (${native.appBuild})` : `“${BUILD_NAME}”`}</span>
            <span style={{ color: "var(--color-silver)" }}>Channel</span>
            <span style={{ color: "var(--color-ink)" }}>{CHANNEL}</span>
            <span style={{ color: "var(--color-silver)" }}>Runtime</span>
            <span className="uppercase tracking-wider" style={{ color: "var(--color-neon)" }}>{runtime}</span>
          </div>
        </Card>

        {native && (native.model || native.osVersion) && (
          <Card>
            <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--color-silver)" }}>Device</p>
            <div className="mt-2 grid grid-cols-2 gap-y-2 text-[13px]">
              {native.manufacturer && <><span style={{ color: "var(--color-silver)" }}>Manufacturer</span><span style={{ color: "var(--color-ink)" }}>{native.manufacturer}</span></>}
              {native.model && <><span style={{ color: "var(--color-silver)" }}>Model</span><span style={{ color: "var(--color-ink)" }}>{native.model}</span></>}
              {native.osVersion && <><span style={{ color: "var(--color-silver)" }}>OS</span><span style={{ color: "var(--color-ink)" }}>{platform()} {native.osVersion}</span></>}
            </div>
          </Card>
        )}

        <Card>
          <p className="serif text-[16px] italic" style={{ color: "var(--color-ink)" }}>Credits</p>
          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--color-silver)" }}>
            Built by riders for riders. Design language inspired by Apple, Porsche, DJI and Tesla.
            Powered by Lovable Cloud, TanStack Start, Google Maps and Gemini AI.
          </p>
        </Card>

        <Card>
          <div className="flex flex-wrap gap-3 text-[13px]">
            <Link to="/settings/terms" style={{ color: "var(--color-neon)" }}>Terms of service</Link>
            <Link to="/settings/privacy" style={{ color: "var(--color-neon)" }}>Privacy policy</Link>
            <Link to="/settings/help" style={{ color: "var(--color-neon)" }}>Help centre</Link>
          </div>
        </Card>
      </div>
    </SettingsScreen>
  );
}
