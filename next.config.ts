import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // googleapis and google-auth-library use Node.js built-ins (child_process, fs, etc.)
  // that must never be bundled for the browser. Mark them as server-only.
  serverExternalPackages: ["googleapis", "google-auth-library"],
};

export default nextConfig;
