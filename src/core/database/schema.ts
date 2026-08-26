import {
  boolean,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
} from "drizzle-orm/pg-core";

/**
 * Base timestamp columns for all tables.
 * Usage: ...timestamps
 */
export const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
};

/**
 * Users table - syncs with Supabase Auth via database trigger.
 *
 * To set up the trigger in Supabase SQL Editor:
 *
 * ```sql
 * -- Function to sync auth.users to public.users
 * CREATE OR REPLACE FUNCTION public.handle_new_user()
 * RETURNS trigger AS $$
 * BEGIN
 *   INSERT INTO public.users (id, email)
 *   VALUES (NEW.id, NEW.email);
 *   RETURN NEW;
 * END;
 * $$ LANGUAGE plpgsql SECURITY DEFINER;
 *
 * -- Trigger on auth.users insert
 * CREATE OR REPLACE TRIGGER on_auth_user_created
 *   AFTER INSERT ON auth.users
 *   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
 * ```
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // References auth.users(id)
  email: text("email").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  ...timestamps,
});

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["tenant", "manager"]);

export const maintenanceCategoryEnum = pgEnum("maintenance_category", [
  "hvac",
  "plumbing",
  "electrical",
  "carpentry",
  "appliance",
  "general",
]);

export const maintenanceUrgencyEnum = pgEnum("maintenance_urgency", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const maintenanceStatusEnum = pgEnum("maintenance_status", [
  "pending",
  "triaged",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
  "escalated",
]);

// ─── Tenant Profiles ──────────────────────────────────────────────────────────

/**
 * Tenant profiles table.
 * One profile per user (tenant or property manager).
 */
export const tenantProfiles = pgTable("tenant_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  role: userRoleEnum("role").notNull().default("tenant"),
  unitNumber: text("unit_number"),
  buildingName: text("building_name"),
  ...timestamps,
});

// ─── Technicians ──────────────────────────────────────────────────────────────

/**
 * Technicians table.
 * Registered by property managers. Each technician gets a Google Calendar
 * created automatically so the agent can check availability and book jobs.
 */
export const technicians = pgTable(
  "technicians",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull().unique(),
    phone: text("phone"),
    /** Array of skill slugs matching maintenance_category values */
    skills: text("skills").array().notNull().default([]),
    /** Google Calendar ID — set after calendar is created via API */
    googleCalendarId: text("google_calendar_id"),
    isActive: boolean("is_active").notNull().default(true),
    buildingName: text("building_name").notNull().default("Meklit Tower"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("idx_technicians_is_active").on(t.isActive)],
);

// ─── Maintenance Requests ─────────────────────────────────────────────────────

/**
 * Maintenance requests table.
 * Created by tenants; triaged by AI; approved & dispatched by property managers.
 */
export const maintenanceRequests = pgTable("maintenance_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: maintenanceCategoryEnum("category"),
  urgency: maintenanceUrgencyEnum("urgency").default("medium"),
  status: maintenanceStatusEnum("status").notNull().default("pending"),
  unitNumber: text("unit_number"),
  buildingName: text("building_name"),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenantProfiles.id, { onDelete: "cascade" }),
  assignedTechnicianId: uuid("assigned_technician_id").references(() => technicians.id, {
    onDelete: "set null",
  }),
  scheduledAt: timestamp("scheduled_at"),
  resolvedAt: timestamp("resolved_at"),
  /** AI triage result stored as JSON */
  aiAnalysis: jsonb("ai_analysis"),
  isSafetyRisk: boolean("is_safety_risk").notNull().default(false),
  managerNotes: text("manager_notes"),
  /** Escalation tracking */
  followUpSentAt: timestamp("follow_up_sent_at"),
  escalatedAt: timestamp("escalated_at"),
  /** Timeline events — array of { type, message, timestamp } */
  timeline: jsonb("timeline").default([]),
  ...timestamps,
});
