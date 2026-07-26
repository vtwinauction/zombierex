/**
 * Real-time messaging server functions.
 * Backed by public.conversations / conversation_members / messages with RLS.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const uid = context.userId;

    const { data: memberRows, error: mErr } = await sb
      .from("conversation_members")
      .select("conversation_id, last_read_at")
      .eq("user_id", uid);
    if (mErr) throw new Error(mErr.message);

    const convIds = (memberRows ?? []).map((r: any) => r.conversation_id);
    if (convIds.length === 0) return [];

    const { data: convs, error: cErr } = await sb
      .from("conversations")
      .select("id, kind, title, last_message_at, created_at")
      .in("id", convIds)
      .order("last_message_at", { ascending: false });
    if (cErr) throw new Error(cErr.message);

    // Other participants + last message per conv
    const { data: allMembers } = await sb
      .from("conversation_members")
      .select("conversation_id, user_id")
      .in("conversation_id", convIds);

    const otherIds = Array.from(
      new Set((allMembers ?? []).filter((m: any) => m.user_id !== uid).map((m: any) => m.user_id))
    );
    const { data: profiles } = otherIds.length
      ? await sb.from("profiles").select("id, display_name, username, avatar_url").in("id", otherIds)
      : { data: [] as any[] };
    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    const { data: lastMsgs } = await sb
      .from("messages")
      .select("id, conversation_id, body, sender_id, created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false })
      .limit(200);
    const lastByConv = new Map<string, any>();
    for (const m of lastMsgs ?? []) {
      if (!lastByConv.has((m as any).conversation_id)) lastByConv.set((m as any).conversation_id, m);
    }

    const lastReadMap = new Map((memberRows ?? []).map((m: any) => [m.conversation_id, m.last_read_at]));

    return (convs ?? []).map((c: any) => {
      const others = (allMembers ?? [])
        .filter((m: any) => m.conversation_id === c.id && m.user_id !== uid)
        .map((m: any) => pMap.get(m.user_id))
        .filter(Boolean);
      const last = lastByConv.get(c.id);
      const lastRead = lastReadMap.get(c.id);
      const unread = last && last.sender_id !== uid && (!lastRead || new Date(last.created_at) > new Date(lastRead)) ? 1 : 0;
      return {
        id: c.id,
        kind: c.kind,
        title: c.title,
        lastMessageAt: c.last_message_at,
        others,
        lastMessage: last ? { body: last.body, createdAt: last.created_at, mine: last.sender_id === uid } : null,
        unread,
      };
    });
  });

export const getMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ conversationId: z.string().uuid(), limit: z.number().int().min(1).max(200).default(100) }).parse(raw))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: msgs, error } = await sb
      .from("messages")
      .select("id, conversation_id, sender_id, body, media_url, created_at")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true })
      .limit(data.limit);
    if (error) throw new Error(error.message);

    const senderIds = Array.from(new Set((msgs ?? []).map((m: any) => m.sender_id)));
    const { data: profiles } = senderIds.length
      ? await sb.from("profiles").select("id, display_name, username, avatar_url").in("id", senderIds)
      : { data: [] as any[] };
    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    // Mark as read
    await sb
      .from("conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", data.conversationId)
      .eq("user_id", context.userId);

    return (msgs ?? []).map((m: any) => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      body: m.body,
      mediaUrl: m.media_url,
      createdAt: m.created_at,
      mine: m.sender_id === context.userId,
      sender: pMap.get(m.sender_id) ?? null,
    }));
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({
    conversationId: z.string().uuid(),
    body: z.string().max(4000).default(""),
    mediaUrl: z.string().url().max(2048).optional(),
  }).refine((v) => v.body.trim().length > 0 || !!v.mediaUrl, { message: "Message is empty" }).parse(raw))

  .handler(async ({ data, context }) => {
    const { error: rlErr } = await context.supabase.rpc("check_rate_limit", {
      _bucket: "messages", _max_hits: 30, _window_seconds: 60,
    });
    if (rlErr) throw new Error(rlErr.message.includes("rate_limit_exceeded")
      ? "You're sending messages too fast — wait a moment."
      : rlErr.message);
    const { data: row, error } = await context.supabase
      .from("messages")
      .insert({
        conversation_id: data.conversationId,
        sender_id: context.userId,
        body: data.body,
        media_url: data.mediaUrl ?? null,
      })
      .select("id, conversation_id, sender_id, body, media_url, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });


export const startDirectMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ recipientId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    if (data.recipientId === context.userId) throw new Error("Cannot DM yourself");

    // Look for existing DM containing both users
    const { data: mine } = await sb.from("conversation_members").select("conversation_id").eq("user_id", context.userId);
    const { data: theirs } = await sb.from("conversation_members").select("conversation_id").eq("user_id", data.recipientId);
    const mineSet = new Set((mine ?? []).map((r: any) => r.conversation_id));
    const shared = (theirs ?? []).map((r: any) => r.conversation_id).filter((id: string) => mineSet.has(id));

    if (shared.length > 0) {
      const { data: dm } = await sb.from("conversations").select("id, kind").in("id", shared).eq("kind", "dm").limit(1).maybeSingle();
      if (dm) return { id: (dm as any).id, existing: true };
    }

    const { data: conv, error: cErr } = await sb
      .from("conversations")
      .insert({ kind: "dm", created_by: context.userId })
      .select("id").single();
    if (cErr) throw new Error(cErr.message);

    const { error: mErr } = await sb.from("conversation_members").insert([
      { conversation_id: conv.id, user_id: context.userId },
      { conversation_id: conv.id, user_id: data.recipientId },
    ]);
    if (mErr) throw new Error(mErr.message);

    return { id: conv.id, existing: false };
  });
