import { BrainCircuit, CalendarDays } from "lucide-react";
import { redirect } from "next/navigation";

import { createClient } from "@/core/supabase/server";
import { getTenantProfile } from "@/features/tenants";
import { findActive } from "@/features/technicians/repository";

import { MeetingForm } from "./meeting-form";

export default async function MeetingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getTenantProfile(user.id).catch(() => null);
  if (profile?.role !== "manager") redirect("/dashboard");

  const technicians = await findActive().catch(() => []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-emerald-600" />
            AI Meeting Scheduler
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Describe the meeting in plain language — the AI checks availability and books it instantly.
          </p>
        </div>

        {/* Technician availability summary */}
        <div className="flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm">
          <span className="text-muted-foreground">Active technicians:</span>
          <span className="font-semibold">{technicians.length}</span>
          {technicians.filter((t) => t.googleCalendarId).length < technicians.length && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              · {technicians.filter((t) => !t.googleCalendarId).length} without calendar
            </span>
          )}
        </div>
      </div>

      {/* How it works banner */}
      <div className="rounded-xl border bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800 px-5 py-4">
        <div className="flex items-start gap-3">
          <BrainCircuit className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              How it works
            </p>
            <ol className="mt-1 text-xs text-emerald-700 dark:text-emerald-400 space-y-0.5 list-decimal list-inside">
              <li>Describe the meeting in natural language (who, when, why)</li>
              <li>Gemini AI extracts the technician, date, time, and purpose</li>
              <li>Google Calendar is checked for availability in real time</li>
              <li>If free — confirm with one click. If busy — pick from suggested slots</li>
              <li>Event created on the technician's calendar + emails sent to both parties</li>
            </ol>
          </div>
        </div>
      </div>

      {technicians.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <CalendarDays className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-sm font-semibold mb-1">No technicians yet</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
            Add technicians first before scheduling meetings. Each technician needs a Google Calendar set up.
          </p>
          <a
            href="/dashboard/technicians/new"
            className="inline-flex items-center rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-medium transition-colors"
          >
            Add First Technician
          </a>
        </div>
      ) : (
        <MeetingForm />
      )}
    </div>
  );
}
