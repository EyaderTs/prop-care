import { CalendarCheck, Mail, Phone, Plus, ShieldOff, Wrench } from "lucide-react";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/core/supabase/server";
import { SKILL_OPTIONS, type Technician, getAllTechnicians } from "@/features/technicians";
import { getTenantProfile } from "@/features/tenants";

import { toggleTechnicianStatus } from "./actions";

function SkillBadge({ skill }: { skill: string }) {
  const option = SKILL_OPTIONS.find((o) => o.value === skill);
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-800">
      {option?.label ?? skill}
    </span>
  );
}

function TechnicianCard({ tech }: { tech: Technician }) {
  return (
    <Card className={tech.isActive ? "" : "opacity-60"}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 font-bold text-sm">
              {tech.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <CardTitle className="text-base">{tech.fullName}</CardTitle>
              <div className="flex items-center gap-3 mt-0.5">
                {tech.isActive ? (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    ● Active
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 font-medium">● Inactive</span>
                )}
                {tech.googleCalendarId ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                    <CalendarCheck className="h-3 w-3" />
                    Calendar linked
                  </span>
                ) : (
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    No calendar
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Toggle active/inactive */}
          <form
            action={async () => {
              "use server";
              await toggleTechnicianStatus(tech.id, tech.isActive);
            }}
          >
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className={
                tech.isActive
                  ? "text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs"
                  : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-xs"
              }
            >
              {tech.isActive ? (
                <>
                  <ShieldOff className="h-3.5 w-3.5 mr-1" /> Deactivate
                </>
              ) : (
                <>
                  <Wrench className="h-3.5 w-3.5 mr-1" /> Reactivate
                </>
              )}
            </Button>
          </form>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Contact */}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            {tech.email}
          </span>
          {tech.phone && (
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              {tech.phone}
            </span>
          )}
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-1.5">
          {tech.skills.length > 0 ? (
            tech.skills.map((skill) => <SkillBadge key={skill} skill={skill} />)
          ) : (
            <span className="text-xs text-muted-foreground italic">No skills set</span>
          )}
        </div>

        {/* Notes */}
        {tech.notes && (
          <p className="text-xs text-muted-foreground border-t pt-2 mt-2">{tech.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default async function TechniciansPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user ? await getTenantProfile(user.id).catch(() => null) : null;

  // Only property managers can access this page
  if (profile?.role !== "manager") {
    redirect("/dashboard");
  }

  let technicians: Technician[] = [];
  try {
    technicians = await getAllTechnicians();
  } catch {
    // DB table may not exist yet
  }

  const active = technicians.filter((t) => t.isActive);
  const inactive = technicians.filter((t) => !t.isActive);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Technicians</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {active.length} active technician{active.length !== 1 ? "s" : ""} at Meklit Tower
          </p>
        </div>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <a href="/dashboard/technicians/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Technician
          </a>
        </Button>
      </div>

      {/* Empty state */}
      {technicians.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <div className="text-4xl mb-3">🔧</div>
          <h3 className="text-sm font-semibold mb-1">No technicians registered yet</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-xs">
            Add technicians and the AI will automatically check their availability when
            dispatching maintenance jobs.
          </p>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <a href="/dashboard/technicians/new">
              <Plus className="mr-2 h-4 w-4" />
              Add your first technician
            </a>
          </Button>
        </div>
      )}

      {/* Active technicians */}
      {active.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Active ({active.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((tech) => (
              <TechnicianCard key={tech.id} tech={tech} />
            ))}
          </div>
        </div>
      )}

      {/* Inactive technicians */}
      {inactive.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Inactive ({inactive.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inactive.map((tech) => (
              <TechnicianCard key={tech.id} tech={tech} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
