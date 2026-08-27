import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  Wrench,
} from "lucide-react";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { createClient } from "@/core/supabase/server";
import { signOut } from "@/features/auth/actions";
import { getTenantProfile } from "@/features/tenants";

interface DashboardLayoutProps {
  children: ReactNode;
}

// ─── Role-specific navigation ─────────────────────────────────────────────────

const tenantNav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/maintenance", label: "My Requests", icon: ClipboardList },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const managerNav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/maintenance", label: "All Requests", icon: ClipboardList },
  { href: "/dashboard/meetings", label: "Meetings", icon: CalendarDays },
  { href: "/dashboard/technicians", label: "Technicians", icon: Wrench },
  { href: "/dashboard/tenants", label: "Tenants", icon: Users },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

// ─── Sidebar nav link ─────────────────────────────────────────────────────────

function NavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </a>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the profile to get the authoritative role
  const profile = await getTenantProfile(user.id).catch(() => null);
  const isManager = profile?.role === "manager";
  const navItems = isManager ? managerNav : tenantNav;

  const displayName =
    profile?.fullName ??
    (user.user_metadata?.["full_name"] as string | undefined) ??
    user.email?.split("@")[0] ??
    "User";
  const initials = (displayName[0] ?? "U").toUpperCase();

  // Role badge styling
  const roleBadge = isManager
    ? {
        label: "Property Manager",
        emoji: "🔑",
        classes:
          "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400",
      }
    : {
        label: "Tenant",
        emoji: "🏢",
        classes:
          "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400",
      };

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col border-r bg-background">
        {/* Brand */}
        <div className="px-5 py-5 border-b">
          <a href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl">🏠</span>
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
              PropCare
            </span>
          </a>
          <p className="text-xs text-muted-foreground mt-1">Meklit Tower</p>
        </div>

        {/* Role badge */}
        <div className="px-4 py-3 border-b">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${roleBadge.classes}`}
          >
            <span>{roleBadge.emoji}</span>
            {roleBadge.label}
          </span>
        </div>

        {/* Navigation — differs by role */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        {/* User info + sign out */}
        <div className="border-t px-3 py-3 space-y-2">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 text-xs font-semibold">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <form action={signOut}>
            <Button
              variant="ghost"
              size="sm"
              type="submit"
              className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      {/* ── Mobile top header ── */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between border-b bg-background px-4 h-14">
        <div className="flex items-center gap-2">
          <a href="/dashboard" className="flex items-center gap-1.5 font-bold">
            <span>🏠</span>
            <span className="text-emerald-700 dark:text-emerald-400">PropCare</span>
          </a>
          <span
            className={`hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge.classes}`}
          >
            {roleBadge.emoji} {roleBadge.label}
          </span>
        </div>
        <nav className="flex items-center gap-1">
          <a
            href="/dashboard"
            className="rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Overview
          </a>
          <a
            href="/dashboard/maintenance"
            className="rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            {isManager ? "Requests" : "My Requests"}
          </a>
          {isManager && (
            <>
              <a
                href="/dashboard/meetings"
                className="rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Meetings
              </a>
              <a
                href="/dashboard/technicians"
                className="rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Technicians
              </a>
            </>
          )}
          <ThemeToggle />
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit" className="h-8 px-2">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </nav>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0">
        <main className="px-6 py-8 pt-20 md:pt-8 max-w-6xl">{children}</main>
      </div>
    </div>
  );
}
