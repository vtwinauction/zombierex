import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, SlidersHorizontal, ArrowUpDown, Plus, MapPin, Star } from "lucide-react";
import { listListings, LISTING_CATEGORIES, LISTING_CONDITIONS } from "@/lib/marketplace.functions";
import { PullToRefresh } from "@/components/PullToRefresh";
import { AutoplayVideo, isVideoUrl } from "@/components/AutoplayVideo";

function HeroMedia({ src, alt, className }: { src: string; alt: string; className?: string }) {
  if (isVideoUrl(src)) {
    return <AutoplayVideo src={src} className={className} muted />;
  }
  return <img src={src} alt={alt} className={className} loading="lazy" />;
}

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
  { id: "new", label: "New" },
  { id: "featured", label: "Featured" },
  { id: "trending", label: "Trending" },
  { id: "nearby", label: "Nearby" },
  { id: "recommended", label: "Picks" },
  { id: "saved", label: "Saved" },
  { id: "mine", label: "Mine" },
] as const;

const SORTS = [
  { id: "recent", label: "Most recent" },
  { id: "price_asc", label: "Price · low to high" },
  { id: "price_desc", label: "Price · high to low" },
  { id: "year_desc", label: "Year · newest" },
] as const;

const CAT_LABEL: Record<string, string> = {
  motorcycle: "Motorcycles", car: "Cars", truck: "Trucks", scooter: "Scooters",
  atv: "ATVs", other_vehicle: "Vehicles",
  parts: "Parts", accessories: "Accessories", riding_gear: "Gear", apparel: "Apparel",
  collectibles: "Collectibles", tools: "Tools", garage_equipment: "Garage",
  electronics: "Electronics", services: "Services",
};

function fmtPrice(cents: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
}

