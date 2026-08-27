import { env } from "@/core/config/env";

import { getBusySlots } from "./calendar";

const WORK_START_HOUR = 8;
const WORK_END_HOUR = 18;
const STEP_MS = 30 * 60 * 1000; // 30-minute steps
const SEARCH_WINDOW_DAYS = 7;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SlotCheckResult {
  available: boolean;
  /** Populated when available = false — the 3 nearest free slots */
  suggestions: SuggestedSlot[];
}

export interface SuggestedSlot {
  start: Date;
  end: Date;
  /** Human-readable label, e.g. "Tomorrow, 10:00 AM" */
  label: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isWorkingHour(date: Date): boolean {
  const day = date.getDay(); // 0 = Sun
  const hour = date.getHours();
  return day !== 0 && hour >= WORK_START_HOUR && hour < WORK_END_HOUR;
}

function nextWorkingBoundary(date: Date): Date {
  const d = new Date(date);
  // Round up to next 30-min boundary
  const mins = d.getMinutes();
  const roundedMins = Math.ceil(mins / 30) * 30;
  d.setMinutes(roundedMins, 0, 0);

  // If we're past working hours or it's Sunday, jump to next working day 8am
  while (!isWorkingHour(d) || d.getHours() >= WORK_END_HOUR) {
    d.setDate(d.getDate() + 1);
    d.setHours(WORK_START_HOUR, 0, 0, 0);
  }
  return d;
}

function formatSlotLabel(start: Date, end: Date): string {
  const now = new Date();
  const todayStr = now.toDateString();
  const tomorrowStr = new Date(now.getTime() + 86400000).toDateString();
  const startStr = start.toDateString();

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: env.GOOGLE_CALENDAR_TIMEZONE,
  });
  const endTime = timeFormatter.format(end);
  const startTime = timeFormatter.format(start);

  let dayLabel: string;
  if (startStr === todayStr) {
    dayLabel = "Today";
  } else if (startStr === tomorrowStr) {
    dayLabel = "Tomorrow";
  } else {
    dayLabel = start.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      timeZone: env.GOOGLE_CALENDAR_TIMEZONE,
    });
  }

  return `${dayLabel}, ${startTime} – ${endTime}`;
}

// ─── Check if a specific slot is free; return suggestions if not ──────────────

export async function checkSlotAndSuggest(
  calendarId: string,
  requestedStart: Date,
  durationMinutes: number,
): Promise<SlotCheckResult> {
  const durationMs = durationMinutes * 60 * 1000;
  const requestedEnd = new Date(requestedStart.getTime() + durationMs);

  // Fetch busy slots for a window starting now through 7 days
  const windowStart = new Date(Math.min(Date.now(), requestedStart.getTime()));
  const windowEnd = new Date(windowStart.getTime() + SEARCH_WINDOW_DAYS * 86400000);
  const busySlots = await getBusySlots(calendarId, windowStart, windowEnd);

  // Check if the requested slot overlaps any busy period
  const overlaps = busySlots.some((busy) => {
    const bs = new Date(busy.start).getTime();
    const be = new Date(busy.end).getTime();
    return requestedStart.getTime() < be && requestedEnd.getTime() > bs;
  });

  if (!overlaps) {
    return { available: true, suggestions: [] };
  }

  // Find the next 3 available free slots
  const suggestions: SuggestedSlot[] = [];
  let cursor = nextWorkingBoundary(new Date());

  while (suggestions.length < 3 && cursor < windowEnd) {
    if (!isWorkingHour(cursor)) {
      cursor = nextWorkingBoundary(cursor);
      continue;
    }

    const slotEnd = new Date(cursor.getTime() + durationMs);
    if (slotEnd.getHours() > WORK_END_HOUR || (slotEnd.getHours() === WORK_END_HOUR && slotEnd.getMinutes() > 0)) {
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(WORK_START_HOUR, 0, 0, 0);
      continue;
    }

    const isFree = !busySlots.some((busy) => {
      const bs = new Date(busy.start).getTime();
      const be = new Date(busy.end).getTime();
      return cursor.getTime() < be && slotEnd.getTime() > bs;
    });

    if (isFree) {
      suggestions.push({
        start: new Date(cursor),
        end: slotEnd,
        label: formatSlotLabel(new Date(cursor), slotEnd),
      });
    }

    cursor = new Date(cursor.getTime() + STEP_MS);
  }

  return { available: false, suggestions };
}
