/**
 * Shopping cart server functions.
 * All calls require an authenticated user; RLS scopes rows to auth.uid().
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listCart = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("cart_items")
      .select(
        "id, listing_id, qty, created_at, listing:listings!cart_items_listing_id_fkey(id, title, brand, model, price_cents, currency, hero_image_url, seller_id, status)",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const cartCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count, error } = await context.supabase
      .from("cart_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return count ?? 0;
  });

export const addToCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z.object({ listingId: z.string().uuid(), qty: z.number().int().min(1).max(999).default(1) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("cart_items")
      .upsert(
        { user_id: context.userId, listing_id: data.listingId, qty: data.qty },
        { onConflict: "user_id,listing_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateCartQty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z.object({ id: z.string().uuid(), qty: z.number().int().min(1).max(999) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("cart_items")
      .update({ qty: data.qty })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeFromCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("cart_items")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
