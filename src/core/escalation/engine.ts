import { and, eq, isNull, lt, or } from "drizzle-orm";

import { db } from "@/core/database/client";
import { sendEmail } from "@/core/email";
import {
  escalationFollowUpEmail,
  escalationManagerAlert,
  escalationOverdueAppointmentAlert,
  escalationUnassignedAlert,
} from "@/core/email/templates";
import { getLogger } from "@/core/logging";
import { maintenanceRequests, tenantProfiles, users } from "@/core/database/schema";
import { appendTimelineEvent } from "./timeline";

const logger = getLogger("escalation.engine");

// ─── Timing thresholds ────────────────────────────────────────────────────────

const MINS = (m: number) => m * 60 * 1000;

// Toggle TEST_MODE to true for local testing (uses minutes instead of hours)
const TEST_MODE = process.env["NODE_ENV"] !== "production";

const FOLLOW_UP_THRESHOLD  = TEST_MODE ? MINS(1)  : MINS(24 * 60); // 1 min  | 24 h
const ESCALATE_THRESHOLD   = TEST_MODE ? MINS(2)  : MINS(12 * 60); // 2 mins | 12 h

// Keep these for the logging messages
const FOLLOW_UP_LABEL  = TEST_MODE ? "1 minute"  : "24 hours";
const ESCALATE_LABEL   = TEST_MODE ? "2 minutes" : "12 hours";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getTenantContact(profileId: string) {
  const rows = await db
    .select({ email: users.email, fullName: tenantProfiles.fullName })
    .from(tenantProfiles)
    .innerJoin(users, eq(users.id, tenantProfiles.userId))
    .where(eq(tenantProfiles.id, profileId))
    .limit(1)
    .catch(() => []);
  return rows[0] ?? null;
}

async function getAllManagerRecipients() {
  const rows = await db
    .select({ email: users.email, fullName: tenantProfiles.fullName })
    .from(tenantProfiles)
    .innerJoin(users, eq(users.id, tenantProfiles.userId))
    .where(eq(tenantProfiles.role, "manager"))
    .catch(() => []);
  return rows.map((r) => ({ email: r.email, name: r.fullName }));
}

function appUrl() {
  return process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
}

// ─── Stage 1 — alert managers for unassigned (pending/triaged) stuck tickets ──
// A tenant hasn't even had a technician assigned yet, so asking them "is it
// resolved?" makes no sense.  The right person to nudge here is the manager.

async function processUnassignedAlerts(): Promise<number> {
  const cutoff = new Date(Date.now() - FOLLOW_UP_THRESHOLD);

  const tickets = await db
    .select()
    .from(maintenanceRequests)
    .where(
      and(
        or(
          eq(maintenanceRequests.status, "pending"),
          eq(maintenanceRequests.status, "triaged"),
        ),
        lt(maintenanceRequests.createdAt, cutoff),
        isNull(maintenanceRequests.followUpSentAt), // alert not yet sent
      ),
    );

  const managers = await getAllManagerRecipients();
  let count = 0;

  for (const ticket of tickets) {
    const tenant = await getTenantContact(ticket.tenantId);

    if (managers.length > 0) {
      await Promise.all(
        managers.map((m) =>
          sendEmail({
            to: [{ email: m.email, name: m.name }],
            ...escalationUnassignedAlert({
              managerName: m.name,
              tenantName: tenant?.fullName ?? "Unknown Tenant",
              requestTitle: ticket.title,
              requestId: ticket.id,
              minutesOpen: Math.round(
                (Date.now() - new Date(ticket.createdAt).getTime()) / MINS(1),
              ),
              appUrl: appUrl(),
            }),
          }).catch((err) =>
            logger.warn({ error: String(err) }, "escalation.unassigned_alert_failed"),
          ),
        ),
      );
    }

    // Reuse followUpSentAt as "alert sent" marker so we don't spam every run
    await db
      .update(maintenanceRequests)
      .set({ followUpSentAt: new Date(), updatedAt: new Date() })
      .where(eq(maintenanceRequests.id, ticket.id));

    await appendTimelineEvent(ticket.id, {
      type: "manager_alerted",
      message: `Managers notified: ticket unassigned after ${FOLLOW_UP_LABEL}. Action required.`,
      actor: "system",
    });

    logger.info({ requestId: ticket.id }, "escalation.unassigned_alert_sent");
    count++;
  }

  return count;
}

// ─── Stage 1b — send follow-up to tenant only for scheduled/in_progress work ─
// Only once a technician has been dispatched and time has passed does it make
// sense to ask the tenant whether the work was actually done.

async function processScheduledFollowUps(): Promise<number> {
  const cutoff = new Date(Date.now() - FOLLOW_UP_THRESHOLD);

  const tickets = await db
    .select()
    .from(maintenanceRequests)
    .where(
      and(
        or(
          eq(maintenanceRequests.status, "scheduled"),
          eq(maintenanceRequests.status, "in_progress"),
        ),
        lt(maintenanceRequests.scheduledAt, cutoff),
        isNull(maintenanceRequests.followUpSentAt),
      ),
    );

  let count = 0;
  for (const ticket of tickets) {
    const tenant = await getTenantContact(ticket.tenantId);
    if (!tenant) continue;

    const resolveUrl = `${appUrl()}/api/escalate/respond?requestId=${ticket.id}&action=resolved&token=${ticket.id}`;
    const unresolvedUrl = `${appUrl()}/api/escalate/respond?requestId=${ticket.id}&action=unresolved&token=${ticket.id}`;

    await sendEmail({
      to: [{ email: tenant.email, name: tenant.fullName }],
      ...escalationFollowUpEmail({
        tenantName: tenant.fullName,
        requestTitle: ticket.title,
        requestId: ticket.id,
        resolveUrl,
        unresolvedUrl,
      }),
    }).catch((err) => logger.warn({ error: String(err) }, "escalation.follow_up_email_failed"));

    await db
      .update(maintenanceRequests)
      .set({ followUpSentAt: new Date(), updatedAt: new Date() })
      .where(eq(maintenanceRequests.id, ticket.id));

    await appendTimelineEvent(ticket.id, {
      type: "follow_up_sent",
      message: `Tenant follow-up sent after technician appointment: asking if work was completed.`,
      actor: "system",
    });

    logger.info({ requestId: ticket.id }, "escalation.scheduled_follow_up_sent");
    count++;
  }

  return count;
}

