"use client";

import {
  AlertCircle,
  BrainCircuit,
  CalendarCheck2,
  CalendarX2,
  CheckCircle2,
  Clock,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import { confirmMeeting, parseMeetingText } from "./actions";
import type { ConfirmState, ParseStepState } from "./actions";

// ─── Example prompts ──────────────────────────────────────────────────────────

const EXAMPLES = [
  "Schedule a 30-minute check-in with Dawit tomorrow at 10am to review the plumbing repairs in unit 3A",
  "I need to meet with the electrician on Friday afternoon for about an hour to inspect the panel",
  "Book a meeting with Yohannes next Monday morning to discuss the HVAC maintenance schedule",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ label, color }: { label: string; color: "green" | "amber" | "red" | "blue" }) {
  const styles = {
    green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400",
    red: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[color]}`}>
      {label}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0 w-28">{label}</span>
      <span className="text-xs font-medium text-right">{value}</span>
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function MeetingForm() {
  const [text, setText] = useState("");
  const [parseState, setParseState] = useState<ParseStepState>({ status: "idle" });
  const [confirmState, setConfirmState] = useState<ConfirmState>({ status: "idle" });
  const [isParsing, startParsing] = useTransition();
  const [isConfirming, startConfirming] = useTransition();

  function handleExampleClick(example: string) {
    setText(example);
    setParseState({ status: "idle" });
    setConfirmState({ status: "idle" });
  }

  function handleParse() {
    setParseState({ status: "idle" });
    setConfirmState({ status: "idle" });
    startParsing(async () => {
      const result = await parseMeetingText(text);
      setParseState(result);
    });
  }

  function handleConfirm(startIso: string, endIso: string) {
    if (parseState.status !== "available" && parseState.status !== "busy") return;
    const tech = parseState.technician;
    const purpose = parseState.parsed.purpose;
    startConfirming(async () => {
      const result = await confirmMeeting(
        tech.id,
        tech.fullName,
        tech.email,
        tech.googleCalendarId,
        startIso,
        endIso,
        purpose,
      );
      setConfirmState(result);
    });
  }

  const isLoading = isParsing || isConfirming;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
      {/* ── Left: input panel ── */}
      <div className="lg:col-span-3 space-y-4">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-emerald-600" />
              Describe the Meeting
            </CardTitle>
            <CardDescription className="text-sm">
              Write naturally — the AI will extract the technician, date, time, and purpose automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder='e.g. "Schedule a meeting with Dawit tomorrow at 3pm to review the plumbing work in unit 4B"'
              className="min-h-[120px] text-sm resize-none"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim() && !isLoading) {
                  handleParse();
                }
              }}
            />

            <Button
              onClick={handleParse}
              disabled={!text.trim() || isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isParsing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analysing with AI…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Check Availability
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Press <kbd className="rounded border px-1 py-0.5 text-xs font-mono bg-muted">⌘ Enter</kbd> to submit
            </p>
          </CardContent>
        </Card>

        {/* Example prompts */}
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Example Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {EXAMPLES.map((example, i) => (
              <button
                key={i}
                onClick={() => handleExampleClick(example)}
                className="w-full text-left text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-lg px-3 py-2.5 transition-colors border border-transparent hover:border-border"
              >
                "{example}"
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Right: result panel ── */}
      <div className="lg:col-span-2 space-y-4">
        {/* Booked success */}
        {confirmState.status === "booked" && (
          <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/10">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <p className="font-semibold text-sm">Meeting Booked!</p>
              </div>
              <p className="text-sm text-muted-foreground">
                The event has been added to{" "}
                <strong>{confirmState.technicianName}</strong>'s Google Calendar.
                Confirmation emails have been sent to both you and the technician.
              </p>
              <div className="rounded-lg bg-emerald-100/60 dark:bg-emerald-950/30 px-4 py-3">
                <p className="text-xs text-emerald-800 dark:text-emerald-400 font-medium">
                  📅 {confirmState.label}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  setText("");
                  setParseState({ status: "idle" });
                  setConfirmState({ status: "idle" });
                }}
              >
                Schedule another meeting
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Confirm error */}
        {confirmState.status === "error" && (
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="pt-6">
              <div className="flex gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-sm">{confirmState.message}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Parse error */}
        {parseState.status === "error" && (
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="pt-6">
              <div className="flex gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-sm">{parseState.message}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Clarification needed */}
        {parseState.status === "clarify" && (
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <BrainCircuit className="h-4 w-4" />
                A bit more info needed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-amber-800 dark:text-amber-300">{parseState.question}</p>
            </CardContent>
          </Card>
        )}

        {/* Slot available — confirm button */}
        {parseState.status === "available" && confirmState.status !== "booked" && (
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CalendarCheck2 className="h-4 w-4" />
                Slot Available
                <StatusBadge label="Free" color="green" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <DetailRow label="Technician" value={parseState.technician.fullName} />
                <DetailRow label="Purpose" value={parseState.parsed.purpose} />
                <DetailRow label="Date & Time" value={parseState.label} />
                <DetailRow label="Duration" value={`${parseState.parsed.durationMinutes} minutes`} />
              </div>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isConfirming}
                onClick={() => handleConfirm(parseState.proposedStart, parseState.proposedEnd)}
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Booking…
                  </>
                ) : (
                  <>
                    <CalendarCheck2 className="mr-2 h-4 w-4" />
                    Confirm & Book Meeting
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Slot busy — suggestions */}
        {parseState.status === "busy" && confirmState.status !== "booked" && (
          <Card className="border-amber-200 dark:border-amber-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <CalendarX2 className="h-4 w-4" />
                That slot is busy
              </CardTitle>
              <CardDescription className="text-xs">
                <strong>{parseState.technician.fullName}</strong> is unavailable at the requested time.
                Pick one of these alternative slots:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {parseState.suggestions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No availability found in the next 7 days. Please check back later.
                </p>
              ) : (
                parseState.suggestions.map((slot, i) => {
                  const startIso = slot.start instanceof Date
                    ? slot.start.toISOString()
                    : new Date(slot.start).toISOString();
                  const endIso = slot.end instanceof Date
                    ? slot.end.toISOString()
                    : new Date(slot.end).toISOString();

                  return (
                    <button
                      key={i}
                      onClick={() => handleConfirm(startIso, endIso)}
                      disabled={isConfirming}
                      className="w-full flex items-center justify-between rounded-lg border border-border hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10 px-4 py-3 text-left transition-all group disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground group-hover:text-emerald-600" />
                        <span className="text-xs font-medium">{slot.label}</span>
                      </div>
                      {isConfirming ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      ) : (
                        <span className="text-xs text-emerald-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          Book →
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        )}

        {/* Idle placeholder */}
        {parseState.status === "idle" && confirmState.status === "idle" && !isParsing && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarDays className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">AI availability check</p>
              <p className="text-xs text-muted-foreground/70 mt-1 max-w-[200px]">
                Your availability result will appear here after you submit a request.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Missing icon import shim ─────────────────────────────────────────────────
function CalendarDays({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
    </svg>
  );
}
