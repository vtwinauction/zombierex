import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  createCampaign,
  AD_OBJECTIVES,
  AD_PLACEMENTS,
  AD_CREATIVE_KINDS,
} from "@/lib/ads.functions";

export const Route = createFileRoute("/_authenticated/ads/new")({
  head: () => ({ meta: [{ title: "New campaign · ZOMBIEREX" }] }),
  component: NewCampaign,
});

function NewCampaign() {
  const nav = useNavigate();
  const create = useServerFn(createCampaign);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [objective, setObjective] = useState<string>("post_engagement");
  const [placements, setPlacements] = useState<string[]>(["feed"]);
  const [budget, setBudget] = useState(2000); // cents
  const [days, setDays] = useState(7);
  const [countries, setCountries] = useState("");
  const [interests, setInterests] = useState("motorcycles, moto, riding");

  const [kind, setKind] = useState<string>("post");
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Learn more");
  const [ctaUrl, setCtaUrl] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");

  const toggle = (p: string) =>
    setPlacements((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const now = Date.now();
      await create({
        data: {
          campaign: {
            name: name.trim(),
            objective: objective as any,
            budget_total_cents: budget,
            budget_daily_cents: Math.round(budget / Math.max(1, days)),
            currency: "usd",
            start_at: new Date(now).toISOString(),
            end_at: new Date(now + days * 86400000).toISOString(),
            placements: placements as any,
            geo_countries: countries
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            geo_cities: [],
            interests: interests
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          },
          creative: {
            kind: kind as any,
            headline: headline || undefined,
            body: body || undefined,
            cta_label: ctaLabel || undefined,
            cta_url: ctaUrl || undefined,
            media_url: mediaUrl || undefined,
          },
        },
      });
      nav({ to: "/ads" });
    } catch (e: any) {
      setErr(e?.message ?? "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle = {
    background: "var(--color-obsidian)",
    border: "1px solid var(--color-hair)",
    borderRadius: 8,
    color: "var(--color-ink)",
  } as const;

  return (
    <div className="pb-32">
      <header className="px-5 pt-8">
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>
          ◆ NEW CAMPAIGN
        </p>
        <h1 className="serif mt-2 text-3xl" style={{ color: "var(--color-ink)" }}>
          Boost & promote
        </h1>
      </header>

      <form onSubmit={onSubmit} className="mt-6 space-y-6 px-5">
        <section className="space-y-3">
          <p className="mono-tag" style={{ color: "var(--color-silver)" }}>
            CAMPAIGN
          </p>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Campaign name"
            className="w-full px-3 py-2 text-[13px]"
            style={fieldStyle}
          />
          <select
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            className="w-full px-3 py-2 text-[13px]"
            style={fieldStyle}
          >
            {AD_OBJECTIVES.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </select>
          <div>
            <p className="mono-tag mb-2" style={{ color: "var(--color-silver)", fontSize: 9 }}>
              PLACEMENTS
            </p>
            <div className="flex flex-wrap gap-2">
              {AD_PLACEMENTS.map((p) => {
                const on = placements.includes(p.code);
                return (
                  <button
                    type="button"
                    key={p.code}
                    onClick={() => toggle(p.code)}
                    className="tap px-3 py-1.5 text-[11px]"
                    style={{
                      background: on ? "var(--color-neon)" : "var(--color-obsidian)",
                      color: on ? "#000" : "var(--color-ink)",
                      border: "1px solid var(--color-hair)",
                      borderRadius: 8,
                      fontWeight: on ? 600 : 400,
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px]" style={{ color: "var(--color-silver)" }}>
              Budget (USD)
              <input
                type="number"
                min={1}
                value={budget / 100}
                onChange={(e) => setBudget(Math.round(+e.target.value * 100))}
                className="mt-1 w-full px-3 py-2 text-[13px]"
                style={fieldStyle}
              />
            </label>
            <label className="text-[11px]" style={{ color: "var(--color-silver)" }}>
              Duration (days)
              <input
                type="number"
                min={1}
                max={90}
                value={days}
                onChange={(e) => setDays(+e.target.value)}
                className="mt-1 w-full px-3 py-2 text-[13px]"
                style={fieldStyle}
              />
            </label>
          </div>
          <input
            value={countries}
            onChange={(e) => setCountries(e.target.value)}
            placeholder="Countries (comma separated, blank = worldwide)"
            className="w-full px-3 py-2 text-[13px]"
            style={fieldStyle}
          />
          <input
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="Interests (comma separated)"
            className="w-full px-3 py-2 text-[13px]"
            style={fieldStyle}
          />
        </section>

        <section className="space-y-3">
          <p className="mono-tag" style={{ color: "var(--color-silver)" }}>
            CREATIVE
          </p>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="w-full px-3 py-2 text-[13px]"
            style={fieldStyle}
          >
            {AD_CREATIVE_KINDS.map((k) => (
              <option key={k} value={k}>
                {k.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Headline"
            className="w-full px-3 py-2 text-[13px]"
            style={fieldStyle}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Body copy"
            rows={3}
            className="w-full px-3 py-2 text-[13px]"
            style={fieldStyle}
          />
          <input
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="Image URL (optional)"
            className="w-full px-3 py-2 text-[13px]"
            style={fieldStyle}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              placeholder="CTA label"
              className="px-3 py-2 text-[13px]"
              style={fieldStyle}
            />
            <input
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              placeholder="https://"
              className="px-3 py-2 text-[13px]"
              style={fieldStyle}
            />
          </div>
        </section>

        {headline && (
          <section>
            <p className="mono-tag mb-2" style={{ color: "var(--color-silver)" }}>
              PREVIEW
            </p>
            <div
              className="p-4"
              style={{
                background: "var(--color-graphite)",
                border: "1px solid var(--color-hair)",
                borderRadius: 12,
              }}
            >
              <span className="mono-tag" style={{ color: "var(--color-neon)", fontSize: 9 }}>
                ◆ SPONSORED
              </span>
              {mediaUrl && (
                <img
                  src={mediaUrl}
                  alt=""
                  className="mt-2 aspect-video w-full rounded object-cover"
                />
              )}
              <h3 className="serif mt-2 text-lg" style={{ color: "var(--color-ink)" }}>
                {headline}
              </h3>
              {body && (
                <p className="mt-1 text-[13px]" style={{ color: "var(--color-silver)" }}>
                  {body}
                </p>
              )}
              {ctaLabel && (
                <div
                  className="mt-2 inline-block px-3 py-1.5 text-[11px]"
                  style={{ background: "var(--color-neon)", color: "#000", borderRadius: 8 }}
                >
                  {ctaLabel}
                </div>
              )}
            </div>
          </section>
        )}

        {err && (
          <p className="text-[12px]" style={{ color: "#ff8080" }}>
            {err}
          </p>
        )}

        <button
          disabled={saving || placements.length === 0}
          type="submit"
          className="tap w-full px-4 py-3 text-[13px]"
          style={{
            background: "var(--color-neon)",
            color: "#000",
            borderRadius: 10,
            fontWeight: 600,
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Creating…" : "Save as draft"}
        </button>
        <p className="mono-tag text-center" style={{ color: "var(--color-silver)", fontSize: 9 }}>
          Drafts are reviewed then activated from Ads Manager.
        </p>
      </form>
    </div>
  );
}
