import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SettingsScreen, Card, TextInput } from "@/components/SettingsScreen";

export const Route = createFileRoute("/_authenticated/settings/content")({
  head: () => ({
    meta: [
      { title: "Content you see · Settings · ZOMBIEREX" },
      { name: "description", content: "Mute words and control sensitive content on ZOMBIEREX." },
    ],
  }),
  component: ContentPage,
});

type Prefs = { muted: string[]; sensitive: "show" | "blur" | "hide" };
const KEY = "zombierex.content.v1";
const DEF: Prefs = { muted: [], sensitive: "blur" };
const load = (): Prefs => {
  try {
    return { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return DEF;
  }
};
const save = (p: Prefs) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
};

function ContentPage() {
  const [p, setP] = useState<Prefs>(DEF);
  const [input, setInput] = useState("");
  useEffect(() => setP(load()), []);
  const update = (n: Prefs) => {
    setP(n);
    save(n);
  };
  const addMuted = () => {
    const w = input.trim().toLowerCase();
    if (!w) return;
    update({ ...p, muted: Array.from(new Set([...p.muted, w])) });
    setInput("");
  };

  return (
    <SettingsScreen
      index="06.05"
      section="CONTENT"
      title="Content you see"
      subtitle="Muted words never appear in your feed, and sensitive posts follow your rule."
    >
      <Card>
        <p className="mono-tag mb-2" style={{ color: "var(--color-silver)" }}>
          Sensitive content
        </p>
        <div className="flex gap-2">
          {(["show", "blur", "hide"] as const).map((k) => (
            <button
              key={k}
              onClick={() => update({ ...p, sensitive: k })}
              className="mono-tag tap px-3 py-1.5 rounded-full"
              style={{
                background: p.sensitive === k ? "var(--color-neon)" : "transparent",
                color: p.sensitive === k ? "#000" : "var(--color-ink)",
                border: "1px solid var(--color-hair-strong)",
              }}
            >
              {k.toUpperCase()}
            </button>
          ))}
        </div>
      </Card>
      <div className="mt-3">
        <Card>
          <p className="mono-tag mb-2" style={{ color: "var(--color-silver)" }}>
            Muted words
          </p>
          <div className="flex gap-2">
            <TextInput
              placeholder="word or phrase"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              onClick={addMuted}
              className="mono-tag tap px-3 rounded-md"
              style={{ background: "var(--color-neon)", color: "#000" }}
            >
              Mute
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {p.muted.map((w) => (
              <span
                key={w}
                className="mono-tag px-2 py-1 rounded-full flex items-center gap-2"
                style={{ border: "1px solid var(--color-hair-strong)", color: "var(--color-ink)" }}
              >
                {w}
                <button
                  onClick={() => update({ ...p, muted: p.muted.filter((x) => x !== w) })}
                  aria-label={`Unmute ${w}`}
                  style={{ color: "var(--color-silver)" }}
                >
                  ×
                </button>
              </span>
            ))}
            {p.muted.length === 0 && (
              <p className="text-[12px]" style={{ color: "var(--color-silver)" }}>
                No muted words yet.
              </p>
            )}
          </div>
        </Card>
      </div>
    </SettingsScreen>
  );
}
