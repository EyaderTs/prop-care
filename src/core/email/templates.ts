import type { TriageResult } from "@/core/gemini";
import type { Technician } from "@/features/technicians";

// ─── Shared layout ────────────────────────────────────────────────────────────

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">

          <!-- Header -->
          <tr>
            <td style="background:#1a2e1a;padding:28px 36px;">
              <p style="margin:0;color:#ffffff;font-size:17px;font-weight:700;letter-spacing:0.3px;">Meklit Tower</p>
              <p style="margin:6px 0 0;color:#86efac;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;">Property Maintenance Management</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px 28px;border-top:1px solid #f3f4f6;">
              <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">This message was sent by the PropCare Maintenance Management System.</p>
              <p style="margin:0;color:#9ca3af;font-size:12px;">Please do not reply directly to this email.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function urgencyBadge(urgency: string): string {
  const styles: Record<string, string> = {
    low: "background:#f3f4f6;color:#374151;",
    medium: "background:#fffbeb;color:#92400e;border:1px solid #fde68a;",
    high: "background:#fff7ed;color:#9a3412;border:1px solid #fed7aa;",
    critical: "background:#fef2f2;color:#991b1b;border:1px solid #fecaca;",
  };
  const style = styles[urgency] ?? styles["low"];
  return `<span style="display:inline-block;padding:3px 12px;border-radius:4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;${style}">${urgency}</span>`;
}

