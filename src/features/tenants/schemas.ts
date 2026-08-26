import { z } from "zod";

export const CreateTenantProfileSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z.string().optional(),
  role: z.enum(["tenant", "manager"]).default("tenant"),
  unitNumber: z.string().optional(),
  buildingName: z.string().optional(),
});

export type CreateTenantProfileInput = z.infer<typeof CreateTenantProfileSchema>;

export const TenantProfileResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  fullName: z.string(),
  phone: z.string().nullable(),
  role: z.enum(["tenant", "manager"]),
  unitNumber: z.string().nullable(),
  buildingName: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TenantProfileResponse = z.infer<typeof TenantProfileResponseSchema>;
