import { getLogger } from "@/core/logging";

import type { TenantProfile } from "./models";
import * as repository from "./repository";
import type { CreateTenantProfileInput } from "./schemas";

const logger = getLogger("tenants.service");

export async function createTenantProfile(
  input: CreateTenantProfileInput,
): Promise<TenantProfile> {
  logger.info({ userId: input.userId, role: input.role }, "tenant.create_started");

  const profile = await repository.create({
    userId: input.userId,
    fullName: input.fullName,
    phone: input.phone ?? null,
    role: input.role,
    unitNumber: input.unitNumber ?? null,
    buildingName: input.buildingName ?? null,
  });

  logger.info({ profileId: profile.id }, "tenant.create_completed");
  return profile;
}

export async function getTenantProfile(userId: string): Promise<TenantProfile | undefined> {
  return repository.findByUserId(userId);
}

export async function updateTenantProfile(
  userId: string,
  data: Partial<Pick<TenantProfile, "fullName" | "phone" | "unitNumber" | "buildingName">>,
): Promise<TenantProfile | undefined> {
  logger.info({ userId }, "tenant.update_started");
  const updated = await repository.update(userId, data);
  logger.info({ userId }, "tenant.update_completed");
  return updated;
}
