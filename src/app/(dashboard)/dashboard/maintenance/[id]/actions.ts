"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  sendEmail,
  technicianJobBriefing,
  tenantAppointmentConfirmation,
  requestCompletedNotification,
  requestCancelledNotification,
} from "@/core/email";
import { createJobEvent, findNextAvailableSlot, isCalendarConfigured } from "@/core/google-calendar";
import type { TriageResult } from "@/core/gemini";
import { getLogger } from "@/core/logging";
import { createClient } from "@/core/supabase/server";
import { db } from "@/core/database/client";
import { tenantProfiles, users } from "@/core/database/schema";
import { eq } from "drizzle-orm";
import { getRequestById, updateWithApproval, updateStatus } from "@/features/maintenance";
import { findById as findTechnicianById } from "@/features/technicians/repository";
import { getTenantProfile } from "@/features/tenants";

const logger = getLogger("maintenance.approve_action");

export async function approveRequest(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user ? await getTenantProfile(user.id).catch(() => null) : null;
  if (profile?.role !== "manager") {
    throw new Error("Only property managers can approve requests.");
  }

  const requestId = formData.get("requestId") as string;
  const technicianId = formData.get("technicianId") as string;
  const managerNotes = (formData.get("managerNotes") as string) || null;

  if (!requestId || !technicianId) {
    throw new Error("Request ID and technician ID are required.");
  }

  const [request, technician] = await Promise.all([
    getRequestById(requestId),
    findTechnicianById(technicianId),
  ]);

  if (!request) throw new Error("Maintenance request not found.");
  if (!technician) throw new Error("Technician not found.");

  logger.info({ requestId, technicianId }, "approve.started");

  // ── 1. Find next available calendar slot ─────────────────────────────────────
  let scheduledAt = new Date();
  scheduledAt.setDate(scheduledAt.getDate() + 1);
  scheduledAt.setHours(9, 0, 0, 0);

  if (isCalendarConfigured() && technician.googleCalendarId) {
    try {
      const slot = await findNextAvailableSlot(technician.googleCalendarId);
      if (slot) {
        scheduledAt = slot.start;

        const eventDescription = [
          `Property: ${request.buildingName ?? "Meklit Tower"}`,
          request.unitNumber ? `Unit: ${request.unitNumber}` : null,
          "",
          `Issue: ${request.description}`,
          managerNotes ? `\nManager Instructions: ${managerNotes}` : null,
        ]
          .filter((l) => l !== null)
          .join("\n");

        await createJobEvent(technician.googleCalendarId, {
          summary: `Maintenance Job: ${request.title}`,
          description: eventDescription,
          location: `Meklit Tower${request.unitNumber ? `, Unit ${request.unitNumber}` : ""}`,
          startDateTime: slot.start.toISOString(),
          endDateTime: slot.end.toISOString(),
        });

        logger.info({ requestId }, "approve.calendar_event_created");
      }
    } catch (err) {
      logger.warn({ requestId, error: String(err) }, "approve.calendar_failed_non_blocking");
    }
  }

  // ── 2. Update the ticket in DB ────────────────────────────────────────────────
  await updateWithApproval(requestId, technicianId, scheduledAt, managerNotes);

  logger.info({ requestId, scheduledAt }, "approve.completed");

  // ── 3. Look up tenant email — tenantId is profile.id, need to join to users ───
  const triage = request.aiAnalysis as TriageResult | null;
  const tenantRows = await db
    .select({ email: users.email, fullName: tenantProfiles.fullName })
    .from(tenantProfiles)
    .innerJoin(users, eq(users.id, tenantProfiles.userId))
    .where(eq(tenantProfiles.id, request.tenantId))
    .limit(1)
    .catch(() => []);
  const tenantEmail = tenantRows[0]?.email ?? null;
  const tenantName = tenantRows[0]?.fullName ?? "Resident";

  // ── 4. Email tenant — appointment confirmed ───────────────────────────────────
  if (tenantEmail) {
    sendEmail({
      to: [{ email: tenantEmail, name: tenantName }],
      ...tenantAppointmentConfirmation({
        tenantName,
        requestTitle: request.title,
        technicianName: technician.fullName,
        scheduledAt,
        unitNumber: request.unitNumber,
        managerNotes,
      }),
    }).catch((err) =>
      logger.warn({ error: String(err) }, "email.tenant_appointment_failed"),
    );
  }

  // ── 5. Email technician — job briefing ────────────────────────────────────────
  sendEmail({
    to: [{ email: technician.email, name: technician.fullName }],
    ...technicianJobBriefing({
      technicianName: technician.fullName,
      technicianEmail: technician.email,
      requestTitle: request.title,
      description: request.description,
      unitNumber: request.unitNumber,
      scheduledAt,
      managerNotes,
      triage,
    }),
  }).catch((err) =>
    logger.warn({ error: String(err) }, "email.technician_briefing_failed"),
  );

  revalidatePath(`/dashboard/maintenance/${requestId}`);
  revalidatePath("/dashboard/maintenance");
  revalidatePath("/dashboard");

  redirect("/dashboard/maintenance");
}

