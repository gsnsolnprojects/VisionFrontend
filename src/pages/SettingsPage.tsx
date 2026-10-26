import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, CreditCard, KeyRound, Keyboard, Palette, Smartphone, User, type LucideIcon } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { PageHeader } from "@/components/pages/PageHeader";
import { LoadingState } from "@/components/pages/LoadingState";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { PasswordSettings } from "@/components/settings/PasswordSettings";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { CompanySettings } from "@/components/settings/CompanySettings";
import { ShortcutSettings } from "@/components/settings/ShortcutSettings";
import { SettingsBillingPage } from "@/pages/SettingsBillingPage";
import { SettingsMobileInspectPage } from "@/pages/SettingsMobileInspectPage";
import { fadeInUpVariants } from "@/utils/animations";
import { cn } from "@/lib/utils";

/**
 * One Settings page for everything: a short list on the left (a row of buttons on phones), the
 * chosen section on the right. Each section has its own address under /dashboard/settings, so
 * links such as the billing page (BILLING_ROUTE) open the right section directly.
 */

interface SectionDef {
  path: string;
  label: string;
  Icon: LucideIcon;
  group: "You" | "Company";
  gsnOnly?: boolean;
}

const BASE = "/dashboard/settings";

const SECTIONS: SectionDef[] = [
  { path: BASE, label: "My profile", Icon: User, group: "You" },
  { path: `${BASE}/password`, label: "Password", Icon: KeyRound, group: "You" },
  { path: `${BASE}/appearance`, label: "Appearance", Icon: Palette, group: "You" },
  { path: `${BASE}/shortcuts`, label: "Shortcut keys", Icon: Keyboard, group: "You", gsnOnly: true },
  { path: `${BASE}/company`, label: "Company", Icon: Building2, group: "Company" },
  { path: `${BASE}/billing`, label: "Plan & billing", Icon: CreditCard, group: "Company" },
  { path: `${BASE}/mobile-inspect`, label: "Mobile Inspect", Icon: Smartphone, group: "Company", gsnOnly: true },
];

function SectionBody({ path }: { path: string }) {
  switch (path) {
    case `${BASE}/password`:
      return <PasswordSettings />;
    case `${BASE}/appearance`:
      return <AppearanceSettings />;
    case `${BASE}/shortcuts`:
      return <ShortcutSettings />;
    case `${BASE}/company`:
      return <CompanySettings />;
    case `${BASE}/billing`:
      return (
        <SettingsSection
          title="Plan & billing"
          intro="Your company's plan, what it includes and how much of it you're using. Everyone in the company shares one plan."
        >
          <SettingsBillingPage />
        </SettingsSection>
      );
    case `${BASE}/mobile-inspect`:
      return (
        <SettingsSection title="Mobile Inspect" intro="Choose the model the Android corrosion inspect app uses.">
          <SettingsMobileInspectPage />
        </SettingsSection>
      );
    default:
      return <ProfileSettings />;
  }
}

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionReady, user, company, loading } = useProfile();

  if (!sessionReady || loading) {
    return <LoadingState message="Loading settings..." />;
  }
  if (sessionReady && !user) {
    return null; // Will be redirected by ProtectedRoutes
  }

  const isGsn = (company?.name ?? "").trim().toLowerCase() === "gsn";
  const sections = SECTIONS.filter((s) => (!s.gsnOnly || isGsn) && (s.group === "You" || company));
  const pathname = location.pathname.replace(/\/+$/, "");
  const active = sections.find((s) => s.path === pathname) ?? sections[0];

  return (
    <div>
      <PageHeader title="Settings" description="Your account, your company and your plan, all in one place." />

      <div className="grid gap-6 md:grid-cols-[220px_1fr] md:gap-8">
        <nav aria-label="Settings sections" className="min-w-0">
          {/* Phones: one scrollable row */}
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:hidden">
            {sections.map((s) => (
              <button
                key={s.path}
                onClick={() => navigate(s.path)}
                aria-current={active.path === s.path ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm",
                  active.path === s.path ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground"
                )}
              >
                <s.Icon className="h-3.5 w-3.5" />
                {s.label}
              </button>
            ))}
          </div>

          {/* Larger screens: grouped list */}
          <div className="hidden space-y-6 md:block">
            {(["You", "Company"] as const).map((group) => {
              const items = sections.filter((s) => s.group === group);
              if (!items.length) return null;
              return (
                <div key={group}>
                  <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group === "You" ? "You" : "Your company"}
                  </p>
                  <ul className="space-y-1">
                    {items.map((s) => (
                      <li key={s.path}>
                        <button
                          onClick={() => navigate(s.path)}
                          aria-current={active.path === s.path ? "page" : undefined}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                            active.path === s.path
                              ? "bg-muted font-medium text-foreground"
                              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          )}
                        >
                          <s.Icon className="h-4 w-4" />
                          {s.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </nav>

        <motion.div key={active.path} className="min-w-0" variants={fadeInUpVariants} initial="hidden" animate="visible">
          <SectionBody path={active.path} />
        </motion.div>
      </div>
    </div>
  );
};
