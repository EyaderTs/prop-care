"use server";

import { revalidatePath } from "next/cache";

import { deactivateTechnician, reactivateTechnician } from "@/features/technicians";

export async function toggleTechnicianStatus(id: string, currentlyActive: boolean) {
  if (currentlyActive) {
    await deactivateTechnician(id);
  } else {
    await reactivateTechnician(id);
  }
  revalidatePath("/dashboard/technicians");
}
