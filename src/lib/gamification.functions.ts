/**
 * Phase 12 · Gamification, Premium & Loyalty.
 *
 * XP ledger + level-up, achievements, daily/weekly/seasonal challenges,
 * leaderboards, referrals, and premium membership toggles.
 *
 * All writes are authenticated; leaderboards are readable by anyone signed in.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// -------- helpers --------
const XP_TABLE: Record<string, number> = {
  post_created: 25,
  reel_created: 60,
  story_created: 15,
  comment_created: 5,
  reaction_received: 2,
  event_join: 30,
  event_hosted: 100,
  community_join: 20,
  community_post: 20,
  challenge_completed: 0, // reward comes from challenge row
  checkin: 10,
  invite_sent: 15,
  invite_activated: 150,
  marketplace_listed: 30,
  marketplace_sold: 200,
};

// -------- XP + streak --------
export const awardXp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        kind: z.string().min(2).max(48),
        amount: z.number().int().min(1).max(1000).optional(),
        ref_kind: z.string().max(32).optional(),
        ref_id: z.string().uuid().optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const amount = data.amount ?? XP_TABLE[data.kind] ?? 5;
    const { data: row, error } = await context.supabase
      .from("xp_events")
      .insert({
        user_id: context.userId,
        kind: data.kind,
        amount,
        ref_kind: data.ref_kind ?? null,
        ref_id: data.ref_id ?? null,
        metadata: data.metadata ?? {},
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const dailyCheckIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: p } = await context.supabase
      .from("profiles")
      .select("streak_days, last_checkin_at")
      .eq("id", context.userId)
      .maybeSingle();
    const now = new Date();
    const last = p?.last_checkin_at ? new Date(p.last_checkin_at) : null;
    const sameDay = last && last.toDateString() === now.toDateString();
    if (sameDay) return { alreadyCheckedIn: true, streak: p?.streak_days ?? 0 };

    const diffDays = last
      ? Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    const streak = diffDays === 1 ? (p?.streak_days ?? 0) + 1 : 1;

    await context.supabase
      .from("profiles")
      .update({ streak_days: streak, last_checkin_at: now.toISOString() })
      .eq("id", context.userId);

    await context.supabase.from("xp_events").insert({
      user_id: context.userId,
      kind: "checkin",
      amount: 10 + Math.min(streak, 30),
      metadata: { streak },
    });

    // progress the daily_checkin challenge
    const { data: challenge } = await context.supabase
      .from("gamification_challenges")
      .select("id, xp_reward, goal_count")
      .eq("slug", "daily_checkin")
      .maybeSingle();
    if (challenge) {
      await context.supabase.from("user_challenges").upsert(
        {
          user_id: context.userId,
          challenge_id: challenge.id,
          progress: 1,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,challenge_id" },
      );
    }

    return { alreadyCheckedIn: false, streak, xp: 10 + Math.min(streak, 30) };
  });

// -------- Profile summary --------
export const getMyGamificationSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: p } = await context.supabase
      .from("profiles")
      .select(
        "xp_total, level, streak_days, last_checkin_at, is_premium, profile_theme, featured_badge_slug, referral_code",
      )
      .eq("id", context.userId)
      .maybeSingle();

    const level = p?.level ?? 1;
    const xpForLevel = (l: number) => Math.pow(l - 1, 2) * 100;
    const currentBase = xpForLevel(level);
    const nextBase = xpForLevel(level + 1);
    const progress = Math.max(
      0,
      Math.min(1, ((p?.xp_total ?? 0) - currentBase) / Math.max(1, nextBase - currentBase)),
    );

    const [{ count: unlocked }, { count: refCount }] = await Promise.all([
      context.supabase
        .from("user_achievements")
        .select("*", { count: "exact", head: true })
        .eq("user_id", context.userId)
        .not("unlocked_at", "is", null),
      context.supabase
        .from("referrals")
        .select("*", { count: "exact", head: true })
        .eq("referrer_id", context.userId),
    ]);

    return {
      xp_total: p?.xp_total ?? 0,
      level,
      xp_to_next: Math.max(0, nextBase - (p?.xp_total ?? 0)),
      level_progress: progress,
      streak_days: p?.streak_days ?? 0,
      is_premium: p?.is_premium ?? false,
      profile_theme: p?.profile_theme ?? "default",
      featured_badge_slug: p?.featured_badge_slug ?? null,
      referral_code: p?.referral_code ?? null,
      achievements_unlocked: unlocked ?? 0,
      referrals: refCount ?? 0,
    };
  });

// -------- Achievements --------
export const listAchievements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: catalog }, { data: mine }] = await Promise.all([
      context.supabase
        .from("achievements")
        .select("*")
        .eq("is_hidden", false)
        .order("sort_order", { ascending: true }),
      context.supabase
        .from("user_achievements")
        .select("achievement_slug, progress, target, unlocked_at")
        .eq("user_id", context.userId),
    ]);
    const map = new Map((mine ?? []).map((r) => [r.achievement_slug, r]));
    return (catalog ?? []).map((a) => ({
      ...a,
      progress: map.get(a.slug)?.progress ?? 0,
      target: map.get(a.slug)?.target ?? 1,
      unlocked_at: map.get(a.slug)?.unlocked_at ?? null,
    }));
  });

export const setFeaturedBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ slug: z.string().nullable() }).parse(raw))
  .handler(async ({ data, context }) => {
    // verify user has unlocked it (or clearing)
    if (data.slug) {
      const { data: owned } = await context.supabase
        .from("user_achievements")
        .select("id")
        .eq("user_id", context.userId)
        .eq("achievement_slug", data.slug)
        .not("unlocked_at", "is", null)
        .maybeSingle();
      if (!owned) throw new Error("You have not unlocked that badge.");
    }
    const { error } = await context.supabase
      .from("profiles")
      .update({ featured_badge_slug: data.slug })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- Challenges --------
export const listMyChallenges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: challenges } = await context.supabase
      .from("gamification_challenges")
      .select("*")
      .eq("is_active", true)
      .order("cadence", { ascending: true });
    const { data: progress } = await context.supabase
      .from("user_challenges")
      .select("challenge_id, progress, completed_at")
      .eq("user_id", context.userId);
    const map = new Map((progress ?? []).map((p) => [p.challenge_id, p]));
    return (challenges ?? []).map((c) => ({
      ...c,
      progress: map.get(c.id)?.progress ?? 0,
      completed_at: map.get(c.id)?.completed_at ?? null,
    }));
  });

export const claimChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ challenge_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: challenge } = await context.supabase
      .from("gamification_challenges")
      .select("*")
      .eq("id", data.challenge_id)
      .maybeSingle();
    if (!challenge) throw new Error("Challenge not found");

    const { data: prog } = await context.supabase
      .from("user_challenges")
      .select("*")
      .eq("user_id", context.userId)
      .eq("challenge_id", data.challenge_id)
      .maybeSingle();
    if (!prog || prog.progress < challenge.goal_count) {
      throw new Error("Not eligible yet — keep going!");
    }
    if (prog.completed_at) return { alreadyClaimed: true };

    await context.supabase
      .from("user_challenges")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", prog.id);

    await context.supabase.from("xp_events").insert({
      user_id: context.userId,
      kind: "challenge_completed",
      amount: challenge.xp_reward,
      ref_kind: "challenge",
      ref_id: challenge.id,
      metadata: { slug: challenge.slug },
    });

    if (challenge.badge_slug) {
      await context.supabase.from("user_achievements").upsert(
        {
          user_id: context.userId,
          achievement_slug: challenge.badge_slug,
          progress: 1,
          target: 1,
          unlocked_at: new Date().toISOString(),
        },
        { onConflict: "user_id,achievement_slug" },
      );
    }

    return { alreadyClaimed: false, xp: challenge.xp_reward };
  });

// -------- Leaderboards --------
export const getLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        board: z.enum(["xp", "creators", "communities"]).default("xp"),
        limit: z.number().int().min(5).max(100).default(25),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    if (data.board === "communities") {
      const { data: rows } = await context.supabase
        .from("clubs")
        .select("id, name, slug, banner_url, members_count")
        .order("members_count", { ascending: false })
        .limit(data.limit);
      return { board: "communities", rows: rows ?? [] };
    }
    if (data.board === "creators") {
      const { data: rows } = await context.supabase
        .from("creator_profiles")
        .select("id, tagline, category, subscribers_count, tips_total_cents")
        .order("subscribers_count", { ascending: false })
        .limit(data.limit);
      return { board: "creators", rows: rows ?? [] };
    }
    const { data: rows } = await context.supabase
      .from("profiles")
      .select("id, handle, display_name, avatar_url, xp_total, level, streak_days, is_premium")
      .order("xp_total", { ascending: false })
      .limit(data.limit);
    return { board: "xp", rows: rows ?? [] };
  });

// -------- Referrals --------
export const claimReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ code: z.string().min(4).max(24) }).parse(raw))
  .handler(async ({ data, context }) => {
    const code = data.code.toUpperCase().trim();
    const { data: referrer } = await context.supabase
      .from("profiles")
      .select("id, referral_code")
      .eq("referral_code", code)
      .maybeSingle();
    if (!referrer) throw new Error("Invalid invite code");
    if (referrer.id === context.userId) throw new Error("Cannot invite yourself");

    const { error } = await context.supabase.from("referrals").insert({
      referrer_id: referrer.id,
      referred_user_id: context.userId,
      code,
      status: "activated",
    });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);

    // reward referrer
    await context.supabase.from("xp_events").insert({
      user_id: referrer.id,
      kind: "invite_activated",
      amount: XP_TABLE.invite_activated,
      ref_kind: "referral",
      metadata: { referred: context.userId },
    });
    // welcome bonus for new user
    await context.supabase.from("xp_events").insert({
      user_id: context.userId,
      kind: "invite_sent",
      amount: 50,
      metadata: { via: code },
    });

    return { ok: true, referrer_id: referrer.id };
  });

// -------- Premium --------
export const activatePremium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        tier: z.enum(["apex", "legend"]).default("apex"),
        months: z.number().int().min(1).max(24).default(1),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const now = new Date();
    const expires = new Date(now);
    expires.setMonth(expires.getMonth() + data.months);
    const priceCents = data.tier === "legend" ? 1999 : 999;

    // Deactivate any prior membership
    await context.supabase
      .from("premium_memberships")
      .update({ status: "expired" })
      .eq("user_id", context.userId)
      .eq("status", "active");

    const { data: row, error } = await context.supabase
      .from("premium_memberships")
      .insert({
        user_id: context.userId,
        tier: data.tier,
        status: "active",
        started_at: now.toISOString(),
        renews_at: expires.toISOString(),
        expires_at: expires.toISOString(),
        price_cents: priceCents * data.months,
        currency: "USD",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const cancelPremium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("premium_memberships")
      .update({ status: "canceled" })
      .eq("user_id", context.userId)
      .eq("status", "active");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- List my referrals --------
export const listMyReferrals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("referral_code")
      .eq("id", context.userId)
      .maybeSingle();

    const { data: refs } = await context.supabase
      .from("referrals")
      .select("id, referred_user_id, status, created_at, rewarded_at")
      .eq("referrer_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);

    const ids = (refs ?? []).map((r) => r.referred_user_id);
    let profiles: Record<
      string,
      { display_name: string | null; avatar_url: string | null; handle: string | null }
    > = {};
    if (ids.length > 0) {
      const { data: rows } = await context.supabase
        .from("profiles")
        .select("id, display_name, avatar_url, handle")
        .in("id", ids);
      for (const row of rows ?? []) {
        profiles[row.id] = {
          display_name: row.display_name,
          avatar_url: row.avatar_url,
          handle: row.handle,
        };
      }
    }

    const { data: xpRows } = await context.supabase
      .from("xp_events")
      .select("amount")
      .eq("user_id", context.userId)
      .eq("ref_kind", "referral");
    const xp_earned = (xpRows ?? []).reduce((sum, r: any) => sum + (r.amount ?? 0), 0);

    return {
      referral_code: profile?.referral_code ?? null,
      xp_earned,
      total: refs?.length ?? 0,
      referrals: (refs ?? []).map((r) => ({
        ...r,
        profile: profiles[r.referred_user_id] ?? null,
      })),
    };
  });
