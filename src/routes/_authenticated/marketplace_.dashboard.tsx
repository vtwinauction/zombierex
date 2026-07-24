import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { StatusBar } from "@/components/StatusBar";
import { getSellerDashboard, updateListing, deleteListing } from "@/lib/marketplace.functions";

export const Route = createFileRoute("/_authenticated/marketplace/dashboard")({
  head: () => ({ meta: [{ title: "Seller Dashboard · ZOMBIEREX" }] }),
  component: Dashboard,
});

function fmtPrice(cents: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
}

function Dashboard() {
  const getFn = useServerFn(getSellerDashboard);
  const updateFn = useServerFn(updateListing);
  const delFn = useServerFn(deleteListing);
  const { data, refetch } = useQuery({ queryKey: ["seller-dashboard"], queryFn: () => getFn() });
  const d = data as any;

  async function markSold(id: string) { await updateFn({ data: { id, patch: {}, status: "sold" } }); refetch(); }
  async function archive(id: string) { await updateFn({ data: { id, patch: {}, status: "archived" } }); refetch(); }
  async function activate(id: string) { await updateFn({ data: { id, patch: {}, status: "active" } }); refetch(); }
  async function remove(id: string) { if (confirm("Delete listing?")) { await delFn({ data: { id } }); refetch(); } }

  return (
    <div className="pb-24">
      <StatusBar index="DSH" section="SELLER DASHBOARD" />

      <div className="flex items-end justify-between px-4 pt-6">
        <div>
          <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>SELLER ▸ CONTROL</p>
          <h1 className="serif mt-2 text-3xl italic" style={{ color: "var(--color-ink)" }}>My Marketplace</h1>
        </div>
        <Link to="/marketplace/new" className="btn-neon" style={{ padding: "10px 14px", fontSize: 10 }}>+ NEW</Link>
      </div>

      <div className="mx-4 mt-4 grid grid-cols-3 gap-2">
        <Metric k="ACTIVE" v={d?.active_count ?? 0} />
        <Metric k="SOLD" v={d?.sold_count ?? 0} />
        <Metric k="RATING" v={`★ ${(d?.avg_rating ?? 0).toFixed(1)}`} />
        <Metric k="VIEWS" v={d?.total_views ?? 0} />
        <Metric k="SAVES" v={d?.total_saves ?? 0} />
        <Metric k="AVG PRICE" v={fmtPrice(d?.avg_price_cents ?? 0)} />
      </div>

      <div className="px-4 pt-6">
        <p className="mono-tag font-bold" style={{ color: "var(--color-neon)" }}>MY LISTINGS · {(d?.listings ?? []).length}</p>
        <div className="mt-3 space-y-2">
          {((d?.listings as any[]) ?? []).map((l: any) => (
            <div key={l.id} className="flex gap-3 border p-2" style={{ borderColor: "var(--color-hair-strong)", background: "rgba(255,255,255,0.02)" }}>
              {l.hero_image_url
                ? <img src={l.hero_image_url} className="h-20 w-20 object-cover" />
                : <div className="h-20 w-20" style={{ background: "var(--color-slate)" }} />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <Link to="/marketplace/$id" params={{ id: l.id }} className="text-sm font-bold truncate" style={{ color: "var(--color-ink)" }}>{l.title}</Link>
                  <span className="mono-tag shrink-0" style={{
                    color: l.status === "active" ? "var(--color-neon)" : l.status === "sold" ? "#ff6b6b" : "var(--color-titanium)"
                  }}>{String(l.status).toUpperCase()}</span>
                </div>
                <p className="mono-num text-sm font-bold" style={{ color: "var(--color-ink)" }}>{fmtPrice(l.price_cents, l.currency)}</p>
                <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
                  {(l.views_count ?? 0)} VIEWS · {(l.saves_count ?? 0)} SAVES
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {l.status === "active" && <MiniBtn onClick={() => markSold(l.id)}>SOLD</MiniBtn>}
                  {l.status === "active" && <MiniBtn onClick={() => archive(l.id)}>ARCHIVE</MiniBtn>}
                  {l.status !== "active" && <MiniBtn onClick={() => activate(l.id)}>RE-LIST</MiniBtn>}
                  <MiniBtn onClick={() => remove(l.id)} danger>DELETE</MiniBtn>
                </div>
              </div>
            </div>
          ))}
          {(!d?.listings || d.listings.length === 0) && (
            <div className="border border-dashed p-6 text-center" style={{ borderColor: "var(--color-hair-strong)" }}>
              <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>NO LISTINGS YET</p>
              <Link to="/marketplace/new" className="btn-neon mt-4 inline-block" style={{ padding: "10px 14px", fontSize: 11 }}>
                CREATE YOUR FIRST ▸
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="border p-3 text-center" style={{ borderColor: "var(--color-hair-strong)", background: "rgba(255,255,255,0.02)" }}>
      <p className="mono-num text-lg font-bold" style={{ color: "var(--color-ink)" }}>{v}</p>
      <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>{k}</p>
    </div>
  );
}
function MiniBtn({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className="tap border px-2 py-1 mono-tag font-bold"
      style={{ borderColor: danger ? "#ff3d3d" : "var(--color-hair-strong)", color: danger ? "#ff3d3d" : "var(--color-ink)" }}>
      {children}
    </button>
  );
}
