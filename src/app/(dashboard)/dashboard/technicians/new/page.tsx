"use client";

import { ArrowLeft, CalendarCheck } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SKILL_OPTIONS } from "@/features/technicians/models";

import { type RegisterTechnicianState, submitRegisterTechnician } from "./actions";

const initialState: RegisterTechnicianState = {};

export default function NewTechnicianPage() {
  const [state, formAction, isPending] = useActionState(
    submitRegisterTechnician,
    initialState,
  );
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  function toggleSkill(value: string) {
    setSelectedSkills((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value],
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/technicians"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add Technician</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Register a new technician for Meklit Tower
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Technician Details</CardTitle>
          <CardDescription>
            A Google Calendar will be created automatically so the AI can check their
            availability when assigning maintenance jobs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-5">
            {state.error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                {state.error}
              </div>
            )}

            {/* Full name */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="e.g. Abebe Kebede"
                required
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="abebe@gmail.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                Google Calendar job invites will be sent to this address.
              </p>
            </div>

            {/* Phone */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">
                Phone <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+251 91 234 5678"
              />
            </div>

            {/* Skills */}
            <div className="flex flex-col gap-2">
              <Label>
                Skills <span className="text-red-500">*</span>
              </Label>
              <p className="text-xs text-muted-foreground -mt-1">
                The AI uses these to match technicians to the right maintenance jobs.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SKILL_OPTIONS.map((skill) => {
                  const isSelected = selectedSkills.includes(skill.value);
                  return (
                    <button
                      key={skill.value}
                      type="button"
                      onClick={() => toggleSkill(skill.value)}
                      className={`rounded-lg border-2 px-3 py-2.5 text-sm font-medium text-left transition-colors ${
                        isSelected
                          ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-500"
                          : "border-border text-muted-foreground hover:border-muted-foreground/50"
                      }`}
                    >
                      {skill.label}
                    </button>
                  );
                })}
              </div>
              {/* Hidden inputs to send selected skills as form values */}
              {selectedSkills.map((s) => (
                <input key={s} type="hidden" name="skills" value={s} />
              ))}
              {selectedSkills.length === 0 && (
                <p className="text-xs text-destructive">Please select at least one skill.</p>
              )}
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="notes">
                Notes <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="e.g. Available Mon–Sat, prefers morning shifts"
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isPending || selectedSkills.length === 0}
              >
                {isPending ? "Registering…" : "Register Technician"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/technicians">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info card */}
      <div className="rounded-xl border border-dashed border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-4">
        <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1.5">
          <CalendarCheck className="h-4 w-4" />
          Automatic Google Calendar setup
        </p>
        <p className="text-sm text-muted-foreground">
          When you register a technician, PropCare automatically creates a dedicated Google
          Calendar for them using the service account. The technician receives a sharing invite
          to their email and can view their scheduled maintenance jobs directly in Google Calendar.
        </p>
      </div>
    </div>
  );
}
