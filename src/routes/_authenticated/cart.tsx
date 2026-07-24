import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getListing } from "@/lib/marketplace.functions";
import { StatusBar } from "@/components/StatusBar";
import { z } from "zod";

const CART_KEY = "zx.cart.v1";

function readCart(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { return []; }
}
function writeCart(ids: string[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(ids));
}

export const Route = createFileRoute("/_authenticated/cart")({
  head: () => ({ meta: [{ title: "Cart · ZOMBIEREX" }] }),
  validateSearch: z.object({ add: z.string().uuid().optional() }),
  component: Cart,
});

function fmtPrice(cents: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
}

function Cart() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const get = useServerFn(getListing);
  const [ids, setIds] = useState<string[]>(() => readCart());

  useEffect(() => {
    if (search.add && !ids.includes(search.add)) {
      const next = [...ids, search.add];
      setIds(next); writeCart(next);
      navigate({ to: "/cart", search: {}, replace: true });
    }
  }, [search.add]);

  const results = useQueries({
    queries: ids.map((id) => ({ queryKey: ["listing", id], queryFn: () => get({ data: { id } }) })),
  });

  const items = results.map((r, i) => ({ id: ids[i], data: r.data as any })).filter((x) => x.data);
  const subtotalByCurrency = items.reduce<Record<string, number>>((acc, x) => {
    const c = x.data.currency ?? "USD";
    acc[c] = (acc[c] ?? 0) + (x.data.price_cents ?? 0);
    return acc;
  }, {});

  function remove(id: string) {
    const next = ids.filter((x) => x !== id);
    setIds(next); writeCart(next);
  }

  return (
    <div className="pb-32">
      <StatusBar index="CRT" section="SHOPPING CART" />
      <div className="px-4 pt-4">
        <h1 className="serif text-3xl italic" style={{ color: "var(--color-ink)" }}>Your Cart</h1>
        <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>{items.length} ITEM{items.length === 1 ? "" : "S"}</p>

        {items.length === 0 && (
          <div className="mt-10 py-16 text-center border" style={{ borderColor: "var(--color-hair-strong)" }}>
            <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>CART EMPTY</p>
            <Link to="/marketplace" className="mt-3 inline-block mono-tag font-bold" style={{ color: "var(--color-neon)" }}>
              BROWSE MARKETPLACE ▸
            </Link>
          </div>
        )}

        {items.map((x) => (
          <div key={x.id} className="mt-3 flex gap-3 border p-3" style={{ borderColor: "var(--color-hair-strong)" }}>
            {x.data.hero_image_url && (
              <Link to="/marketplace/$id" params={{ id: x.id }}>
                <img src={x.data.hero_image_url} className="h-20 w-20 object-cover" alt="" />
              </Link>
            )}
            <div className="flex-1 min-w-0">
              <Link to="/marketplace/$id" params={{ id: x.id }}>
                <p className="text-sm font-bold truncate" style={{ color: "var(--color-ink)" }}>{x.data.title}</p>
              </Link>
              <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>{x.data.brand} · {x.data.model}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="mono-num font-bold" style={{ color: "var(--color-neon)" }}>{fmtPrice(x.data.price_cents, x.data.currency)}</p>
                <button onClick={() => remove(x.id)} className="mono-tag" style={{ color: "#ff3d3d" }}>REMOVE</button>
              </div>
            </div>
          </div>
        ))}

        {items.length > 0 && (
          <>
            <div className="mt-6 border" style={{ borderColor: "var(--color-hair-strong)" }}>
              {Object.entries(subtotalByCurrency).map(([c, cents]) => (
                <div key={c} className="flex justify-between border-b px-3 py-3 last:border-b-0" style={{ borderColor: "var(--color-hair)" }}>
                  <span className="mono-tag" style={{ color: "var(--color-titanium)" }}>SUBTOTAL ({c})</span>
                  <span className="mono-num text-lg font-bold" style={{ color: "var(--color-neon)" }}>{fmtPrice(cents, c)}</span>
                </div>
              ))}
            </div>

            <p className="mt-3 text-xs" style={{ color: "var(--color-titanium)" }}>
              Each seller ships separately. You'll check out one item at a time so escrow, shipping, and tracking stay accurate per seller.
            </p>

            <div className="mt-4 space-y-2">
              {items.map((x) => (
                <Link
                  key={x.id}
                  to="/checkout/$id"
                  params={{ id: x.id }}
                  className="block tap py-3 mono-tag font-bold text-center text-black"
                  style={{ background: "var(--color-neon)" }}
                >
                  CHECKOUT: {x.data.title.slice(0, 24).toUpperCase()} ▸
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
