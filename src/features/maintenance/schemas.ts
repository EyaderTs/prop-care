import { z } from "zod";

export const CreateMaintenanceRequestSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Please describe the issue in detail"),
  unitNumber: z.string().optional(),
  buildingName: z.string().optional(),
});

export type CreateMaintenanceRequestInput = z.infer<typeof CreateMaintenanceRequestSchema>;

export const MaintenanceRequestResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  category: z
    .enum(["hvac", "plumbing", "electrical", "carpentry", "appliance", "general"])
    .nullable(),
  urgency: z.enum(["low", "medium", "high", "critical"]).nullable(),
  status: z.enum(["pending", "triaged", "scheduled", "in_progress", "completed", "cancelled"]),
  unitNumber: z.string().nullable(),
  buildingName: z.string().nullable(),
  tenantId: z.string().uuid(),
  isSafetyRisk: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type MaintenanceRequestResponse = z.infer<typeof MaintenanceRequestResponseSchema>;
