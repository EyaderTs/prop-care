import {
  AlertTriangle,
  ArrowLeft,
  BrainCircuit,
  CalendarCheck,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/core/supabase/server";
import type { TriageResult } from "@/core/gemini";
import type { TimelineEvent } from "@/core/escalation";
import { parseTimeline } from "@/core/escalation";
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  URGENCY_LABELS,
  getRequestById,
} from "@/features/maintenance";
import { getActiveTechnicians } from "@/features/technicians";
import { getTenantProfile } from "@/features/tenants";

import { approveRequest, cancelRequest, completeRequest } from "./actions";

type ApproveFormProps = {
  requestId: string;
  technicians: { id: string; fullName: string; skills: string[]; googleCalendarId: string | null }[];
  suggestedTechnicianId?: string | undefined;
};

// ─── Colour helpers ───────────────────────────────────────────────────────────

const urgencyColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
  critical: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  triaged: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  scheduled: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  in_progress: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

// ─── Approve form (client component wrapper for useActionState) ───────────────

function ApproveForm({ requestId, technicians, suggestedTechnicianId }: ApproveFormProps) {
  return (
    <form action={approveRequest} className="flex flex-col gap-4">
      <input type="hidden" name="requestId" value={requestId} />

      <div className="flex flex-col gap-2">
        <label htmlFor="technicianId" className="text-sm font-medium">
          Assign Technician
        </label>
        <select
          id="technicianId"
          name="technicianId"
          defaultValue={suggestedTechnicianId ?? ""}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          required
        >
          <option value="" disabled>
            Select a technician…
          </option>
          {technicians.map((t) => (
            <option key={t.id} value={t.id}>
              {t.fullName}
              {t.googleCalendarId ? " 📅" : " (no calendar)"}
              {t.id === suggestedTechnicianId ? " ← AI suggested" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="managerNotes" className="text-sm font-medium">
          Notes for technician{" "}
          <span className="text-muted-foreground font-normal text-xs">(optional)</span>
        </label>
        <Textarea
          id="managerNotes"
          name="managerNotes"
          placeholder="e.g. Access code is 1234, tenant available after 10am"
          rows={2}
          className="resize-none text-sm"
        />
      </div>

      <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
        <CheckCircle2 className="mr-2 h-4 w-4" />
        Approve & Dispatch
      </Button>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user ? await getTenantProfile(user.id).catch(() => null) : null;
  const isManager = profile?.role === "manager";

  const request = await getRequestById(id).catch(() => null);
  if (!request) notFound();

  // Tenants can only view their own requests
  if (!isManager && request.tenantId !== profile?.id) {
    redirect("/dashboard/maintenance");
  }

  const activeTechnicians = isManager ? await getActiveTechnicians().catch(() => []) : [];

  const triage = request.aiAnalysis as TriageResult | null;
  const timeline = parseTimeline(request.timeline);

  // Suggest the first technician whose skills match required skills
  let suggestedTechnicianId: string | undefined;
  if (triage?.requiredSkills && activeTechnicians.length > 0) {
    const match = activeTechnicians.find((t) =>
      triage.requiredSkills.some((skill) => t.skills.includes(skill)),
    );
    suggestedTechnicianId = match?.id;
  }

  const canApprove =
    isManager && (request.status === "pending" || request.status === "triaged");

  const canComplete =
    isManager &&
    (request.status === "scheduled" ||
      request.status === "in_progress" ||
      request.status === "escalated");

  const canCancel =
    request.status !== "completed" &&
    request.status !== "cancelled" &&
    (isManager ||
      (request.tenantId === profile?.id &&
        request.status !== "scheduled" &&
        request.status !== "in_progress"));

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Back */}
      <div className="flex items-center gap-3">
        <a
          href="/dashboard/maintenance"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </a>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-bold">{request.title}</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[request.status ?? "pending"]}`}>
            {STATUS_LABELS[request.status ?? "pending"]}
          </span>
          {request.urgency && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${urgencyColors[request.urgency]}`}>
              {URGENCY_LABELS[request.urgency]}
            </span>
          )}
          {request.isSafetyRisk && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
              <AlertTriangle className="h-3 w-3" /> Safety Risk
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left column — request details + AI analysis */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* Request details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Request Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Description</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {request.description}
                </p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                {request.unitNumber && (
                  <div>
                    <p className="text-xs text-muted-foreground">Unit</p>
                    <p className="font-medium">{request.unitNumber}</p>
                  </div>
                )}
                {request.buildingName && (
                  <div>
                    <p className="text-xs text-muted-foreground">Building</p>
                    <p className="font-medium">{request.buildingName}</p>
                  </div>
                )}
                {request.category && (
                  <div>
                    <p className="text-xs text-muted-foreground">Category</p>
                    <p className="font-medium">{CATEGORY_LABELS[request.category]}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="font-medium">
                    {new Date(request.createdAt).toLocaleDateString("en-US", {
                      dateStyle: "medium",
                    })}
                  </p>
                </div>
              </div>

              {request.scheduledAt && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                    <CalendarCheck className="h-4 w-4" />
                    <span className="font-medium">
                      Scheduled:{" "}
                      {new Date(request.scheduledAt).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                </>
              )}

              {request.managerNotes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Manager Notes</p>
                    <p className="text-sm">{request.managerNotes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* AI Analysis card */}
          {triage ? (
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <BrainCircuit className="h-4 w-4" />
                  Gemini AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary */}
                <p className="text-sm leading-relaxed">{triage.summary}</p>
                <Separator />

                {/* Key fields */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Category</p>
                    <p className="font-medium">{CATEGORY_LABELS[triage.category]}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Urgency</p>
                    <p className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${urgencyColors[triage.urgency]}`}>
                      {URGENCY_LABELS[triage.urgency]}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Required Skills</p>
                    <p className="font-medium capitalize">
                      {triage.requiredSkills.join(", ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Suggested SLA</p>
                    <p className="font-medium">{triage.suggestedSLA}</p>
                  </div>
                </div>

                {/* Safety risk */}
                {triage.isSafetyRisk && triage.safetyRiskReason && (
                  <div className="flex gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                        Safety Risk Detected
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                        {triage.safetyRiskReason}
                      </p>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Confidence: {triage.confidence} · Analyzed{" "}
                  {new Date(triage.analysisTimestamp).toLocaleTimeString()}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex items-center gap-3 py-6 text-muted-foreground">
                <BrainCircuit className="h-5 w-5" />
                <p className="text-sm">AI analysis pending — will appear once triage completes.</p>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          {timeline.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="relative border-l border-border ml-2 space-y-4">
                  {timeline.map((event: TimelineEvent, i: number) => (
                    <li key={i} className="ml-4">
                      <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border border-background bg-muted-foreground/40" />
                      <p className="text-xs font-medium text-foreground">{event.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(event.timestamp).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                        {event.actor && ` · ${event.actor}`}
                      </p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column — approval or status */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Suggested response — manager only */}
          {isManager && triage?.suggestedResponse && (
            <Card className="border-violet-200 dark:border-violet-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-violet-700 dark:text-violet-400">
                  <BrainCircuit className="h-4 w-4" />
                  AI-Suggested Response
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed italic text-muted-foreground">
                  &ldquo;{triage.suggestedResponse}&rdquo;
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  You can use this as a starting point when responding to the tenant.
                </p>
              </CardContent>
            </Card>
          )}

          {canApprove ? (
            <Card className="border-emerald-200 dark:border-emerald-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Approve & Dispatch
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeTechnicians.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active technicians available.{" "}
                    <a href="/dashboard/technicians/new" className="underline text-emerald-600">
                      Add one
                    </a>
                    .
                  </p>
                ) : (
                  <ApproveForm
                    requestId={request.id}
                    technicians={activeTechnicians}
                    suggestedTechnicianId={suggestedTechnicianId}
                  />
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-2 text-sm">
                  {request.status === "scheduled" || request.status === "completed" ? (
                    <CalendarCheck className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium">
                    Status: {STATUS_LABELS[request.status ?? "pending"]}
                  </span>
                </div>
                {request.scheduledAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Scheduled for{" "}
                    {new Date(request.scheduledAt).toLocaleString("en-US", {
                      dateStyle: "full",
                      timeStyle: "short",
                    })}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Mark as Completed — manager, scheduled or in_progress */}
          {canComplete && (
            <Card className="border-emerald-200 dark:border-emerald-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Close Job
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form action={completeRequest} className="flex flex-col gap-3">
                  <input type="hidden" name="requestId" value={request.id} />
                  <Textarea
                    name="completionNotes"
                    placeholder="Optional: describe what was done (e.g. replaced capacitor, cleaned filters)"
                    rows={2}
                    className="resize-none text-sm"
                  />
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark as Completed
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Cancel Request */}
          {canCancel && (
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-600 dark:text-red-400">
                  <XCircle className="h-4 w-4" />
                  Cancel Request
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form action={cancelRequest} className="flex flex-col gap-3">
                  <input type="hidden" name="requestId" value={request.id} />
                  <Textarea
                    name="reason"
                    placeholder={isManager ? "Optional: reason for cancellation (sent to tenant)" : "Optional: reason for cancelling"}
                    rows={2}
                    className="resize-none text-sm"
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel This Request
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
