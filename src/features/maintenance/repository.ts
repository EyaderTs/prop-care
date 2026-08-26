import { count, desc, eq } from "drizzle-orm";

import { db } from "@/core/database/client";
import type { TriageResult } from "@/core/gemini";

import type { MaintenanceRequest, NewMaintenanceRequest } from "./models";
import { maintenanceRequests } from "./models";

export async function findById(id: string): Promise<MaintenanceRequest | undefined> {
  const results = await db
    .select()
    .from(maintenanceRequests)
    .where(eq(maintenanceRequests.id, id))
    .limit(1);
  return results[0];
}

export async function findByTenantId(tenantId: string): Promise<MaintenanceRequest[]> {
  return db
    .select()
    .from(maintenanceRequests)
    .where(eq(maintenanceRequests.tenantId, tenantId))
    .orderBy(desc(maintenanceRequests.createdAt));
}

export async function findAll(): Promise<MaintenanceRequest[]> {
  return db.select().from(maintenanceRequests).orderBy(desc(maintenanceRequests.createdAt));
}

export async function countByStatus(
  status: MaintenanceRequest["status"],
): Promise<number> {
  const results = await db
    .select({ count: count() })
    .from(maintenanceRequests)
    .where(eq(maintenanceRequests.status, status));
  return results[0]?.count ?? 0;
}

export async function countByTenantId(tenantId: string): Promise<number> {
  const results = await db
    .select({ count: count() })
    .from(maintenanceRequests)
    .where(eq(maintenanceRequests.tenantId, tenantId));
  return results[0]?.count ?? 0;
}

export async function create(data: NewMaintenanceRequest): Promise<MaintenanceRequest> {
  const results = await db.insert(maintenanceRequests).values(data).returning();
  const request = results[0];
  if (!request) {
    throw new Error("Failed to create maintenance request");
  }
  return request;
}

/** Store Gemini triage result — updates category, urgency, safety flag, ai_analysis, status */
export async function updateWithTriage(
  id: string,
  triage: TriageResult,
): Promise<MaintenanceRequest | undefined> {
  const results = await db
    .update(maintenanceRequests)
    .set({
      category: triage.category as MaintenanceRequest["category"],
      urgency: triage.urgency as MaintenanceRequest["urgency"],
      isSafetyRisk: triage.isSafetyRisk,
      aiAnalysis: triage as unknown as Record<string, unknown>,
      status: "triaged",
      updatedAt: new Date(),
    })
    .where(eq(maintenanceRequests.id, id))
    .returning();
  return results[0];
}

/** Manager approves: assign technician + scheduled time + move to scheduled */
export async function updateWithApproval(
  id: string,
  technicianId: string,
  scheduledAt: Date,
  managerNotes: string | null,
): Promise<MaintenanceRequest | undefined> {
  const results = await db
    .update(maintenanceRequests)
    .set({
      assignedTechnicianId: technicianId,
      scheduledAt,
      managerNotes,
      status: "scheduled",
      updatedAt: new Date(),
    })
    .where(eq(maintenanceRequests.id, id))
    .returning();
  return results[0];
}

export async function updateStatus(
  id: string,
  status: MaintenanceRequest["status"],
): Promise<MaintenanceRequest | undefined> {
  const results = await db
    .update(maintenanceRequests)
    .set({ status, updatedAt: new Date() })
    .where(eq(maintenanceRequests.id, id))
    .returning();
  return results[0];
}
