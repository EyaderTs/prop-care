import { Building2, Mail, Phone, ShieldCheck, User } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/core/supabase/server";
import { signOut } from "@/features/auth/actions";
import { getTenantProfile } from "@/features/tenants";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user ? await getTenantProfile(user.id).catch(() => null) : null;
  const initials = (profile?.fullName?.[0] ?? user?.email?.[0] ?? "U").toUpperCase();
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "N/A";
  const lastSignIn = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "N/A";

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </CardTitle>
          <CardDescription>Your account and tenant information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar row */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-xl font-bold">
              {initials}
            </div>
            <div>
              <p className="font-medium">{profile?.fullName ?? "—"}</p>
              <p className="text-sm text-muted-foreground capitalize">
                {profile?.role === "manager" ? "🔑 Property Manager" : "🏢 Tenant"}
              </p>
            </div>
          </div>

          <Separator />

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <dt className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email
              </dt>
              <dd className="text-sm font-medium">{user?.email}</dd>
            </div>

            {profile?.phone && (
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Phone
                </dt>
                <dd className="text-sm font-medium">{profile.phone}</dd>
              </div>
            )}

            {profile?.role === "tenant" && profile.unitNumber && (
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Unit
                </dt>
                <dd className="text-sm font-medium">
                  Unit {profile.unitNumber}
                  {profile.buildingName && `, ${profile.buildingName}`}
                </dd>
              </div>
            )}

            {profile?.role === "manager" && profile.buildingName && (
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Property
                </dt>
                <dd className="text-sm font-medium">{profile.buildingName}</dd>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <dt className="text-xs text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Member since
              </dt>
              <dd className="text-sm font-medium">{memberSince}</dd>
            </div>

            <div className="flex flex-col gap-1">
              <dt className="text-xs text-muted-foreground">Last sign in</dt>
              <dd className="text-sm font-medium">{lastSignIn}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Appearance card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Choose your preferred color theme</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-muted-foreground">Switch between light and dark mode</p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      {/* Sign out card */}
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible account actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Sign out</p>
              <p className="text-xs text-muted-foreground">Sign out of your PropCare account</p>
            </div>
            <form action={signOut}>
              <Button variant="outline" size="sm" type="submit" className="text-destructive border-destructive/40 hover:bg-destructive/10">
                Sign out
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
