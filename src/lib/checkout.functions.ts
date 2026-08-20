/**
 * Checkout pricing — the buyer-facing quote.
 *
 * ONE engine, called on the server, and the screen renders what it returns.
 * `commission.ts` is deliberately client-safe so the owner's preview and this
 * quote run identical maths, but the AUTHORITATIVE number comes from here,
 * because fee rules live behind RLS a buyer cannot read.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeSplit, resolveFeeRule, type FeeRule, type SplitContext } from "@/lib/commission";
import { DEFAULT_CURRENCY } from "@/lib/money";

export interface CheckoutQuote {
  listing_id: string;
  currency: string;
  /** What the buyer pays. */
  item_cents: number;
  shipping_cents: number;
  buyer_total_cents: number;
  /** What the platform keeps, and what the seller receives. */
  platform_fee_cents: number;
  seller_net_cents: number;
  fee_bps: number;
  fee_label: string;
  /**
   * Who the fee is charged to. Listing it in the buyer's price table while
   * deducting it from the seller shows the buyer a charge they do not pay.
   */
  fee_borne_by: "seller" | "buyer";
  /**
   * Hold period in days, from payment_config. 0 means funds are released
   * immediately — in which case the UI must NOT claim they are held.
   */
  hold_days: number;
}

export const getCheckoutQuote = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ listing_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }): Promise<CheckoutQuote> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: listing, error } = await supabaseAdmin
      .from("listings")
      .select("id, price_cents, currency, category, seller_id, status")
      .eq("id", data.listing_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!listing) throw new Error("Listing not found");

    const l = listing as unknown as {
      id: string;
      price_cents: number | null;
      currency: string | null;
      category: string | null;
      seller_id: string | null;
      status: string | null;
    };

    if (l.status && l.status !== "active") {
      throw new Error("This listing is no longer available");
    }

    const currency = l.currency ?? DEFAULT_CURRENCY;
    const item = l.price_cents ?? 0;
    // `listings` has NO shipping column — the schema was checked, not assumed.
    // Shipping is arranged with the seller, so the quote reports 0 and the UI
    // says "Set by seller" rather than implying a total that includes postage.
    const shipping = 0;

    // Seller type affects the rate — a subscribed seller may pay less.
    let sellerType: string | null = null;
    if (l.seller_id) {
      const { data: sfs } = await supabaseAdmin
        .from("seller_finance_settings")
        .select("seller_type")
        .eq("seller_id", l.seller_id)
        .maybeSingle();
      sellerType = (sfs as { seller_type?: string | null } | null)?.seller_type ?? null;
    }

    const { data: rules } = await supabaseAdmin.from("fee_rules").select("*").eq("is_active", true);

    const ctx: SplitContext = {
      kind: "order",
      category: l.category,
      sellerId: l.seller_id,
      sellerType,
      currency,
    };
    const rule = resolveFeeRule((rules ?? []) as unknown as FeeRule[], ctx);

    // The fee is charged on the ITEM, not on shipping — charging commission on
    // a courier's fee is how sellers learn to inflate postage.
    const split = computeSplit(item, rule);

    const { data: cfg } = await supabaseAdmin
      .from("payment_config")
      .select("value")
      .eq("key", "escrow")
      .maybeSingle();
    const holdDays =
      Number((cfg as { value?: { hold_days?: number } } | null)?.value?.hold_days ?? 0) || 0;

    return {
      listing_id: l.id,
      currency,
      item_cents: item,
      shipping_cents: shipping,
      buyer_total_cents: item + shipping,
      platform_fee_cents: split.platform_fee_cents,
      seller_net_cents: split.net_cents,
      fee_bps: split.fee_bps,
      fee_label: split.rule_label,
      fee_borne_by: "seller",
      hold_days: holdDays,
    };
  });
