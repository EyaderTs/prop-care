import { getLogger } from "@/core/logging";

const logger = getLogger("email.brevo");

interface SendEmailOptions {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
}

function getBrevoConfig(): { apiKey: string; senderEmail: string; senderName: string } | null {
  const apiKey = process.env["BREVO_API_KEY"];
  const senderEmail = process.env["BREVO_SENDER_EMAIL"];
  if (!apiKey || !senderEmail) return null;
  return {
    apiKey,
    senderEmail,
    senderName: process.env["BREVO_SENDER_NAME"] ?? "Meklit Tower",
  };
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const config = getBrevoConfig();

  if (!config) {
    logger.warn({}, "email.brevo_not_configured_skipped");
    return false;
  }

  const payload = {
    sender: { email: config.senderEmail, name: config.senderName },
    to: options.to,
    subject: options.subject,
    htmlContent: options.htmlContent,
    textContent: options.textContent,
  };

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": config.apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "(no body)");
    logger.error({ status: response.status, body }, "email.brevo_send_failed");
    return false;
  }

  logger.info({ to: options.to.map((r) => r.email), subject: options.subject }, "email.sent");
  return true;
}

export const isEmailConfigured = () => Boolean(process.env["BREVO_API_KEY"] && process.env["BREVO_SENDER_EMAIL"]);
