/**
 * Vendor & subscription server functions — authenticated, RLS-scoped.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const BUSINESS_TYPES = [
  { code: "motorcycle_workshop", label: "Motorcycle Workshop" },
  { code: "car_workshop", label: "Car Workshop" },
  { code: "dealership", label: "Dealership" },
  { code: "spare_parts", label: "Spare Parts Store" },
  { code: "performance_shop", label: "Performance Shop" },
  { code: "tire_shop", label: "Tire Shop" },
  { code: "detailing", label: "Detailing Center" },
  { code: "builder", label: "Motorcycle Builder" },
  { code: "rental", label: "Rental Company" },
  { code: "towing", label: "Towing Company" },
  { code: "insurance", label: "Insurance Company" },
  { code: "training_school", label: "Training School" },
  { code: "motorcycle_club", label: "Motorcycle Club" },
  { code: "automotive_brand", label: "Automotive Brand" },
  { code: "other", label: "Other Automotive Business" },
] as const;

const BUSINESS_TYPE_CODES = BUSINESS_TYPES.map((b) => b.code) as [string, ...string[]];

const SlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(48)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Lowercase letters, numbers and hyphens");

const opt = (s: z.ZodString) => s.optional().or(z.literal(""));

const VendorApplicationSchema = z.object({
  slug: SlugSchema,
  business_name: z.string().trim().min(2).max(120),
  business_type: z.enum(BUSINESS_TYPE_CODES),
  legal_name: opt(z.string().trim().max(160)),
  trade_license_no: opt(z.string().trim().max(80)),
  tax_number: opt(z.string().trim().max(80)),
  owner_name: opt(z.string().trim().max(120)),
  email: opt(z.string().trim().email().max(255)),
  phone: opt(z.string().trim().max(40)),
  website: opt(z.string().trim().url().max(255)),
  description: opt(z.string().trim().max(2000)),
  address_line1: opt(z.string().trim().max(200)),
  address_line2: opt(z.string().trim().max(200)),
  city: opt(z.string().trim().max(120)),
  region: opt(z.string().trim().max(120)),
  country: opt(z.string().trim().max(120)),
  postal_code: opt(z.string().trim().max(20)),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  socials: z.record(z.string(), z.string().url().max(255)).optional(),
  operating_hours: z.record(z.string(), z.string().max(60)).optional(),
  service_areas: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
});

function normalize<T extends Record<string, unknown>>(o: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    out[k] = v === "" ? null : v;
  }
  return out as T;
}

export const listPlans = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("id, code, name, price_cents, currency, interval, features")
    .eq("is_active", true)
    .order("price_cents", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getMyVendor = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("vendors")
      .select("*")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const applyAsVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => VendorApplicationSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const payload = normalize({
      ...data,
      owner_id: context.userId,
      verification_status: "pending",
      submitted_at: new Date().toISOString(),
    });

    // upsert on owner_id (one vendor per user for v1)
    const { data: existing } = await context.supabase
      .from("vendors")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();

    const query = existing
      ? context.supabase.from("vendors").update(payload).eq("id", existing.id).select().single()
      : context.supabase.from("vendors").insert(payload).select().single();

    const { data: row, error } = await query;
    if (error) throw new Error(error.message);
    return row;
  });

export const updateMyVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => VendorApplicationSchema.partial().parse(raw))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("vendors")
      .update(normalize(data))
      .eq("owner_id", context.userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const subscribeVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        vendor_id: z.string().uuid(),
        plan_code: z.string().min(2).max(40),
        billing_interval: z.enum(["month", "quarter", "semiannual", "year"]).default("month"),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    // Verify caller owns the vendor
    const { data: vendor } = await context.supabase
      .from("vendors")
      .select("id, owner_id")
      .eq("id", data.vendor_id)
      .maybeSingle();
    if (!vendor || vendor.owner_id !== context.userId) {
      throw new Error("Forbidden");
    }
    const { data: plan, error: planErr } = await context.supabase
      .from("subscription_plans")
      .select("id, code, price_cents")
      .eq("code", data.plan_code)
      .maybeSingle();
    if (planErr || !plan) throw new Error("Plan not found");

    const now = new Date();
    const trialEnds = plan.price_cents > 0 ? new Date(now.getTime() + 14 * 24 * 3600 * 1000) : null;
    const periodMonths = { month: 1, quarter: 3, semiannual: 6, year: 12 }[data.billing_interval];
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + periodMonths);

    // Cancel any prior active subs for this vendor
    await context.supabase
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("vendor_id", data.vendor_id)
      .eq("status", "active");

    const { data: sub, error } = await context.supabase
      .from("subscriptions")
      .insert({
        user_id: context.userId,
        vendor_id: data.vendor_id,
        plan_id: plan.id,
        status: plan.price_cents > 0 ? "trialing" : "active",
        trial_ends_at: trialEnds?.toISOString() ?? null,
        current_period_end: periodEnd.toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return sub;
  });

export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("subscriptions")
      .select(
        "id, status, plan_id, trial_ends_at, current_period_end, cancel_at_period_end, vendor_id, plan:subscription_plans(code, name, price_cents, currency, interval, features)",
      )
      .eq("user_id", context.userId)
      .in("status", ["active", "trialing", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const getVendorDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: vendor } = await context.supabase
      .from("vendors")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!vendor) return null;

    const [products, services, orders, bookings, reviews] = await Promise.all([
      context.supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("vendor_id", vendor.id),
      context.supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("vendor_id", vendor.id),
      context.supabase
        .from("orders")
        .select("id, total_cents", { count: "exact" })
        .eq("vendor_id", vendor.id),
      context.supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("vendor_id", vendor.id),
      context.supabase.from("reviews").select("rating").eq("vendor_id", vendor.id),
    ]);
    const revenue = (orders.data ?? []).reduce((sum, o: any) => sum + (o.total_cents ?? 0), 0);
    const ratings = (reviews.data ?? []).map((r: any) => r.rating).filter(Boolean);
    const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

    return {
      products: products.count ?? 0,
      services: services.count ?? 0,
      orders: orders.count ?? 0,
      bookings: bookings.count ?? 0,
      reviews: ratings.length,
      revenue_cents: revenue,
      avg_rating: avgRating,
    };
  });
