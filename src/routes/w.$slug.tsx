import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { getGarageProfile } from "@/lib/garages.functions";
import {
  DAY_KEYS,
  SPECIALTY_LABEL,
  isOpenNow,
  type Availability,
} from "@/lib/garage-taxonomy";
import { BookingSheet } from "@/components/garage/BookingSheet";

export const Route = createFileRoute("/w/$slug")({
  loader: async ({ params }) => {
    const data = await getGarageProfile({ data: { slug: params.slug } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const v: any = loaderData?.vendor;
    const title = v ? `${v.business_name} · Workshop · ZOMBIEREX` : "Workshop · ZOMBIEREX";
    const desc = v
      ? `${v.business_name}${v.city ? ` in ${v.city}` : ""} — ${
          (v.specialties ?? []).map((s: string) => SPECIALTY_LABEL[s] ?? s).slice(0, 4).join(", ") ||
          "automotive workshop"
        }. Book a service, see reviews, hours and pricing.`
      : "Automotive workshop profile and service booking.";
    const img: string | undefined = v?.cover_url || v?.logo_url || undefined;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc.slice(0, 158) },
      { property: "og:title", content: title },
      { property: "og:description", content: desc.slice(0, 158) },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ];
    if (img && /^https:\/\//.test(img)) {
      meta.push({ property: "og:image", content: img }, { name: "twitter:image", content: img });
    }
    return { meta };
  },
  errorComponent: () => (
    <Shell>
      <p className="serif text-2xl italic">This workshop couldn’t be loaded.</p>
      <Link to="/garages" className="mono-tag mt-3 inline-block underline">
        BACK TO DISCOVERY
      </Link>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <p className="serif text-2xl italic">Workshop not found.</p>
      <Link to="/garages" className="mono-tag mt-3 inline-block underline">
        BACK TO DISCOVERY
      </Link>
    </Shell>
  ),
  component: WorkshopProfile,
});

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-16 text-center">{children}</div>;
}

const TABS = ["Overview", "Services", "Portfolio", "Reviews", "Info"] as const;

function money(cents?: number | null, currency = "BHD") {
  if (cents == null) return null;
  const minor = ["BHD", "KWD", "OMR"].includes(currency) ? 1000 : 100;
  return `${currency} ${(cents / minor).toFixed(minor === 1000 ? 3 : 2)}`;
}

