import { BrainCircuit, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/core/supabase/server";
import type { TriageResult } from "@/core/gemini";
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  URGENCY_LABELS,
  type MaintenanceRequest,
  getAllRequests,
  getRequestsByTenant,
} from "@/features/maintenance";
import { getTenantProfile } from "@/features/tenants";

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
  in_progress: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  escalated: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

function RequestCard({ req, isManager }: { req: MaintenanceRequest; isManager: boolean }) {
  const triage = req.aiAnalysis as TriageResult | null;
  const needsApproval =
    isManager && (req.status === "pending" || req.status === "triaged");

  return (
    <a href={`/dashboard/maintenance/${req.id}`} className="block group">
      <Card className="hover:shadow-md transition-shadow group-hover:border-emerald-300 dark:group-hover:border-emerald-700">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{req.title}</CardTitle>
              <CardDescription>
                {req.category ? CATEGORY_LABELS[req.category] : "Awaiting triage"}
                {req.unitNumber && ` · Unit ${req.unitNumber}`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
              {req.isSafetyRisk && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                  ⚠ Safety
                </span>
              )}
              {req.urgency && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${urgencyColor[req.urgency]}`}>
                  {URGENCY_LABELS[req.urgency]}
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[req.status ?? "pending"]}`}>
                {STATUS_LABELS[req.status ?? "pending"]}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* AI summary if available */}
          {triage?.summary ? (
            <p className="text-sm text-muted-foreground line-clamp-2 flex items-start gap-1.5">
              <BrainCircuit className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
              {triage.summary}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground line-clamp-2">{req.description}</p>
          )}

          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              {new Date(req.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
            </p>
            {needsApproval && (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Tap to review & approve →
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

export default async function MaintenancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user ? await getTenantProfile(user.id).catch(() => null) : null;
  const isManager = profile?.role === "manager";

  let requests: MaintenanceRequest[] = [];
  try {
    requests = isManager
      ? await getAllRequests()
      : profile
        ? await getRequestsByTenant(profile.id)
        : [];
  } catch {
    // DB tables may not exist yet
  }

  const needsApproval = isManager
    ? requests.filter((r) => r.status === "pending" || r.status === "triaged")
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isManager ? "All Requests" : "My Requests"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isManager
              ? `${requests.length} total · ${needsApproval.length} need approval`
              : `${requests.length} request${requests.length !== 1 ? "s" : ""} submitted`}
          </p>
        </div>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <a href="/dashboard/maintenance/new">
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </a>
        </Button>
      </div>

      {/* Needs approval banner for manager */}
      {needsApproval.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <span className="font-semibold">
            {needsApproval.length} request{needsApproval.length !== 1 ? "s" : ""} need{needsApproval.length === 1 ? "s" : ""} your approval.
          </span>{" "}
          Tap any card to review the AI analysis and dispatch a technician.
        </div>
      )}

      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <div className="text-4xl mb-4">🔧</div>
          <h3 className="text-base font-semibold mb-1">No maintenance requests yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            {isManager
              ? "Tenant requests will appear here once submitted."
              : "Submit your first request — Gemini AI will triage it instantly."}
          </p>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <a href="/dashboard/maintenance/new">
              <Plus className="mr-2 h-4 w-4" />
              Submit a request
            </a>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((req) => (
            <RequestCard key={req.id} req={req} isManager={isManager} />
          ))}
        </div>
      )}
    </div>
  );
}
