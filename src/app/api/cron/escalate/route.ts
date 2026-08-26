import { NextResponse } from "next/server";

import { runEscalationCheck } from "@/core/escalation";
import { getLogger } from "@/core/logging";

const logger = getLogger("api.cron.escalate");

function isAuthorized(request: Request): boolean {
  const secret = process.env["CRON_SECRET"];
  if (!secret) {
    // No secret configured — block all access
    return false;
  }
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    logger.warn({}, "api.cron.escalate.unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runEscalationCheck();
    logger.info(result, "api.cron.escalate.success");
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ error: String(err) }, "api.cron.escalate.error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Also allow GET for easy manual triggering from the manager dashboard
export async function GET(request: Request) {
  return POST(request);
}
