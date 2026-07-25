import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { StatusBar } from "@/components/StatusBar";
import { supabase } from "@/integrations/supabase/client";
import { getEvent, updateEvent, EVENT_CATEGORIES } from "@/lib/events.functions";

export const Route = createFileRoute("/_authenticated/events_/$id/edit")({
  head: () => ({ meta: [{ title: "Edit event · ZOMBIEREX" }] }),
  component: EditEventPage,
});

const CATEGORY_LABEL: Record<string, string> = {
  ride: "Motorcycle Ride", bike_night: "Bike Night", car_meet: "Car Meet", cars_coffee: "Cars & Coffee",
  drag: "Drag Racing", drift: "Drift Event", track_day: "Track Day", rally: "Rally", off_road: "Off-Road",
  monster_truck: "Monster Truck Show", bike_show: "Motorcycle Show", custom_bike_show: "Custom Bike Show",
  classic_show: "Classic Car Show", supercar_meet: "Supercar Meet", festival: "Motorsport Festival",
  charity: "Charity Ride", launch: "Product Launch", workshop: "Workshop & Seminar", other: "Other",
};

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EditEventPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const get = useServerFn(getEvent);
  const update = useServerFn(updateEvent);

  const { data: ev, isLoading } = useQuery({ queryKey: ["event", id], queryFn: () => get({ data: { id } }) });

  const [form, setForm] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (!ev || form) return;
    const e: any = ev;
    setForm({
      title: e.title ?? "",
      description: e.description ?? "",
      category: e.category ?? "ride",
      visibility: e.visibility ?? "public",
      cover_url: e.cover_url ?? "",
      starts_at: toLocalInput(e.starts_at),
      ends_at: toLocalInput(e.ends_at),
      location: e.location ?? "",
      address: e.address ?? "",
      max_attendees: e.max_attendees ? String(e.max_attendees) : "",
      hashtags: (e.hashtags ?? []).join(", "),
      rules: e.rules ?? "",
      contact_email: e.contact_email ?? "",
      contact_phone: e.contact_phone ?? "",
    });
  }, [ev, form]);

  async function onCoverFile(f: File | null) {
    if (!f) return;
    setErr(null);
    try {
      setUploading(true); setPct(0);
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) throw new Error("Sign in required");
      const { uploadWithRetry, compressImage } = await import("@/lib/media-upload");
      const blob = await compressImage(f);
      const res = await uploadWithRetry(blob, { userId: uid, bucket: "vehicles", onProgress: (p) => setPct(Math.round(p.pct * 100)) });
      setForm((s: any) => ({ ...s, cover_url: res.url }));
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed");
    } finally { setUploading(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const patch: any = {
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
        hashtags: form.hashtags.split(/[,\s]+/).map((s: string) => s.trim().replace(/^#/, "")).filter(Boolean),
        rules: form.rules || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
      };
      await update({ data: { id, patch } });
      qc.invalidateQueries({ queryKey: ["event", id] });
      qc.invalidateQueries({ queryKey: ["events"] });
      navigate({ to: "/events/$id", params: { id } });
    } catch (e: any) {
      setErr(e?.message ?? "Failed to update event");
    } finally { setBusy(false); }
  }

  if (isLoading || !form) return <div className="p-6"><p className="mono-tag" style={{ color: "var(--color-ash)" }}>LOADING…</p></div>;

  return (
    <div>
      <StatusBar index="06" section="EVENTS · EDIT" />
      <div className="px-4 pt-6 pb-32">
        <div className="flex items-center justify-between">
          <div>
            <p className="mono-tag" style={{ color: "var(--color-ash)" }}>EDIT EVENT</p>
            <h1 className="mt-2 display-xl text-3xl uppercase leading-tight">{form.title || "Untitled"}</h1>
          </div>
          <Link to="/events/$id" params={{ id }} className="mono-tag" style={{ color: "var(--color-ash)" }}>← BACK</Link>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {/* Cover uploader */}
          <div>
            <p className="mono-tag" style={{ color: "var(--color-ash)" }}>COVER PHOTO</p>
            <div className="mt-2 hairline overflow-hidden">
              <div className="relative h-48" style={{ background: "var(--color-mist)" }}>
                {form.cover_url ? (
                  <img src={form.cover_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center">
                    <p className="mono-tag" style={{ color: "var(--color-ash)" }}>NO COVER</p>
                  </div>
                )}
                <label className="tap absolute right-3 bottom-3 mono-tag cursor-pointer" style={{ background: "rgba(0,0,0,0.7)", color: "#fff", padding: "6px 10px" }}>
                  {uploading ? `${pct}%` : (form.cover_url ? "REPLACE PHOTO" : "ADD PHOTO")}
                  <input type="file" accept="image/*" hidden disabled={uploading}
                    onChange={(e) => { const f = e.target.files?.[0]; e.currentTarget.value = ""; onCoverFile(f ?? null); }} />
                </label>
              </div>
              {form.cover_url && (
                <button type="button" onClick={() => setForm({ ...form, cover_url: "" })} className="tap w-full py-2 mono-tag hairline-t" style={{ color: "#c33" }}>
                  REMOVE COVER
                </button>
              )}
            </div>
          </div>

          <Field label="Title">
            <input required maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">
                {EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
              </select>
            </Field>
            <Field label="Visibility">
              <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })} className="input">
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
              </select>
            </Field>
          </div>

          <Field label="Description">
            <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" />
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
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input" />
          </Field>
          <Field label="Address">
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Max attendees">
              <input type="number" min={1} value={form.max_attendees} onChange={(e) => setForm({ ...form, max_attendees: e.target.value })} className="input" placeholder="Optional" />
            </Field>
            <Field label="Hashtags">
              <input value={form.hashtags} onChange={(e) => setForm({ ...form, hashtags: e.target.value })} className="input" />
            </Field>
          </div>

          <Field label="Rules">
            <textarea rows={3} value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} className="input" />
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
        </form>
      </div>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 hairline-t" style={{ background: "var(--color-bone)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto flex max-w-screen-md gap-2 px-4 py-3">
          <Link to="/events/$id" params={{ id }} className="tap flex-1 hairline py-3 text-center mono-caps">CANCEL</Link>
          <button onClick={submit as any} disabled={busy || uploading} className="btn-solid flex-[2] py-3" style={{ fontSize: 12 }}>
            {busy ? "SAVING…" : "SAVE CHANGES ▸"}
          </button>
        </div>
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
