"use server";

import { revalidatePath } from "next/cache";

import { runEscalationCheck } from "@/core/escalation";
import { getLogger } from "@/core/logging";
import { createClient } from "@/core/supabase/server";
import { getTenantProfile } from "@/features/tenants";

const logger = getLogger("dashboard.actions");

export async function runEscalationAction(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user ? await getTenantProfile(user.id).catch(() => null) : null;
  if (profile?.role !== "manager") {
    throw new Error("Only managers can trigger escalation checks.");
  }

  const result = await runEscalationCheck();
  logger.info({ ...result, triggeredBy: user?.id }, "escalation.manual_run");

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/maintenance");
}
