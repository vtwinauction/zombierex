/**
 * Share helper — builds canonical deep links for ZOMBIEREX content.
 * Uses window.location.origin on the client; server callers pass origin.
 */

export type ShareableType = "profile" | "post" | "listing" | "event" | "reel" | "creator";

export function shareUrl(
  type: ShareableType,
  id: string,
  origin = typeof window !== "undefined" ? window.location.origin : "https://zombierex.com",
): string {
  const map: Record<ShareableType, string> = {
    profile: `${origin}/u/${id}`,
    creator: `${origin}/creator/${id}`,
    post: `${origin}/post/${id}`,
    reel: `${origin}/reels/${id}`,
    listing: `${origin}/marketplace/${id}`,
    event: `${origin}/events/${id}`,
  };
  return map[type];
}

export function shareTitle(type: ShareableType, name?: string | null): string {
  if (name) return `${name} · ZOMBIEREX`;
  const map: Record<ShareableType, string> = {
    profile: "Rider Profile · ZOMBIEREX",
    creator: "Creator Profile · ZOMBIEREX",
    post: "Post · ZOMBIEREX",
    reel: "Reel · ZOMBIEREX",
    listing: "Listing · ZOMBIEREX",
    event: "Event · ZOMBIEREX",
  };
  return map[type];
}
