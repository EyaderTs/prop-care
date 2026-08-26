import { AlertTriangle, CheckCircle2, Clock, Plus, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/core/supabase/server";
import { STATUS_LABELS, URGENCY_LABELS, type MaintenanceRequest } from "@/features/maintenance";
import { getAllRequests, getRequestsByTenant, getStatusCounts } from "@/features/maintenance";
import { getTenantProfile } from "@/features/tenants";

import { runEscalationAction } from "./actions";

const urgencyColor: Record<string, string> = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
  critical: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

const statusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  triaged: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  scheduled: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  escalated: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  in_progress: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

function RequestRow({ req }: { req: MaintenanceRequest }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{req.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {req.unitNumber && `Unit ${req.unitNumber}`}
          {req.buildingName && req.unitNumber && " · "}
          {req.buildingName}
          {!req.unitNumber && !req.buildingName && "No location info"}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {req.urgency && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${urgencyColor[req.urgency]}`}
          >
            {URGENCY_LABELS[req.urgency]}
          </span>
        )}
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[req.status ?? "pending"]}`}
        >
          {STATUS_LABELS[req.status ?? "pending"]}
        </span>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName =
    (user?.user_metadata?.["full_name"] as string | undefined) ??
    user?.email?.split("@")[0] ??
    "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  let profile = user ? await getTenantProfile(user.id).catch(() => null) : null;
  const isManager = profile?.role === "manager";

  let requests: MaintenanceRequest[] = [];
  let counts = {
    pending: 0,
    triaged: 0,
    scheduled: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  };

  try {
    if (isManager) {
      requests = await getAllRequests();
      counts = await getStatusCounts();
    } else if (profile) {
      requests = await getRequestsByTenant(profile.id);
      const pending = requests.filter((r) => r.status === "pending").length;
      const inProgress = requests.filter(
        (r) => r.status === "in_progress" || r.status === "scheduled",
      ).length;
      const completed = requests.filter((r) => r.status === "completed").length;
      counts = {
        pending,
        triaged: requests.filter((r) => r.status === "triaged").length,
        scheduled: requests.filter((r) => r.status === "scheduled").length,
        in_progress: inProgress,
        completed,
        cancelled: requests.filter((r) => r.status === "cancelled").length,
      };
    }
  } catch {
    // DB tables may not exist yet — show empty state gracefully
  }

  const activeCount = counts.pending + counts.triaged + counts.scheduled + counts.in_progress;
  const recentRequests = requests.slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {greeting},{" "}
            <span className="text-emerald-600 dark:text-emerald-400">{displayName}</span> 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isManager
              ? `You have ${activeCount} active maintenance request${activeCount === 1 ? "" : "s"} to review`
              : profile
                ? `Unit ${profile.unitNumber ?? "—"} · ${profile.buildingName ?? "No building"}`
                : "Complete your profile to get started"}
          </p>
        </div>
        <Button
          asChild
          className="bg-emerald-600 hover:bg-emerald-700 text-white hidden sm:flex"
        >
          <a href="/dashboard/maintenance/new">
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </a>
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending / Triaged
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.pending + counts.triaged}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Scheduled
            </CardTitle>
            <Wrench className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.scheduled}</div>
            <p className="text-xs text-muted-foreground mt-1">Appointment booked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Progress
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.in_progress}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently being worked on</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.completed}</div>
            <p className="text-xs text-muted-foreground mt-1">Resolved requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Recent Requests</CardTitle>
            <CardDescription className="text-sm">
              {isManager ? "All maintenance requests" : "Your maintenance requests"}
            </CardDescription>
          </div>
          {requests.length > 5 && (
            <a
              href="/dashboard/maintenance"
              className="text-sm text-emerald-600 hover:underline font-medium"
            >
              View all &rarr;
            </a>
          )}
        </CardHeader>
        <CardContent>
          {recentRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
              <div className="text-4xl mb-3">🔧</div>
              <h3 className="text-sm font-semibold mb-1">No maintenance requests yet</h3>
              <p className="text-sm text-muted-foreground mb-5 max-w-xs">
                {isManager
                  ? "Tenant requests will appear here once submitted."
                  : "Submit your first maintenance request and our AI will triage it automatically."}
              </p>
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <a href="/dashboard/maintenance/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Submit a request
                </a>
              </Button>
            </div>
          ) : (
            <div>
              {recentRequests.map((req) => (
                <RequestRow key={req.id} req={req} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manager-only: manual escalation trigger for local testing */}
      {isManager && (
        <div className="rounded-xl border border-dashed border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
              Escalation Engine
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Checks for overdue tickets, sends follow-ups, and escalates as needed.
              In production this runs automatically via GCP Cloud Scheduler.
            </p>
          </div>
          <form action={runEscalationAction}>
            <Button
              type="submit"
              variant="outline"
              className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs"
            >
              Run Check Now
            </Button>
          </form>
        </div>
      )}

      {/* Mobile CTA */}
      <div className="sm:hidden">
        <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
          <a href="/dashboard/maintenance/new">
            <Plus className="mr-2 h-4 w-4" />
            New Maintenance Request
          </a>
        </Button>
      </div>
    </div>
  );
}