function sectionHeading(text: string): string {
  return `<p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#6b7280;">${text}</p>`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 20px 6px 0;font-size:13px;color:#6b7280;white-space:nowrap;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:500;">${value}</td>
  </tr>`;
}

// ─── Tenant confirmation ──────────────────────────────────────────────────────

export function tenantRequestConfirmation(
  tenantName: string,
  requestTitle: string,
  _requestId: string,
): { subject: string; htmlContent: string } {
  const subject = `Maintenance Request Received — ${requestTitle}`;

  const htmlContent = layout(
    subject,
    `<p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827;">Dear ${tenantName},</p>
    <p style="margin:0 0 24px;font-size:13px;color:#6b7280;">Meklit Tower · Maintenance Department</p>

    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.7;">
      We are writing to confirm that your maintenance request has been successfully received and
      registered in our system. Our AI triage system has begun analyzing the details of your
      request to determine the appropriate priority level and required technician skills.
    </p>

    <div style="background:#f9fafb;border-left:3px solid #059669;border-radius:0 6px 6px 0;padding:16px 20px;margin-bottom:24px;">
      ${sectionHeading("Your Request")}
      <p style="margin:0;font-size:15px;font-weight:600;color:#111827;">${requestTitle}</p>
    </div>

    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.7;">
      Your property manager will review the AI-generated analysis and will contact you shortly
      to confirm the scheduled appointment. You may also track the status of your request through
      the PropCare tenant portal at any time.
    </p>

    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.7;">
      We appreciate your patience and assure you that your request will be handled promptly
      in accordance with its assessed priority.
    </p>

    <p style="margin:0 0 4px;font-size:14px;color:#374151;">Yours sincerely,</p>
    <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">The Maintenance Team</p>
    <p style="margin:0;font-size:13px;color:#6b7280;">Meklit Tower — PropCare</p>`,
  );

  return { subject, htmlContent };
}

// ─── Manager new-request alert ────────────────────────────────────────────────

export function managerNewRequestAlert(opts: {
  tenantName: string;
  tenantUnit: string | null;
  requestTitle: string;
  requestId: string;
  triage: TriageResult;
  suggestedTechnician: Technician | null;
}): { subject: string; htmlContent: string } {
  const urgencyLabel = opts.triage.urgency.charAt(0).toUpperCase() + opts.triage.urgency.slice(1);
  const subject = `Action Required — New Maintenance Request [${urgencyLabel} Priority]: ${opts.requestTitle}`;

  const techBlock = opts.suggestedTechnician
    ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:16px 20px;margin-top:20px;">
        ${sectionHeading("Recommended Technician")}
        <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#111827;">${opts.suggestedTechnician.fullName}</p>
        <table cellpadding="0" cellspacing="0" style="margin-top:8px;">
          ${infoRow("Skills", opts.suggestedTechnician.skills.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(", "))}
          ${infoRow("Calendar", opts.suggestedTechnician.googleCalendarId ? "Connected — availability will be checked automatically" : "Not connected")}
        </table>
      </div>`
    : `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:16px 20px;margin-top:20px;">
        ${sectionHeading("Technician Assignment")}
        <p style="margin:0;font-size:14px;color:#92400e;line-height:1.6;">
          No active technician with matching skills (<strong>${opts.triage.requiredSkills.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(", ")}</strong>) was found in the system.
          Please register a suitable technician or manually assign from the available roster.
        </p>
      </div>`;

  const safetyBlock = opts.triage.isSafetyRisk
    ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:14px 20px;margin-top:12px;">
        <p style="margin:0;font-size:13px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:0.5px;">Safety Risk Identified</p>
        <p style="margin:6px 0 0;font-size:13px;color:#7f1d1d;line-height:1.6;">${opts.triage.safetyRiskReason}</p>
      </div>`
    : "";

  const htmlContent = layout(
    subject,
    `<p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827;">New Maintenance Request</p>
    <p style="margin:0 0 28px;font-size:13px;color:#6b7280;">Action required — please review and approve at your earliest convenience</p>

    <!-- Request summary -->
    <div style="background:#f9fafb;border-radius:6px;padding:16px 20px;margin-bottom:20px;">
      ${sectionHeading("Request Summary")}
      <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#111827;">${opts.requestTitle}</p>
      <table cellpadding="0" cellspacing="0">
        ${infoRow("Submitted by", `${opts.tenantName}${opts.tenantUnit ? ` &mdash; Unit ${opts.tenantUnit}` : ""}`)}
      </table>
    </div>

    ${safetyBlock}

    <!-- AI Analysis -->
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:16px 20px;margin-top:${opts.triage.isSafetyRisk ? "12px" : "0"};">
      ${sectionHeading("AI Triage Analysis — Gemini")}
      <p style="margin:0 0 16px;font-size:14px;color:#1e3a5f;line-height:1.7;">${opts.triage.summary}</p>
      <table cellpadding="0" cellspacing="0">
        ${infoRow("Priority", urgencyBadge(opts.triage.urgency))}
        ${infoRow("Category", opts.triage.category.charAt(0).toUpperCase() + opts.triage.category.slice(1))}
        ${infoRow("Required Skills", opts.triage.requiredSkills.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(", "))}
        ${infoRow("Suggested SLA", opts.triage.suggestedSLA)}
        ${infoRow("Safety Risk", opts.triage.isSafetyRisk ? "Yes" : "No")}
      </table>
    </div>

    ${techBlock}

    <!-- CTA -->
    <div style="margin-top:28px;padding-top:24px;border-top:1px solid #f3f4f6;">
      <p style="margin:0 0 16px;font-size:14px;color:#374151;">
        Please log in to the PropCare portal to review the full analysis, assign a technician,
        and approve the dispatch.
      </p>
      <a href="${process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000"}/dashboard/maintenance/${opts.requestId}"
         style="display:inline-block;background:#1a2e1a;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:6px;font-size:14px;font-weight:600;letter-spacing:0.3px;">
        Review &amp; Approve Request
      </a>
    </div>`,
  );

  return { subject, htmlContent };
}

// ─── Tenant appointment confirmation (sent when manager approves) ─────────────

export function tenantAppointmentConfirmation(opts: {
  tenantName: string;
  requestTitle: string;
  technicianName: string;
  scheduledAt: Date;
  unitNumber: string | null;
  managerNotes: string | null;
}): { subject: string; htmlContent: string } {
  const subject = `Appointment Confirmed — ${opts.requestTitle}`;

  const tz = process.env["GOOGLE_CALENDAR_TIMEZONE"] ?? "Africa/Addis_Ababa";
  const dateStr = opts.scheduledAt.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: tz,
  });
  const timeStr = opts.scheduledAt.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", timeZone: tz,
  });

  const htmlContent = layout(
    subject,
    `<p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827;">Dear ${opts.tenantName},</p>
    <p style="margin:0 0 24px;font-size:13px;color:#6b7280;">Meklit Tower · Maintenance Department</p>

    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.7;">
      We are pleased to inform you that your maintenance request has been reviewed and a technician
      has been assigned to address the issue. Your appointment details are provided below.
    </p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:20px 24px;margin-bottom:20px;">
      ${sectionHeading("Appointment Confirmation")}
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        ${infoRow("Request", `<strong>${opts.requestTitle}</strong>`)}
        ${opts.unitNumber ? infoRow("Unit", opts.unitNumber) : ""}
        ${infoRow("Date", dateStr)}
        ${infoRow("Time", timeStr)}
        ${infoRow("Technician", opts.technicianName)}
      </table>
    </div>

    ${opts.managerNotes
      ? `<div style="background:#f9fafb;border-left:3px solid #d1d5db;border-radius:0 6px 6px 0;padding:14px 20px;margin-bottom:20px;">
          ${sectionHeading("Note from Property Manager")}
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${opts.managerNotes}</p>
        </div>`
      : ""}

    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.7;">
      Please ensure that access to the relevant area is available at the scheduled time.
      If you have any questions or need to reschedule, please contact the property management
      office directly.
    </p>

    <p style="margin:0 0 4px;font-size:14px;color:#374151;">Yours sincerely,</p>
    <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">The Maintenance Team</p>
    <p style="margin:0;font-size:13px;color:#6b7280;">Meklit Tower — PropCare</p>`,
  );

  return { subject, htmlContent };
}

// ─── Technician job briefing ──────────────────────────────────────────────────

export function technicianJobBriefing(opts: {
  technicianName: string;
  technicianEmail: string;
  requestTitle: string;
  description: string;
  unitNumber: string | null;
  scheduledAt: Date;
  managerNotes: string | null;
  triage: TriageResult | null;
}): { subject: string; htmlContent: string } {
  const subject = `Job Assignment — ${opts.requestTitle}`;

  const tz = process.env["GOOGLE_CALENDAR_TIMEZONE"] ?? "Africa/Addis_Ababa";
  const dateStr = opts.scheduledAt.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: tz,
  });
  const timeStr = opts.scheduledAt.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", timeZone: tz,
  });

  const htmlContent = layout(
    subject,
    `<p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827;">Dear ${opts.technicianName},</p>
    <p style="margin:0 0 24px;font-size:13px;color:#6b7280;">Meklit Tower · Maintenance Department</p>

    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.7;">
      A new maintenance job has been assigned to you. Please review the details below and
      ensure you are prepared for the scheduled appointment. The job has also been added to
      your PropCare calendar.
    </p>

    <div style="background:#f9fafb;border-radius:6px;padding:20px 24px;margin-bottom:20px;">
      ${sectionHeading("Job Details")}
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        ${infoRow("Job", `<strong>${opts.requestTitle}</strong>`)}
        ${infoRow("Location", `Meklit Tower${opts.unitNumber ? ` — Unit ${opts.unitNumber}` : ""}`)}
        ${infoRow("Date", dateStr)}
        ${infoRow("Time", timeStr)}
        ${opts.triage ? infoRow("Priority", urgencyBadge(opts.triage.urgency)) : ""}
        ${opts.triage ? infoRow("Category", opts.triage.category.charAt(0).toUpperCase() + opts.triage.category.slice(1)) : ""}
      </table>
    </div>

    <div style="background:#f9fafb;border-left:3px solid #059669;border-radius:0 6px 6px 0;padding:14px 20px;margin-bottom:20px;">
      ${sectionHeading("Issue Description")}
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${opts.description}</p>
    </div>

    ${opts.triage?.isSafetyRisk && opts.triage.safetyRiskReason
      ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:14px 20px;margin-bottom:20px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#991b1b;">Safety Risk — Please Take Precautions</p>
          <p style="margin:0;font-size:14px;color:#7f1d1d;line-height:1.6;">${opts.triage.safetyRiskReason}</p>
        </div>`
      : ""}

    ${opts.managerNotes
      ? `<div style="background:#eff6ff;border-left:3px solid #93c5fd;border-radius:0 6px 6px 0;padding:14px 20px;margin-bottom:20px;">
          ${sectionHeading("Instructions from Manager")}
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${opts.managerNotes}</p>
        </div>`
      : ""}

    <p style="margin:0 0 4px;font-size:14px;color:#374151;">Kind regards,</p>
    <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">Property Management</p>
    <p style="margin:0;font-size:13px;color:#6b7280;">Meklit Tower — PropCare</p>`,
  );

  return { subject, htmlContent };
}

