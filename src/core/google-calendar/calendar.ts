import { env } from "@/core/config/env";
import { getLogger } from "@/core/logging";

import { getCalendarClient } from "./client";

const logger = getLogger("google-calendar");

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalendarEvent {
  summary: string;
  description: string;
  location?: string;
  startDateTime: string; // ISO 8601, e.g. "2026-08-26T10:00:00"
  endDateTime: string;   // ISO 8601
}

export interface FreeBusySlot {
  start: string;
  end: string;
}

export interface AvailableSlot {
  start: Date;
  end: Date;
}

// ─── Create a dedicated calendar for a technician ─────────────────────────────

/**
 * Creates a new Google Calendar owned by the service account and shares it
 * with the technician's email so they can see their scheduled jobs.
 * Returns the new calendar's ID (store this in the DB).
 */
export async function createTechnicianCalendar(
  technicianName: string,
  technicianEmail: string,
): Promise<string> {
  const calendar = getCalendarClient();

  logger.info({ technicianEmail }, "google_calendar.create_started");

  // 1. Create the calendar
  const { data: newCalendar } = await calendar.calendars.insert({
    requestBody: {
      summary: `${technicianName} — PropCare Jobs`,
      description: `Maintenance job schedule for ${technicianName} at Meklit Tower`,
      timeZone: env.GOOGLE_CALENDAR_TIMEZONE,
    },
  });

  const calendarId = newCalendar.id;
  if (!calendarId) {
    throw new Error("Google Calendar API did not return a calendar ID");
  }

  // 2. Share it with the technician (editor access so they can see/edit their jobs)
  await calendar.acl.insert({
    calendarId,
    requestBody: {
      role: "writer",
      scope: { type: "user", value: technicianEmail },
    },
  });

  logger.info({ technicianEmail, calendarId }, "google_calendar.create_completed");
  return calendarId;
}

// ─── Check availability (freebusy) ───────────────────────────────────────────

/**
 * Returns a list of busy time slots for a technician's calendar
 * within the given time window.
 */
export async function getBusySlots(
  calendarId: string,
  windowStart: Date,
  windowEnd: Date,
): Promise<FreeBusySlot[]> {
  const calendar = getCalendarClient();

  const { data } = await calendar.freebusy.query({
    requestBody: {
      timeMin: windowStart.toISOString(),
      timeMax: windowEnd.toISOString(),
      timeZone: env.GOOGLE_CALENDAR_TIMEZONE,
      items: [{ id: calendarId }],
    },
  });

  const busySlots = data.calendars?.[calendarId]?.busy ?? [];
  return busySlots.map((slot) => ({
    start: slot.start ?? "",
    end: slot.end ?? "",
  }));
}

/**
 * Finds the next available 2-hour slot for a technician within the next 7 days,
 * looking only at working hours (8 AM – 6 PM, Mon–Sat).
 * Returns null if no slot is found.
 */
export async function findNextAvailableSlot(
  calendarId: string,
  durationHours = 2,
): Promise<AvailableSlot | null> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days ahead

  const busySlots = await getBusySlots(calendarId, now, windowEnd);

  // Walk through working hours in 30-min steps and find a free gap
  const SLOT_DURATION_MS = durationHours * 60 * 60 * 1000;
  const STEP_MS = 30 * 60 * 1000;
  const WORK_START_HOUR = 8;
  const WORK_END_HOUR = 18;

  let cursor = new Date(now);
  // Start from next 30-min boundary
  cursor.setMinutes(Math.ceil(cursor.getMinutes() / 30) * 30, 0, 0);

  while (cursor < windowEnd) {
    const dayOfWeek = cursor.getDay(); // 0=Sun, 6=Sat
    const hour = cursor.getHours();

    // Skip Sundays and outside working hours
    if (dayOfWeek === 0 || hour < WORK_START_HOUR || hour >= WORK_END_HOUR) {
      // Jump to next work day 8 AM
      cursor.setDate(cursor.getDate() + (dayOfWeek === 0 ? 1 : 0));
      cursor.setHours(WORK_START_HOUR, 0, 0, 0);
      if (cursor.getDay() === 0) cursor.setDate(cursor.getDate() + 1);
      continue;
    }

    const slotEnd = new Date(cursor.getTime() + SLOT_DURATION_MS);
    // Don't go past end of working day
    if (slotEnd.getHours() > WORK_END_HOUR) {
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(WORK_START_HOUR, 0, 0, 0);
      continue;
    }

    // Check if this slot overlaps any busy period
    const overlaps = busySlots.some((busy) => {
      const busyStart = new Date(busy.start).getTime();
      const busyEnd = new Date(busy.end).getTime();
      return cursor.getTime() < busyEnd && slotEnd.getTime() > busyStart;
    });

    if (!overlaps) {
      return { start: new Date(cursor), end: slotEnd };
    }

    cursor = new Date(cursor.getTime() + STEP_MS);
  }

  return null; // No slot found in 7 days
}

// ─── Create a job event ───────────────────────────────────────────────────────

/**
 * Creates a maintenance job event on the technician's calendar.
 * Notifies all attendees via email automatically (Google sends the invite).
 * Returns the created event ID.
 */
export async function createJobEvent(
  calendarId: string,
  event: CalendarEvent,
): Promise<string> {
  const calendar = getCalendarClient();

  logger.info({ calendarId, summary: event.summary }, "google_calendar.event_create_started");

  const { data } = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: event.summary,
      description: event.description,
      location: event.location ?? "Meklit Tower",
      start: {
        dateTime: event.startDateTime,
        timeZone: env.GOOGLE_CALENDAR_TIMEZONE,
      },
      end: {
        dateTime: event.endDateTime,
        timeZone: env.GOOGLE_CALENDAR_TIMEZONE,
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 24 * 60 }, // 1 day before
          { method: "popup", minutes: 60 },       // 1 hour before
        ],
      },
    },
  });

  const eventId = data.id;
  if (!eventId) throw new Error("Google Calendar API did not return an event ID");

  logger.info({ calendarId, eventId }, "google_calendar.event_create_completed");
  return eventId;
}
