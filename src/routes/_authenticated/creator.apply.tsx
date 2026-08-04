import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { applyAsCreator, getMyCreatorProfile, CREATOR_CATEGORIES } from "@/lib/creator.functions";

export const Route = createFileRoute("/_authenticated/creator/apply")({
  head: () => ({ meta: [{ title: "Apply as creator · ZOMBIEREX" }] }),
  component: ApplyPage,
});

const CATEGORY_LABEL: Record<string, string> = {
  motorcycle_builder: "Motorcycle Builder",
  custom_bike_builder: "Custom Bike Builder",
  car_builder: "Car Builder",
  racer: "Racer",
  drifter: "Drifter",
  drag_racer: "Drag Racer",
  detailer: "Detailer",
  photographer: "Photographer",
  videographer: "Videographer",
  mechanic: "Mechanic",
  reviewer: "Automotive Reviewer",
  club: "Club",
  event_organizer: "Event Organizer",
  influencer: "Influencer",
  other: "Other",
};

function ApplyPage() {
  const navigate = useNavigate();
  const getMy = useServerFn(getMyCreatorProfile);
  const apply = useServerFn(applyAsCreator);
  const { data: existing } = useQuery({ queryKey: ["my-creator"], queryFn: () => getMy() });

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    category: "motorcycle_builder" as (typeof CREATOR_CATEGORIES)[number],
    tagline: "",
    portfolio_url: "",
    collab_email: "",
    accepts_collabs: true,
    instagram: "",
    youtube: "",
    tiktok: "",
    twitter: "",
    website: "",
  });

  useEffect(() => {
    if (!existing) return;
    const s = (existing as any).social_links ?? {};
    setForm((f) => ({
      ...f,
      category: (existing as any).category ?? f.category,
      tagline: (existing as any).tagline ?? "",
      portfolio_url: (existing as any).portfolio_url ?? "",
      collab_email: (existing as any).collab_email ?? "",
      accepts_collabs: (existing as any).accepts_collabs ?? true,
      instagram: s.instagram ?? "",
      youtube: s.youtube ?? "",
      tiktok: s.tiktok ?? "",
      twitter: s.twitter ?? "",
      website: s.website ?? "",
    }));
  }, [existing]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await apply({
        data: {
          category: form.category,
          tagline: form.tagline,
          portfolio_url: form.portfolio_url,
          collab_email: form.collab_email,
          accepts_collabs: form.accepts_collabs,
          social_links: {
            instagram: form.instagram || null,
            youtube: form.youtube || null,
            tiktok: form.tiktok || null,
            twitter: form.twitter || null,
            website: form.website || null,
          },
        },
      });
      navigate({ to: "/creator/dashboard" });
    } catch (e: any) {
      setErr(e?.message ?? "Failed to submit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pb-24">
      <div className="px-4 pt-6">
        <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
          CREATOR PROGRAM
        </p>
        <h1 className="serif mt-2 text-4xl italic" style={{ color: "var(--color-ink)" }}>
          Apply
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--color-silver)" }}>
          Unlock monetization, analytics, brand collabs and a verified creator badge. Reviewed by
          the team within 48h.
        </p>

        {existing && (existing as any).status && (
          <div
            className="mt-4 border p-3"
            style={{ borderColor: "var(--color-hair-strong)", background: "rgba(163,255,26,0.05)" }}
          >
            <p className="mono-tag font-bold" style={{ color: "var(--color-neon)" }}>
              CURRENT STATUS · {String((existing as any).status).toUpperCase()}
            </p>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Creator category">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as any })}
              className="input"
            >
              {CREATOR_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Tagline">
            <input
              maxLength={200}
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              className="input"
              placeholder="Custom Ducati builds · Bay Area"
            />
          </Field>

          <Field label="Portfolio URL">
            <input
              type="url"
              value={form.portfolio_url}
              onChange={(e) => setForm({ ...form, portfolio_url: e.target.value })}
              className="input"
              placeholder="https://…"
            />
          </Field>

          <Field label="Collaboration email">
            <input
              type="email"
              value={form.collab_email}
              onChange={(e) => setForm({ ...form, collab_email: e.target.value })}
              className="input"
              placeholder="collabs@…"
            />
          </Field>

          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--color-ink)" }}>
            <input
              type="checkbox"
              checked={form.accepts_collabs}
              onChange={(e) => setForm({ ...form, accepts_collabs: e.target.checked })}
            />
            <span>Accept brand collaboration requests</span>
          </label>

          <div className="pt-2 mono-tag font-bold" style={{ color: "var(--color-titanium)" }}>
            SOCIAL LINKS
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["instagram", "Instagram"],
              ["youtube", "YouTube"],
              ["tiktok", "TikTok"],
              ["twitter", "X / Twitter"],
              ["website", "Website"],
            ].map(([k, label]) => (
              <Field key={k} label={label as string}>
                <input
                  value={(form as any)[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value } as any)}
                  className="input"
                  placeholder="https://…"
                />
              </Field>
            ))}
          </div>

          {err && (
            <p className="mono-tag" style={{ color: "#ff3d3d" }}>
              {err}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-neon w-full"
            style={{ padding: "14px", fontSize: 12 }}
          >
            {busy ? "SUBMITTING…" : existing ? "UPDATE APPLICATION ▸" : "SUBMIT APPLICATION ▸"}
          </button>
        </form>
      </div>

      <style>{`
        .input { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid var(--color-hair-strong); padding: 10px 12px; font-size: 14px; color: var(--color-ink); }
        .input:focus { outline: none; border-color: var(--color-neon); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mono-tag font-bold" style={{ color: "var(--color-titanium)" }}>
        {label.toUpperCase()}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
