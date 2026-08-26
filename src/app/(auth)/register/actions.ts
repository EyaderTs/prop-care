"use server";

import { redirect } from "next/navigation";

import { TOWER_NAME } from "@/core/config/tower";
import { createClient } from "@/core/supabase/server";
import { createTenantProfile } from "@/features/tenants";

export interface RegisterState {
  error?: string;
  success?: boolean;
  message?: string;
}

export async function register(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const supabase = await createClient();

  const email = formData.get("email");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");
  const fullName = formData.get("fullName");
  const phone = formData.get("phone");
  const role = formData.get("role");
  const unitNumber = formData.get("unitNumber");

  // buildingName is always TOWER_NAME — sent as a hidden field but we enforce it here too
  const buildingName = TOWER_NAME;

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof confirmPassword !== "string" ||
    typeof fullName !== "string"
  ) {
    return { error: "Invalid form data" };
  }

  if (!email || !password || !confirmPassword || !fullName) {
    return { error: "Name, email, and password fields are required" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  const resolvedRole = role === "manager" ? "manager" : "tenant";

  const { error, data } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role: resolvedRole },
    },
  });

  if (error) {
    // Translate Supabase's rate-limit error into an actionable message
    const msg = error.message.toLowerCase();
    if (msg.includes("email rate limit") || msg.includes("rate limit")) {
      return {
        error:
          "Too many sign-up attempts in a short time. " +
          "To fix this during development: open your Supabase dashboard > Authentication > Email > disable Confirm email. " +
          "This removes the verification step so you can register immediately.",
      };
    }
    if (msg.includes("user already registered") || msg.includes("already been registered")) {
      return { error: "An account with this email already exists. Try signing in instead." };
    }
    return { error: error.message };
  }

  // Session exists → email confirmation is disabled, we can create the profile now
  if (data.user && data.session) {
    try {
      await createTenantProfile({
        userId: data.user.id,
        fullName,
        phone: typeof phone === "string" && phone ? phone : undefined,
        role: resolvedRole,
        unitNumber:
          resolvedRole === "tenant" && typeof unitNumber === "string" && unitNumber
            ? unitNumber
            : undefined,
        buildingName,
      });
    } catch {
      // Profile will be created lazily on first dashboard load
    }
    redirect("/dashboard");
  }

  // Email confirmation required (Supabase default)
  return {
    success: true,
    message:
      "A confirmation email has been sent. Click the link in your inbox to activate your account, then sign in.",
  };
}