// ─── Request completed notification ──────────────────────────────────────────

export function requestCompletedNotification(opts: {
  tenantName: string;
  requestTitle: string;
  completionNotes: string | null;
}): { subject: string; htmlContent: string } {
  const subject = `Maintenance Request Resolved — ${opts.requestTitle}`;

  const htmlContent = layout(
    subject,
    `<p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827;">Dear ${opts.tenantName},</p>
    <p style="margin:0 0 24px;font-size:13px;color:#6b7280;">Meklit Tower · Maintenance Department</p>

    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.7;">
      We are pleased to inform you that the maintenance work associated with your request
      has been completed. Please find the details below.
    </p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:20px 24px;margin-bottom:20px;">
      ${sectionHeading("Resolved Request")}
      <p style="margin:0;font-size:15px;font-weight:600;color:#111827;">${opts.requestTitle}</p>
      <p style="margin:8px 0 0;font-size:13px;color:#059669;font-weight:600;">Status: Completed</p>
    </div>

    ${opts.completionNotes
      ? `<div style="background:#f9fafb;border-left:3px solid #d1d5db;border-radius:0 6px 6px 0;padding:14px 20px;margin-bottom:20px;">
          ${sectionHeading("Completion Notes")}
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${opts.completionNotes}</p>
        </div>`
      : ""}

    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.7;">
      We hope the issue has been fully resolved to your satisfaction. Should you experience
      any further problems, please do not hesitate to submit a new request through the
      PropCare portal.
    </p>

    <p style="margin:0 0 4px;font-size:14px;color:#374151;">Yours sincerely,</p>
    <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">The Maintenance Team</p>
    <p style="margin:0;font-size:13px;color:#6b7280;">Meklit Tower — PropCare</p>`,
  );

  return { subject, htmlContent };
}

