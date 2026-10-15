import React from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { PageHeader } from "@/components/pages/PageHeader";
import { LoadingState } from "@/components/pages/LoadingState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isSuperadmin } from "@/lib/utils/superadmin";
import { AdminOverviewTab } from "@/components/admin/AdminOverviewTab";
import { AdminUsersTab } from "@/components/admin/AdminUsersTab";
import { AdminCompaniesTab } from "@/components/admin/AdminCompaniesTab";
import { AdminRevenueTab } from "@/components/admin/AdminRevenueTab";
import { AdminJobsTab } from "@/components/admin/AdminJobsTab";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "users", label: "Users" },
  { value: "companies", label: "Companies" },
  { value: "revenue", label: "Revenue" },
  { value: "jobs", label: "Jobs & activity" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

/**
 * Superadmin panel (GSN platform admin only). Everything here is also checked by
 * the backend (/api/admin requires the superadmin), so hiding the page is not the
 * only protection.
 */
export const AdminPage: React.FC = () => {
  const { sessionReady, loading, user, profile, userRole, company } = useProfile();
  const [searchParams, setSearchParams] = useSearchParams();

  if (!sessionReady || loading) return <LoadingState message="Loading..." />;
  if (!user) return null; // ProtectedRoutes redirects to sign-in
  // The profile (role + company) can arrive after loading ends; decide only once it's here
  if (!profile || (profile.company_id && !company)) return <LoadingState message="Loading..." />;
  if (!isSuperadmin(userRole, company?.name)) return <Navigate to="/dashboard" replace />;

  const requested = searchParams.get("tab");
  const tab: TabValue = TABS.some((t) => t.value === requested) ? (requested as TabValue) : "overview";

  return (
    <div>
      <PageHeader title="Superadmin" description="Every company, user, payment and job on Vision-M Studio" />

      <Tabs value={tab} onValueChange={(value) => setSearchParams({ tab: value }, { replace: true })}>
        <TabsList className="mb-6 flex h-auto flex-wrap justify-start">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <AdminOverviewTab />
        </TabsContent>
        <TabsContent value="users">
          <AdminUsersTab />
        </TabsContent>
        <TabsContent value="companies">
          <AdminCompaniesTab />
        </TabsContent>
        <TabsContent value="revenue">
          <AdminRevenueTab />
        </TabsContent>
        <TabsContent value="jobs">
          <AdminJobsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
