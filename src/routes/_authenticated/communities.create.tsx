import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { createCommunity, CATEGORIES } from "@/lib/communities.functions";

export const Route = createFileRoute("/_authenticated/communities/create")({
  head: () => ({ meta: [{ title: "Create community · ZOMBIEREX" }] }),
  component: CreateCommunityPage,
});

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

function CreateCommunityPage() {
  const navigate = useNavigate();
  const create = useServerFn(createCommunity);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    category: "clubs",
    location: "",
    rules: "",
    is_private: false,
    join_policy: "open" as "open" | "request" | "invite",
  });
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: async () => {
      setError(null);
      const slug = form.slug || slugify(form.name);
      const payload = {
        name: form.name,
        slug,
        description: form.description || undefined,
        category: form.category,
        location: form.location || undefined,
        rules: form.rules || undefined,
        is_private: form.is_private,
        join_policy: form.join_policy,
        hashtags: [],
      };
      return create({ data: payload });
    },
    onSuccess: (club) => navigate({ to: "/communities/$slug", params: { slug: club.slug } }),
    onError: (e: Error) => setError(e.message),
  });

  const canSubmit = form.name.length >= 3 && form.category.length > 0 && !mut.isPending;

  return (
    <div className="pb-24">

      <div className="px-4 pt-6">
        <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>New signal</p>
        <h1 className="serif text-[32px] italic leading-none" style={{ color: "var(--color-ink)" }}>Start a community</h1>
        <p className="mt-2 text-[13px]" style={{ color: "var(--color-titanium)" }}>
          Bring together riders and drivers who share your passion. You'll be the owner.
        </p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
        className="mt-6 space-y-4 px-4"
      >
        <Field label="Name">
          <input
            required minLength={3} maxLength={80}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })}
            className={inputClass}
            placeholder="Night Circuit LA"
          />
        </Field>

        <Field label="URL slug" hint="lowercase, digits, dashes">
          <input
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
            className={inputClass}
            placeholder="night-circuit-la"
            pattern="[a-z0-9-]+"
          />
        </Field>

        <Field label="Category">
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className={inputClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
            ))}
          </select>
        </Field>

        <Field label="Location" hint="Optional · city, region, or worldwide">
          <input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className={inputClass}
            placeholder="Los Angeles, CA"
            maxLength={80}
          />
        </Field>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputClass}
            rows={3}
            maxLength={2000}
            placeholder="What is this community about?"
          />
        </Field>

        <Field label="House rules" hint="Optional">
          <textarea
            value={form.rules}
            onChange={(e) => setForm({ ...form, rules: e.target.value })}
            className={inputClass}
            rows={4}
            maxLength={4000}
            placeholder="1. Respect the crew…"
          />
        </Field>

        <Field label="Privacy">
          <div className="flex gap-2">
            <ToggleChip active={!form.is_private} onClick={() => setForm({ ...form, is_private: false })}>Public</ToggleChip>
            <ToggleChip active={form.is_private} onClick={() => setForm({ ...form, is_private: true })}>Private</ToggleChip>
          </div>
        </Field>

        <Field label="Join policy">
          <div className="flex gap-2">
            {(["open","request","invite"] as const).map((p) => (
              <ToggleChip key={p} active={form.join_policy === p} onClick={() => setForm({ ...form, join_policy: p })}>
                {p}
              </ToggleChip>
            ))}
          </div>
        </Field>

        {error && (
          <p className="rounded-md p-2 text-[12px]"
            style={{ background: "color-mix(in oklab, red 15%, transparent)", color: "#ffb3b3", border: "1px solid rgba(255,80,80,0.4)" }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="tap w-full rounded-full py-3 text-[13px] font-bold uppercase tracking-wider disabled:opacity-40"
          style={{ background: "var(--color-neon)", color: "var(--color-obsidian)", letterSpacing: "0.16em" }}
        >
          {mut.isPending ? "Launching…" : "Launch community"}
        </button>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg px-3 py-2.5 text-[13px] focus:outline-none";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="mono-tag" style={{ color: "var(--color-ink)", fontSize: 10 }}>{label}</span>
        {hint && <span className="mono-tag" style={{ color: "var(--color-titanium)", fontSize: 9 }}>{hint}</span>}
      </div>
      <div
        style={{ background: "var(--color-graphite)", border: "1px solid var(--color-hair-strong)", borderRadius: 8, color: "var(--color-ink)" }}
      >
        {children}
      </div>
    </label>
  );
}

function ToggleChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap flex-1 rounded-md py-2 text-[11px] font-bold uppercase tracking-wider capitalize"
      style={{
        background: active ? "var(--color-neon)" : "transparent",
        color: active ? "var(--color-obsidian)" : "var(--color-ink)",
        border: `1px solid ${active ? "var(--color-neon)" : "var(--color-hair-strong)"}`,
        letterSpacing: "0.14em",
      }}
    >
      {children}
    </button>
  );
}