// ─── Request cancelled notification ──────────────────────────────────────────

export function requestCancelledNotification(opts: {
  tenantName: string;
  requestTitle: string;
  reason: string | null;
}): { subject: string; htmlContent: string } {
  const subject = `Maintenance Request Cancelled — ${opts.requestTitle}`;

  const htmlContent = layout(
    subject,
    `<p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827;">Dear ${opts.tenantName},</p>
    <p style="margin:0 0 24px;font-size:13px;color:#6b7280;">Meklit Tower · Maintenance Department</p>

    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.7;">
      We are writing to inform you that the following maintenance request has been cancelled
      by the property management team.
    </p>

    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:20px 24px;margin-bottom:20px;">
      ${sectionHeading("Cancelled Request")}
      <p style="margin:0;font-size:15px;font-weight:600;color:#111827;">${opts.requestTitle}</p>
      <p style="margin:8px 0 0;font-size:13px;color:#dc2626;font-weight:600;">Status: Cancelled</p>
    </div>

    ${opts.reason
      ? `<div style="background:#f9fafb;border-left:3px solid #d1d5db;border-radius:0 6px 6px 0;padding:14px 20px;margin-bottom:20px;">
          ${sectionHeading("Reason")}
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${opts.reason}</p>
        </div>`
      : ""}

    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.7;">
      If this cancellation was made in error or the issue still requires attention, please
      submit a new request through the PropCare portal or contact the property management
      office directly.
    </p>

    <p style="margin:0 0 4px;font-size:14px;color:#374151;">Yours sincerely,</p>
    <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">The Maintenance Team</p>
    <p style="margin:0;font-size:13px;color:#6b7280;">Meklit Tower — PropCare</p>`,
  );

  return { subject, htmlContent };
}

// ─── Escalation: tenant follow-up ─────────────────────────────────────────────

export function escalationFollowUpEmail(opts: {
  tenantName: string;
  requestTitle: string;
  requestId: string;
  resolveUrl: string;
  unresolvedUrl: string;
}): { subject: string; htmlContent: string } {
  const subject = `Follow-Up: Is Your Maintenance Issue Resolved? — ${opts.requestTitle}`;

  const htmlContent = layout(
    subject,
    `<p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827;">Dear ${opts.tenantName},</p>
    <p style="margin:0 0 24px;font-size:13px;color:#6b7280;">Meklit Tower · Maintenance Department</p>

    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.7;">
      We are following up on your maintenance request that was submitted some time ago and
      appears to be still open in our system. We want to ensure your issue receives the
      attention it deserves.
    </p>

    <div style="background:#f9fafb;border-left:3px solid #f59e0b;border-radius:0 6px 6px 0;padding:16px 20px;margin-bottom:24px;">
      ${sectionHeading("Open Request")}
      <p style="margin:0;font-size:15px;font-weight:600;color:#111827;">${opts.requestTitle}</p>
    </div>

    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.7;">
      Please let us know the current status of this issue by clicking one of the options below:
    </p>

    <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding-right:12px;">
          <a href="${opts.resolveUrl}"
             style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:14px;font-weight:600;">
            Issue is Resolved
          </a>
        </td>
        <td>
          <a href="${opts.unresolvedUrl}"
             style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:14px;font-weight:600;">
            Still Unresolved
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 4px;font-size:14px;color:#374151;">Yours sincerely,</p>
    <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">The Maintenance Team</p>
    <p style="margin:0;font-size:13px;color:#6b7280;">Meklit Tower — PropCare</p>`,
  );

  return { subject, htmlContent };
}

