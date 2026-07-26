/**
 * Server-only helper: call Lovable AI Gateway (Gemini vision) to classify
 * a hosted image URL. Fail-open — if the gateway is unreachable or returns
 * malformed JSON, we allow the upload. Purely additive safety layer.
 */

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type ImageCategory =
  | "nudity"
  | "sexual"
  | "graphic_violence"
  | "gore"
  | "hate_symbols"
  | "self_harm"
  | "illegal_activity";

export type ModerationVerdict = {
  safe: boolean;
  categories: ImageCategory[];
  reason?: string;
  skipped?: boolean;
};

const SYSTEM = `You are a strict image safety classifier for a motorcycle & car social network.
Return ONLY compact JSON: {"safe":boolean,"categories":string[],"reason":string}.
Mark unsafe if the image contains: explicit nudity, sexual acts, graphic gore,
severe violence toward people, hate symbols, self-harm imagery, or clearly
illegal activity. Motorcycles, cars, wheelies, burnouts, race crashes, blood-free
injuries, models in normal riding gear, and mild profanity are SAFE.
Allowed categories: nudity, sexual, graphic_violence, gore, hate_symbols, self_harm, illegal_activity.`;

export async function moderateImageUrl(url: string): Promise<ModerationVerdict> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return { safe: true, categories: [], skipped: true };

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
        max_tokens: 200,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: "Classify this image. JSON only." },
              { type: "image_url", image_url: { url } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) return { safe: true, categories: [], skipped: true };

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { safe: true, categories: [], skipped: true };

    const parsed = JSON.parse(match[0]) as {
      safe?: boolean;
      categories?: unknown;
      reason?: unknown;
    };
    const categories = Array.isArray(parsed.categories)
      ? (parsed.categories.filter((c) => typeof c === "string") as ImageCategory[])
      : [];
    return {
      safe: parsed.safe !== false && categories.length === 0,
      categories,
      reason: typeof parsed.reason === "string" ? parsed.reason : undefined,
    };
  } catch {
    return { safe: true, categories: [], skipped: true };
  }
}