// ─── Stage 2 — escalate tickets where follow-up was sent but still unresolved ──

async function processEscalations(): Promise<number> {
  const cutoff = new Date(Date.now() - ESCALATE_THRESHOLD);

  const tickets = await db
    .select()
    .from(maintenanceRequests)
    .where(
      and(
        or(
          eq(maintenanceRequests.status, "pending"),
          eq(maintenanceRequests.status, "triaged"),
        ),
        lt(maintenanceRequests.followUpSentAt, cutoff),
      ),
    );

  const managers = await getAllManagerRecipients();
  let count = 0;

  for (const ticket of tickets) {
    const tenant = await getTenantContact(ticket.tenantId);

    // Alert all managers
    if (managers.length > 0) {
      await Promise.all(
        managers.map((m) =>
          sendEmail({
            to: [{ email: m.email, name: m.name }],
            ...escalationManagerAlert({
              managerName: m.name,
              tenantName: tenant?.fullName ?? "Unknown Tenant",
              requestTitle: ticket.title,
              requestId: ticket.id,
              hoursOpen: Math.round(
                (Date.now() - new Date(ticket.createdAt).getTime()) / MINS(60),
              ),
              appUrl: appUrl(),
            }),
          }).catch((err) =>
            logger.warn({ error: String(err) }, "escalation.manager_alert_failed"),
          ),
        ),
      );
    }

    // Update status to escalated
    await db
      .update(maintenanceRequests)
      .set({ status: "escalated", escalatedAt: new Date(), updatedAt: new Date() })
      .where(eq(maintenanceRequests.id, ticket.id));

    await appendTimelineEvent(ticket.id, {
      type: "escalated",
      message: `Ticket escalated after ${ESCALATE_LABEL} with no response following follow-up. All managers notified.`,
      actor: "system",
    });

    logger.info({ requestId: ticket.id }, "escalation.ticket_escalated");
    count++;
  }

  return count;
}

// ─── Stage 3 — escalate overdue appointments ──────────────────────────────────
// Only runs AFTER Stage 1b has already sent the tenant follow-up (followUpSentAt
// is set) and the tenant still hasn't responded within the escalation threshold.

async function processOverdueAppointments(): Promise<number> {
  const cutoff = new Date(Date.now() - ESCALATE_THRESHOLD);

  const tickets = await db
    .select()
    .from(maintenanceRequests)
    .where(
      and(
        or(
          eq(maintenanceRequests.status, "scheduled"),
          eq(maintenanceRequests.status, "in_progress"),
        ),
        // Follow-up must already have been sent before we escalate
        lt(maintenanceRequests.followUpSentAt, cutoff),
      ),
    );

  const managers = await getAllManagerRecipients();
  let count = 0;

  for (const ticket of tickets) {
    const tenant = await getTenantContact(ticket.tenantId);

    if (managers.length > 0) {
      await Promise.all(
        managers.map((m) =>
          sendEmail({
            to: [{ email: m.email, name: m.name }],
            ...escalationOverdueAppointmentAlert({
              managerName: m.name,
              tenantName: tenant?.fullName ?? "Unknown Tenant",
              requestTitle: ticket.title,
              requestId: ticket.id,
              scheduledAt: ticket.scheduledAt!,
              appUrl: appUrl(),
            }),
          }).catch((err) =>
            logger.warn({ error: String(err) }, "escalation.overdue_alert_failed"),
          ),
        ),
      );
    }

    await db
      .update(maintenanceRequests)
      .set({ status: "escalated", escalatedAt: new Date(), updatedAt: new Date() })
      .where(eq(maintenanceRequests.id, ticket.id));

    await appendTimelineEvent(ticket.id, {
      type: "escalated",
      message: `Appointment was scheduled for ${ticket.scheduledAt?.toLocaleString()} but not marked completed after ${ESCALATE_LABEL}. Escalated and managers alerted.`,
      actor: "system",
    });

    logger.info({ requestId: ticket.id }, "escalation.overdue_appointment_escalated");
    count++;
  }

  return count;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export interface EscalationRunResult {
  unassignedAlertsToManagers: number;
  scheduledFollowUpsToTenants: number;
  ticketsEscalated: number;
  overdueAppointments: number;
}

export async function runEscalationCheck(): Promise<EscalationRunResult> {
  logger.info({}, "escalation.run_started");

  const [unassignedAlertsToManagers, scheduledFollowUpsToTenants, ticketsEscalated, overdueAppointments] =
    await Promise.all([
      processUnassignedAlerts(),
      processScheduledFollowUps(),
      processEscalations(),
      processOverdueAppointments(),
    ]);

  logger.info(
    { unassignedAlertsToManagers, scheduledFollowUpsToTenants, ticketsEscalated, overdueAppointments },
    "escalation.run_completed",
  );

  return { unassignedAlertsToManagers, scheduledFollowUpsToTenants, ticketsEscalated, overdueAppointments };
}