// ─── Escalation: manager alert ────────────────────────────────────────────────

export function escalationManagerAlert(opts: {
  managerName: string;
  tenantName: string;
  requestTitle: string;
  requestId: string;
  hoursOpen: number;
  appUrl: string;
}): { subject: string; htmlContent: string } {
  const subject = `Escalation Alert — Unresolved Request (${opts.hoursOpen}h): ${opts.requestTitle}`;

  const htmlContent = layout(
    subject,
    `<p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827;">Dear ${opts.managerName},</p>
    <p style="margin:0 0 24px;font-size:13px;color:#6b7280;">Meklit Tower · PropCare System Alert</p>

    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#991b1b;">Escalation Required</p>
      <p style="margin:0;font-size:14px;color:#7f1d1d;line-height:1.6;">
        A maintenance request has been open for <strong>${opts.hoursOpen} hours</strong> without resolution.
        A follow-up was sent to the tenant but the issue remains unresolved.
      </p>
    </div>

    <div style="background:#f9fafb;border-radius:6px;padding:16px 20px;margin-bottom:20px;">
      ${sectionHeading("Escalated Request")}
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        ${infoRow("Title", `<strong>${opts.requestTitle}</strong>`)}
        ${infoRow("Tenant", opts.tenantName)}
        ${infoRow("Open for", `${opts.hoursOpen} hours`)}
        ${infoRow("Status", '<span style="color:#dc2626;font-weight:600;">Escalated</span>')}
      </table>
    </div>

    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.7;">
      Immediate action is required. Please review this request and either assign a technician
      or contact the tenant directly.
    </p>

    <a href="${opts.appUrl}/dashboard/maintenance/${opts.requestId}"
       style="display:inline-block;background:#1a2e1a;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:6px;font-size:14px;font-weight:600;">
      Review Escalated Request
    </a>`,
  );

  return { subject, htmlContent };
}

// ─── Escalation: overdue appointment ─────────────────────────────────────────

export function escalationOverdueAppointmentAlert(opts: {
  managerName: string;
  tenantName: string;
  requestTitle: string;
  requestId: string;
  scheduledAt: Date;
  appUrl: string;
}): { subject: string; htmlContent: string } {
  const subject = `Appointment Overdue — Please Verify: ${opts.requestTitle}`;

  const scheduledStr = opts.scheduledAt.toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: process.env["GOOGLE_CALENDAR_TIMEZONE"] ?? "Africa/Addis_Ababa",
  });

  const htmlContent = layout(
    subject,
    `<p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827;">Dear ${opts.managerName},</p>
    <p style="margin:0 0 24px;font-size:13px;color:#6b7280;">Meklit Tower · PropCare System Alert</p>

    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#92400e;">Appointment Not Confirmed</p>
      <p style="margin:0;font-size:14px;color:#78350f;line-height:1.6;">
        A maintenance appointment has passed its scheduled time but has not been marked as
        completed. Please verify whether the work was carried out.
      </p>
    </div>

    <div style="background:#f9fafb;border-radius:6px;padding:16px 20px;margin-bottom:20px;">
      ${sectionHeading("Overdue Appointment")}
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        ${infoRow("Request", `<strong>${opts.requestTitle}</strong>`)}
        ${infoRow("Tenant", opts.tenantName)}
        ${infoRow("Was scheduled for", scheduledStr)}
      </table>
    </div>

    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.7;">
      Please log in to confirm whether the job was completed or to reschedule if the
      technician was unable to attend.
    </p>

    <a href="${opts.appUrl}/dashboard/maintenance/${opts.requestId}"
       style="display:inline-block;background:#1a2e1a;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:6px;font-size:14px;font-weight:600;">
      Review Request
    </a>`,
  );

  return { subject, htmlContent };
}

