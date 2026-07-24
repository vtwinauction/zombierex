import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { StatusBar } from "@/components/StatusBar";
import { createListing, LISTING_CATEGORIES, LISTING_CONDITIONS, LISTING_FUELS, LISTING_TRANSMISSIONS } from "@/lib/marketplace.functions";
import { compressImage, uploadWithRetry } from "@/lib/media-upload";
import {
  CURRENCIES, COUNTRIES, YEARS,
  getAllBrands, getAllModels, getAllCities,
  rememberBrand, rememberModel, rememberCity,
} from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/marketplace/new")({
  head: () => ({ meta: [{ title: "New Listing · ZOMBIEREX" }] }),
  component: NewListing,
});

type Photo = { url: string; is_video: boolean };

function NewListing() {
  const navigate = useNavigate();
  const createFn = useServerFn(createListing);
  const [form, setForm] = useState<any>({
    title: "", description: "", category: "motorcycle", condition: "used",
    price_cents: 0, currency: "USD", is_negotiable: true,
    brand: "", model: "", year: "", mileage_km: "", engine_cc: "",
    fuel_type: "na", transmission: "na", city: "", region: "", country: "",
    color: "", vin: "",
  });
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends string>(k: K, v: any) { setForm((f: any) => ({ ...f, [k]: v })); }

  const submit = useMutation({
    mutationFn: async () => {
      if (!form.title || form.title.length < 3) throw new Error("Title too short");
      if (!form.price_cents && form.price_cents !== 0) throw new Error("Price required");
      const payload: any = {
        title: form.title.trim(),
        description: form.description || null,
        category: form.category,
        condition: form.condition,
        price_cents: Math.round(Number(form.price_cents) * 100),
        currency: form.currency || "USD",
        is_negotiable: !!form.is_negotiable,
        brand: form.brand || null,
        model: form.model || null,
        year: form.year ? Number(form.year) : null,
        mileage_km: form.mileage_km ? Number(form.mileage_km) : null,
        engine_cc: form.engine_cc ? Number(form.engine_cc) : null,
        fuel_type: form.fuel_type,
        transmission: form.transmission,
        city: form.city || null,
        region: form.region || null,
        country: form.country || null,
        color: form.color || null,
        vin: form.vin || null,
        hero_image_url: photos[0]?.url ?? null,
        photos,
        tags: [],
      };
      if (payload.brand) rememberBrand(payload.brand);
      if (payload.brand && payload.model) rememberModel(payload.brand, payload.model);
      if (payload.city) rememberCity(payload.city);
      return createFn({ data: payload });
    },
    onSuccess: (res) => navigate({ to: "/marketplace/$id", params: { id: res.id } }),
    onError: (e: any) => setErr(e?.message ?? "Failed to create"),
  });

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setErr(null); setUploading(true); setUploadPct(0);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess.session?.user.id;
      if (!userId) throw new Error("Sign in required");
      const arr = Array.from(files).slice(0, 15 - photos.length);
      const uploaded: Photo[] = [];
      let i = 0;
      for (const f of arr) {
        const isVideo = f.type.startsWith("video/");
        const blob = isVideo ? f : await compressImage(f);
        const res = await uploadWithRetry(blob as any, {
          userId, bucket: "marketplace",
          onProgress: (p) => setUploadPct(((i + p.pct) / arr.length)),
        });
        uploaded.push({ url: res.url, is_video: isVideo });
        i++;
      }
      setPhotos((p) => [...p, ...uploaded]);
    } catch (e: any) { setErr(e?.message ?? "Upload failed"); }
    finally { setUploading(false); setUploadPct(0); }
  }

  return (
    <div className="pb-56">

      <StatusBar index="09" section="NEW LISTING" />

      <div className="px-4 pt-6">
        <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>MARKETPLACE ▸ CREATE</p>
        <h1 className="serif mt-2 text-3xl italic" style={{ color: "var(--color-ink)" }}>List an item</h1>
      </div>

      {/* Photos */}
      <div className="px-4 pt-6">
        <Label>PHOTOS & VIDEO · {photos.length}/15</Label>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {photos.map((p, i) => (
            <div key={i} className="relative aspect-square border" style={{ borderColor: "var(--color-hair-strong)" }}>
              {p.is_video
                ? <video src={p.url} className="h-full w-full object-cover" />
                : <img src={p.url} className="h-full w-full object-cover" />}
              <button onClick={() => setPhotos((xs) => xs.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 h-6 w-6 mono-tag font-bold"
                style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}>×</button>
              {i === 0 && <span className="absolute bottom-1 left-1 mono-tag px-1" style={{ background: "var(--color-neon)", color: "#0a0a0a" }}>HERO</span>}
            </div>
          ))}
          {photos.length < 15 && (
            <label className="tap flex aspect-square cursor-pointer items-center justify-center border border-dashed"
              style={{ borderColor: "var(--color-hair-strong)", color: "var(--color-neon)" }}>
              <span className="mono-tag font-bold">+ ADD</span>
              <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            </label>
          )}
        </div>
        {uploading && (
          <div className="mt-2">
            <div className="h-1 w-full" style={{ background: "var(--color-hair)" }}>
              <div className="h-full" style={{ width: `${Math.round(uploadPct*100)}%`, background: "var(--color-neon)" }} />
            </div>
            <p className="mono-tag mt-1" style={{ color: "var(--color-titanium)" }}>UPLOADING… {Math.round(uploadPct*100)}%</p>
          </div>
        )}
      </div>

      <Section title="ESSENTIALS">
        <Input label="TITLE *" value={form.title} onChange={(v: string) => set("title", v)} placeholder="2022 Kawasaki Ninja ZX-6R" />
        <TextArea label="DESCRIPTION" value={form.description} onChange={(v: string) => set("description", v)} placeholder="History, mods, service records…" />
        <Row>
          <Select label="CATEGORY *" value={form.category} onChange={(v: string) => set("category", v)}
            options={LISTING_CATEGORIES.map((c) => [c, c.replace("_"," ")])} />
          <Select label="CONDITION *" value={form.condition} onChange={(v: string) => set("condition", v)}
            options={LISTING_CONDITIONS.map((c) => [c, c.replace("_"," ")])} />
        </Row>
        <Row>
          <Input label="PRICE *" type="number" value={form.price_cents} onChange={(v: string) => set("price_cents", v)} placeholder="9500" />
          <Select label="CURRENCY *" value={form.currency} onChange={(v: string) => set("currency", v)}
            options={CURRENCIES.map((c) => [c.code, `${c.code} · ${c.symbol} · ${c.label}`])} />
        </Row>
        <label className="mt-3 flex items-center gap-2">
          <input type="checkbox" checked={form.is_negotiable} onChange={(e) => set("is_negotiable", e.target.checked)} />
          <span className="mono-tag" style={{ color: "var(--color-ink)" }}>PRICE NEGOTIABLE</span>
        </label>
      </Section>

      <Section title="VEHICLE DETAILS">
        <Row>
          <DataListInput label="BRAND" value={form.brand} onChange={(v: string) => set("brand", v)}
            listId="brand-list" options={getAllBrands()} placeholder="Kawasaki" />
          <DataListInput label="MODEL" value={form.model} onChange={(v: string) => set("model", v)}
            listId="model-list" options={form.brand ? getAllModels(form.brand) : []} placeholder="ZX-6R" />
        </Row>
        <Row>
          <Select label="YEAR" value={form.year} onChange={(v: string) => set("year", v)}
            options={[["", "—"], ...YEARS.map((y) => [String(y), String(y)] as [string,string])]} />
          <Input label="MILEAGE (km)" type="number" value={form.mileage_km} onChange={(v: string) => set("mileage_km", v)} placeholder="7800" />
        </Row>
        <Row>
          <Input label="ENGINE (cc)" type="number" value={form.engine_cc} onChange={(v: string) => set("engine_cc", v)} placeholder="636" />
          <Input label="COLOR" value={form.color} onChange={(v: string) => set("color", v)} placeholder="Lime Green" />
        </Row>
        <Row>
          <Select label="FUEL" value={form.fuel_type} onChange={(v: string) => set("fuel_type", v)}
            options={LISTING_FUELS.map((c) => [c, c])} />
          <Select label="TRANSMISSION" value={form.transmission} onChange={(v: string) => set("transmission", v)}
            options={LISTING_TRANSMISSIONS.map((c) => [c, c])} />
        </Row>
        <Input label="VIN (optional)" value={form.vin} onChange={(v: string) => set("vin", v)} placeholder="17-char VIN" />
      </Section>

      <Section title="LOCATION">
        <Row>
          <Select label="COUNTRY" value={form.country} onChange={(v: string) => set("country", v)}
            options={[["", "—"], ...COUNTRIES.map((c) => [c, c] as [string,string])]} />
          <DataListInput label="CITY" value={form.city} onChange={(v: string) => set("city", v)}
            listId="city-list" options={getAllCities(form.country)} placeholder="Manama" />
        </Row>
        <Input label="REGION / VILLAGE" value={form.region} onChange={(v: string) => set("region", v)} placeholder="Jid Ali" />
      </Section>

      {err && <p className="mx-4 mt-4 mono-tag" style={{ color: "#ff6b6b" }}>ERR · {err}</p>}

      <div className="fixed inset-x-0 z-40 border-t p-3"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)", background: "var(--color-obsidian)", borderColor: "var(--color-hair-strong)" }}>
        <button onClick={() => submit.mutate()} disabled={submit.isPending || uploading}
          className="btn-neon w-full py-3" style={{ fontSize: 12 }}>
          {submit.isPending ? "PUBLISHING…" : "PUBLISH LISTING ▸"}
        </button>
      </div>

    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mono-tag font-bold" style={{ color: "var(--color-titanium)" }}>{children}</p>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-4 mt-6 border p-4 space-y-3" style={{ borderColor: "var(--color-hair-strong)", background: "rgba(255,255,255,0.02)" }}>
      <p className="mono-tag font-bold" style={{ color: "var(--color-neon)" }}>{title}</p>
      {children}
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}
function Input({ label, value, onChange, type = "text", placeholder }: any) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <input type={type} value={value ?? ""} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border px-3 py-2 text-sm"
        style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }} />
    </label>
  );
}
function TextArea({ label, value, onChange, placeholder }: any) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <textarea value={value ?? ""} placeholder={placeholder} rows={4}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border px-3 py-2 text-sm"
        style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }} />
    </label>
  );
}
function Select({ label, value, onChange, options }: any) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border px-2 py-2 text-sm"
        style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }}>
        {options.map(([v, lbl]: any) => <option key={v} value={v}>{String(lbl)}</option>)}
      </select>
    </label>
  );
}
function DataListInput({ label, value, onChange, listId, options, placeholder }: any) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <input list={listId} value={value ?? ""} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border px-3 py-2 text-sm"
        style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }} />
      <datalist id={listId}>
        {(options as string[]).map((o) => <option key={o} value={o} />)}
      </datalist>
    </label>
  );
}
