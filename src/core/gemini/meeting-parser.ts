import { getLogger } from "@/core/logging";

import { getGeminiModel } from "./client";

const logger = getLogger("gemini.meeting-parser");

// ─── Types ────────────────────────────────────────────────────────────────────

export type MeetingParseConfidence = "high" | "medium" | "low";

export interface ParsedMeetingRequest {
  /** Partial name or identifier the manager used, e.g. "Dawit", "the plumber" */
  technicianNameHint: string;
  /**
   * ISO 8601 date-time string for the requested start, interpreted relative to
   * today in Africa/Addis_Ababa timezone.  null if the manager didn't specify.
   */
  requestedDateTime: string | null;
  /** Meeting length in minutes. Defaults to 60 if not mentioned. */
  durationMinutes: number;
  /** Short description of the meeting purpose. */
  purpose: string;
  confidence: MeetingParseConfidence;
  /** Populated when confidence is low — explains what information is missing. */
  clarificationNeeded: string | null;
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildMeetingParsePrompt(text: string, todayIso: string): string {
  return `You are an AI assistant for PropCare, a property management system for Meklit Tower in Addis Ababa, Ethiopia.

Today's date and time is: ${todayIso} (Africa/Addis_Ababa timezone, UTC+3).

A property manager has typed the following natural-language request to schedule a meeting with a technician:

"${text}"

Your task is to extract the scheduling intent. Respond with ONLY a valid JSON object — no markdown, no code blocks, no explanations — just raw JSON.

The JSON must have exactly these fields:
{
  "technicianNameHint": "The name or description of the technician the manager wants to meet (e.g. 'Dawit', 'the plumber', 'senior electrician'). Empty string if not mentioned.",
  "requestedDateTime": "ISO 8601 datetime string for the requested meeting start (e.g. '2026-08-28T15:00:00'). Use the context of today's date to resolve relative references like 'tomorrow', 'next Monday', 'this Friday at 2pm'. null if no time was specified.",
  "durationMinutes": integer number of minutes for the meeting. Default to 60 if not mentioned. Common values: 30, 60, 90, 120.,
  "purpose": "A clear one-sentence description of the meeting's purpose (e.g. 'Discuss plumbing inspection for unit 4B'). Infer from context if not stated explicitly.",
  "confidence": "high" if all fields are clear, "medium" if some reasonable assumptions were made, "low" if key information is missing or ambiguous,
  "clarificationNeeded": "A friendly question asking for the missing information, e.g. 'Which technician would you like to meet?' or 'What time works for you?'. null if confidence is high or medium."
}

Interpretation rules:
- "tomorrow" = the day after ${todayIso.slice(0, 10)}
- "next week" = 7 days from today
- "morning" = 9:00 AM, "afternoon" = 2:00 PM, "evening" = 5:00 PM if no specific time given
- Working hours are 8:00 AM – 6:00 PM, Monday to Saturday
- If the manager says "around 3" or "at 3", assume PM during business hours`;
}

// ─── Main parser function ─────────────────────────────────────────────────────

export async function parseMeetingRequest(text: string): Promise<ParsedMeetingRequest> {
  logger.info({ text }, "gemini.meeting_parse_started");

  const todayIso = new Date().toLocaleString("sv-SE", {
    timeZone: "Africa/Addis_Ababa",
    dateStyle: "short",
    timeStyle: "medium",
  });

  const model = getGeminiModel();
  const prompt = buildMeetingParsePrompt(text, todayIso);

  const result = await model.generateContent(prompt);
  const rawText = result.response.text().trim();

  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: ParsedMeetingRequest;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    logger.error({ rawText }, "gemini.meeting_parse_failed");
    return {
      technicianNameHint: "",
      requestedDateTime: null,
      durationMinutes: 60,
      purpose: text,
      confidence: "low",
      clarificationNeeded:
        "I wasn't able to fully understand that request. Could you specify the technician's name and a preferred date and time?",
    };
  }

  logger.info(
    { confidence: parsed.confidence, technicianNameHint: parsed.technicianNameHint },
    "gemini.meeting_parse_completed",
  );

  return parsed;
}
