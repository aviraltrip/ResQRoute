import { DistressCategory } from "@prisma/client";

export type Triage = {
  severity: number;
  category: DistressCategory;
  summary: string;
};

const VALID: DistressCategory[] = ["medical", "mobility", "fire_exposure", "structural", "panic"];

const SYSTEM_PROMPT = `You triage trapped-hotel-guest distress messages for first responders.
The transcript may be in English, Hindi, or Kannada. You MUST translate any non-English text to English. The summary MUST be exclusively in English.
Reply with JSON only — no prose, no markdown.
Schema: {"severity": 1-5 integer, "category": "medical"|"mobility"|"fire_exposure"|"structural"|"panic", "summary": "one short sentence under 20 words for a firefighter, lead with location/injury/hazard"}.
Severity rubric: 5 = life-threatening now, 4 = serious injury or imminent danger, 3 = trapped but stable, 2 = uncomfortable, 1 = minor concern.`;

function normalizeCategory(raw: unknown): DistressCategory {
  if (typeof raw !== "string") return "panic";
  const c = raw.toLowerCase().replace(/-/g, "_");
  return (VALID as string[]).includes(c) ? (c as DistressCategory) : "panic";
}

function clampSeverity(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 3;
  return Math.max(1, Math.min(5, Math.round(n)));
}

export async function triageDistress(text: string): Promise<Triage> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { severity: 3, category: "panic", summary: text.slice(0, 120) };
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://resqroute.local",
      "X-Title": "ResQRoute",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    return { severity: 3, category: "panic", summary: text.slice(0, 120) };
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content?.trim() ?? "{}";

  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (m) {
      try { parsed = JSON.parse(m[0]); } catch { /* ignore */ }
    }
  }

  return {
    severity: clampSeverity(parsed.severity),
    category: normalizeCategory(parsed.category),
    summary:
      typeof parsed.summary === "string" && parsed.summary.length > 0
        ? parsed.summary
        : text.slice(0, 120),
  };
}
