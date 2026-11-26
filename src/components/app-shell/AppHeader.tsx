import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Building2, Menu, CheckCircle2, XCircle, Sun, Moon } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { PlaygroundBell } from "./PlaygroundBell";
import { JoinCompanyDialog } from "@/components/JoinCompanyDialog";
import { JoinRequestsSidePanel } from "@/components/JoinRequestsSidePanel";
import { useProfile } from "@/hooks/useProfile";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import { useTheme } from "@/hooks/useTheme";
import { countIncomingJoinRequests, getLatestInvite, getMyJoinRequest } from "@/lib/api/account";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RoleBadge } from "@/components/RoleBadge";
import { useSidebar } from "./sidebar-context";
import { usePlanAccess } from "@/contexts/plan-access-context";
import { cn } from "@/lib/utils";
import { isSuperadmin } from "@/lib/utils/superadmin";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useWorkspaceKind } from "@/lib/workspaceKind";

export const AppHeader: React.FC = () => {
  const navigate = useNavigate();
  const { profile, isAdmin, company, loading, sessionReady, hasPermission, user, userRole } = useProfile();
  const planAccess = usePlanAccess();
  // Playground workspaces, and companies previewing it before choosing a plan
  const isPlaygroundWorkspace = useWorkspaceKind() !== "standard";
  const [hasPendingJoinRequest, setHasPendingJoinRequest] = useState(false);
  const { isOnline, isLoading: backendStatusLoading } = useBackendStatus();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [showRequestsPanel, setShowRequestsPanel] = useState(false);
  // Phones: the menu is the sidebar overlay in AppShell
  const { isOpen: mobileMenuOpen, toggleSidebar: toggleMobileMenu } = useSidebar();
  const isMobile = useIsMobile();
  const lastInviteStatusRef = useRef<string | null>(null);

  // Debug admin status in development (only when session is fully initialized)
  useEffect(() => {
    if (import.meta.env.DEV && sessionReady && !loading) {
      console.log("[AppHeader] Admin Status Check:", {
        hasProfile: !!profile,
        hasCompany: !!company,
        profileEmail: profile?.email,
        companyAdminEmail: company?.admin_email,
        companyFromProfile: profile?.companies?.admin_email,
        emailsMatch: profile?.email === company?.admin_email,
        emailsMatchWithProfile: profile?.email === profile?.companies?.admin_email,
        isAdmin,
        shouldShowBell: isAdmin && profile?.email,
        shouldShowPanel: isAdmin && profile?.email,
        loading,
        sessionReady,
      });
    }
  }, [profile, company, isAdmin, loading, sessionReady]);

  // Admins: tell them when someone accepts their latest organisation invite (checked every 30 seconds;
  // the requester's approved / rejected notice is the 30-second check right below)
  useEffect(() => {
    if (!user?.id || !profile?.company_id) return;

    let cancelled = false;
    let baseline: string | null | undefined; // first look only remembers the state, no toast

    const checkInvite = async () => {
      const invite = await getLatestInvite().catch(() => null);
      if (cancelled) return;
      const key = invite ? `${invite.email}|${invite.status}` : null;
      if (baseline === undefined) {
        baseline = key;
        return;
      }
      if (!invite || key === baseline || invite.status !== "accepted") {
        baseline = key;
        return;
      }
      baseline = key;
      if (lastInviteStatusRef.current === key) return;
      lastInviteStatusRef.current = key;
      toast({
        title: "Invite accepted",
        description: `${invite.email || "The invited user"} accepted your organisation invite.`,
      });
    };

    checkInvite();
    const interval = setInterval(checkInvite, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user?.id, profile?.company_id, toast]);

  // Initial + periodic check so requester sees status change even if they weren't online at the exact moment
  useEffect(() => {
    if (!user?.id || !sessionReady || loading) return;

    let cancelled = false;
    let lastSeenStatus: string | null = null;

    const checkRequestStatus = async () => {
      try {
        const data = await getMyJoinRequest("decided");

        if (cancelled || !data) return;

        const currentStatus = data.status;
        const companyName = data.company_name as string | undefined;

        // Only notify once per status value in this session
        if (!currentStatus || currentStatus === lastSeenStatus) return;
        lastSeenStatus = currentStatus;

        if (currentStatus === "approved") {
          toast({
            title: "Request approved",
            description: companyName
              ? `Your request to join "${companyName}" has been accepted.`
              : "Your workspace join request has been accepted.",
          });
        } else if (currentStatus === "rejected") {
          toast({
            title: "Request rejected",
            description: companyName
              ? `Your request to join "${companyName}" has been rejected.`
              : "Your workspace join request has been rejected.",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Error checking join request status:", err);
      }
    };

    // Initial check
    checkRequestStatus();
    // Lightweight polling as a fallback (every 30 seconds)
    const interval = setInterval(checkRequestStatus, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user?.id, sessionReady, loading, toast]);

  // When user has no company, check if they have a pending join request (to disable Create/Join buttons)
  useEffect(() => {
    if (!user?.id || profile?.company_id || !sessionReady || loading) {
      setHasPendingJoinRequest(false);
      return;
    }

    let cancelled = false;
    getMyJoinRequest("open")
      .then((data) => {
        if (!cancelled) setHasPendingJoinRequest(!!data);
      })
      .catch(() => undefined);

    const onJoinRequestSent = () => setHasPendingJoinRequest(true);
    window.addEventListener("visionm:join-request-sent", onJoinRequestSent);

    return () => {
      cancelled = true;
      window.removeEventListener("visionm:join-request-sent", onJoinRequestSent);
    };
  }, [user?.id, profile?.company_id, sessionReady, loading]);

  // Poll for pending requests (every 30 seconds) if admin
  useEffect(() => {
    if (profile && isAdmin && profile.email) {
      fetchPendingRequestCount();
      const interval = setInterval(fetchPendingRequestCount, 30000);
      return () => clearInterval(interval);
    } else {
      setPendingRequestCount(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, isAdmin]);

  const fetchPendingRequestCount = async () => {
    if (!profile || !isAdmin || !profile.email) {
      setPendingRequestCount(0);
      return;
    }

    try {
      const count = await countIncomingJoinRequests();
      setPendingRequestCount(count || 0);
    } catch (error) {
      console.error("Error fetching pending request count:", error);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-colors duration-300 ease-in-out shadow-sm dark:shadow-none">
        {/* Playground: full width, so GSN's logo lines up with the sidebar's "Vision-M" below it */}
        <div
          className={cn(
            "flex h-16 items-center justify-between",
            isPlaygroundWorkspace ? "w-full px-5" : "container px-4"
          )}
        >
          {/* Left: Mobile Menu + Logo */}
          <div className="flex items-center gap-2">
            {/* Mobile menu button: opens / closes the sidebar overlay */}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMobileMenu}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}

            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate("/dashboard")}
            >
              {isPlaygroundWorkspace ? (
                // Playground: GSN's logo here; the sidebar names the product (Vision-M · Playground edition)
                <span className="rounded-md dark:bg-white dark:px-1">
                  <img src="/demo/gsn-logo.png" alt="GSN" className="h-10 w-auto" />
                </span>
              ) : (
                <>
                  <Building2 className="h-6 w-6 text-primary" />
                  <span className="text-xl font-bold text-primary">
                    VisionM
                    {/* Vision: square brand mark, as on the landing page */}
                    <span aria-hidden="true" className="hidden vision:inline-block ml-1 h-2 w-2 bg-[#88a530]" />
                  </span>
                </>
              )}
              {profile?.companies?.name && (
                <div className="hidden md:inline-flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center h-5 px-2 py-0.5 rounded-md border border-transparent text-xs font-medium leading-none bg-muted text-muted-foreground cursor-default">
                          {profile.companies.name}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p className="text-xs">
                          {profile.companies.description?.trim()
                            ? profile.companies.description
                            : profile.companies.name}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {userRole && <RoleBadge role={userRole} />}
                </div>
              )}
            </div>
          </div>

          {/* Center: Backend Status Indicator (superadmin only) */}
          <div className="hidden md:flex items-center gap-4" role="status" aria-live="polite">
            {!backendStatusLoading && isSuperadmin(userRole, company?.name) && (
              <div className="flex items-center gap-1.5">
                {isOnline ? (
                  <span 
                    className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400"
                    aria-label="Backend status: Online"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Backend: Online</span>
                  </span>
                ) : (
                  <span 
                    className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400"
                    aria-label="Backend status: Offline"
                  >
                    <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Backend: Offline</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {!profile?.company_id && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  disabled={hasPendingJoinRequest}
                  onClick={() => navigate("/dashboard?action=create-company")}
                >
                  Create Organisation
                </Button>
                <JoinCompanyDialog disabled={hasPendingJoinRequest} />
              </>
            )}

            {/* Icon Group */}
            <div className="flex items-center gap-1 bg-muted/30 dark:bg-muted/20 rounded-lg px-2 py-1">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="hover:bg-muted rounded-full"
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>

              {/* Playground: training updates (and join requests for the admin) */}
              {sessionReady && !loading && isPlaygroundWorkspace && profile?.email && (
                <PlaygroundBell
                  joinRequestCount={hasPermission("manageWorkspaceUsers") ? pendingRequestCount : 0}
                  onOpenJoinRequests={hasPermission("manageWorkspaceUsers") ? () => setShowRequestsPanel(true) : undefined}
                />
              )}

              {/* Notification Bell Icon - Workspace Admin Only */}
              {sessionReady && !loading && !isPlaygroundWorkspace && hasPermission("manageWorkspaceUsers") && profile?.email && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative hover:bg-muted rounded-full"
                  onClick={() => setShowRequestsPanel(true)}
                  title="Join Requests"
                >
                  <Bell className="h-5 w-5" />
                  {pendingRequestCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {pendingRequestCount}
                    </Badge>
                  )}
                </Button>
              )}

              {/* User Menu */}
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Join Requests Side Panel - Workspace Admin Only */}
      {sessionReady && !loading && hasPermission("manageWorkspaceUsers") && profile?.email && (
        <JoinRequestsSidePanel
          open={showRequestsPanel}
          onOpenChange={setShowRequestsPanel}
          adminEmail={profile.email}
          onRequestProcessed={fetchPendingRequestCount}
        />
      )}
    </>
  );
};

