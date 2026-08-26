function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

/**
 * Get Supabase anon/publishable key.
 * Supports both legacy ANON_KEY and new PUBLISHABLE_KEY naming.
 */
function getSupabaseKey(): string {
  const publishableKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

  const key = publishableKey ?? anonKey;
  if (!key) {
    throw new Error(
      "Missing required environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return key;
}

/**
 * Parse and validate the Google service account JSON.
 * Returns null if not configured (calendar features will be disabled).
 */
function getGoogleServiceAccount(): string | null {
  return process.env["GOOGLE_SERVICE_ACCOUNT_JSON"] ?? null;
}

export const env = {
  // App config
  NODE_ENV: getOptionalEnv("NODE_ENV", "development"),
  LOG_LEVEL: getOptionalEnv("LOG_LEVEL", "info"),
  APP_NAME: getOptionalEnv("APP_NAME", "propcare"),

  // Supabase config (required)
  NEXT_PUBLIC_SUPABASE_URL: getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getSupabaseKey(),

  // Database config (required)
  DATABASE_URL: getRequiredEnv("DATABASE_URL"),

  // Google Calendar config (optional — calendar features disabled if missing)
  GOOGLE_SERVICE_ACCOUNT_JSON: getGoogleServiceAccount(),
  GOOGLE_CALENDAR_TIMEZONE: getOptionalEnv("GOOGLE_CALENDAR_TIMEZONE", "Africa/Addis_Ababa"),

  // Gemini AI config (optional at startup, validated at call time)
  GEMINI_API_KEY: process.env["GEMINI_API_KEY"] ?? null,

  // Email (Brevo)
  BREVO_API_KEY: process.env["BREVO_API_KEY"] ?? null,
  BREVO_SENDER_EMAIL: getOptionalEnv("BREVO_SENDER_EMAIL", ""),
  BREVO_SENDER_NAME: getOptionalEnv("BREVO_SENDER_NAME", "PropCare · Meklit Tower"),

  // Cron / escalation
  CRON_SECRET: process.env["CRON_SECRET"] ?? null,

  // Public base URL (needed in escalation emails — set to your domain in production)
  NEXT_PUBLIC_APP_URL: getOptionalEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
} as const;

export type Env = typeof env;
