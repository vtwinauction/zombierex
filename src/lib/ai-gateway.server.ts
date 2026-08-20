/**
 * Minimal Lovable AI Gateway helper.
 * Server-only. Reads LOVABLE_API_KEY at call time.
 */

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GenerateOptions = {
  model?: string;
  temperature?: number;
  jsonObject?: boolean;
  maxTokens?: number;
};

/**
 * Call Lovable AI Gateway chat completions. Returns the assistant text.
 * Throws with the provider's error body on non-2xx.
 */
export async function aiComplete(
  messages: ChatMessage[],
  opts: GenerateOptions = {},
): Promise<string> {
  const { assertModuleEnabled } = await import("./feature-gate.server");
  await assertModuleEnabled("ai", "REX AI");

  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  const body: Record<string, unknown> = {
    model: opts.model ?? "google/gemini-3-flash-preview",
    messages,
  };
  if (opts.temperature !== undefined) body.temperature = opts.temperature;
  if (opts.jsonObject) body.response_format = { type: "json_object" };
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // Log the full upstream body server-side for debugging; return a generic
    // message to callers so provider errors, keys, or PII never leak client-side.
    console.error(`[ai-gateway] upstream error status=${res.status} body=${text}`);
    if (res.status === 429) throw new Error("AI rate limit — try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted for this workspace.");
    throw new Error("AI service temporarily unavailable. Please try again.");
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

/** Convenience wrapper that parses a JSON object response, tolerating stray text. */
export async function aiCompleteJson<T = unknown>(
  messages: ChatMessage[],
  opts: GenerateOptions = {},
): Promise<T> {
  const text = await aiComplete(messages, { ...opts, jsonObject: true });
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error("AI returned non-JSON output");
  }
}
