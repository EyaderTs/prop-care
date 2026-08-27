# Demo Script — PropCare AI Property Maintenance Assistant
# Total target: ~7 minutes

---

## [0:00 – 1:00] Problem & Solution (talk to camera / slides)

"Property managers waste hours every day on repetitive maintenance coordination —
reading tenant messages, figuring out urgency, picking the right technician,
scheduling visits, sending emails, and following up on forgotten tickets.

PropCare automates all of that using Gemini AI, Google Calendar, and automated
email notifications — while keeping the manager in control of key decisions."

---

## [1:00 – 2:30] Tenant Submits a Request (live demo)

> Open: https://prop-care-sigma.vercel.app/register

"First, a tenant registers. Building name is locked to Meklit Tower."

> Register as a tenant, then go to Dashboard → New Request

"The tenant describes the issue in plain language — no form fields to fill."

> Type: "The AC in my apartment stopped working last night. It's very hot inside, around 32°C."
> Submit the request.

"As soon as it's submitted — Gemini AI runs in the background."

> Open the request that was just created.

"Look at the AI analysis: it classified this as HVAC, High urgency, detected a
safety risk, suggested an HVAC technician, and drafted a response for the tenant —
all from one plain-language sentence."

---

## [2:30 – 4:00] Manager Approves & Dispatches (live demo)

> Log in as manager in a different browser / incognito tab.
> Open Dashboard → All Requests → click the same request.

"The manager sees the full AI breakdown — category, urgency, safety risk, and
the AI's suggested response. There's also a card showing which technician
the AI recommends based on skills."

> Scroll to the Approve & Dispatch section. Select a technician, pick a date/time, click Approve.

"On approval, the agent automatically:
- Creates a Google Calendar event on the technician's calendar
- Emails the tenant with the appointment details
- Emails the technician with the job brief"

> Show the request is now in Scheduled status.

---

## [4:00 – 5:00] Escalation Engine & Meeting Scheduler (live demo)

> Manager dashboard → click "Run Check Now" button at the bottom.

"This is the escalation engine. In production it runs every hour via cron.
For unassigned tickets it alerts the manager. For dispatched jobs it
asks the tenant if the work was done. If ignored, the ticket is automatically
escalated and all managers are notified."

> Go to Meetings in the sidebar.

"Now the AI meeting scheduler. The manager types a natural language request."

> Type: "Schedule a meeting with [technician name] tomorrow at 10am to review the AC repair"
> Click Check Availability.

"Gemini parses the request, checks the technician's Google Calendar, and either
confirms the slot or offers the next 3 available times."

> Click Confirm & Book.

"Event created, emails sent — done."

---

## [5:00 – 6:30] Code Walkthrough (screen share — IDE)

> Open: src/core/gemini/triage.ts

"This is the AI triage function. We send the tenant's message to Gemini with
a structured prompt asking for category, urgency, safety risk, and a suggested
response. The result is parsed and stored in the database."

> Open: src/core/escalation/engine.ts

"This is the escalation engine — three stages. Stage 1 alerts the manager if
a ticket has no technician after the threshold. Stage 2 sends the tenant a
follow-up email after dispatch. Stage 3 escalates if they don't respond."

> Open: src/app/(dashboard)/dashboard/meetings/actions.ts

"This is the agentic meeting scheduler. It calls Gemini to parse the text,
matches the technician by name, checks Google Calendar for availability,
and either creates the event or returns suggested slots — all in one server action."

> Open: src/core/database/schema.ts — briefly show the maintenance_requests table

"The database schema tracks the full ticket lifecycle — status, AI analysis,
timeline events, escalation timestamps — everything in one table."

---

## [6:30 – 7:00] Wrap Up

"PropCare demonstrates a full end-to-end AI automation loop:
- AI that classifies and acts on natural language
- Real integrations — Google Calendar, Brevo email, Supabase
- Human-in-the-loop: the manager stays in control of dispatch decisions
- Automated background jobs that prevent things from falling through the cracks

The code is on GitHub and the app is live at prop-care-sigma.vercel.app."

---

## Tips before recording
- Use two browser profiles: one logged in as tenant, one as manager
- Have a test technician already created with a Google Calendar set up
- Have at least one pending request already in the DB so the escalation demo is instant
- Record in Loom: screen + small camera bubble in corner
- Keep your cursor movements slow and deliberate
