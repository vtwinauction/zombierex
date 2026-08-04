/**
 * Voice cues — Web Speech API wrapper. Safe no-op when unsupported.
 */
export function speak(
  text: string,
  opts?: { rate?: number; pitch?: number; volume?: number; lang?: string },
) {
  if (typeof window === "undefined") return;
  const s = window.speechSynthesis;
  if (!s) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = opts?.rate ?? 1;
    u.pitch = opts?.pitch ?? 1;
    u.volume = opts?.volume ?? 1;
    u.lang = opts?.lang ?? "en-US";
    s.cancel();
    s.speak(u);
  } catch {
    /* ignore */
  }
}

export function cancelSpeech() {
  if (typeof window === "undefined") return;
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}

export function isSpeechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
