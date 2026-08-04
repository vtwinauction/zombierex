/**
 * Storage — signed URL helpers.
 *
 * All buckets (avatars, vehicles, posts, documents) are private. Uploads and
 * reads go through signed URLs minted here. Path convention:
 *   <bucket>/<user_id>/<...>
 * Enforced server-side so a user cannot mint URLs for other users' folders.
 *
 * `documents` (vendor KYC) is stricter: reads require admin OR the vendor
 * owner; writes require the vendor owner. Path convention:
 *   documents/vendor/<vendor_id>/<...>
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Bucket = "avatars" | "vehicles" | "posts" | "documents" | "marketplace";
const BUCKETS = ["avatars", "vehicles", "posts", "documents", "marketplace"] as const;

const PathSchema = z
  .string()
  .min(1)
  .max(512)
  .regex(/^[A-Za-z0-9._\-/]+$/, "Invalid characters in path")
  .refine((p) => !p.includes(".."), "Path traversal not allowed")
  .refine((p) => !p.startsWith("/"), "Path must be relative");

const MIME_ALLOWED: Record<Bucket, RegExp> = {
  avatars: /^image\/(png|jpeg|webp|gif|heic|heif)$/,
  vehicles: /^image\/(png|jpeg|webp|gif|heic|heif)$/,
  posts: /^(image\/(png|jpeg|webp|gif|heic|heif)|video\/(mp4|webm|quicktime))$/,
  documents: /^(image\/(png|jpeg|webp|heic|heif)|application\/pdf)$/,
  marketplace: /^(image\/(png|jpeg|webp|gif|heic|heif)|video\/(mp4|webm|quicktime))$/,
};

async function assertOwnerOfVendor(supabase: any, userId: string, vendorId: string) {
  const { data } = await supabase
    .from("vendors")
    .select("owner_id")
    .eq("id", vendorId)
    .maybeSingle();
  if (!data || data.owner_id !== userId) throw new Error("Forbidden");
}

async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "super_admin"])
    .limit(1)
    .maybeSingle();
  return !!data;
}

function assertOwnPath(bucket: Bucket, path: string, userId: string) {
  // documents use a vendor-scoped path; other buckets use user-scoped.
  if (bucket === "documents") {
    if (!/^vendor\/[0-9a-f-]{36}\//.test(path))
      throw new Error("documents path must be vendor/<vendor_id>/…");
    return;
  }
  if (!path.startsWith(`${userId}/`)) throw new Error(`${bucket} path must start with ${userId}/`);
}

const UploadSchema = z.object({
  bucket: z.enum(BUCKETS),
  path: PathSchema,
  content_type: z.string().min(3).max(120),
});

export const createSignedUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => UploadSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const bucket = data.bucket as Bucket;
    if (!MIME_ALLOWED[bucket].test(data.content_type))
      throw new Error(`Content-type ${data.content_type} not allowed for ${bucket}`);

    if (bucket === "documents") {
      const m = data.path.match(/^vendor\/([0-9a-f-]{36})\//);
      if (!m) throw new Error("Invalid documents path");
      await assertOwnerOfVendor(context.supabase, context.userId, m[1]);
    } else {
      assertOwnPath(bucket, data.path, context.userId);
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUploadUrl(data.path);
    if (error) throw new Error(error.message);
    return {
      bucket,
      path: signed.path,
      token: signed.token,
      signed_url: signed.signedUrl,
    };
  });

const YEAR = 31536000;
const ReadSchema = z.object({
  bucket: z.enum(BUCKETS),
  path: PathSchema,
  // Public social media (posts/avatars/vehicles/marketplace) needs durable URLs
  // or feeds go blank 15 minutes after upload. Sensitive `documents` stay capped
  // at 15 minutes in the handler below.
  expires_in: z.number().int().min(30).max(YEAR).default(YEAR),
});

// Verify visibility via the caller's RLS-scoped client. A row the user cannot
// see returns nothing — so the signed URL cannot bypass RLS.
async function assertPathVisibleToUser(
  supabase: any,
  bucket: Bucket,
  path: string,
  userId: string,
): Promise<boolean> {
  if (path.startsWith(`${userId}/`)) return true;
  if (bucket === "avatars") {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .ilike("avatar_url", `%${path}%`)
      .limit(1)
      .maybeSingle();
    return !!data;
  }
  if (bucket === "posts") {
    const { data } = await supabase
      .from("posts")
      .select("id")
      .or(`media_url.ilike.%${path}%,thumbnail_url.ilike.%${path}%`)
      .limit(1)
      .maybeSingle();
    return !!data;
  }
  if (bucket === "vehicles") {
    const { data } = await supabase.from("vehicles").select("id").limit(1).maybeSingle();
    return !!data;
  }
  if (bucket === "marketplace") {
    const { data } = await supabase
      .from("listing_photos")
      .select("id")
      .ilike("url", `%${path}%`)
      .limit(1)
      .maybeSingle();
    return !!data;
  }
  return false;
}

export const createSignedReadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => ReadSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const bucket = data.bucket as Bucket;
    // Sensitive vendor documents keep the short 15-minute cap.
    const expiresIn = bucket === "documents" ? Math.min(data.expires_in, 900) : data.expires_in;

    if (bucket === "documents") {
      const m = data.path.match(/^vendor\/([0-9a-f-]{36})\//);
      if (!m) throw new Error("Invalid documents path");
      const { data: vendor } = await context.supabase
        .from("vendors")
        .select("owner_id")
        .eq("id", m[1])
        .maybeSingle();
      const admin = await isAdmin(context.supabase, context.userId);
      if (!admin && (!vendor || vendor.owner_id !== context.userId)) throw new Error("Forbidden");
    } else {
      const ok = await assertPathVisibleToUser(context.supabase, bucket, data.path, context.userId);
      if (!ok) throw new Error("Forbidden");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(data.path, expiresIn);
    if (error) throw new Error(error.message);
    return { bucket, path: data.path, signed_url: signed.signedUrl, expires_in: expiresIn };
  });

export const deleteMyObject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ bucket: z.enum(BUCKETS), path: PathSchema }).parse(raw))
  .handler(async ({ data, context }) => {
    const bucket = data.bucket as Bucket;
    if (bucket === "documents") {
      const m = data.path.match(/^vendor\/([0-9a-f-]{36})\//);
      if (!m) throw new Error("Invalid documents path");
      await assertOwnerOfVendor(context.supabase, context.userId, m[1]);
    } else {
      assertOwnPath(bucket, data.path, context.userId);
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage.from(bucket).remove([data.path]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
