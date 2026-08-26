import { google } from "googleapis";

import { env } from "@/core/config/env";

/**
 * Returns an authenticated Google Calendar API client using the service account.
 * The service account must have Google Calendar API enabled in Google Cloud Console.
 */
export function getCalendarClient() {
  if (!env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new Error(
      "Google Calendar is not configured. Add GOOGLE_SERVICE_ACCOUNT_JSON to your .env file.",
    );
  }

  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } catch {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON. Make sure it is a single-line minified JSON string.",
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ],
  });

  return google.calendar({ version: "v3", auth });
}

export const isCalendarConfigured = () => Boolean(env.GOOGLE_SERVICE_ACCOUNT_JSON);
