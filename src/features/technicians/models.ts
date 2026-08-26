import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import { technicians } from "@/core/database/schema";

export { technicians };

export type Technician = InferSelectModel<typeof technicians>;
export type NewTechnician = InferInsertModel<typeof technicians>;

/** Skill slugs that map 1-to-1 with maintenance categories */
export const SKILL_OPTIONS = [
  { value: "hvac", label: "HVAC / Air Conditioning" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "carpentry", label: "Carpentry / Structural" },
  { value: "appliance", label: "Appliance Repair" },
  { value: "general", label: "General Maintenance" },
] as const;

export type SkillValue = (typeof SKILL_OPTIONS)[number]["value"];
