"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/core/supabase/server";
import { registerTechnician } from "@/features/technicians";
import { getTenantProfile } from "@/features/tenants";

export interface RegisterTechnicianState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function submitRegisterTechnician(
  _prev: RegisterTechnicianState,
  formData: FormData,
): Promise<RegisterTechnicianState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user ? await getTenantProfile(user.id).catch(() => null) : null;
  if (profile?.role !== "manager") {
    return { error: "Only property managers can register technicians." };
  }

  const fullName = formData.get("fullName");
  const email = formData.get("email");
  const phone = formData.get("phone");
  const notes = formData.get("notes");
  const skills = formData.getAll("skills") as string[];

  if (typeof fullName !== "string" || typeof email !== "string") {
    return { error: "Invalid form data." };
  }

  if (!fullName.trim()) return { error: "Full name is required." };
  if (!email.trim()) return { error: "Email is required." };
  if (skills.length === 0) return { error: "Select at least one skill." };

  try {
    await registerTechnician({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: typeof phone === "string" && phone.trim() ? phone.trim() : undefined,
      skills: skills as never,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : undefined,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to register technician." };
  }

  redirect("/dashboard/technicians");
}
