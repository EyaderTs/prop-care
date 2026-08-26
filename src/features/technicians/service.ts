import { isCalendarConfigured, createTechnicianCalendar } from "@/core/google-calendar";
import { getLogger } from "@/core/logging";
import { TOWER_NAME } from "@/core/config/tower";

import type { Technician } from "./models";
import * as repository from "./repository";
import type { RegisterTechnicianInput } from "./schemas";

const logger = getLogger("technicians.service");

/**
 * Register a new technician.
 * If Google Calendar is configured, a dedicated calendar is created for them
 * and the calendar ID is stored in the DB so the agent can check availability.
 */
export async function registerTechnician(
  input: RegisterTechnicianInput,
): Promise<Technician> {
  logger.info({ email: input.email }, "technician.register_started");

  // Check for duplicate email
  const existing = await repository.findByEmail(input.email);
  if (existing) {
    throw new Error(`A technician with email ${input.email} is already registered.`);
  }

  // Insert the technician record
  const technician = await repository.create({
    fullName: input.fullName,
    email: input.email,
    phone: input.phone ?? null,
    skills: input.skills as string[],
    notes: input.notes ?? null,
    buildingName: TOWER_NAME,
    isActive: true,
  });

  // Create Google Calendar asynchronously (non-blocking for the UI)
  if (isCalendarConfigured()) {
    try {
      const calendarId = await createTechnicianCalendar(input.fullName, input.email);
      await repository.updateCalendarId(technician.id, calendarId);
      technician.googleCalendarId = calendarId;
      logger.info(
        { technicianId: technician.id, calendarId },
        "technician.calendar_created",
      );
    } catch (err) {
      // Calendar creation failing should not block registration
      logger.warn(
        { technicianId: technician.id, error: String(err) },
        "technician.calendar_create_failed",
      );
    }
  }

  logger.info({ technicianId: technician.id }, "technician.register_completed");
  return technician;
}

export async function getAllTechnicians(): Promise<Technician[]> {
  return repository.findAll();
}

export async function getActiveTechnicians(): Promise<Technician[]> {
  return repository.findActive();
}

export async function getTechniciansBySkills(skills: string[]): Promise<Technician[]> {
  return repository.findBySkills(skills);
}

export async function deactivateTechnician(id: string): Promise<void> {
  logger.info({ id }, "technician.deactivate");
  await repository.setActive(id, false);
}

export async function reactivateTechnician(id: string): Promise<void> {
  logger.info({ id }, "technician.reactivate");
  await repository.setActive(id, true);
}
