import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import { tenantProfiles } from "@/core/database/schema";

export { tenantProfiles };

export type TenantProfile = InferSelectModel<typeof tenantProfiles>;
export type NewTenantProfile = InferInsertModel<typeof tenantProfiles>;

export type UserRole = "tenant" | "manager";
