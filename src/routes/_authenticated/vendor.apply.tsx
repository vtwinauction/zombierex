import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { applyAsVendor, getMyVendor, BUSINESS_TYPES } from "@/lib/vendor.functions";

const vendorQuery = queryOptions({ queryKey: ["my-vendor"], queryFn: () => getMyVendor() });

export const Route = createFileRoute("/_authenticated/vendor/apply")({
  head: () => ({
    meta: [
      { title: "Vendor Application · ZOMBIEREX" },
      {
        name: "description",
        content:
          "Register your automotive business on ZOMBIEREX in a guided, verified onboarding flow.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(vendorQuery),
  component: ApplyPage,
});

type FormState = {
  slug: string;
  business_name: string;
  business_type: string;
  legal_name: string;
  trade_license_no: string;
  tax_number: string;
  owner_name: string;
  email: string;
  phone: string;
  website: string;
  description: string;
  address_line1: string;
  city: string;
  region: string;
  country: string;
  postal_code: string;
  service_areas: string;
  operating_hours: string;
  socials_instagram: string;
  socials_facebook: string;
};

const STEPS = ["Business", "Contact", "Location", "Documents", "Review"] as const;

function ApplyPage() {
  const { data: vendor } = useSuspenseQuery(vendorQuery);
  const [step, setStep] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const applyFn = useServerFn(applyAsVendor);
  const qc = useQueryClient();
  const nav = useNavigate();

  const [f, setF] = useState<FormState>(() => ({
    slug: (vendor as any)?.slug ?? "",
    business_name: (vendor as any)?.business_name ?? "",
    business_type: (vendor as any)?.business_type ?? "motorcycle_workshop",
    legal_name: (vendor as any)?.legal_name ?? "",
    trade_license_no: (vendor as any)?.trade_license_no ?? "",
    tax_number: (vendor as any)?.tax_number ?? "",
    owner_name: (vendor as any)?.owner_name ?? "",
    email: (vendor as any)?.email ?? "",
    phone: (vendor as any)?.phone ?? "",
    website: (vendor as any)?.website ?? "",
    description: (vendor as any)?.description ?? "",
    address_line1: (vendor as any)?.address_line1 ?? "",
    city: (vendor as any)?.city ?? "",
    region: (vendor as any)?.region ?? "",
    country: (vendor as any)?.country ?? "",
    postal_code: (vendor as any)?.postal_code ?? "",
    service_areas: ((vendor as any)?.service_areas ?? []).join(", "),
    operating_hours: JSON.stringify(
      (vendor as any)?.operating_hours ?? {
        mon_fri: "9:00–18:00",
        sat: "10:00–16:00",
        sun: "closed",
      },
      null,
      0,
    ),
    socials_instagram: (vendor as any)?.socials?.instagram ?? "",
    socials_facebook: (vendor as any)?.socials?.facebook ?? "",
  }));

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  const canNext = useMemo(() => {
    if (step === 0) return f.business_name.length >= 2 && f.slug.length >= 3 && !!f.business_type;
    return true;
  }, [step, f]);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      let hours: Record<string, string> = {};
      try {
        hours = JSON.parse(f.operating_hours || "{}");
      } catch {
        hours = {};
      }
      const socials: Record<string, string> = {};
      if (f.socials_instagram) socials.instagram = f.socials_instagram;
      if (f.socials_facebook) socials.facebook = f.socials_facebook;
      await applyFn({
        data: {
          slug: f.slug,
          business_name: f.business_name,
          business_type: f.business_type as any,
          legal_name: f.legal_name,
          trade_license_no: f.trade_license_no,
          tax_number: f.tax_number,
          owner_name: f.owner_name,
          email: f.email,
          phone: f.phone,
          website: f.website,
          description: f.description,
          address_line1: f.address_line1,
          city: f.city,
          region: f.region,
          country: f.country,
          postal_code: f.postal_code,
          service_areas: f.service_areas
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          socials,
          operating_hours: hours,
        },
      });
      await qc.invalidateQueries({ queryKey: ["my-vendor"] });
      nav({ to: vendor ? "/vendor" : "/vendor/plans" });
    } catch (e: any) {
      setErr(e?.message ?? "Submission failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-5 pt-2 pb-24">
      {/* Stepper */}
      <div className="flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div
              className="h-[3px]"
              style={{
                background: i <= step ? "var(--color-neon)" : "var(--color-hair-strong)",
                borderRadius: 2,
              }}
            />
            <p
              className="mono-tag mt-1.5"
              style={{
                color: i === step ? "var(--color-ink)" : "var(--color-silver)",
                fontSize: 8.5,
              }}
            >
              {String(i + 1).padStart(2, "0")} · {s}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {step === 0 && (
          <>
            <Field
              label="Business name"
              v={f.business_name}
              onChange={(v) => set("business_name", v)}
              placeholder="Apex Motorcycles"
            />
            <Field
              label="URL handle"
              v={f.slug}
              onChange={(v) => set("slug", v.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="apex-motorcycles"
              hint="zombierex.app/vendor/…"
            />
            <Select
              label="Business type"
              v={f.business_type}
              onChange={(v) => set("business_type", v)}
              options={BUSINESS_TYPES.map((b) => ({ value: b.code, label: b.label }))}
            />
            <TextArea
              label="Description"
              v={f.description}
              onChange={(v) => set("description", v)}
              placeholder="What do you offer, what makes you different?"
            />
          </>
        )}
        {step === 1 && (
          <>
            <Field label="Owner name" v={f.owner_name} onChange={(v) => set("owner_name", v)} />
            <Field label="Email" v={f.email} onChange={(v) => set("email", v)} type="email" />
            <Field label="Phone" v={f.phone} onChange={(v) => set("phone", v)} type="tel" />
            <Field
              label="Website"
              v={f.website}
              onChange={(v) => set("website", v)}
              placeholder="https://…"
            />
            <Field
              label="Instagram URL"
              v={f.socials_instagram}
              onChange={(v) => set("socials_instagram", v)}
            />
            <Field
              label="Facebook URL"
              v={f.socials_facebook}
              onChange={(v) => set("socials_facebook", v)}
            />
          </>
        )}
        {step === 2 && (
          <>
            <Field
              label="Street address"
              v={f.address_line1}
              onChange={(v) => set("address_line1", v)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" v={f.city} onChange={(v) => set("city", v)} />
              <Field label="Region" v={f.region} onChange={(v) => set("region", v)} />
              <Field label="Country" v={f.country} onChange={(v) => set("country", v)} />
              <Field
                label="Postal code"
                v={f.postal_code}
                onChange={(v) => set("postal_code", v)}
              />
            </div>
            <Field
              label="Service areas (comma-separated)"
              v={f.service_areas}
              onChange={(v) => set("service_areas", v)}
              placeholder="Dubai, Sharjah, Abu Dhabi"
            />
            <TextArea
              label="Operating hours (JSON)"
              v={f.operating_hours}
              onChange={(v) => set("operating_hours", v)}
              placeholder='{"mon_fri":"9-18","sat":"10-16"}'
            />
          </>
        )}
        {step === 3 && (
          <>
            <Field
              label="Legal / trading name"
              v={f.legal_name}
              onChange={(v) => set("legal_name", v)}
            />
            <Field
              label="Trade license number"
              v={f.trade_license_no}
              onChange={(v) => set("trade_license_no", v)}
            />
            <Field
              label="Tax / VAT number (optional)"
              v={f.tax_number}
              onChange={(v) => set("tax_number", v)}
            />
            <div
              className="rounded p-4 text-[12px]"
              style={{
                background: "var(--color-surface-1)",
                border: "1px dashed var(--color-hair-strong)",
                color: "var(--color-silver)",
              }}
            >
              📎 Document uploads (license PDF + owner ID) open after submission from the vendor
              console. We'll email a secure upload link.
            </div>
          </>
        )}
        {step === 4 && (
          <div className="surface-1 p-4" style={{ borderRadius: 8 }}>
            <p className="mono-tag" style={{ color: "var(--color-silver)" }}>
              REVIEW
            </p>
            <h3 className="serif mt-2 text-2xl italic">{f.business_name || "—"}</h3>
            <p className="mt-1 text-[11px]" style={{ color: "var(--color-silver)" }}>
              {BUSINESS_TYPES.find((b) => b.code === f.business_type)?.label} · @
              {f.slug || "handle"}
            </p>
            <dl className="mt-4 space-y-2 text-[12px]">
              <Row k="Owner" v={f.owner_name} />
              <Row k="Contact" v={[f.email, f.phone].filter(Boolean).join(" · ")} />
              <Row k="Location" v={[f.city, f.region, f.country].filter(Boolean).join(", ")} />
              <Row k="License" v={f.trade_license_no || "—"} />
            </dl>
          </div>
        )}
      </div>

      {err && (
        <div
          className="mt-4 rounded px-3 py-2 text-[12px]"
          style={{ background: "rgba(220,60,60,0.1)", border: "1px solid rgba(220,60,60,0.4)" }}
        >
          {err}
        </div>
      )}

      <div className="mt-6 flex gap-2">
        {step > 0 && (
          <button className="btn-ghost flex-1" onClick={() => setStep((s) => s - 1)}>
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            className="btn-solid flex-1"
            disabled={!canNext}
            onClick={() => setStep((s) => s + 1)}
            style={{ opacity: canNext ? 1 : 0.5 }}
          >
            Continue
          </button>
        ) : (
          <button
            className="btn-solid flex-1"
            disabled={busy}
            onClick={submit}
            style={{ opacity: busy ? 0.6 : 1 }}
          >
            {busy ? "Submitting…" : vendor ? "Save changes" : "Submit for verification"}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  v,
  onChange,
  placeholder,
  type = "text",
  hint,
}: {
  label: string;
  v: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mono-tag" style={{ color: "var(--color-silver)" }}>
        {label}
      </span>
      <input
        value={v}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        placeholder={placeholder}
        className="mt-1.5 w-full bg-transparent px-3 py-2.5 text-[13px] outline-none"
        style={{
          border: "1px solid var(--color-hair-strong)",
          borderRadius: 6,
          color: "var(--color-ink)",
        }}
      />
      {hint && (
        <span className="mt-1 block text-[10px]" style={{ color: "var(--color-silver)" }}>
          {hint}
        </span>
      )}
    </label>
  );
}
function TextArea({
  label,
  v,
  onChange,
  placeholder,
}: {
  label: string;
  v: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mono-tag" style={{ color: "var(--color-silver)" }}>
        {label}
      </span>
      <textarea
        value={v}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="mt-1.5 w-full bg-transparent px-3 py-2.5 text-[13px] outline-none resize-none"
        style={{
          border: "1px solid var(--color-hair-strong)",
          borderRadius: 6,
          color: "var(--color-ink)",
        }}
      />
    </label>
  );
}
function Select({
  label,
  v,
  onChange,
  options,
}: {
  label: string;
  v: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mono-tag" style={{ color: "var(--color-silver)" }}>
        {label}
      </span>
      <select
        value={v}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full bg-transparent px-3 py-2.5 text-[13px] outline-none"
        style={{
          border: "1px solid var(--color-hair-strong)",
          borderRadius: 6,
          color: "var(--color-ink)",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="mono-tag" style={{ color: "var(--color-silver)" }}>
        {k}
      </dt>
      <dd className="text-right text-[12px]" style={{ color: "var(--color-ink)" }}>
        {v || "—"}
      </dd>
    </div>
  );
}
