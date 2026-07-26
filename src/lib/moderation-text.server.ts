/**
 * Server-only text moderation via Lovable AI Gateway (Gemini).
 * Fail-open — never blocks legitimate content on gateway errors.
 * Used for post captions, comments, DMs, bios, listing descriptions.
 */

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type TextCategory =
  | "hate"
  | "harassment"
  | "sexual"
  | "self_harm"
  | "violence"
  | "illegal"
  | "spam";

export type TextVerdict = {
  safe: boolean;
  categories: TextCategory[];
  reason?: string;
  skipped?: boolean;
};

const SYSTEM = `You are a strict text safety classifier for a motorcycle & car social network.
Return ONLY compact JSON: {"safe":boolean,"categories":string[],"reason":string}.
Mark unsafe if the text contains: hate speech or slurs, targeted harassment,
sexual solicitation, self-harm encouragement, credible violence/threats, clearly
illegal activity, or aggressive spam/scam links.
Motorcycle/car culture, mild profanity, aggressive riding talk, drag-race
challenges, race-track speeds, and passionate opinions are SAFE.
Allowed categories: hate, harassment, sexual, self_harm, violence, illegal, spam.`;

export async function moderateText(text: string): Promise<TextVerdict> {
  const key = process.env.LOVABLE_API_KEY;
  const trimmed = text.trim();
  if (!key || trimmed.length < 3) return { safe: true, categories: [], skipped: true };

  try {
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        response_format: { type: "json_object" },
        temperature: 0,
        max_tokens: 150,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: trimmed.slice(0, 4000) },
        ],
      }),
    });
    if (!res.ok) return { safe: true, categories: [], skipped: true };
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Partial<TextVerdict>;
    return {
      safe: parsed.safe !== false,
      categories: Array.isArray(parsed.categories) ? (parsed.categories as TextCategory[]) : [],
      reason: parsed.reason,
    };
  } catch {
    return { safe: true, categories: [], skipped: true };
  }
}
