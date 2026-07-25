import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";

const CART_KEY = "zx.cart.v1";

/**
 * Cart entry point rendered in the top masthead on every page.
 * Reads the local cart snapshot and shows a live item count badge.
 */
export function CartIconLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const read = () => {
      try {
        const ids = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
        setCount(Array.isArray(ids) ? ids.length : 0);
      } catch {
        setCount(0);
      }
    };
    read();
    window.addEventListener("storage", read);
    const id = window.setInterval(read, 500);
    return () => {
      window.removeEventListener("storage", read);
      window.clearInterval(id);
    };
  }, []);

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
