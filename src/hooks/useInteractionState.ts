import { useCallback, useEffect, useState } from "react";
import {
  enqueue,
  getPendingForTarget,
  isOnline,
  retryFailed,
  setForceOffline,
  subscribe,
  type QueuedAction,
} from "@/lib/interaction-queue";
import { share as nativeShare } from "@/lib/native";

export type InteractionState = {
  liked: boolean;
  saved: boolean;
  likes: number;
  shares: number;
  pending: QueuedAction[];
  hasFailed: boolean;
  isSyncing: boolean;
  online: boolean;
};

export function useInteractionState(
  targetId: string,
  initial: { likes: number; shares: number },
) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likes, setLikes] = useState(initial.likes);
  const [shares, setShares] = useState(initial.shares);
  const [pending, setPending] = useState<QueuedAction[]>(() =>
    getPendingForTarget(targetId),
  );
  const [online, setOnline] = useState<boolean>(isOnline());

  useEffect(() => {
    const update = () => {
      setPending(getPendingForTarget(targetId));
      setOnline(isOnline());
    };
    const unsub = subscribe(update);
    update();
    return unsub;
  }, [targetId]);

  const toggleLike = useCallback(() => {
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    try { enqueue(targetId, next ? "like" : "unlike"); } catch (e) { console.error("enqueue like failed", e); }
  }, [liked, targetId]);

  const toggleSave = useCallback(() => {
    const next = !saved;
    setSaved(next);
    try { enqueue(targetId, next ? "save" : "unsave"); } catch (e) { console.error("enqueue save failed", e); }
  }, [saved, targetId]);

  const share = useCallback(() => {
    setShares((n) => n + 1);
    try { enqueue(targetId, "share"); } catch (e) { console.error("enqueue share failed", e); }
    // Fire the native / web share sheet in parallel; failures are silent.
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/${targetId.replace(/^db:/, "posts/")}`;
      void nativeShare({ title: "ZOMBIEREX", url, dialogTitle: "Share" });
    }
  }, [targetId]);



  const hasFailed = pending.some((a) => a.status === "failed");
  const isSyncing = pending.some((a) => a.status === "retrying");

  return {
    liked,
    saved,
    likes,
    shares,
    pending,
    hasFailed,
    isSyncing,
    online,
    toggleLike,
    toggleSave,
    share,
    retry: retryFailed,
    setForceOffline,
  };
}
