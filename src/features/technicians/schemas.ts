import { z } from "zod";

const VALID_SKILLS = [
  "hvac",
  "plumbing",
  "electrical",
  "carpentry",
  "appliance",
  "general",
] as const;

export const RegisterTechnicianSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Must be a valid email address"),
  phone: z.string().optional(),
  skills: z
    .array(z.enum(VALID_SKILLS))
    .min(1, "Select at least one skill"),
  notes: z.string().optional(),
});

export type RegisterTechnicianInput = z.infer<typeof RegisterTechnicianSchema>;
