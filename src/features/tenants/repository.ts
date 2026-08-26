import { eq } from "drizzle-orm";

import { db } from "@/core/database/client";

import type { NewTenantProfile, TenantProfile } from "./models";
import { tenantProfiles } from "./models";

export async function findByUserId(userId: string): Promise<TenantProfile | undefined> {
  const results = await db
    .select()
    .from(tenantProfiles)
    .where(eq(tenantProfiles.userId, userId))
    .limit(1);
  return results[0];
}

export async function findById(id: string): Promise<TenantProfile | undefined> {
  const results = await db
    .select()
    .from(tenantProfiles)
    .where(eq(tenantProfiles.id, id))
    .limit(1);
  return results[0];
}

export async function create(data: NewTenantProfile): Promise<TenantProfile> {
  const results = await db.insert(tenantProfiles).values(data).returning();
  const profile = results[0];
  if (!profile) {
    throw new Error("Failed to create tenant profile");
  }
  return profile;
}

export async function update(
  userId: string,
  data: Partial<Pick<TenantProfile, "fullName" | "phone" | "unitNumber" | "buildingName">>,
): Promise<TenantProfile | undefined> {
  const results = await db
    .update(tenantProfiles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tenantProfiles.userId, userId))
    .returning();
  return results[0];
}
