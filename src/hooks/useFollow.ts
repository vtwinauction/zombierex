import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { haptic } from "@/lib/native";
import { supabase } from "@/integrations/supabase/client";
import { follow as followFn, unfollow as unfollowFn } from "@/lib/feed.functions";

/**
 * DB-backed follow state. Persists to the `follows` table via server fns,
 * so the social graph survives reinstalls and is visible to everyone else.
 * Local state stays optimistic; failures roll back with a toast.
 */
export function useFollow(id: string, label?: string) {
  const [following, setFollowing] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (alive) { setFollowing(false); setReady(true); } return; }
      const { data } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", user.id)
        .eq("followee_id", id)
        .maybeSingle();
      if (alive) { setFollowing(!!data); setReady(true); }
    })();
    return () => { alive = false; };
  }, [id]);

  const toggle = useCallback(
    async (e?: { stopPropagation?: () => void; preventDefault?: () => void }) => {
      e?.stopPropagation?.();
      e?.preventDefault?.();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Sign in to follow riders"); return; }
      const next = !following;
      setFollowing(next); // optimistic
      void haptic(next ? "medium" : "light");
      try {
        if (next) await followFn({ data: { followee_id: id } });
        else await unfollowFn({ data: { followee_id: id } });
        toast.success(next ? `Following ${label ?? "rider"}` : `Unfollowed ${label ?? "rider"}`);
      } catch (err) {
        setFollowing(!next); // rollback
        toast.error(err instanceof Error ? err.message : "Follow failed");
      }
    },
    [following, id, label],
  );

  return { following, toggle, ready };
}
