import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { StatusBar } from "@/components/StatusBar";
import { getSellerProfile, listSellerReviews } from "@/lib/marketplace.functions";

export const Route = createFileRoute("/marketplace/seller/$id")({
  head: ({ params }) => ({ meta: [{ title: `Seller · ${params.id.slice(0, 8)} · ZOMBIEREX` }] }),
  component: SellerPage,
});

function fmtPrice(cents: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
}

function SellerPage() {
  const { id } = Route.useParams();
  const getFn = useServerFn(getSellerProfile);
  const revFn = useServerFn(listSellerReviews);

  const { data } = useQuery({ queryKey: ["seller", id], queryFn: () => getFn({ data: { id } }) });
  const { data: reviews } = useQuery({ queryKey: ["seller-reviews", id], queryFn: () => revFn({ data: { seller_id: id, limit: 20 } }) });

  const p = (data as any)?.profile;
  const listings = ((data as any)?.active_listings ?? []) as any[];

  return (
    <div className="pb-24">
      <StatusBar index="SLR" section="SELLER PROFILE" />

      <div className="px-4 pt-6">
        <div className="flex items-center gap-4">
          {p?.avatar_url
            ? <img src={p.avatar_url} className="h-20 w-20 rounded-full object-cover border-2" style={{ borderColor: "var(--color-neon)" }} />
            : <div className="h-20 w-20 rounded-full" style={{ background: "var(--color-slate)" }} />}
          <div className="flex-1 min-w-0">
            <h1 className="serif text-2xl italic truncate" style={{ color: "var(--color-ink)" }}>{p?.display_name ?? p?.handle ?? "Seller"}</h1>
            <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>@{p?.handle}</p>
            {p?.tier && <span className="mono-tag mt-1 inline-block px-2 py-0.5" style={{ background: "var(--color-neon)", color: "#0a0a0a" }}>{String(p.tier).toUpperCase()}</span>}
          </div>
        </div>
        {p?.bio && <p className="mt-3 text-sm" style={{ color: "var(--color-ink)" }}>{p.bio}</p>}
      </div>

      <div className="mx-4 mt-6 grid grid-cols-4 border" style={{ borderColor: "var(--color-hair-strong)" }}>
        <Stat k="RATING" v={`★ ${Number(p?.seller_rating_avg ?? 0).toFixed(1)}`} />
        <Stat k="REVIEWS" v={p?.seller_reviews_count ?? 0} />
        <Stat k="ACTIVE" v={listings.length} />
        <Stat k="FOLLOWERS" v={p?.followers_count ?? 0} />
      </div>

      <div className="px-4 pt-6">
        <p className="mono-tag font-bold" style={{ color: "var(--color-neon)" }}>ACTIVE LISTINGS · {listings.length}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {listings.map((l: any) => (
            <Link key={l.id} to="/marketplace/$id" params={{ id: l.id }} className="border" style={{ borderColor: "var(--color-hair-strong)" }}>
              {l.hero_image_url
                ? <img src={l.hero_image_url} className="aspect-square w-full object-cover" />
                : <div className="aspect-square w-full" style={{ background: "var(--color-slate)" }} />}
              <div className="p-2">
                <p className="text-xs font-bold truncate" style={{ color: "var(--color-ink)" }}>{l.title}</p>
                <p className="mono-num text-sm font-bold" style={{ color: "var(--color-ink)" }}>{fmtPrice(l.price_cents, l.currency)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="px-4 pt-8">
        <p className="mono-tag font-bold" style={{ color: "var(--color-neon)" }}>REVIEWS · {(reviews as any[] ?? []).length}</p>
        <div className="mt-3 space-y-2">
          {((reviews as any[]) ?? []).map((r: any) => (
            <div key={r.id} className="border p-3" style={{ borderColor: "var(--color-hair-strong)", background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>{r.reviewer?.display_name ?? r.reviewer?.handle ?? "Rider"}</span>
                <span className="mono-num" style={{ color: "var(--color-neon)" }}>★ {r.rating}</span>
              </div>
              {r.body && <p className="mt-1 text-sm" style={{ color: "var(--color-ink)" }}>{r.body}</p>}
            </div>
          ))}
          {(!reviews || (reviews as any[]).length === 0) && <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>NO REVIEWS YET</p>}
        </div>
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="border-r py-3 text-center last:border-r-0" style={{ borderColor: "var(--color-hair)" }}>
      <p className="mono-num text-sm font-bold" style={{ color: "var(--color-ink)" }}>{v}</p>
      <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>{k}</p>
    </div>
  );
}
