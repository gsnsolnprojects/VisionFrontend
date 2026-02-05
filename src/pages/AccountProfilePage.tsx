import React, { useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/pages/PageHeader";
import { UserProfileDialog } from "@/components/UserProfileDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfile } from "@/hooks/useProfile";
import { LoadingState } from "@/components/pages/LoadingState";
import { User, Mail, Phone, Building2 } from "lucide-react";
import { fadeInUpVariants } from "@/utils/animations";

export const AccountProfilePage: React.FC = () => {
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const { profile, user, company, loading } = useProfile();

  const displayName = profile?.name || (user?.user_metadata?.name as string) || "—";
  const displayEmail = profile?.email || user?.email || "—";
  const displayPhone = profile?.phone || "—";
  const displayCompany = company?.name || (profile as any)?.companies?.name || null;
  const hasAnyInfo = displayName !== "—" || displayEmail !== "—" || displayPhone !== "—" || displayCompany;

  if (loading) {
    return <LoadingState message="Loading profile..." />;
  }

  return (
    <div>
      <PageHeader
        title="Profile"
        description="Update your personal information"
      />

      <motion.div
        className="space-y-4"
        variants={fadeInUpVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Personal information</CardTitle>
                <CardDescription>
                  Your profile details are shown below. Use Edit Profile to change them.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-0">
            {!hasAnyInfo ? (
              <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No profile information yet. Click &quot;Edit Profile&quot; to add your name, email, and phone.
                </p>
              </div>
            ) : (
              <dl className="divide-y divide-border">
                <div className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Name
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium text-foreground">
                      {displayName}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-4 py-4 last:pb-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Email
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium text-foreground break-all">
                      {displayEmail}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-4 py-4 last:pb-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Phone
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium text-foreground">
                      {displayPhone}
                    </dd>
                  </div>
                </div>
                {(displayCompany != null && displayCompany !== "") && (
                  <div className="flex items-start gap-4 py-4 last:pb-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Company
                      </dt>
                      <dd className="mt-0.5 text-sm font-medium text-foreground">
                        {displayCompany}
                      </dd>
                    </div>
                  </div>
                )}
              </dl>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={() => setShowProfileDialog(true)}>
            Edit Profile
          </Button>
        </div>
      </motion.div>

      <UserProfileDialog
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
      />
    </div>
  );
};
