import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { StatusBar } from "@/components/StatusBar";
import { createEvent, EVENT_CATEGORIES } from "@/lib/events.functions";

export const Route = createFileRoute("/_authenticated/events/new")({
  head: () => ({ meta: [{ title: "Host an event · ZOMBIEREX" }] }),
  component: NewEventPage,
});

const CATEGORY_LABEL: Record<string, string> = {
  ride: "Motorcycle Ride", bike_night: "Bike Night", car_meet: "Car Meet", cars_coffee: "Cars & Coffee",
  drag: "Drag Racing", drift: "Drift Event", track_day: "Track Day", rally: "Rally", off_road: "Off-Road",
  monster_truck: "Monster Truck Show", bike_show: "Motorcycle Show", custom_bike_show: "Custom Bike Show",
  classic_show: "Classic Car Show", supercar_meet: "Supercar Meet", festival: "Motorsport Festival",
  charity: "Charity Ride", launch: "Product Launch", workshop: "Workshop & Seminar", other: "Other",
};

function NewEventPage() {
  const navigate = useNavigate();
  const create = useServerFn(createEvent);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "ride" as (typeof EVENT_CATEGORIES)[number],
    visibility: "public" as "public" | "private" | "unlisted",
    cover_url: "",
    starts_at: "",
    ends_at: "",
    location: "",
    address: "",
    max_attendees: "",
    hashtags: "",
    rules: "",
    contact_email: "",
    contact_phone: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const payload: any = {
        title: form.title,
        description: form.description,
        category: form.category,
        visibility: form.visibility,
        cover_url: form.cover_url || null,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        location: form.location,
        address: form.address || null,
        max_attendees: form.max_attendees ? Number(form.max_attendees) : null,
        hashtags: form.hashtags.split(/[,\s]+/).map((s) => s.trim().replace(/^#/, "")).filter(Boolean),
        rules: form.rules || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
      };
      const row = await create({ data: payload });
      navigate({ to: "/events/$id", params: { id: (row as any).id } });
    } catch (e: any) {
      setErr(e?.message ?? "Failed to create event");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <StatusBar index="06" section="EVENTS · NEW" />
      <div className="px-4 pt-6 pb-24">
        <p className="mono-tag" style={{ color: "var(--color-ash)" }}>HOST AN EVENT</p>
        <h1 className="mt-2 display-xl text-4xl uppercase">New event</h1>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Title">
            <input required maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" />
          </Field>

          <Field label="Category">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as any })} className="input">
              {EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
              ))}
            </select>
          </Field>

          <Field label="Visibility">
            <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as any })} className="input">
              <option value="public">Public — anyone can find & RSVP</option>
              <option value="unlisted">Unlisted — link only</option>
              <option value="private">Private — invitees only</option>
            </select>
          </Field>

          <Field label="Description">
            <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" />
          </Field>

          <Field label="Cover image URL">
            <input type="url" placeholder="https://…" value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} className="input" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts">
              <input required type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="input" />
            </Field>
            <Field label="Ends">
              <input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="input" />
            </Field>
          </div>

          <Field label="Location (name)">
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input" placeholder="Rocky Ridge Speedway" />
          </Field>

          <Field label="Address">
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" placeholder="Street, city, country" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Max attendees">
              <input type="number" min={1} value={form.max_attendees} onChange={(e) => setForm({ ...form, max_attendees: e.target.value })} className="input" placeholder="Optional" />
            </Field>
            <Field label="Hashtags">
              <input value={form.hashtags} onChange={(e) => setForm({ ...form, hashtags: e.target.value })} className="input" placeholder="ride, sunday, canyon" />
            </Field>
          </div>

          <Field label="Rules">
            <textarea rows={3} value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} className="input" placeholder="Riding etiquette, safety, dress code…" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact email">
              <input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className="input" />
            </Field>
            <Field label="Contact phone">
              <input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="input" />
            </Field>
          </div>

          {err && <p className="mono-tag" style={{ color: "#c33" }}>{err}</p>}

          <button type="submit" disabled={busy} className="btn-solid w-full" style={{ padding: "14px", fontSize: 12 }}>
            {busy ? "CREATING…" : "PUBLISH EVENT ▸"}
          </button>
        </form>
      </div>

      <style>{`
        .input { width: 100%; background: var(--color-mist); border: 1px solid var(--color-hair); padding: 10px 12px; font-size: 14px; color: var(--color-ink); }
        .input:focus { outline: none; border-color: var(--color-signal); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mono-tag" style={{ color: "var(--color-ash)" }}>{label.toUpperCase()}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
