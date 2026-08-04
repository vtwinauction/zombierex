/**
 * Post drafts — localStorage-backed, per-user (best-effort).
 * Stores a serializable snapshot of the composer state.
 */
export type PostDraft = {
  id: string;
  createdAt: number;
  updatedAt: number;
  caption: string;
  kind: "photo" | "video" | "telemetry";
  media: Array<{ url: string; contentType: string; path?: string }>;
  scheduledFor?: number | null;
};

const KEY = "zombierex.post.drafts.v1";

function read(): PostDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PostDraft[]) : [];
  } catch {
    return [];
  }
}

function write(list: PostDraft[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* quota */
  }
}

export function listDrafts(): PostDraft[] {
  return read().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getDraft(id: string): PostDraft | undefined {
  return read().find((d) => d.id === id);
}

export function saveDraft(
  draft: Omit<PostDraft, "id" | "createdAt" | "updatedAt"> & { id?: string },
): PostDraft {
  const now = Date.now();
  const list = read();
  const id = draft.id ?? `d_${now}_${Math.random().toString(36).slice(2, 8)}`;
  const existing = list.find((d) => d.id === id);
  const next: PostDraft = {
    id,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    caption: draft.caption,
    kind: draft.kind,
    media: draft.media,
    scheduledFor: draft.scheduledFor ?? null,
  };
  const others = list.filter((d) => d.id !== id);
  write([next, ...others].slice(0, 30));
  return next;
}

export function deleteDraft(id: string) {
  write(read().filter((d) => d.id !== id));
}
