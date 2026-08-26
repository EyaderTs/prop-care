import { getLogger } from "@/core/logging";

import type { MaintenanceRequest } from "./models";
import * as repository from "./repository";
import type { CreateMaintenanceRequestInput } from "./schemas";

const logger = getLogger("maintenance.service");

export async function createMaintenanceRequest(
  input: CreateMaintenanceRequestInput,
  tenantId: string,
): Promise<MaintenanceRequest> {
  logger.info({ tenantId }, "maintenance.create_started");

  const request = await repository.create({
    title: input.title,
    description: input.description,
    tenantId,
    unitNumber: input.unitNumber ?? null,
    buildingName: input.buildingName ?? null,
    status: "pending",
  });

  logger.info({ requestId: request.id }, "maintenance.create_completed");
  return request;
}

export async function getRequestById(id: string): Promise<MaintenanceRequest | undefined> {
  return repository.findById(id);
}

export async function getRequestsByTenant(tenantId: string): Promise<MaintenanceRequest[]> {
  return repository.findByTenantId(tenantId);
}

export async function getAllRequests(): Promise<MaintenanceRequest[]> {
  return repository.findAll();
}

export async function getRequestCountByTenant(tenantId: string): Promise<number> {
  return repository.countByTenantId(tenantId);
}

export async function getStatusCounts(): Promise<{
  pending: number;
  triaged: number;
  scheduled: number;
  in_progress: number;
  completed: number;
  cancelled: number;
}> {
  const [pending, triaged, scheduled, inProgress, completed, cancelled] = await Promise.all([
    repository.countByStatus("pending"),
    repository.countByStatus("triaged"),
    repository.countByStatus("scheduled"),
    repository.countByStatus("in_progress"),
    repository.countByStatus("completed"),
    repository.countByStatus("cancelled"),
  ]);

  return { pending, triaged, scheduled, in_progress: inProgress, completed, cancelled };
}