// ─── Helper: look up tenant email + name by profile ID ───────────────────────

async function getTenantContact(
  tenantProfileId: string,
): Promise<{ email: string; name: string } | null> {
  const rows = await db
    .select({ email: users.email, fullName: tenantProfiles.fullName })
    .from(tenantProfiles)
    .innerJoin(users, eq(users.id, tenantProfiles.userId))
    .where(eq(tenantProfiles.id, tenantProfileId))
    .limit(1)
    .catch(() => []);
  const row = rows[0];
  if (!row) return null;
  return { email: row.email, name: row.fullName };
}

// ─── Mark as Completed ────────────────────────────────────────────────────────

export async function completeRequest(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const profile = user ? await getTenantProfile(user.id).catch(() => null) : null;
  if (profile?.role !== "manager") {
    throw new Error("Only property managers can mark requests as completed.");
  }

  const requestId = formData.get("requestId") as string;
  const completionNotes = (formData.get("completionNotes") as string) || null;
  if (!requestId) throw new Error("Request ID is required.");

  const request = await getRequestById(requestId);
  if (!request) throw new Error("Maintenance request not found.");

  // Update status and optionally store completion notes in managerNotes
  await updateStatus(requestId, "completed");
  if (completionNotes) {
    const { db: dbClient } = await import("@/core/database/client");
    const { maintenanceRequests } = await import("@/core/database/schema");
    await dbClient
      .update(maintenanceRequests)
      .set({ managerNotes: completionNotes, updatedAt: new Date() })
      .where(eq(maintenanceRequests.id, requestId));
  }

  logger.info({ requestId }, "request.completed");

  // Email tenant — job done
  const tenant = await getTenantContact(request.tenantId);
  if (tenant) {
    sendEmail({
      to: [{ email: tenant.email, name: tenant.name }],
      ...requestCompletedNotification({
        tenantName: tenant.name,
        requestTitle: request.title,
        completionNotes,
      }),
    }).catch((err) =>
      logger.warn({ error: String(err) }, "email.completion_failed"),
    );
  }

  revalidatePath(`/dashboard/maintenance/${requestId}`);
  revalidatePath("/dashboard/maintenance");
  revalidatePath("/dashboard");
  redirect("/dashboard/maintenance");
}

// ─── Cancel Request ───────────────────────────────────────────────────────────

export async function cancelRequest(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const profile = user ? await getTenantProfile(user.id).catch(() => null) : null;
  if (!profile) throw new Error("You must be signed in.");

  const requestId = formData.get("requestId") as string;
  const reason = (formData.get("reason") as string) || null;
  if (!requestId) throw new Error("Request ID is required.");

  const request = await getRequestById(requestId);
  if (!request) throw new Error("Maintenance request not found.");

  // Tenants can only cancel their own requests that haven't been scheduled yet
  if (profile.role === "tenant") {
    if (request.tenantId !== profile.id) {
      throw new Error("You can only cancel your own requests.");
    }
    if (request.status === "scheduled" || request.status === "in_progress" || request.status === "completed") {
      throw new Error("This request has already been scheduled and cannot be cancelled.");
    }
  }

  await updateStatus(requestId, "cancelled");
  if (reason) {
    const { db: dbClient } = await import("@/core/database/client");
    const { maintenanceRequests } = await import("@/core/database/schema");
    await dbClient
      .update(maintenanceRequests)
      .set({ managerNotes: reason, updatedAt: new Date() })
      .where(eq(maintenanceRequests.id, requestId));
  }

  logger.info({ requestId, cancelledBy: profile.role }, "request.cancelled");

  // Notify the tenant if a manager cancelled their request
  if (profile.role === "manager" && request.tenantId !== profile.id) {
    const tenant = await getTenantContact(request.tenantId);
    if (tenant) {
      sendEmail({
        to: [{ email: tenant.email, name: tenant.name }],
        ...requestCancelledNotification({
          tenantName: tenant.name,
          requestTitle: request.title,
          reason,
        }),
      }).catch((err) =>
        logger.warn({ error: String(err) }, "email.cancellation_failed"),
      );
    }
  }

  revalidatePath(`/dashboard/maintenance/${requestId}`);
  revalidatePath("/dashboard/maintenance");
  revalidatePath("/dashboard");
  redirect("/dashboard/maintenance");
}
