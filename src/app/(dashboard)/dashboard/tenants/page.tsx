import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Building2, Mail, Phone, User } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/core/database/client";
import { tenantProfiles, users, maintenanceRequests } from "@/core/database/schema";
import { createClient } from "@/core/supabase/server";
import { getTenantProfile } from "@/features/tenants";
import { count } from "drizzle-orm";

export default async function TenantsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user ? await getTenantProfile(user.id).catch(() => null) : null;
  if (profile?.role !== "manager") redirect("/dashboard");

  // Fetch all tenants with their email and open request count
  const tenantRows = await db
    .select({
      id: tenantProfiles.id,
      fullName: tenantProfiles.fullName,
      phone: tenantProfiles.phone,
      unitNumber: tenantProfiles.unitNumber,
      buildingName: tenantProfiles.buildingName,
      createdAt: tenantProfiles.createdAt,
      email: users.email,
    })
    .from(tenantProfiles)
    .innerJoin(users, eq(users.id, tenantProfiles.userId))
    .where(eq(tenantProfiles.role, "tenant"))
    .orderBy(tenantProfiles.fullName)
    .catch(() => []);

  // Fetch open request counts per tenant
  const requestCounts = await db
    .select({
      tenantId: maintenanceRequests.tenantId,
      total: count(),
    })
    .from(maintenanceRequests)
    .groupBy(maintenanceRequests.tenantId)
    .catch(() => []);

  const countMap = Object.fromEntries(
    requestCounts.map((r) => [r.tenantId, r.total]),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Tenants</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {tenantRows.length} registered tenant{tenantRows.length !== 1 ? "s" : ""} in Meklit Tower
        </p>
      </div>

      {tenantRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <div className="text-4xl mb-4">👤</div>
          <h3 className="text-base font-semibold mb-1">No tenants registered yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Tenants will appear here once they register through the PropCare portal.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {tenantRows.map((tenant) => {
            const requestCount = countMap[tenant.id] ?? 0;
            return (
              <Card key={tenant.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm truncate">{tenant.fullName}</p>
                        {requestCount > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0 font-medium">
                            {requestCount} request{requestCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{tenant.email}</span>
                        </div>

                        {tenant.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            <span>{tenant.phone}</span>
                          </div>
                        )}

                        {(tenant.unitNumber || tenant.buildingName) && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                            <span>
                              {tenant.buildingName ?? "Meklit Tower"}
                              {tenant.unitNumber ? ` · Unit ${tenant.unitNumber}` : ""}
                            </span>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground mt-2">
                        Member since{" "}
                        {new Date(tenant.createdAt).toLocaleDateString("en-US", {
                          dateStyle: "medium",
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
