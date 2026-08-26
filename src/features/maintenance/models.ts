import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import { maintenanceRequests } from "@/core/database/schema";

export { maintenanceRequests };

export type MaintenanceRequest = InferSelectModel<typeof maintenanceRequests>;
export type NewMaintenanceRequest = InferInsertModel<typeof maintenanceRequests>;

export type MaintenanceCategory =
  | "hvac"
  | "plumbing"
  | "electrical"
  | "carpentry"
  | "appliance"
  | "general";
export type MaintenanceUrgency = "low" | "medium" | "high" | "critical";
export type MaintenanceStatus =
  | "pending"
  | "triaged"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "escalated";

export const CATEGORY_LABELS: Record<MaintenanceCategory, string> = {
  hvac: "HVAC / Air Conditioning",
  plumbing: "Plumbing",
  electrical: "Electrical",
  carpentry: "Carpentry / Structural",
  appliance: "Appliance",
  general: "General",
};

export const URGENCY_LABELS: Record<MaintenanceUrgency, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const STATUS_LABELS: Record<MaintenanceStatus, string> = {
  pending: "Pending",
  triaged: "Triaged",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  escalated: "Escalated",
};
