/**
 * Global inbox counts — unread notifications + unread DM channels.
 * Used by FeedHeader chips to surface activity without opening the pages.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getInboxCounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const uid = context.userId;

    // Unread notifications
    const { count: notif } = await sb
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .is("read_at", null);

    // Unread DM channels: any conversation where last message is newer than my last_read_at
    // and I'm not the sender. Kept lightweight — pulls up to 100 recent memberships.
    const { data: members } = await sb
      .from("conversation_members")
      .select("conversation_id, last_read_at")
      .eq("user_id", uid);

    let dm = 0;
    const ids = (members ?? []).map((m: any) => m.conversation_id);
    if (ids.length > 0) {
      const { data: lastMsgs } = await sb
        .from("messages")
        .select("conversation_id, sender_id, created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false })
        .limit(200);
      const lastByConv = new Map<string, any>();
      for (const m of lastMsgs ?? []) {
        if (!lastByConv.has((m as any).conversation_id)) lastByConv.set((m as any).conversation_id, m);
      }
      for (const m of members ?? []) {
        const last = lastByConv.get((m as any).conversation_id);
        if (!last) continue;
        if (last.sender_id === uid) continue;
        const lr = (m as any).last_read_at;
        if (!lr || new Date(last.created_at) > new Date(lr)) dm++;
      }
    }

    return { notifications: notif ?? 0, messages: dm };
  });
