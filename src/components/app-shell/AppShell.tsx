import React, { useEffect, useRef } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { AppBreadcrumbs } from "./Breadcrumbs";
import { BreadcrumbProvider } from "./breadcrumb-context";
import { SidebarProvider, useSidebar } from "./sidebar-context";
import { useProfile } from "@/hooks/useProfile";
import { useRoutePersistence } from "@/hooks/useRoutePersistence";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// Constants for inactivity tracking
const INACTIVITY_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const MIN_IDLE_DURATION_MS = 5 * 60 * 1000; // Minimum 5 minutes to prevent false positives
const MAX_IDLE_DURATION_MS = 24 * 60 * 60 * 1000; // Maximum 24 hours to ignore stale timestamps
const LAST_HIDDEN_STORAGE_KEY = "visionm_last_tab_hidden";
const HAS_REFRESHED_STORAGE_KEY = "visionm_has_refreshed_after_idle";
const PAGE_LOAD_TIME_KEY = "visionm_page_load_time";

const AppShellContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { sessionReady, user, error } = useProfile();
  const isMobile = useIsMobile();
  const { isOpen, toggleSidebar } = useSidebar();
  
  // Use refs to persist across remounts
  const visibilityChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);

  // Show error toast if session restore fails (but suppress soft profile timeouts)
  useEffect(() => {
    if (!sessionReady || !error) return;

    const isProfileTimeout =
      error.includes("Profile fetch timeout after 8 seconds") ||
      error.includes("Profile fetch safety timeout after 10 seconds");

    if (isProfileTimeout) {
      // Treat profile timeouts as soft warnings: keep state, no user-facing toast
      return;
    }

    toast({
      title: "Session Error",
      description: error,
      variant: "destructive",
    });
  }, [sessionReady, error, toast]);

  // Restore route after session is ready and user is authenticated
  useRoutePersistence(sessionReady, user);

  // Track actual user activity and perform a single controlled refresh after long inactivity
  useEffect(() => {
    // Store page load time on mount
    const pageLoadTime = Date.now();
    const ACTIVITY_TIME_KEY = "visionm_last_user_activity";
    
    try {
      const storedLoadTime = sessionStorage.getItem(PAGE_LOAD_TIME_KEY);
      if (!storedLoadTime) {
        sessionStorage.setItem(PAGE_LOAD_TIME_KEY, pageLoadTime.toString());
      }
      
      // Initialize activity time on page load
      sessionStorage.setItem(ACTIVITY_TIME_KEY, pageLoadTime.toString());
    } catch (error) {
      // Ignore storage errors
    }

    // Track user activity - update timestamp on any user interaction
    const updateActivityTime = () => {
      try {
        sessionStorage.setItem(ACTIVITY_TIME_KEY, Date.now().toString());
        // Allow future refreshes after new activity
        sessionStorage.setItem(HAS_REFRESHED_STORAGE_KEY, "false");
      } catch (error) {
        // Ignore storage errors
      }
    };

    // Any user interaction should reset inactivity and cancel pending refresh
    const handleUserActivity = () => {
      updateActivityTime();
      // Cancel any scheduled refresh when user is actively interacting
      if (visibilityChangeTimeoutRef.current) {
        clearTimeout(visibilityChangeTimeoutRef.current);
        visibilityChangeTimeoutRef.current = null;
      }
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'keypress', 'scroll', 'touchstart', 'click', 'focus'];
    activityEvents.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    // When the tab becomes visible again, check if we've been idle long enough
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      try {
        const refreshedFlag = sessionStorage.getItem(HAS_REFRESHED_STORAGE_KEY);
        if (refreshedFlag === "true") {
          return;
        }

        const lastActivityStr = sessionStorage.getItem(ACTIVITY_TIME_KEY);
        if (!lastActivityStr) {
          sessionStorage.setItem(ACTIVITY_TIME_KEY, Date.now().toString());
          return;
        }

        const lastActivityTime = parseInt(lastActivityStr, 10);
        const pageLoadTimestamp = sessionStorage.getItem(PAGE_LOAD_TIME_KEY);

        // Ignore if timestamp is from previous session
        if (pageLoadTimestamp && lastActivityTime < parseInt(pageLoadTimestamp, 10)) {
          sessionStorage.setItem(ACTIVITY_TIME_KEY, Date.now().toString());
          return;
        }

        const inactivityDuration = Date.now() - lastActivityTime;

        // Only consider refresh after a long idle window
        if (
          inactivityDuration < INACTIVITY_THRESHOLD_MS ||
          inactivityDuration > MAX_IDLE_DURATION_MS
        ) {
          return;
        }

        // Schedule a controlled refresh after a short grace period.
        // Any user activity during this window cancels the refresh.
        if (visibilityChangeTimeoutRef.current) {
          clearTimeout(visibilityChangeTimeoutRef.current);
        }

        visibilityChangeTimeoutRef.current = setTimeout(() => {
          try {
            const refreshed = sessionStorage.getItem(HAS_REFRESHED_STORAGE_KEY);
            if (refreshed === "true") {
              return;
            }

            const latestActivityStr = sessionStorage.getItem(ACTIVITY_TIME_KEY);
            if (!latestActivityStr) return;

            const latestActivityTime = parseInt(latestActivityStr, 10);
            const latestInactivity = Date.now() - latestActivityTime;

            // If there has been recent activity since scheduling, skip refresh
            if (
              latestInactivity < INACTIVITY_THRESHOLD_MS ||
              latestInactivity > MAX_IDLE_DURATION_MS
            ) {
              return;
            }

            console.log("[AppShell] REFRESH TRIGGERED after long inactivity (visibilitychange)");
            sessionStorage.setItem(HAS_REFRESHED_STORAGE_KEY, "true");
            // window.location.reload();
            console.log("[AppShell] Inactivity detected — no reload");

          } catch (error) {
            console.error("[AppShell] Error during inactivity refresh:", error);
          } finally {
            visibilityChangeTimeoutRef.current = null;
          }
        }, 5000); // 5s grace period
      } catch (error) {
        console.error("[AppShell] Error in visibility change handler:", error);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (visibilityChangeTimeoutRef.current) {
        clearTimeout(visibilityChangeTimeoutRef.current);
      }
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []); // Constants are defined outside component, no need to include them

  // This component only renders when sessionReady && user (gated by ProtectedRoutes)
  // So we can safely render the UI here
  return (
    <div className="min-h-screen flex flex-col bg-background transition-colors duration-300 ease-in-out">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden relative transition-colors duration-300 ease-in-out">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <div
            className={cn(
              "transition-all duration-300 ease-in-out overflow-hidden border-r bg-background",
              "shadow-sm dark:shadow-none",
              isOpen ? "w-64" : "w-16"
            )}
          >
            <AppSidebar />
          </div>
        )}

        {/* Mobile Sidebar Overlay */}
        {isMobile && isOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={toggleSidebar}
              aria-hidden="true"
            />
            <div className="fixed left-0 top-16 bottom-0 z-50 w-64 border-r bg-background">
              <AppSidebar onNavigate={toggleSidebar} />
            </div>
          </>
        )}

        {/* Main Content */}
        <main
          className={cn(
            "flex-1 overflow-y-auto transition-colors duration-300 ease-in-out"
          )}
        >
          <div className="container mx-auto px-4 py-6 max-w-7xl">
            <AppBreadcrumbs className="mb-3" />
            <Outlet />
          </div>
        </main>
      </div>
      <footer className="border-t bg-background py-4 transition-colors duration-300 ease-in-out">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} VisionM. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export const AppShell = () => {
  return (
    <BreadcrumbProvider>
      <SidebarProvider>
        <AppShellContent />
      </SidebarProvider>
    </BreadcrumbProvider>
  );
};

