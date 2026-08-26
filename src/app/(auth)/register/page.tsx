"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { useState, useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TOWER_NAME } from "@/core/config/tower";

import { type RegisterState, register } from "./actions";

const initialState: RegisterState = {};

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(register, initialState);
  const [role, setRole] = useState<"tenant" | "manager">("tenant");

  if (state.success) {
    return (
      <Card className="shadow-lg border-border/60">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🏠</span>
            <span className="font-bold text-lg text-emerald-700 dark:text-emerald-400">
              PropCare
            </span>
          </div>
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription>{state.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login">
            <Button variant="outline" className="w-full">
              Back to sign in
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-border/60">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🏠</span>
          <span className="font-bold text-lg text-emerald-700 dark:text-emerald-400">PropCare</span>
        </div>
        <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
        <CardDescription>
          {TOWER_NAME} — maintenance powered by AI
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {state.error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              {state.error}
            </div>
          )}

          {/* Locked tower badge */}
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 px-3 py-2.5">
            <span className="text-base">🏢</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-emerald-600 dark:text-emerald-500 font-medium">Property</p>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                {TOWER_NAME}
              </p>
            </div>
            <Lock className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          </div>
          {/* Hidden field always sends the tower name */}
          <input type="hidden" name="buildingName" value={TOWER_NAME} />

          {/* Role selection */}
          <div className="flex flex-col gap-2">
            <Label>I am a…</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("tenant")}
                className={`flex flex-col items-center gap-1.5 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                  role === "tenant"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-500"
                    : "border-border text-muted-foreground hover:border-border/80"
                }`}
              >
                <span className="text-xl">🏢</span>
                Tenant
              </button>
              <button
                type="button"
                onClick={() => setRole("manager")}
                className={`flex flex-col items-center gap-1.5 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                  role === "manager"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-500"
                    : "border-border text-muted-foreground hover:border-border/80"
                }`}
              >
                <span className="text-xl">🔑</span>
                Property Manager
              </button>
            </div>
            <input type="hidden" name="role" value={role} />
          </div>

          {/* Full name */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Jane Smith"
              required
              autoComplete="name"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">
              Phone Number{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+251 91 234 5678"
              autoComplete="tel"
            />
          </div>

          {/* Unit number (tenant only) */}
          {role === "tenant" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="unitNumber">Unit Number</Label>
              <Input
                id="unitNumber"
                name="unitNumber"
                type="text"
                placeholder="e.g. 4B, 12A"
                autoComplete="off"
              />
            </div>
          )}

          {/* Password */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={6}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={isPending}
          >
            {isPending ? "Creating account..." : "Get started"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-emerald-600 hover:underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
