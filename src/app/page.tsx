import { ArrowRight, BrainCircuit, CalendarCheck, ClipboardList, Wrench } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: ClipboardList,
    title: "Smart Request Submission",
    description:
      "Tenants describe issues in plain language. Our AI instantly categorizes, assesses urgency, and creates a structured ticket.",
  },
  {
    icon: BrainCircuit,
    title: "AI-Powered Triage",
    description:
      "Gemini AI analyzes every request — detecting urgency, required skills, safety risks, and suggesting the right technician.",
  },
  {
    icon: Wrench,
    title: "Technician Dispatch",
    description:
      "Property managers review AI recommendations, approve assignments, and the agent emails both tenant and technician automatically.",
  },
  {
    icon: CalendarCheck,
    title: "Automated Scheduling",
    description:
      "Google Calendar events are created automatically when a job is approved. Tenants get instant confirmation with appointment details.",
  },
];

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <a href="/" className="flex items-center gap-2">
            <span className="text-xl">🏠</span>
            <span className="font-bold text-lg text-emerald-700 dark:text-emerald-400">
              PropCare
            </span>
          </a>
          <nav className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <a href="/login">Sign in</a>
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              asChild
            >
              <a href="/register">Get started</a>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="container mx-auto px-4 py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 mb-8">
            <BrainCircuit className="h-3.5 w-3.5" />
            AI-Powered Property Maintenance
          </div>

          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Maintenance coordination{" "}
            <span className="text-emerald-600 dark:text-emerald-400">on autopilot</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            PropCare uses Gemini AI to triage tenant requests, suggest technicians, and
            automate dispatch — so property managers focus on decisions, not paperwork.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8"
              asChild
            >
              <a href="/register">
                Get started free
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="/login">Sign in</a>
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="border-t bg-muted/30 py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-2xl font-bold mb-3">
              The full maintenance lifecycle, automated
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
              From tenant request to resolved ticket — PropCare handles every step with AI
              intelligence and keeps everyone in the loop.
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-xl border bg-background p-6 shadow-sm flex flex-col gap-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow roles */}
        <section className="container mx-auto px-4 py-20">
          <h2 className="text-center text-2xl font-bold mb-12">Built for every role</h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20 p-8">
              <div className="text-3xl mb-4">🏢</div>
              <h3 className="text-xl font-bold mb-2">For Tenants</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  Submit requests in plain language — no forms to fill
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  Get instant confirmation with expected response times
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  Receive email with appointment details automatically
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  Track your request status in real time
                </li>
              </ul>
              <Button
                className="mt-6 bg-emerald-600 hover:bg-emerald-700 text-white"
                asChild
              >
                <a href="/register">Register as Tenant</a>
              </Button>
            </div>

            <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-8">
              <div className="text-3xl mb-4">🔑</div>
              <h3 className="text-xl font-bold mb-2">For Property Managers</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  AI pre-triages every request with category and urgency
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  Approve or reassign suggested technician with one click
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  Calendar events and emails sent automatically on approval
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  Safety escalations flagged for immediate attention
                </li>
              </ul>
              <Button className="mt-6" variant="outline" asChild>
                <a href="/register">Register as Manager</a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">PropCare</span>{" "}
          — AI-powered property maintenance assistant
        </p>
      </footer>
    </div>
  );
}
