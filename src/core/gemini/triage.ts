import { getLogger } from "@/core/logging";

import { getGeminiModel } from "./client";

const logger = getLogger("gemini.triage");

// ─── Types ────────────────────────────────────────────────────────────────────

export type TriageCategory =
  | "hvac"
  | "plumbing"
  | "electrical"
  | "carpentry"
  | "appliance"
  | "general";

export type TriageUrgency = "low" | "medium" | "high" | "critical";

export interface TriageResult {
  category: TriageCategory;
  urgency: TriageUrgency;
  summary: string;
  requiredSkills: TriageCategory[];
  isSafetyRisk: boolean;
  safetyRiskReason: string | null;
  suggestedSLA: string;
  suggestedResponse: string;
  confidence: "high" | "medium" | "low";
  analysisTimestamp: string;
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildTriagePrompt(
  title: string,
  description: string,
  unitNumber: string | null,
): string {
  return `You are an expert property maintenance coordinator AI for Meklit Tower in Addis Ababa, Ethiopia.

A tenant has submitted the following maintenance request:

TITLE: ${title}
DESCRIPTION: ${description}
UNIT: ${unitNumber ?? "Not specified"}

Analyze this request carefully and respond with ONLY a valid JSON object — no markdown, no code block, no explanation — just the raw JSON.

The JSON must have exactly these fields:
{
  "category": one of: "hvac" | "plumbing" | "electrical" | "carpentry" | "appliance" | "general",
  "urgency": one of: "low" | "medium" | "high" | "critical",
  "summary": "A clear 1-2 sentence summary of the problem",
  "requiredSkills": array of skill strings from: ["hvac", "plumbing", "electrical", "carpentry", "appliance", "general"],
  "isSafetyRisk": true or false,
  "safetyRiskReason": "Explanation of safety risk, or null if none",
  "suggestedSLA": "Suggested response time, e.g. 'Within 2 hours', 'Within 24 hours', 'Within 3 business days'",
  "suggestedResponse": "A polite, professional response message to send to the tenant (2-3 sentences)",
  "confidence": one of: "high" | "medium" | "low"
}

Urgency guide:
- critical: immediate safety risk, flooding, electrical fire hazard, gas leak
- high: major discomfort, affects daily life (AC broken in heat, no hot water)
- medium: inconvenient but manageable (slow drain, minor leak, appliance issue)
- low: cosmetic or non-urgent (paint, minor fixture, non-critical)`;
}

// ─── Main triage function ─────────────────────────────────────────────────────

export async function triageMaintenanceRequest(
  title: string,
  description: string,
  unitNumber: string | null,
): Promise<TriageResult> {
  logger.info({ title }, "gemini.triage_started");

  const model = getGeminiModel();
  const prompt = buildTriagePrompt(title, description, unitNumber);

  const result = await model.generateContent(prompt);
  const rawText = result.response.text().trim();

  // Strip markdown code fences if Gemini wraps in them despite instructions
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: Omit<TriageResult, "analysisTimestamp">;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    logger.error({ rawText }, "gemini.triage_parse_failed");
    // Return a safe fallback so the request is not blocked
    return {
      category: "general",
      urgency: "medium",
      summary: title,
      requiredSkills: ["general"],
      isSafetyRisk: false,
      safetyRiskReason: null,
      suggestedSLA: "Within 24 hours",
      suggestedResponse:
        "Thank you for your maintenance request. We have received it and will be in touch shortly.",
      confidence: "low",
      analysisTimestamp: new Date().toISOString(),
    };
  }

  const triage: TriageResult = {
    ...parsed,
    analysisTimestamp: new Date().toISOString(),
  };

  logger.info(
    { category: triage.category, urgency: triage.urgency, isSafetyRisk: triage.isSafetyRisk },
    "gemini.triage_completed",
  );

  return triage;
}
