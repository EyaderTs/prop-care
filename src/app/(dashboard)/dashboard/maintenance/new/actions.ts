"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { TOWER_NAME } from "@/core/config/tower";
import { db } from "@/core/database/client";
import { tenantProfiles, users } from "@/core/database/schema";
import { managerNewRequestAlert, sendEmail, tenantRequestConfirmation } from "@/core/email";
import { triageMaintenanceRequest } from "@/core/gemini";
import { getLogger } from "@/core/logging";
import { createClient } from "@/core/supabase/server";
import { createMaintenanceRequest, updateWithTriage } from "@/features/maintenance";
import { getActiveTechnicians } from "@/features/technicians";
import { getTenantProfile } from "@/features/tenants";

const logger = getLogger("maintenance.new_action");

export interface NewRequestState {
  error?: string;
}

/** Fetch every registered manager's name + email from the DB. */
async function getAllManagerRecipients(): Promise<{ email: string; name: string }[]> {
  const rows = await db
    .select({ email: users.email, fullName: tenantProfiles.fullName })
    .from(tenantProfiles)
    .innerJoin(users, eq(users.id, tenantProfiles.userId))
    .where(eq(tenantProfiles.role, "manager"))
    .catch(() => []);

  return rows.map((r) => ({ email: r.email, name: r.fullName }));
}

export async function submitMaintenanceRequest(
  _prevState: NewRequestState,
  formData: FormData,
): Promise<NewRequestState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be signed in to submit a request." };

  const profile = await getTenantProfile(user.id).catch(() => null);
  if (!profile) return { error: "Tenant profile not found. Please complete your profile first." };

  const title = formData.get("title");
  const description = formData.get("description");
  const unitNumber = formData.get("unitNumber");

  if (typeof title !== "string" || typeof description !== "string") {
    return { error: "Invalid form data." };
  }
  if (!title.trim() || !description.trim()) {
    return { error: "Title and description are required." };
  }
  if (title.trim().length < 5) return { error: "Title must be at least 5 characters." };
  if (description.trim().length < 10) {
    return { error: "Please describe the issue in more detail (at least 10 characters)." };
  }

  const resolvedUnit =
    (typeof unitNumber === "string" && unitNumber ? unitNumber : null) ??
    profile.unitNumber ??
    null;

  // 1. Create the request record
  const request = await createMaintenanceRequest(
    {
      title: title.trim(),
      description: description.trim(),
      unitNumber: resolvedUnit ?? undefined,
      buildingName: profile.buildingName ?? TOWER_NAME,
    },
    profile.id,
  );

  const tenantName = profile.fullName ?? user.email ?? "Tenant";
  const tenantEmail = user.email ?? null;

  // 2. Send immediate confirmation to tenant (non-blocking)
  if (tenantEmail) {
    sendEmail({
      to: [{ email: tenantEmail, name: tenantName }],
      ...tenantRequestConfirmation(tenantName, request.title, request.id),
    }).catch((err) =>
      logger.warn({ error: String(err) }, "email.tenant_confirmation_failed"),
    );
  }

  // 3. Run Gemini triage
  let triage = null;
  try {
    triage = await triageMaintenanceRequest(
      request.title,
      request.description,
      request.unitNumber,
    );
    await updateWithTriage(request.id, triage);
    logger.info(
      { requestId: request.id, category: triage.category, urgency: triage.urgency },
      "triage.stored",
    );
  } catch (err) {
    logger.warn({ requestId: request.id, error: String(err) }, "triage.failed_non_blocking");
  }

  // 4. Alert all registered managers (non-blocking)
  if (triage) {
    Promise.all([
      getAllManagerRecipients(),
      getActiveTechnicians().catch(() => []),
    ]).then(([managers, technicians]) => {
      if (managers.length === 0) return;

      const suggestedTechnician =
        technicians.find((t) =>
          triage.requiredSkills.some((skill) => t.skills.includes(skill)),
        ) ?? null;

      const emailPayload = managerNewRequestAlert({
        tenantName,
        tenantUnit: resolvedUnit,
        requestTitle: request.title,
        requestId: request.id,
        triage,
        suggestedTechnician,
      });

      // Send one email per manager so each sees their own name in the To field
      return Promise.all(
        managers.map((manager) =>
          sendEmail({ to: [manager], ...emailPayload }).catch((err) =>
            logger.warn(
              { managerEmail: manager.email, error: String(err) },
              "email.manager_alert_failed",
            ),
          ),
        ),
      );
    }).catch((err) =>
      logger.warn({ error: String(err) }, "email.manager_alert_batch_failed"),
    );
  }

  redirect("/dashboard/maintenance");
}
