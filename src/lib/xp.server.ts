/**
 * Server-only XP writer.
 *
 * Users have no direct INSERT/UPDATE grant on `xp_events` or `user_challenges`
 * (see migration "lock down self-service privilege escalation"). Every XP award
 * must flow through here, where the amount comes from a server-side table and
 * never from client input.
 */

export const XP_TABLE: Record<string, number> = {
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
  drag_match_win: 0, // stake comes from the match row
};

export type XpInsert = {
  user_id: string;
  kind: string;
  amount: number;
  ref_kind?: string | null;
  ref_id?: string | null;
  metadata?: Record<string, unknown>;
};

/** Insert an XP event with the service-role client. Amount must be server-derived. */
export async function insertXpEvent(row: XpInsert) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const amount = Math.max(0, Math.min(Math.round(row.amount), 5000));
  const { data, error } = await supabaseAdmin
    .from("xp_events")
    .insert({
      user_id: row.user_id,
      kind: row.kind,
      amount,
      ref_kind: row.ref_kind ?? null,
      ref_id: row.ref_id ?? null,
      metadata: (row.metadata ?? {}) as never,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function upsertUserChallenge(row: {
  user_id: string;
  challenge_id: string;
  progress: number;
  completed_at?: string | null;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("user_challenges")
    .upsert(
      {
        user_id: row.user_id,
        challenge_id: row.challenge_id,
        progress: row.progress,
        completed_at: row.completed_at ?? null,
      },
      { onConflict: "user_id,challenge_id" },
    );
  if (error) throw new Error(error.message);
}

export async function completeUserChallenge(id: string, userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("user_challenges")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
