import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { listCart, addToCart, removeFromCart, updateCartQty } from "@/lib/cart.functions";

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
  const qc = useQueryClient();

  const fetchCart = useServerFn(listCart);
  const addFn = useServerFn(addToCart);
  const removeFn = useServerFn(removeFromCart);
  const updateFn = useServerFn(updateCartQty);

  const cartQ = useQuery({
    queryKey: ["cart", "items"],
    queryFn: () => fetchCart(),
    staleTime: 15_000,
  });

  const invalidateCart = () => {
    qc.invalidateQueries({ queryKey: ["cart"] });
  };

  const addMut = useMutation({
    mutationFn: (listingId: string) => addFn({ data: { listingId } }),
    onSuccess: invalidateCart,
    onError: (e: any) => toast.error(e?.message ?? "Failed to add"),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: invalidateCart,
  });

  const qtyMut = useMutation({
    mutationFn: ({ id, qty }: { id: string; qty: number }) => updateFn({ data: { id, qty } }),
    onSuccess: invalidateCart,
  });

  // Handle ?add=<listingId> deep link (e.g., older callers, share links).
  useEffect(() => {
    if (search.add) {
      const id = search.add;
      addMut.mutate(id);
      navigate({ to: "/cart", search: {}, replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.add]);

  const items = (cartQ.data ?? []) as any[];
  const subtotalByCurrency = items.reduce<Record<string, number>>((acc, x) => {
    const c = x.listing?.currency ?? "USD";
    const price = x.listing?.price_cents ?? 0;
    acc[c] = (acc[c] ?? 0) + price * x.qty;
    return acc;
  }, {});

  return (
    <div className="pb-32">
      <div className="px-4 pt-4">
        <h1 className="serif text-3xl italic" style={{ color: "var(--color-ink)" }}>Your Cart</h1>
        <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>{items.length} ITEM{items.length === 1 ? "" : "S"}</p>

        {cartQ.isLoading && (
          <p className="mt-6 mono-tag" style={{ color: "var(--color-titanium)" }}>LOADING…</p>
        )}

        {!cartQ.isLoading && items.length === 0 && (
          <div className="mt-10 py-16 text-center border" style={{ borderColor: "var(--color-hair-strong)" }}>
            <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>CART EMPTY</p>
            <Link to="/marketplace" className="mt-3 inline-block mono-tag font-bold" style={{ color: "var(--color-neon)" }}>
              BROWSE MARKETPLACE ▸
            </Link>
          </div>
        )}

        {items.map((x) => {
          const l = x.listing ?? {};
          return (
            <div key={x.id} className="mt-3 flex gap-3 border p-3" style={{ borderColor: "var(--color-hair-strong)" }}>
              {l.hero_image_url && (
                <Link to="/marketplace/$id" params={{ id: x.listing_id }}>
                  <img src={l.hero_image_url} className="h-20 w-20 object-cover" alt="" />
                </Link>
              )}
              <div className="flex-1 min-w-0">
                <Link to="/marketplace/$id" params={{ id: x.listing_id }}>
                  <p className="text-sm font-bold truncate" style={{ color: "var(--color-ink)" }}>{l.title ?? "Listing removed"}</p>
                </Link>
                <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>{[l.brand, l.model].filter(Boolean).join(" · ")}</p>
                <div className="flex items-center justify-between mt-2 gap-2">
                  <p className="mono-num font-bold" style={{ color: "var(--color-neon)" }}>
                    {l.price_cents != null ? fmtPrice(l.price_cents, l.currency) : "—"}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => qtyMut.mutate({ id: x.id, qty: Math.max(1, x.qty - 1) })}
                      className="tap h-7 w-7 border mono-tag font-bold"
                      style={{ borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }}
                      aria-label="Decrease quantity"
                    >−</button>
                    <span className="mono-num text-sm w-6 text-center" style={{ color: "var(--color-ink)" }}>{x.qty}</span>
                    <button
                      onClick={() => qtyMut.mutate({ id: x.id, qty: Math.min(999, x.qty + 1) })}
                      className="tap h-7 w-7 border mono-tag font-bold"
                      style={{ borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }}
                      aria-label="Increase quantity"
                    >+</button>
                    <button
                      onClick={() => removeMut.mutate(x.id)}
                      className="tap ml-2 mono-tag"
                      style={{ color: "#ff3d3d" }}
                    >REMOVE</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

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
                  to="/checkout/order/$id"
                  params={{ id: x.listing_id }}
                  className="block tap py-3 mono-tag font-bold text-center text-black"
                  style={{ background: "var(--color-neon)" }}
                >
                  CHECKOUT: {(x.listing?.title ?? "").slice(0, 24).toUpperCase()} ▸
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
