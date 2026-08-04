/**
 * ZOMBIEREX — Interaction Queue
 * -----------------------------------------------------------------
 * Offline-friendly action queue for social interactions
 * (like / save / share). Applies optimistic updates immediately,
 * persists pending mutations to localStorage, and drains them by
 * calling the real backend (`react` / `unreact`) whenever the
 * network is (or becomes) available. A synthetic "force offline"
 * flag is available for exercising queued / retrying / failed
 * states end-to-end from the UI.
 */

export type InteractionKind = "like" | "unlike" | "save" | "unsave" | "share";

export type QueuedAction = {
  id: string;
  targetId: string;
  kind: InteractionKind;
  createdAt: number;
  attempts: number;
  lastError?: string;
  status: "pending" | "retrying" | "failed";
};

type Listener = () => void;

const STORAGE_KEY = "zrex.interactions.queue.v1";
const FORCE_OFFLINE_KEY = "zrex.interactions.forceOffline";
const MAX_ATTEMPTS = 6;

const listeners = new Set<Listener>();
let queue: QueuedAction[] = load();
let draining = false;

function load(): QueuedAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedAction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    /* quota / private mode — ignore */
  }
}

function emit() {
  for (const l of listeners) l();
}

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getQueueSnapshot(): QueuedAction[] {
  return queue;
}

export function getPendingForTarget(targetId: string): QueuedAction[] {
  return queue.filter((a) => a.targetId === targetId);
}

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  if (typeof window !== "undefined") {
    try {
      if (window.sessionStorage.getItem(FORCE_OFFLINE_KEY) === "1") return false;
    } catch {
      /* ignore */
    }
  }
  return navigator.onLine !== false;
}

export function setForceOffline(v: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (v) window.sessionStorage.setItem(FORCE_OFFLINE_KEY, "1");
    else window.sessionStorage.removeItem(FORCE_OFFLINE_KEY);
  } catch {
    /* ignore */
  }
  emit();
  if (!v) void drain();
}

/** Real network transport — sends the queued action to the backend. */
async function sendAction(action: QueuedAction): Promise<void> {
  if (!isOnline()) throw new Error("offline");
  const { react, unreact } = await import("@/lib/feed.functions");
  try {
    if (action.kind === "like") await react({ data: { post_id: action.targetId, kind: "like" } });
    else if (action.kind === "unlike")
      await unreact({ data: { post_id: action.targetId, kind: "like" } });
    else if (action.kind === "save")
      await react({ data: { post_id: action.targetId, kind: "save" } });
    else if (action.kind === "unsave")
      await unreact({ data: { post_id: action.targetId, kind: "save" } });
    else if (action.kind === "share")
      await react({ data: { post_id: action.targetId, kind: "share" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    // Auth errors shouldn't retry forever — mark as terminal.
    if (msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("forbidden")) {
      throw new Error("auth_required");
    }
    throw err;
  }
}

export function enqueue(targetId: string, kind: InteractionKind): QueuedAction {
  const action: QueuedAction = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    targetId,
    kind,
    createdAt: Date.now(),
    attempts: 0,
    status: isOnline() ? "pending" : "pending",
  };
  queue = [...queue, action];
  persist();
  emit();
  void drain();
  return action;
}

export function retryFailed() {
  queue = queue.map((a) =>
    a.status === "failed" ? { ...a, status: "pending", attempts: 0, lastError: undefined } : a,
  );
  persist();
  emit();
  void drain();
}

async function drain() {
  if (draining) return;
  draining = true;
  try {
    while (true) {
      const next = queue.find((a) => a.status !== "failed");
      if (!next) break;
      if (!isOnline()) break;

      queue = queue.map((a) =>
        a.id === next.id ? { ...a, status: "retrying", attempts: a.attempts + 1 } : a,
      );
      persist();
      emit();

      try {
        await sendAction(next);
        // success — drop it
        queue = queue.filter((a) => a.id !== next.id);
        persist();
        emit();
      } catch (err) {
        const attempts = queue.find((a) => a.id === next.id)?.attempts ?? next.attempts + 1;
        const message = err instanceof Error ? err.message : "error";
        if (message === "offline") {
          // leave it as pending until we come back online
          queue = queue.map((a) =>
            a.id === next.id ? { ...a, status: "pending", lastError: message } : a,
          );
          persist();
          emit();
          break;
        }
        if (attempts >= MAX_ATTEMPTS) {
          queue = queue.map((a) =>
            a.id === next.id ? { ...a, status: "failed", lastError: message } : a,
          );
          persist();
          emit();
          continue;
        }
        // exponential backoff before next attempt
        const wait = Math.min(8000, 400 * 2 ** Math.min(attempts, 5));
        queue = queue.map((a) =>
          a.id === next.id ? { ...a, status: "pending", lastError: message } : a,
        );
        persist();
        emit();
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  } finally {
    draining = false;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    emit();
    void drain();
  });
  window.addEventListener("offline", () => emit());
  // Kick off any actions persisted from a previous session.
  if (queue.length > 0) void drain();
}