function MarketplacePage() {
  const [scope, setScope] = useState<(typeof SCOPES)[number]["id"]>("new");
  const [sort, setSort] = useState<(typeof SORTS)[number]["id"]>("recent");
  const [category, setCategory] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [yearMin, setYearMin] = useState<string>("");
  const [condition, setCondition] = useState<string | undefined>();

  const list = useServerFn(listListings);
  const { data, isLoading, refetch } = useQuery({
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
  const sorted = useMemo(() => {
    const arr = [...rows];
    switch (sort) {
      case "price_asc": arr.sort((a, b) => (a.price_cents ?? 0) - (b.price_cents ?? 0)); break;
      case "price_desc": arr.sort((a, b) => (b.price_cents ?? 0) - (a.price_cents ?? 0)); break;
      case "year_desc": arr.sort((a, b) => (b.year ?? 0) - (a.year ?? 0)); break;
    }
    return arr;
  }, [rows, sort]);
  const featured = useMemo(() => sorted.find((l: any) => l.is_featured) ?? sorted[0], [sorted]);
  const rest = useMemo(() => sorted.filter((l: any) => l.id !== featured?.id), [sorted, featured]);

  return (
    <PullToRefresh onRefresh={() => refetch()}>
    <div className="pb-24" style={{ background: "var(--color-paper-1)" }}>

      {/* Title row */}
      <div className="flex items-end justify-between gap-3 px-4 pt-6">
        <div className="min-w-0">
          <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>{rows.length} LISTINGS</p>
          <h1 className="serif mt-1 text-4xl italic leading-none" style={{ color: "var(--color-ink)" }}>Marketplace</h1>
        </div>
        <Link
          to="/marketplace/new"
          className="tap inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 mono-tag font-bold shadow-sm transition-transform active:scale-95"
          style={{ background: "var(--color-neon)", color: "#0a0a0a" }}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} /> LIST ITEM
        </Link>
      </div>

      {/* Compact toolbar: search + filters + sort */}
      <div className="px-4 pt-4">
        <div
          className="flex items-stretch gap-2 rounded-2xl border p-1.5 shadow-sm"
          style={{ borderColor: "var(--color-line)", background: "var(--color-paper-0)" }}
        >
          <div className="flex flex-1 items-center gap-2 rounded-xl px-3" style={{ background: "var(--color-paper-2)" }}>
            <Search className="h-4 w-4 shrink-0" style={{ color: "var(--color-ink-3)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search machines, parts, gear…"
              className="w-full bg-transparent py-2.5 text-sm outline-none"
              style={{ color: "var(--color-ink)" }}
            />
          </div>
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            aria-pressed={filtersOpen}
            className="tap inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 mono-tag font-bold transition-colors"
            style={{
              background: filtersOpen ? "var(--color-neon)" : "var(--color-paper-2)",
              color: filtersOpen ? "#0a0a0a" : "var(--color-ink)",
            }}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Selects row */}
        <div className="mt-2 grid grid-cols-3 gap-2">
          <SelectField label="VIEW" value={scope} onChange={(v) => setScope(v as any)} options={SCOPES.map(s => ({ value: s.id, label: s.label }))} />
          <SelectField label="CATEGORY" value={category ?? ""} onChange={(v) => setCategory(v || undefined)} options={[{ value: "", label: "All" }, ...LISTING_CATEGORIES.map(c => ({ value: c, label: CAT_LABEL[c] ?? c }))]} />
          <SelectField
            label={<span className="inline-flex items-center gap-1"><ArrowUpDown className="h-3 w-3" /> SORT</span>}
            value={sort}
            onChange={(v) => setSort(v as any)}
            options={SORTS.map(s => ({ value: s.id, label: s.label }))}
          />
        </div>

        {filtersOpen && (
          <div
            className="mt-2 rounded-2xl border p-3 shadow-sm"
            style={{ borderColor: "var(--color-line)", background: "var(--color-paper-0)" }}
          >
            <div className="grid grid-cols-2 gap-2">
              <FilterInput label="MIN PRICE" value={priceMin} onChange={setPriceMin} type="number" placeholder="0" />
              <FilterInput label="MAX PRICE" value={priceMax} onChange={setPriceMax} type="number" placeholder="—" />
              <FilterInput label="YEAR ≥" value={yearMin} onChange={setYearMin} type="number" placeholder="2015" />
              <SelectField
                label="CONDITION"
                value={condition ?? ""}
                onChange={(v) => setCondition(v || undefined)}
                options={[{ value: "", label: "Any" }, ...LISTING_CONDITIONS.map(c => ({ value: c, label: c.replace("_", " ") }))]}
              />
            </div>
            <button
              onClick={() => { setPriceMin(""); setPriceMax(""); setYearMin(""); setCondition(undefined); }}
              className="mt-3 mono-tag font-bold"
              style={{ color: "var(--color-neon-deep)" }}
            >
              CLEAR ALL ▸
            </button>
          </div>
        )}
      </div>

      {/* Featured */}
      {featured && <FeaturedCard listing={featured} />}

      {/* Grid */}
      <div className="px-4 pt-4 grid grid-cols-2 gap-3">
        {isLoading && (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        )}
        {!isLoading && rows.length === 0 && (
          <div
            className="col-span-2 rounded-2xl border border-dashed p-8 text-center"
            style={{ borderColor: "var(--color-line-2)", background: "var(--color-paper-0)" }}
          >
            <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>NO LISTINGS YET</p>
            <Link
              to="/marketplace/new"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 mono-tag font-bold"
              style={{ background: "var(--color-neon)", color: "#0a0a0a" }}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} /> CREATE THE FIRST
            </Link>
          </div>
        )}
        {rest.map((l: any) => <ListingCard key={l.id} listing={l} />)}
      </div>
    </div>
    </PullToRefresh>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: React.ReactNode; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mono-tag font-bold" style={{ color: "var(--color-titanium)" }}>{label}</span>
      <div
        className="mt-1 rounded-xl border shadow-sm"
        style={{ borderColor: "var(--color-line)", background: "var(--color-paper-0)" }}
      >
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-transparent px-2.5 py-2 text-sm outline-none"
          style={{ color: "var(--color-ink)" }}
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label.toUpperCase()}</option>)}
        </select>
      </div>
    </label>
  );
}