function WorkshopProfile() {
  const { vendor, services, reviews } = Route.useLoaderData() as any;
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [booking, setBooking] = useState(false);
  const open = isOpenNow((vendor.availability ?? null) as Availability | null);
  const currency = vendor.currency ?? "BHD";
  const canBook = vendor.booking_enabled !== false;

  return (
    <div className="pb-32">
      <div
        className="relative h-48 w-full bg-cover bg-center"
        style={{
          backgroundImage: vendor.cover_url ? `url(${vendor.cover_url})` : undefined,
          background: vendor.cover_url ? undefined : "var(--color-line)",
        }}
      >
        <Link
          to="/garages"
          className="tap absolute left-3 top-3 border px-2 py-1 text-xs"
          style={{ borderColor: "var(--color-line)", background: "rgba(0,0,0,0.4)", color: "#fff" }}
        >
          ← Garages
        </Link>
      </div>

      <div className="px-4">
        <div className="-mt-10 flex items-end gap-3">
          <div
            className="h-20 w-20 shrink-0 border-2 bg-cover bg-center"
            style={{
              borderColor: "var(--color-bone, #fafafa)",
              backgroundImage: vendor.logo_url ? `url(${vendor.logo_url})` : undefined,
              background: vendor.logo_url ? undefined : "var(--color-line)",
            }}
          />
          <div className="pb-1">
            <h1 className="serif text-2xl italic leading-tight">{vendor.business_name}</h1>
            <p className="mono-tag text-[10px] opacity-60">
              {vendor.business_type?.replace(/_/g, " ").toUpperCase()} · {vendor.city ?? "—"}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <span className="mono-num">★ {Number(vendor.rating_avg ?? 0).toFixed(1)}</span>
          <span className="opacity-60">{vendor.reviews_count ?? 0} reviews</span>
          <span style={{ color: open ? "var(--color-signal, #00c853)" : "#b0483c" }}>
            {open ? "Open now" : "Closed"}
          </span>
          {vendor.is_verified && (
            <span className="mono-tag" style={{ color: "var(--color-signal, #00c853)" }}>
              VERIFIED
            </span>
          )}
          {vendor.emergency_service && <span className="opacity-70">24/7 roadside</span>}
          {vendor.response_time_mins ? (
            <span className="opacity-70">Replies in ~{vendor.response_time_mins} min</span>
          ) : null}
        </div>

        {(vendor.specialties ?? []).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {vendor.specialties.map((s: string) => (
              <span key={s} className="border px-2 py-1 text-[11px]" style={{ borderColor: "var(--color-line)" }}>
                {SPECIALTY_LABEL[s] ?? s}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            disabled={!canBook}
            onClick={() => setBooking(true)}
            className="btn-neon flex-1 py-3 text-center"
            style={{ opacity: canBook ? 1 : 0.4 }}
          >
            {canBook ? "BOOK A SERVICE" : "BOOKING UNAVAILABLE"}
          </button>
          {vendor.phone && (
            <a
              href={`tel:${vendor.phone}`}
              className="tap border px-4 py-3 text-sm"
              style={{ borderColor: "var(--color-line)" }}
            >
              Call
            </a>
          )}
          {vendor.lat != null && vendor.lng != null && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${vendor.lat},${vendor.lng}`}
              target="_blank"
              rel="noreferrer"
              className="tap border px-4 py-3 text-sm"
              style={{ borderColor: "var(--color-line)" }}
            >
              Route
            </a>
          )}
        </div>
      </div>

      <div className="-mx-1 mt-6 flex gap-2 overflow-x-auto px-5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="tap shrink-0 border-b-2 px-2 pb-2 text-xs uppercase tracking-widest"
            style={{
              borderColor: tab === t ? "var(--color-signal, #00c853)" : "transparent",
              opacity: tab === t ? 1 : 0.5,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="px-4 pt-5">
        {tab === "Overview" && (
          <div className="space-y-5">
            {vendor.description && <p className="text-sm leading-relaxed opacity-85">{vendor.description}</p>}
            <Stats vendor={vendor} currency={currency} />
            {(vendor.brands ?? []).length > 0 && (
              <Section title="Brands serviced">
                <div className="flex flex-wrap gap-1.5">
                  {vendor.brands.map((b: string) => (
                    <span key={b} className="border px-2 py-1 text-[11px]" style={{ borderColor: "var(--color-line)" }}>
                      {b}
                    </span>
                  ))}
                </div>
              </Section>
            )}
            {(vendor.certifications ?? []).length > 0 && (
              <Section title="Certifications">
                <ul className="space-y-1 text-sm opacity-85">
                  {vendor.certifications.map((c: any, i: number) => (
                    <li key={i}>• {typeof c === "string" ? c : c?.name}</li>
                  ))}
                </ul>
              </Section>
            )}
            {(vendor.team ?? []).length > 0 && (
              <Section title="Team">
                <div className="space-y-2">
                  {vendor.team.map((m: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className="h-9 w-9 bg-cover bg-center"
                        style={{
                          backgroundImage: m?.photo_url ? `url(${m.photo_url})` : undefined,
                          background: m?.photo_url ? undefined : "var(--color-line)",
                        }}
                      />
                      <div className="text-sm">
                        <p>{m?.name}</p>
                        <p className="text-xs opacity-60">{m?.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}

        {tab === "Services" && (
          <div className="space-y-2">
            {services.length === 0 && <p className="text-sm opacity-70">No published price list — request a quotation.</p>}
            {services.map((s: any) => (
              <div key={s.id} className="border p-3" style={{ borderColor: "var(--color-line)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    {s.description && <p className="mt-0.5 text-xs opacity-70">{s.description}</p>}
                    {s.duration_minutes ? (
                      <p className="mono-tag mt-1 text-[10px] opacity-60">{s.duration_minutes} MIN</p>
                    ) : null}
                  </div>
                  <span className="mono-num shrink-0 text-sm">{money(s.price_cents, currency) ?? "Quote"}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "Portfolio" && (
          <div className="grid grid-cols-2 gap-2">
            {[...(vendor.portfolio ?? []), ...(vendor.gallery ?? [])].length === 0 && (
              <p className="col-span-2 text-sm opacity-70">No project photos yet.</p>
            )}
            {[...(vendor.portfolio ?? []), ...(vendor.gallery ?? [])].map((p: any, i: number) => {
              const url = typeof p === "string" ? p : p?.url;
              if (!url) return null;
              return (
                <div key={i} className="aspect-square bg-cover bg-center" style={{ backgroundImage: `url(${url})` }} />
              );
            })}
          </div>
        )}

        {tab === "Reviews" && (
          <div className="space-y-3">
            {reviews.length === 0 && <p className="text-sm opacity-70">No reviews yet.</p>}
            {reviews.map((r: any) => (
              <div key={r.id} className="border p-3" style={{ borderColor: "var(--color-line)" }}>
                <div className="flex items-center justify-between">
                  <p className="text-sm">{r.reviewer?.display_name ?? "Rider"}</p>
                  <span className="mono-num text-xs">★ {r.rating}</span>
                </div>
                {r.body && <p className="mt-1 text-sm opacity-80">{r.body}</p>}
              </div>
            ))}
          </div>
        )}

        {tab === "Info" && (
          <div className="space-y-5">
            <Section title="Opening hours">
              <ul className="space-y-1 text-sm">
                {DAY_KEYS.map((d) => {
                  const w = (vendor.availability as any)?.[d];
                  return (
                    <li key={d} className="flex justify-between">
                      <span className="mono-tag text-[10px] opacity-60">{d.toUpperCase()}</span>
                      <span>{!w || w.closed ? "Closed" : `${w.open} – ${w.close}`}</span>
                    </li>
                  );
                })}
              </ul>
            </Section>
            <Section title="Contact">
              <ul className="space-y-1 text-sm opacity-85">
                {vendor.address_line1 && <li>{vendor.address_line1}</li>}
                <li>{[vendor.city, vendor.region, vendor.country].filter(Boolean).join(", ")}</li>
                {vendor.phone && <li>{vendor.phone}</li>}
                {vendor.email && <li>{vendor.email}</li>}
                {vendor.website && (
                  <li>
                    <a href={vendor.website} target="_blank" rel="noreferrer" className="underline">
                      {vendor.website}
                    </a>
                  </li>
                )}
              </ul>
            </Section>
            {(vendor.payment_methods ?? []).length > 0 && (
              <Section title="Payment accepted">
                <p className="text-sm opacity-85">
                  {vendor.payment_methods.map((m: string) => m.replace(/_/g, " ")).join(" · ")}
                </p>
              </Section>
            )}
          </div>
        )}
      </div>

      <BookingSheet
        garage={{ id: vendor.id, business_name: vendor.business_name, currency, slug: vendor.slug }}
        services={services}
        open={booking}
        onClose={() => setBooking(false)}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mono-tag mb-2 text-[10px] opacity-60">{title.toUpperCase()}</h2>
      {children}
    </section>
  );
}

function Stats({ vendor, currency }: { vendor: any; currency: string }) {
  const items = [
    { k: "Jobs done", v: vendor.completed_jobs_count ?? 0 },
    { k: "From", v: money(vendor.price_from_cents, currency) ?? "—" },
    { k: "Followers", v: vendor.followers_count ?? 0 },
  ];
  return (
    <div className="grid grid-cols-3 border" style={{ borderColor: "var(--color-line)" }}>
      {items.map((i) => (
        <div key={i.k} className="border-r p-3 last:border-r-0" style={{ borderColor: "var(--color-line)" }}>
          <p className="mono-tag text-[9px] opacity-60">{i.k.toUpperCase()}</p>
          <p className="mono-num text-sm">{i.v}</p>
        </div>
      ))}
    </div>
  );
}
