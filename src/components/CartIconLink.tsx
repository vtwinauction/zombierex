import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { cartCount } from "@/lib/cart.functions";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

/**
 * Cart entry point rendered in the top masthead on every page.
 * Live count reads from the database (RLS-scoped to the signed-in user).
 */
export function CartIconLink() {
  const fetchCount = useServerFn(cartCount);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => mounted && setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const q = useQuery({
    queryKey: ["cart", "count"],
    queryFn: () => fetchCount(),
    enabled: signedIn,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
  const count = q.data ?? 0;

  return (
    <Link
      to="/cart"
      aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart"}
      className="tap relative grid h-9 w-9 place-items-center"
      style={{ color: "var(--color-ink-0)", borderRadius: 10 }}
    >
      <ShoppingCart size={17} strokeWidth={1.8} />
      {count > 0 && (
        <span
          className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full px-1 text-[9px] font-bold"
          style={{
            background: "var(--color-neon, #7cff3f)",
            color: "var(--color-ink-0)",
            boxShadow: "0 0 0 2px #fff",
          }}
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
