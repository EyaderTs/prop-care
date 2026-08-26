"use client";

import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { TOWER_NAME } from "@/core/config/tower";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { type NewRequestState, submitMaintenanceRequest } from "./actions";

const initialState: NewRequestState = {};

export function NewRequestForm({ defaultUnitNumber }: { defaultUnitNumber?: string | null | undefined }) {
  const [state, formAction, isPending] = useActionState(submitMaintenanceRequest, initialState);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/maintenance"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Submit Maintenance Request</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Describe the issue — our AI will triage and categorize it automatically
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request Details</CardTitle>
          <CardDescription>
            Be as descriptive as possible. Mention the location, what you observed, and when it
            started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-5">
            {state.error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                {state.error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Issue Title</Label>
              <Input
                id="title"
                name="title"
                type="text"
                placeholder="e.g. AC not cooling in unit 4B"
                required
                minLength={5}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Describe the Issue</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="e.g. The AC stopped cooling last night. It's about 30°C inside. I've checked the thermostat and it shows the right temperature but warm air is coming out."
                rows={5}
                required
                minLength={10}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                The more detail you provide, the better our AI can assess urgency and find the
                right technician.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="unitNumber">Unit Number</Label>
                {defaultUnitNumber ? (
                  <>
                    <div className="flex items-center gap-2 h-9 rounded-md border border-input bg-muted/50 px-3 text-sm">
                      <span className="flex-1">{defaultUnitNumber}</span>
                      <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </div>
                    <input type="hidden" name="unitNumber" value={defaultUnitNumber} />
                  </>
                ) : (
                  <Input
                    id="unitNumber"
                    name="unitNumber"
                    type="text"
                    placeholder="e.g. 4B"
                  />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label>Building</Label>
                <div className="flex items-center gap-2 h-9 rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground">
                  <span className="flex-1 truncate">{TOWER_NAME}</span>
                  <Lock className="h-3 w-3 shrink-0" />
                </div>
                <input type="hidden" name="buildingName" value={TOWER_NAME} />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isPending}
              >
                {isPending ? "Submitting..." : "Submit Request"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/maintenance">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20 p-4">
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-1">
          🤖 What happens next?
        </p>
        <p className="text-sm text-muted-foreground">
          After you submit, our AI (Gemini) will analyze your request to determine the issue
          category, urgency level, required technician skills, and any safety risks. Your property
          manager will review the analysis and approve a technician appointment.
        </p>
      </div>
    </div>
  );
}
