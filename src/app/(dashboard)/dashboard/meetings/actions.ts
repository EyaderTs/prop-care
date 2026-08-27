"use server";

import { parseMeetingRequest, type ParsedMeetingRequest } from "@/core/gemini";
import { checkSlotAndSuggest, createJobEvent, type SuggestedSlot } from "@/core/google-calendar";
import { sendEmail } from "@/core/email";
import { meetingScheduledEmail } from "@/core/email/templates";
import { getLogger } from "@/core/logging";
import { createClient } from "@/core/supabase/server";
import { findActive } from "@/features/technicians/repository";
import { getTenantProfile } from "@/features/tenants";
import { db } from "@/core/database/client";
import { tenantProfiles } from "@/core/database/schema";
import { eq } from "drizzle-orm";

const logger = getLogger("meetings.actions");

// ─── Types ────────────────────────────────────────────────────────────────────

export type ParseStepState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "clarify"; question: string; parsed: ParsedMeetingRequest }
  | {
      status: "available";
      parsed: ParsedMeetingRequest;
      technician: { id: string; fullName: string; email: string; googleCalendarId: string };
      proposedStart: string; // ISO
      proposedEnd: string;   // ISO
      label: string;
    }
  | {
      status: "busy";
      parsed: ParsedMeetingRequest;
      technician: { id: string; fullName: string; email: string; googleCalendarId: string };
      suggestions: SuggestedSlot[];
    };

export type ConfirmState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "booked"; eventId: string; label: string; technicianName: string };

// ─── Helper: match technician by name hint ────────────────────────────────────

async function matchTechnician(hint: string) {
  if (!hint.trim()) return null;
  const all = await findActive();
  const lower = hint.toLowerCase();
  // Exact or partial name match
  return (
    all.find((t) => t.fullName.toLowerCase() === lower) ??
    all.find((t) => t.fullName.toLowerCase().includes(lower)) ??
    all.find((t) =>
      lower.split(" ").some((word) => word.length > 2 && t.fullName.toLowerCase().includes(word)),
    ) ??
    null
  );
}

// ─── Helper: get manager's display name ──────────────────────────────────────

async function getManagerName(userId: string): Promise<string> {
  const rows = await db
    .select({ fullName: tenantProfiles.fullName })
    .from(tenantProfiles)
    .where(eq(tenantProfiles.userId, userId))
    .limit(1)
    .catch(() => []);
  return rows[0]?.fullName ?? "Property Manager";
}

// ─── Action 1: Parse the natural language request ─────────────────────────────

export async function parseMeetingText(text: string): Promise<ParseStepState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Not authenticated." };

  const profile = await getTenantProfile(user.id).catch(() => null);
  if (profile?.role !== "manager") {
    return { status: "error", message: "Only managers can schedule meetings." };
  }

  if (!text.trim()) {
    return { status: "error", message: "Please describe the meeting you want to schedule." };
  }

  let parsed: ParsedMeetingRequest;
  try {
    parsed = await parseMeetingRequest(text);
  } catch (err) {
    logger.error({ error: String(err) }, "meetings.parse_failed");
    return { status: "error", message: "AI parsing failed. Please try again." };
  }

  if (parsed.confidence === "low" || parsed.clarificationNeeded) {
    return {
      status: "clarify",
      question: parsed.clarificationNeeded ?? "Could you provide more details?",
      parsed,
    };
  }

  // Match the technician
  const technician = await matchTechnician(parsed.technicianNameHint);
  if (!technician) {
    return {
      status: "clarify",
      question: `I couldn't find a technician matching "${parsed.technicianNameHint}". Could you check the name? You can see all technicians on the Technicians page.`,
      parsed,
    };
  }

  if (!technician.googleCalendarId) {
    return {
      status: "error",
      message: `${technician.fullName} does not have a Google Calendar set up yet. Please edit the technician profile to create one first.`,
    };
  }

  // Determine the requested start time
  const requestedStart = parsed.requestedDateTime
    ? new Date(parsed.requestedDateTime)
    : new Date(Date.now() + 24 * 60 * 60 * 1000); // default to tomorrow

  // Check availability
  let check;
  try {
    check = await checkSlotAndSuggest(
      technician.googleCalendarId,
      requestedStart,
      parsed.durationMinutes,
    );
  } catch (err) {
    logger.error({ error: String(err) }, "meetings.calendar_check_failed");
    return { status: "error", message: "Could not check calendar availability. Please try again." };
  }

  const tech = { id: technician.id, fullName: technician.fullName, email: technician.email, googleCalendarId: technician.googleCalendarId };

  if (check.available) {
    const proposedEnd = new Date(requestedStart.getTime() + parsed.durationMinutes * 60 * 1000);
    return {
      status: "available",
      parsed,
      technician: tech,
      proposedStart: requestedStart.toISOString(),
      proposedEnd: proposedEnd.toISOString(),
      label: new Intl.DateTimeFormat("en-US", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: process.env["GOOGLE_CALENDAR_TIMEZONE"] ?? "Africa/Addis_Ababa",
      }).format(requestedStart),
    };
  }

  return { status: "busy", parsed, technician: tech, suggestions: check.suggestions };
}

// ─── Action 2: Confirm and create the calendar event ─────────────────────────

export async function confirmMeeting(
  technicianId: string,
  technicianName: string,
  technicianEmail: string,
  technicianCalendarId: string,
  startIso: string,
  endIso: string,
  purpose: string,
): Promise<ConfirmState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Not authenticated." };

  const managerName = await getManagerName(user.id);

  const start = new Date(startIso);
  const end = new Date(endIso);

  let eventId: string;
  try {
    eventId = await createJobEvent(technicianCalendarId, {
      summary: `Meeting: ${purpose}`,
      description: `Meeting scheduled via PropCare AI.\n\nPurpose: ${purpose}\nManager: ${managerName}\nTechnician: ${technicianName}`,
      location: "Meklit Tower — Property Management Office",
      startDateTime: startIso,
      endDateTime: endIso,
    });
  } catch (err) {
    logger.error({ error: String(err) }, "meetings.calendar_create_failed");
    return { status: "error", message: "Failed to create calendar event. Please try again." };
  }

  // Email the technician
  await sendEmail({
    to: [{ email: technicianEmail, name: technicianName }],
    ...meetingScheduledEmail({
      recipientName: technicianName,
      recipientRole: "technician",
      managerName,
      technicianName,
      purpose,
      startDateTime: start,
      endDateTime: end,
    }),
  }).catch((err) => logger.warn({ error: String(err) }, "meetings.technician_email_failed"));

  // Email the manager
  await sendEmail({
    to: [{ email: user.email!, name: managerName }],
    ...meetingScheduledEmail({
      recipientName: managerName,
      recipientRole: "manager",
      managerName,
      technicianName,
      purpose,
      startDateTime: start,
      endDateTime: end,
    }),
  }).catch((err) => logger.warn({ error: String(err) }, "meetings.manager_email_failed"));

  const label = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: process.env["GOOGLE_CALENDAR_TIMEZONE"] ?? "Africa/Addis_Ababa",
  }).format(start);

  logger.info({ eventId, technicianId, managerUserId: user.id }, "meetings.booked");

  return { status: "booked", eventId, label, technicianName };
}
