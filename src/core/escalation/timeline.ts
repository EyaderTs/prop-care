import { eq } from "drizzle-orm";

import { db } from "@/core/database/client";
import { maintenanceRequests } from "@/core/database/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TimelineEventType =
  | "submitted"
  | "triaged"
  | "scheduled"
  | "follow_up_sent"
  | "tenant_confirmed_resolved"
  | "tenant_reported_unresolved"
  | "escalated"
  | "completed"
  | "cancelled"
  | "manager_alerted";

export interface TimelineEvent {
  type: TimelineEventType;
  message: string;
  timestamp: string; // ISO
  actor?: "system" | "tenant" | "manager";
}

// ─── Append a single event to the ticket's timeline JSONB array ───────────────

export async function appendTimelineEvent(
  requestId: string,
  event: Omit<TimelineEvent, "timestamp">,
): Promise<void> {
  const fullEvent: TimelineEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  // Fetch current timeline, append, and save back
  const rows = await db
    .select({ timeline: maintenanceRequests.timeline })
    .from(maintenanceRequests)
    .where(eq(maintenanceRequests.id, requestId))
    .limit(1);

  const current = (rows[0]?.timeline as TimelineEvent[] | null) ?? [];
  const updated = [...current, fullEvent];

  await db
    .update(maintenanceRequests)
    .set({ timeline: updated as unknown as Record<string, unknown>[], updatedAt: new Date() })
    .where(eq(maintenanceRequests.id, requestId));
}

export function parseTimeline(raw: unknown): TimelineEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw as TimelineEvent[];
}