// ─── Escalation: unassigned ticket manager alert ──────────────────────────────

export function escalationUnassignedAlert(opts: {
  managerName: string;
  tenantName: string;
  requestTitle: string;
  requestId: string;
  minutesOpen: number;
  appUrl: string;
}): { subject: string; htmlContent: string } {
  const subject = `Action Required — Unassigned Request (${opts.minutesOpen}m): ${opts.requestTitle}`;

  const htmlContent = layout(
    subject,
    `<p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827;">Dear ${opts.managerName},</p>
    <p style="margin:0 0 24px;font-size:13px;color:#6b7280;">Meklit Tower · PropCare System Alert</p>

    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#9a3412;">Technician Not Yet Assigned</p>
      <p style="margin:0;font-size:14px;color:#7c2d12;line-height:1.6;">
        A maintenance request has been waiting for <strong>${opts.minutesOpen} minute${opts.minutesOpen !== 1 ? "s" : ""}</strong>
        with no technician assigned. The tenant is still waiting.
      </p>
    </div>

    <div style="background:#f9fafb;border-radius:6px;padding:16px 20px;margin-bottom:20px;">
      ${sectionHeading("Open Request")}
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        ${infoRow("Title", `<strong>${opts.requestTitle}</strong>`)}
        ${infoRow("Tenant", opts.tenantName)}
        ${infoRow("Waiting for", `${opts.minutesOpen} minute${opts.minutesOpen !== 1 ? "s" : ""}`)}
        ${infoRow("Status", '<span style="color:#d97706;font-weight:600;">Pending — No Technician</span>')}
      </table>
    </div>

    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.7;">
      Please review the AI triage analysis and assign an appropriate technician as soon as possible.
    </p>

    <a href="${opts.appUrl}/dashboard/maintenance/${opts.requestId}"
       style="display:inline-block;background:#1a2e1a;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:6px;font-size:14px;font-weight:600;">
      Assign Technician Now
    </a>`,
  );

  return { subject, htmlContent };
}

// ─── Meeting scheduled notification ──────────────────────────────────────────

export function meetingScheduledEmail(opts: {
  recipientName: string;
  recipientRole: "technician" | "manager";
  managerName: string;
  technicianName: string;
  purpose: string;
  startDateTime: Date;
  endDateTime: Date;
  calendarEventId?: string;
}): { subject: string; htmlContent: string } {
  const tz = process.env["GOOGLE_CALENDAR_TIMEZONE"] ?? "Africa/Addis_Ababa";
  const fmt = (d: Date) =>
    d.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short", timeZone: tz });

  const subject = `Meeting Confirmed: ${opts.purpose}`;

  const whoLine =
    opts.recipientRole === "technician"
      ? `Property Manager <strong>${opts.managerName}</strong> has scheduled a meeting with you.`
      : `Your meeting with <strong>${opts.technicianName}</strong> has been confirmed.`;

  const htmlContent = layout(
    subject,
    `<p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827;">Dear ${opts.recipientName},</p>
    <p style="margin:0 0 24px;font-size:13px;color:#6b7280;">Meklit Tower · PropCare Scheduling</p>

    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.7;">${whoLine}</p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      ${sectionHeading("Meeting Details")}
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        ${infoRow("Purpose", `<strong>${opts.purpose}</strong>`)}
        ${infoRow("Date & Time", fmt(opts.startDateTime))}
        ${infoRow("Duration", `${Math.round((opts.endDateTime.getTime() - opts.startDateTime.getTime()) / 60000)} minutes`)}
        ${infoRow("Manager", opts.managerName)}
        ${infoRow("Technician", opts.technicianName)}
        ${infoRow("Location", "Meklit Tower — to be confirmed by manager")}
      </table>
    </div>

    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.7;">
      This meeting has been added to the technician's Google Calendar. Please be available
      at the scheduled time. If you need to reschedule, please contact the property management office.
    </p>

    <p style="margin:0 0 4px;font-size:14px;color:#374151;">Yours sincerely,</p>
    <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">The Management Team</p>
    <p style="margin:0;font-size:13px;color:#6b7280;">Meklit Tower — PropCare</p>`,
  );

  return { subject, htmlContent };
}