function FilterInput({ label, value, onChange, type = "text", placeholder }: any) {
  return (
    <label className="block">
      <span className="mono-tag font-bold" style={{ color: "var(--color-titanium)" }}>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border px-2.5 py-2 text-sm outline-none shadow-sm focus:border-[var(--color-ink)]"
        style={{ background: "var(--color-paper-0)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
      />
    </label>
  );
}

function Badge({ children, tone = "neon" }: { children: React.ReactNode; tone?: "neon" | "dark" | "light" | "red" }) {
  const styles: React.CSSProperties =
    tone === "neon" ? { background: "var(--color-neon)", color: "#0a0a0a" } :
    tone === "dark" ? { background: "rgba(10,10,10,0.85)", color: "#fff", backdropFilter: "blur(4px)" } :
    tone === "red"  ? { background: "#ff3d3d", color: "#fff" } :
                      { background: "rgba(255,255,255,0.9)", color: "#0a0a0a", backdropFilter: "blur(4px)" };
  return (
    <span
      className="mono-tag inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider shadow-sm"
      style={styles}
    >
      {children}
    </span>
  );
}

function FeaturedCard({ listing }: { listing: any }) {
  const l = listing;
  return (
    <Link
      to="/marketplace/$id"
      params={{ id: l.id }}
      className="block px-4 pt-5"
    >
      <article
        className="overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
        style={{
          borderColor: "var(--color-line)",
          background: "var(--color-paper-0)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -12px rgba(0,0,0,0.08)",
        }}
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden" style={{ background: "var(--color-paper-2)" }}>
          {l.hero_image_url ? (
            <img
              src={l.hero_image_url}
              alt={l.title}
              className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
              loading="lazy"
            />
          ) : null}
          <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
            <Badge tone="neon">{l.is_featured ? "FEATURED" : "TOP PICK"}</Badge>
            {l.seller?.is_verified && <Badge tone="dark">VERIFIED</Badge>}
            {l.status === "sold" && <Badge tone="red">SOLD</Badge>}
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2">
            <p className="mono-tag font-bold" style={{ color: "var(--color-neon-deep)" }}>
              {(CAT_LABEL[l.category] ?? l.category).toUpperCase()}
              {l.year && ` · ${l.year}`}
              {l.brand && ` · ${String(l.brand).toUpperCase()}`}
              {l.model && ` ${String(l.model).toUpperCase()}`}
            </p>
          </div>
          <h2 className="serif mt-1 text-2xl italic leading-tight" style={{ color: "var(--color-ink)" }}>
            {l.title}
          </h2>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <p className="mono-num text-xl font-bold" style={{ color: "var(--color-neon-deep)" }}>
              {fmtPrice(l.price_cents, l.currency)}
              {l.is_negotiable && <span className="mono-tag ml-2 text-[10px]" style={{ color: "var(--color-neon-deep)" }}>OBO</span>}
            </p>

            {l.city && (
              <p className="mono-tag inline-flex items-center gap-1 truncate" style={{ color: "var(--color-titanium)" }}>
                <MapPin className="h-3 w-3" /> {[l.city, l.country].filter(Boolean).join(", ").toUpperCase()}
              </p>
            )}
          </div>

          {l.condition && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Chip>{String(l.condition).replace("_", " ").toUpperCase()}</Chip>
              {l.mileage_km != null && <Chip>{l.mileage_km.toLocaleString()} KM</Chip>}
              {l.engine_cc != null && <Chip>{l.engine_cc} CC</Chip>}
              {l.transmission && l.transmission !== "na" && <Chip>{String(l.transmission).toUpperCase()}</Chip>}
            </div>
          )}

          {l.seller && (
            <div
              className="mt-4 flex items-center gap-2 border-t pt-3"
              style={{ borderColor: "var(--color-line)" }}
            >
              {l.seller.avatar_url
                ? <img src={l.seller.avatar_url} className="h-8 w-8 rounded-full object-cover" alt="" />
                : <div className="h-8 w-8 rounded-full" style={{ background: "var(--color-paper-2)" }} />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold" style={{ color: "var(--color-ink)" }}>
                  {l.seller.display_name ?? l.seller.handle}
                </p>
                <p className="mono-tag inline-flex items-center gap-1" style={{ color: "var(--color-titanium)" }}>
                  <Star className="h-3 w-3" fill="currentColor" />
                  {Number(l.seller.seller_rating_avg ?? 0).toFixed(1)}
                </p>
              </div>
              <span className="mono-tag font-bold" style={{ color: "var(--color-neon-deep)" }}>VIEW ▸</span>
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}

function ListingCard({ listing }: { listing: any }) {
  const l = listing;
  return (
    <Link
      to="/marketplace/$id"
      params={{ id: l.id }}
      className="group block overflow-hidden rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      style={{
        borderColor: "var(--color-line)",
        background: "var(--color-paper-0)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <div className="relative aspect-square w-full overflow-hidden" style={{ background: "var(--color-paper-2)" }}>
        {l.hero_image_url ? (
          <img
            src={l.hero_image_url}
            alt={l.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : null}
        <div className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1">
          {l.is_featured && <Badge tone="neon">FEATURED</Badge>}
          {!l.is_featured && l.is_new && <Badge tone="light">NEW</Badge>}
          {l.seller?.is_verified && <Badge tone="dark">✓</Badge>}
        </div>
        {l.status === "sold" && (
          <div className="absolute right-2 top-2"><Badge tone="red">SOLD</Badge></div>
        )}
      </div>
      <div className="p-2.5">
        <p className="mono-tag truncate" style={{ color: "var(--color-neon-deep)" }}>
          {(CAT_LABEL[l.category] ?? l.category).toUpperCase()}
          {l.year && ` · ${l.year}`}
        </p>
        <p className="mt-0.5 line-clamp-2 min-h-[2.4em] text-[13px] font-semibold leading-tight" style={{ color: "var(--color-ink)" }}>
          {l.title}
        </p>
        <p className="mono-num mt-1.5 text-sm font-bold" style={{ color: "var(--color-neon-deep)" }}>
          {fmtPrice(l.price_cents, l.currency)}
          {l.is_negotiable && <span className="mono-tag ml-1 text-[9px]" style={{ color: "var(--color-neon-deep)" }}>OBO</span>}
        </p>

        <div className="mt-1 flex items-center justify-between gap-1">
          {l.condition && (
            <span className="mono-tag truncate text-[9px]" style={{ color: "var(--color-titanium)" }}>
              {String(l.condition).replace("_", " ").toUpperCase()}
            </span>
          )}
          {l.city && (
            <span className="mono-tag inline-flex items-center gap-0.5 truncate text-[9px]" style={{ color: "var(--color-titanium)" }}>
              <MapPin className="h-2.5 w-2.5" /> {String(l.city).toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="mono-tag inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]"
      style={{ borderColor: "var(--color-line)", color: "var(--color-ink-2)", background: "var(--color-paper-1)" }}
    >
      {children}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{ borderColor: "var(--color-line)", background: "var(--color-paper-0)" }}
    >
      <div className="aspect-square w-full animate-pulse" style={{ background: "var(--color-paper-2)" }} />
      <div className="space-y-2 p-2.5">
        <div className="h-2 w-1/2 animate-pulse rounded" style={{ background: "var(--color-paper-2)" }} />
        <div className="h-3 w-4/5 animate-pulse rounded" style={{ background: "var(--color-paper-2)" }} />
        <div className="h-3 w-1/3 animate-pulse rounded" style={{ background: "var(--color-paper-2)" }} />
      </div>
    </div>
  );
}
