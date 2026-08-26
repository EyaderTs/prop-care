import { db } from "@/core/database/client";
import { maintenanceRequests } from "@/core/database/schema";
import { appendTimelineEvent } from "@/core/escalation/timeline";
import { getLogger } from "@/core/logging";
import { eq } from "drizzle-orm";

const logger = getLogger("api.escalate.respond");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get("requestId");
  const action = searchParams.get("action"); // "resolved" | "unresolved"
  const token = searchParams.get("token");   // simple token = requestId itself

  if (!requestId || !action || token !== requestId) {
    return new Response(
      htmlPage("Invalid Link", "This link is invalid or has already been used."),
      { status: 400, headers: { "Content-Type": "text/html" } },
    );
  }

  const rows = await db
    .select()
    .from(maintenanceRequests)
    .where(eq(maintenanceRequests.id, requestId))
    .limit(1)
    .catch(() => []);

  const ticket = rows[0];
  if (!ticket) {
    return new Response(
      htmlPage("Not Found", "This maintenance request no longer exists."),
      { status: 404, headers: { "Content-Type": "text/html" } },
    );
  }

  if (action === "resolved") {
    await db
      .update(maintenanceRequests)
      .set({ status: "completed", resolvedAt: new Date(), updatedAt: new Date() })
      .where(eq(maintenanceRequests.id, requestId));

    await appendTimelineEvent(requestId, {
      type: "tenant_confirmed_resolved",
      message: "Tenant confirmed the issue is resolved via email follow-up link.",
      actor: "tenant",
    });

    logger.info({ requestId }, "escalation.tenant_confirmed_resolved");

    return new Response(
      htmlPage(
        "Thank you!",
        "We're glad your issue has been resolved. Your request has been marked as completed.",
      ),
      { headers: { "Content-Type": "text/html" } },
    );
  }

  if (action === "unresolved") {
    await db
      .update(maintenanceRequests)
      .set({ status: "escalated", escalatedAt: new Date(), updatedAt: new Date() })
      .where(eq(maintenanceRequests.id, requestId));

    await appendTimelineEvent(requestId, {
      type: "tenant_reported_unresolved",
      message: "Tenant reported the issue is still unresolved via email follow-up link. Request escalated.",
      actor: "tenant",
    });

    logger.info({ requestId }, "escalation.tenant_reported_unresolved");

    return new Response(
      htmlPage(
        "Escalated",
        "We have escalated your request. Your property manager has been notified and will contact you shortly.",
      ),
      { headers: { "Content-Type": "text/html" } },
    );
  }

  return new Response(
    htmlPage("Invalid Action", "Unknown action requested."),
    { status: 400, headers: { "Content-Type": "text/html" } },
  );
}

// ─── Simple branded HTML response page ───────────────────────────────────────

function htmlPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — PropCare</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #fff; border-radius: 12px; padding: 40px 48px; max-width: 480px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
    .logo { font-size: 14px; font-weight: 700; color: #059669; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 1px; }
    h1 { margin: 0 0 12px; font-size: 22px; color: #111827; }
    p { margin: 0; font-size: 15px; color: #6b7280; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <p class="logo">Meklit Tower · PropCare</p>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
