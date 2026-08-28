# PropCare — AI Property Maintenance Assistant

An AI-powered maintenance coordination system for residential property management. Tenants submit requests in plain language, Gemini AI triages them, and the agent handles scheduling, email notifications, follow-ups, and escalations automatically.

**Live demo:** https://prop-care-sigma.vercel.app

---

## What it does

| Workflow | Description |
|---|---|
| **A — AI Triage** | Tenant submits a request in plain language → Gemini classifies category, urgency, safety risk, and suggests a technician |
| **B — Approval & Dispatch** | Manager reviews AI analysis, approves a technician → Google Calendar event created + emails sent to tenant and technician |
| **C — Resolution** | Manager marks ticket as completed → tenant receives a completion notification |
| **D — Escalation** | Background job checks for stuck tickets → alerts manager if unassigned, asks tenant if work was done, escalates if unresolved |
| **E — Meeting Scheduler** | Manager types a natural language meeting request → Gemini parses it, checks Google Calendar availability, books the event |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions) |
| Database & Auth | Supabase (PostgreSQL + Auth) |
| ORM | Drizzle ORM |
| AI | Google Gemini API |
| Email | Brevo (Sendinblue) |
| Calendar | Google Calendar API (Service Account) |
| Scheduling | cron-job.org → `/api/cron/escalate` |
| Hosting | Vercel |
| UI | shadcn/ui + Tailwind CSS v4 |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/                  # Login & registration
│   ├── (dashboard)/             # All protected pages
│   │   └── dashboard/
│   │       ├── maintenance/     # Request list, detail, new request
│   │       ├── meetings/        # AI meeting scheduler
│   │       ├── technicians/     # Technician management
│   │       └── tenants/         # Tenant list (manager only)
│   └── api/
│       ├── cron/escalate/       # Secured cron endpoint
│       └── escalate/respond/    # Tenant email action links
├── core/
│   ├── gemini/                  # AI triage + meeting parser
│   ├── google-calendar/         # Calendar events + availability
│   ├── email/                   # Brevo client + all email templates
│   ├── escalation/              # Escalation engine + timeline
│   └── database/                # Drizzle schema & client
└── features/
    ├── maintenance/             # Requests repository & service
    ├── technicians/             # Technician repository & service
    └── tenants/                 # Tenant profile repository & service
```

---

## Roles

| Role | Access |
|---|---|
| **Tenant** | Submit requests, track status, receive email updates |
| **Manager** | Full dashboard — review AI analysis, approve dispatch, manage technicians and tenants, run escalation checks |

Register at `/register` and select your role. Building name is pre-set to **Meklit Tower**.

---

## Local Setup

```bash
# Install dependencies
bun install

# Copy env file and fill in your credentials
cp .env.example .env

# Run database migrations (in Supabase SQL Editor)
# Run: drizzle/migrations/propcare_full_schema.sql
# Run: drizzle/migrations/escalation_columns.sql

# Start dev server
bun run dev
```

## Required Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_URL=

GEMINI_API_KEY=
GOOGLE_SERVICE_ACCOUNT_JSON=        # Full JSON as single line
GOOGLE_CALENDAR_TIMEZONE=Africa/Addis_Ababa

BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=PropCare · Meklit Tower

NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
CRON_SECRET=your-secret-here
```

## Escalation Cron Job

The `/api/cron/escalate` endpoint is called hourly by [cron-job.org](https://cron-job.org).  
Set the `Authorization` header to `Bearer <CRON_SECRET>` in the cron job config.

In development (`NODE_ENV !== production`) thresholds are **1–2 minutes** for easy testing.  
In production they switch automatically to **24h / 12h**.

---

## Key Commands

```bash
bun run dev        # Development server
bun run build      # Production build
bun run lint       # Lint check
bun test           # Run tests
```
