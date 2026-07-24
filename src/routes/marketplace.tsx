import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { StatusBar } from "@/components/StatusBar";
import { listListings, LISTING_CATEGORIES, LISTING_CONDITIONS } from "@/lib/marketplace.functions";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace · ZOMBIEREX" },
      { name: "description", content: "Buy and sell motorcycles, cars, parts, gear and services in the ZOMBIEREX community." },
    ],
  }),
  component: MarketplacePage,
});

const SCOPES = [
  { id: "featured", label: "Featured" },
  { id: "trending", label: "Trending" },
  { id: "new", label: "New" },
  { id: "nearby", label: "Nearby" },
  { id: "recommended", label: "Picks" },
  { id: "saved", label: "Saved" },
  { id: "mine", label: "Mine" },
] as const;

const CAT_LABEL: Record<string, string> = {
  motorcycle: "Motorcycles", car: "Cars", truck: "Trucks", scooter: "Scooters",
  atv: "ATVs", boat: "Boats", other_vehicle: "Vehicles",
  parts: "Parts", accessories: "Accessories", riding_gear: "Gear", apparel: "Apparel",
  collectibles: "Collectibles", tools: "Tools", garage_equipment: "Garage",
  electronics: "Electronics", services: "Services",
};

function fmtPrice(cents: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
}

function MarketplacePage() {
  const [scope, setScope] = useState<(typeof SCOPES)[number]["id"]>("new");
  const [category, setCategory] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [yearMin, setYearMin] = useState<string>("");
  const [condition, setCondition] = useState<string | undefined>();

  const list = useServerFn(listListings);
  const { data, isLoading } = useQuery({
    queryKey: ["marketplace", scope, category, search, priceMin, priceMax, yearMin, condition],
    queryFn: () => list({ data: {
      scope, category: category as any, condition: condition as any,
      search: search || undefined,
      price_min: priceMin ? Number(priceMin) * 100 : undefined,
      price_max: priceMax ? Number(priceMax) * 100 : undefined,
      year_min: yearMin ? Number(yearMin) : undefined,
    }}),
  });

  const rows = (data ?? []) as any[];
  const featured = useMemo(() => rows.find((l: any) => l.is_featured) ?? rows[0], [rows]);
  const rest = useMemo(() => rows.filter((l: any) => l.id !== featured?.id), [rows, featured]);

  return (
    <div className="pb-24">
      <StatusBar index="09" section="MARKETPLACE" />

      <div className="flex items-end justify-between px-4 pt-6">
        <div>
          <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>{rows.length} LISTINGS</p>
          <h1 className="serif mt-2 text-4xl italic" style={{ color: "var(--color-ink)" }}>Marketplace</h1>
        </div>
        <Link to="/marketplace/new" className="btn-neon" style={{ padding: "10px 14px", fontSize: 10 }}>
          + LIST ITEM
        </Link>
      </div>

      <div className="px-4 pt-4 flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search machines, parts, gear…"
          className="flex-1 border px-3 py-3 text-sm"
          style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }}
        />
        <button onClick={() => setFiltersOpen((v) => !v)}
          className="tap border px-3 mono-tag font-bold"
          style={{ borderColor: "var(--color-hair-strong)", color: filtersOpen ? "#0a0a0a" : "var(--color-ink)", background: filtersOpen ? "var(--color-neon)" : "transparent" }}>
          FILTERS
        </button>
      </div>

      {filtersOpen && (
        <div className="mx-4 mt-3 border p-3 space-y-3" style={{ borderColor: "var(--color-hair-strong)", background: "rgba(255,255,255,0.02)" }}>
          <div className="grid grid-cols-2 gap-2">
            <FilterInput label="MIN PRICE" value={priceMin} onChange={setPriceMin} type="number" placeholder="0" />
            <FilterInput label="MAX PRICE" value={priceMax} onChange={setPriceMax} type="number" placeholder="—" />
            <FilterInput label="YEAR ≥" value={yearMin} onChange={setYearMin} type="number" placeholder="2015" />
            <label className="block">
              <span className="mono-tag font-bold" style={{ color: "var(--color-titanium)" }}>CONDITION</span>
              <select value={condition ?? ""} onChange={(e) => setCondition(e.target.value || undefined)}
                className="mt-1 w-full border px-2 py-2 text-sm"
                style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }}>
                <option value="">Any</option>
                {LISTING_CONDITIONS.map((c) => <option key={c} value={c}>{c.replace("_"," ")}</option>)}
              </select>
            </label>
          </div>
          <button onClick={() => { setPriceMin(""); setPriceMax(""); setYearMin(""); setCondition(undefined); }}
            className="mono-tag font-bold" style={{ color: "var(--color-neon)" }}>CLEAR ▸</button>
        </div>
      )}

      <div className="no-scrollbar mt-4 flex overflow-x-auto border-y" style={{ borderColor: "var(--color-hair)" }}>
        {SCOPES.map((s) => {
          const active = scope === s.id;
          return (
            <button key={s.id} onClick={() => setScope(s.id)}
              className="tap relative shrink-0 border-r px-4 py-3 mono-tag font-bold"
              style={{
                borderColor: "var(--color-hair)",
                color: active ? "var(--color-ink)" : "var(--color-titanium)",
                background: active ? "rgba(255,255,255,0.03)" : "transparent",
              }}>
              {s.label.toUpperCase()}
              {active && <span className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: "var(--color-neon)" }} />}
            </button>
          );
        })}
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3 border-b" style={{ borderColor: "var(--color-hair)" }}>
        <ChipButton active={!category} onClick={() => setCategory(undefined)}>ALL</ChipButton>
        {LISTING_CATEGORIES.map((c) => (
          <ChipButton key={c} active={category === c} onClick={() => setCategory(c === category ? undefined : c)}>
            {(CAT_LABEL[c] ?? c).toUpperCase()}
          </ChipButton>
        ))}
      </div>

      {featured && (
        <FeaturedCard listing={featured} />
      )}

      <div className="px-4 pt-4 grid grid-cols-2 gap-3">
        {isLoading && <p className="col-span-2 mono-tag" style={{ color: "var(--color-titanium)" }}>LOADING…</p>}
        {!isLoading && rows.length === 0 && (
          <div className="col-span-2 border border-dashed p-6 text-center" style={{ borderColor: "var(--color-hair-strong)" }}>
            <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>NO LISTINGS YET</p>
            <Link to="/marketplace/new" className="btn-neon mt-4 inline-block" style={{ padding: "10px 14px", fontSize: 11 }}>
              CREATE THE FIRST ▸
            </Link>
          </div>
        )}
        {rest.map((l: any) => <ListingCard key={l.id} listing={l} />)}
      </div>
    </div>
  );
}

function ChipButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="tap shrink-0 border px-3 py-1.5 mono-tag font-bold"
      style={{
        borderColor: "var(--color-hair-strong)",
        background: active ? "var(--color-neon)" : "transparent",
        color: active ? "#0a0a0a" : "var(--color-ink)",
      }}>
      {children}
    </button>
  );
}

function FilterInput({ label, value, onChange, type = "text", placeholder }: any) {
  return (
    <label className="block">
      <span className="mono-tag font-bold" style={{ color: "var(--color-titanium)" }}>{label}</span>
      <input type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border px-2 py-2 text-sm"
        style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }} />
    </label>
  );
}

function FeaturedCard({ listing }: { listing: any }) {
  return (
    <Link to="/marketplace/$id" params={{ id: listing.id }} className="block px-4 pt-4">
      <div className="relative overflow-hidden border" style={{ borderColor: "var(--color-hair-strong)" }}>
        <div className="relative h-64 w-full">
          {listing.hero_image_url ? (
            <img src={listing.hero_image_url} className="h-full w-full object-cover" style={{ filter: "grayscale(0.15) contrast(1.1)" }} loading="lazy" />
          ) : <div className="h-full w-full" style={{ background: "var(--color-slate)" }} />}
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.9) 100%)" }} />
          <span className="absolute left-3 top-3 mono-tag font-bold px-2 py-1"
            style={{ background: "var(--color-neon)", color: "#0a0a0a" }}>
            {listing.is_featured ? "FEATURED" : "TOP PICK"}
          </span>
          <div className="absolute inset-x-3 bottom-3">
            <p className="mono-tag font-bold" style={{ color: "var(--color-neon)" }}>
              {(CAT_LABEL[listing.category] ?? listing.category).toUpperCase()}
              {listing.year && ` · ${listing.year}`}
              {listing.brand && ` · ${String(listing.brand).toUpperCase()}`}
            </p>
            <h2 className="serif mt-1 text-2xl italic leading-tight" style={{ color: "var(--color-ink)" }}>
              {listing.title}
            </h2>
            <div className="mt-2 flex items-center justify-between">
              <p className="mono-num text-lg font-bold" style={{ color: "var(--color-ink)" }}>
                {fmtPrice(listing.price_cents, listing.currency)}
                {listing.is_negotiable && <span className="mono-tag ml-2" style={{ color: "var(--color-neon)" }}>OBO</span>}
              </p>
              {listing.city && <p className="mono-tag" style={{ color: "rgba(255,255,255,0.8)" }}>{listing.city.toUpperCase()}</p>}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ListingCard({ listing }: { listing: any }) {
  return (
    <Link to="/marketplace/$id" params={{ id: listing.id }} className="block border" style={{ borderColor: "var(--color-hair-strong)", background: "rgba(255,255,255,0.02)" }}>
      <div className="relative">
        {listing.hero_image_url ? (
          <img src={listing.hero_image_url} className="aspect-square w-full object-cover" style={{ filter: "grayscale(0.15)" }} loading="lazy" />
        ) : <div className="aspect-square w-full" style={{ background: "var(--color-slate)" }} />}
        {listing.status === "sold" && (
          <span className="absolute right-2 top-2 mono-tag font-bold px-2 py-0.5" style={{ background: "#ff3d3d", color: "#fff" }}>SOLD</span>
        )}
      </div>
      <div className="p-2">
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>
          {(CAT_LABEL[listing.category] ?? listing.category).toUpperCase()}
          {listing.year && ` · ${listing.year}`}
        </p>
        <p className="mt-0.5 text-xs font-bold truncate" style={{ color: "var(--color-ink)" }}>{listing.title}</p>
        <p className="mono-num mt-1 text-sm font-bold" style={{ color: "var(--color-ink)" }}>
          {fmtPrice(listing.price_cents, listing.currency)}
        </p>
        {listing.city && <p className="mono-tag mt-0.5" style={{ color: "var(--color-titanium)" }}>{listing.city.toUpperCase()}</p>}
      </div>
    </Link>
  );
}
