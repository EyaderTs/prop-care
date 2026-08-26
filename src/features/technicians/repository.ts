import { and, eq, sql } from "drizzle-orm";

import { db } from "@/core/database/client";

import type { NewTechnician, Technician } from "./models";
import { technicians } from "./models";

export async function findAll(): Promise<Technician[]> {
  return db.select().from(technicians).orderBy(technicians.fullName);
}

export async function findActive(): Promise<Technician[]> {
  return db
    .select()
    .from(technicians)
    .where(eq(technicians.isActive, true))
    .orderBy(technicians.fullName);
}

export async function findById(id: string): Promise<Technician | undefined> {
  const results = await db
    .select()
    .from(technicians)
    .where(eq(technicians.id, id))
    .limit(1);
  return results[0];
}

export async function findByEmail(email: string): Promise<Technician | undefined> {
  const results = await db
    .select()
    .from(technicians)
    .where(eq(technicians.email, email))
    .limit(1);
  return results[0];
}

/**
 * Find active technicians who have at least one of the requested skills.
 * Uses Postgres array overlap operator (&&).
 */
export async function findBySkills(skills: string[]): Promise<Technician[]> {
  return db
    .select()
    .from(technicians)
    .where(
      and(
        eq(technicians.isActive, true),
        sql`${technicians.skills} && ${skills}`,
      ),
    )
    .orderBy(technicians.fullName);
}

export async function create(data: NewTechnician): Promise<Technician> {
  const results = await db.insert(technicians).values(data).returning();
  const tech = results[0];
  if (!tech) throw new Error("Failed to create technician");
  return tech;
}

export async function updateCalendarId(
  id: string,
  calendarId: string,
): Promise<void> {
  await db
    .update(technicians)
    .set({ googleCalendarId: calendarId, updatedAt: new Date() })
    .where(eq(technicians.id, id));
}

export async function setActive(id: string, isActive: boolean): Promise<void> {
  await db
    .update(technicians)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(technicians.id, id));
}
