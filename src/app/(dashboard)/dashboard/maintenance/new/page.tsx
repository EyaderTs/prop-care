import { createClient } from "@/core/supabase/server";
import { getTenantProfile } from "@/features/tenants";

import { NewRequestForm } from "./new-request-form";

export default async function NewMaintenanceRequestPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user ? await getTenantProfile(user.id).catch(() => null) : null;

  return <NewRequestForm defaultUnitNumber={profile?.unitNumber} />;
}
