// src/contexts/ProfileContext.tsx
import React, { useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { auth, type AuthChangeEvent, type Session } from "@/lib/auth/authClient";
import { isUserAdmin } from "@/lib/utils/adminUtils";
import { ProfileContext, type ProfileContextType } from "./profile-context";
import { clearLastRoute } from "@/utils/routePersistence";
import type { UserRole } from "@/types/roles";
import { hasPermission as hasPermissionUtil } from "@/lib/utils/permissions";
import { apiUrl, clearAuthCache } from "@/lib/api/config";

type ProfileProviderProps = {
  children: ReactNode;
};

/** Profile + organisation of the signed-in person in one call. deactivated = the API refused them. */
async function fetchMe(accessToken: string): Promise<{ profile: any | null; company: any | null; deactivated: boolean }> {
  const res = await fetch(apiUrl("auth/me"), {
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: "include",
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 403 && /deactivated/i.test(body?.message || body?.error || "")) {
    return { profile: null, company: null, deactivated: true };
  }
  if (res.status === 403 && /profile not found/i.test(body?.message || "")) {
    return { profile: null, company: null, deactivated: false };
  }
  if (!res.ok) throw new Error(body?.message || body?.error || `Failed to load profile (HTTP ${res.status})`);
  return { profile: body.profile || null, company: body.company || null, deactivated: false };
}

export function ProfileProvider({ children }: ProfileProviderProps) {
  const isDev = import.meta.env.DEV;
  const [profile, setProfile] = useState<any | null>(null);
  const [company, setCompany] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reloadProfileInProgress = useRef(false);
  // Track in-flight profile loads so multiple callers share the same request
  const loadProfilePromiseRef = useRef<Promise<void> | null>(null);
  const lastProfileUserIdRef = useRef<string | null>(null);
  const hasInitializedProfileRef = useRef(false);

  const loadProfile = useCallback(
    async (session: any) => {
      const userId = session?.user?.id as string | undefined;

      if (!userId) {
        if (isDev) {
          console.log("[ProfileContext] No session.user.id, skipping profile fetch");
        }
          setUser(null);
          setProfile(null);
          setCompany(null);
          setIsAdmin(false);
          setLoading(false);
          lastProfileUserIdRef.current = null;
          loadProfilePromiseRef.current = null;
          return;
      }

      // If a profile load is already in flight for the same user, reuse it
      if (
        loadProfilePromiseRef.current &&
        lastProfileUserIdRef.current === userId
      ) {
        if (isDev) {
          console.log("[ProfileContext] Reusing in-flight profile load for user:", userId);
        }
        return loadProfilePromiseRef.current;
      }

      lastProfileUserIdRef.current = userId;

      const loadPromise = (async () => {
        try {
          setLoading(true);
          setError(null);

          if (isDev) {
            console.log("[ProfileContext] Fetching profile for user:", userId);
          }

        // Add timeout to profile fetch to prevent infinite hanging
        const profileTimeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error("Profile fetch timeout after 8 seconds")),
            8000
          );
        });

        // Race between the fetch and timeout
        const me = await Promise.race([fetchMe(session.access_token), profileTimeoutPromise]);

          const profileData = me.deactivated ? { is_active: false } : me.profile;

          if (!profileData) {
            if (isDev) {
              console.log("[ProfileContext] Profile not found for user:", userId);
            }
            setProfile(null);
            setCompany(null);
            setIsAdmin(false);
            setUserRole(null);
            setLoading(false);
            return;
          }

          // Enforce login access: deactivated users must not use the app
          if (profileData.is_active === false) {
            if (isDev) {
              console.log("[ProfileContext] User is deactivated (is_active=false), signing out");
            }
            try {
              sessionStorage.setItem("VISIONM_DEACTIVATED_SIGNOUT", "true");
            } catch {
              // ignore
            }
            setError("Your account has been deactivated. Please contact your administrator.");
            setUser(null);
            setProfile(null);
            setCompany(null);
            setIsAdmin(false);
            setUserRole(null);
            setLoading(false);
            await auth.signOut();
            return;
          }

          setProfile(profileData);
          setCompany(null);
          setIsAdmin(false);

          // Derive a UI role from existing profile/company data.
          // NOTE:
          // - This is intentionally conservative to avoid changing existing behavior.
          // - Once the backend exposes explicit roles (platform_admin, workspace_admin, etc.),
          //   we can map them directly here.
          let derivedRole: UserRole | null = null;

          // Prefer explicit profile.role if present.
          const rawRole = (profileData as any).role as string | undefined;
          
          // Check for new role system values first
          if (rawRole === "platform_admin" || rawRole === "workspace_admin" || 
              rawRole === "ml_engineer" || rawRole === "operator" || rawRole === "viewer") {
            derivedRole = rawRole as UserRole;
          } else if (rawRole === "admin") {
            // Legacy role - map to workspace_admin
            derivedRole = "workspace_admin";
          } else if (rawRole === "member") {
            // Legacy role - map to viewer
            derivedRole = "viewer";
          }

          if (profileData.company_id) {
            // Came with the profile from /api/auth/me
            const companyData: any = me.company;

            if (companyData) {
              setCompany(companyData);
              const adminStatus = isUserAdmin(profileData, companyData);
              setIsAdmin(adminStatus);
              setProfile({ ...profileData, companies: companyData });

              // If we don't have an explicit role yet but user is treated as admin,
              // assume workspace_admin for UI purposes (backwards compatible).
              if (!derivedRole && adminStatus) {
                derivedRole = "workspace_admin";
              }
            }
          }

          // Fallback role if still undefined: treat as viewer for UI gating.
          if (!derivedRole) {
            derivedRole = "viewer";
          }

          setUserRole(derivedRole);
          
          // Clear auth cache to ensure fresh data on next API call
          clearAuthCache();
        } catch (err: any) {
          const message = err?.message || "Failed to load profile";
          const isTimeoutError =
            message.includes("Profile fetch timeout after 8 seconds") ||
            message.includes("Profile fetch safety timeout after 10 seconds");

          // Only log real errors to console; suppress timeout errors from console.error
          if (!isTimeoutError) {
            console.error("Error loading profile:", err);
          }

          if (isTimeoutError) {
            // Soft-handle profile timeouts: keep existing profile/company/admin state
            // so the app doesn't temporarily behave as if the user has no profile.
            setError(message);
            if (isDev) {
              console.warn("[ProfileContext] Profile fetch timeout - keeping existing profile state");
            }
          } else {
            // For real errors, preserve existing behavior and clear profile-related state
            setError(message);
            setProfile(null);
            setCompany(null);
            setIsAdmin(false);
            setUserRole(null);
          }
        } finally {
          // Always ensure loading is set to false, even if something goes wrong
          // Use setTimeout to ensure this runs even if the function is stuck
          setTimeout(() => {
            setLoading(false);
            if (isDev) {
              console.log("[ProfileContext] loadProfile finally block executed, loading set to false");
            }
          }, 0);
          
          // Also set it immediately (in case setTimeout doesn't help)
          setLoading(false);
          if (isDev) {
            console.log("[ProfileContext] loadProfile completed, loading set to false");
          }
        }
      })();

      loadProfilePromiseRef.current = loadPromise;

      try {
        await loadPromise;
      } finally {
        loadProfilePromiseRef.current = null;
      }
    },
    [isDev]
  );

  useEffect(() => {
    let mounted = true;

    const hydrateSession = async () => {
      try {
        setError(null);

        const {
          data: { session },
          error: sessionError,
        } = await auth.getSession();

        if (isDev) {
          console.log("[ProfileContext] hydrateSession getSession:", {
            hasSession: !!session,
            sessionError,
          });
        }

        if (sessionError) throw sessionError;

        if (!mounted) return;

        if (!session) {
          setUser(null);
          setProfile(null);
          setCompany(null);
          setIsAdmin(false);
          setSessionReady(true);
          setLoading(false);
          setUserRole(null);
          return;
        }

        setUser(session.user);
        // Load profile and set sessionReady after completion
        // Use a safety timeout to ensure we don't hang forever, but prefer waiting for actual completion
        const loadProfilePromise = loadProfile(session);
        const safetyTimeout = new Promise<void>((resolve) => {
          setTimeout(() => {
            if (isDev) {
              console.warn("[ProfileContext] loadProfile safety timeout - setting sessionReady after 15s");
            }
            resolve();
          }, 15000); // 15 second safety timeout
        });

        try {
          // Race between profile load and safety timeout
          await Promise.race([loadProfilePromise, safetyTimeout]);
          // Set sessionReady after loadProfile completes (or timeout)
          // If profile is still loading, it will complete in background
          setSessionReady(true);
          hasInitializedProfileRef.current = true;

          if (isDev) {
            console.log("[ProfileContext] Session hydrated successfully");
          }
        } catch (profileError: any) {
          // If loadProfile throws, we still need to set sessionReady
          console.error("[ProfileContext] loadProfile threw error:", profileError);
          setSessionReady(true);
        }
      } catch (err: any) {
        console.error("Error hydrating session:", err);
        setError(err?.message || "Failed to restore session");
        setUser(null);
        setProfile(null);
        setCompany(null);
        setIsAdmin(false);
        setSessionReady(true);
        setLoading(false);
      }
    };

    hydrateSession();

    const {
      data: { subscription },
    } = auth.onAuthStateChange((event, session) => {
      // Run the work right after the callback returns, so listeners never block each other
      setTimeout(() => {
        void handleAuthChange(event, session);
      }, 0);
    });

    async function handleAuthChange(event: AuthChangeEvent, session: Session | null) {
      if (!mounted) return;

      if (isDev) {
        console.log("[ProfileContext] onAuthStateChange:", {
          event,
          hasSession: !!session,
          time: new Date().toISOString(),
        });
      }

      if (event === "SIGNED_OUT" || !session) {
        // Deactivated (is_active=false): show deactivation message
        let deactivatedSignOut = false;
        try {
          deactivatedSignOut =
            sessionStorage.getItem("VISIONM_DEACTIVATED_SIGNOUT") === "true";
          if (deactivatedSignOut) {
            sessionStorage.removeItem("VISIONM_DEACTIVATED_SIGNOUT");
          }
        } catch {
          // ignore
        }

        if (deactivatedSignOut) {
          hasInitializedProfileRef.current = false;
          setUser(null);
          setProfile(null);
          setCompany(null);
          setIsAdmin(false);
          setSessionReady(true);
          setLoading(false);
          setError("Your account has been deactivated. Please contact your administrator.");
          clearLastRoute();
          return;
        }

        // Distinguish explicit user sign-out from auto sign-out (e.g., refresh-token failure)
        let explicitSignOut = false;
        try {
          explicitSignOut =
            sessionStorage.getItem("VISIONM_EXPLICIT_SIGNOUT") === "true";
        } catch {
          // Ignore storage errors and treat as non-explicit
        }

        if (explicitSignOut) {
          // Clear marker so future sign-ins work normally
          try {
            sessionStorage.removeItem("VISIONM_EXPLICIT_SIGNOUT");
          } catch {
            // ignore
          }

          // Hard reset on explicit logout (existing behavior)
          hasInitializedProfileRef.current = false;
          setUser(null);
          setProfile(null);
          setCompany(null);
          setIsAdmin(false);
          setSessionReady(true);
          setLoading(false);
          // Clear route persistence on logout
          clearLastRoute();
        } else {
          // Graceful handling for auto sign-out / refresh-token failures
          // Keep route and avoid full app reset; prompt user to sign in again.
          hasInitializedProfileRef.current = false;
          setUser(null);
          setSessionReady(true);
          setLoading(false);
          setError("Your session expired. Please sign in again.");
        }
      } else if (event === "SIGNED_IN") {
        // 🔐 Prevent re-initialization on tab focus
        if (hasInitializedProfileRef.current) {
          if (isDev) {
            console.log("[ProfileContext] Ignoring repeated SIGNED_IN event");
          }
          return;
        }
      
        try {
          sessionStorage.removeItem("VISIONM_EXPLICIT_SIGNOUT");
        } catch (err) {
          // Ignore sessionStorage errors (e.g., in private browsing mode)
          if (isDev) {
            console.warn("[ProfileContext] Failed to remove sessionStorage item:", err);
          }
        }
      
        hasInitializedProfileRef.current = true;
        setUser(session.user);
      
        try {
          await loadProfile(session);
          setSessionReady(true);
        } catch (profileError: any) {
          console.error("[ProfileContext] loadProfile threw error in auth state change:", profileError);
          setSessionReady(true);
        }
      
      } else if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        // Re-check profile (including is_active) on token refresh so deactivated users are signed out when they focus the tab
        if (isDev) {
          console.log("[ProfileContext] Token refreshed / user updated — re-checking profile (is_active)");
        }
        setUser(session.user);
        try {
          await loadProfile(session);
        } catch (profileError: any) {
          console.error("[ProfileContext] loadProfile threw error on token refresh:", profileError);
        }
        setSessionReady(true);
      }
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value: ProfileContextType = {
    profile,
    company,
    isAdmin,
    userRole,
    hasPermission: (permission) => hasPermissionUtil(userRole, permission),
    loading,
    user,
    sessionReady,
    error,
    reloadProfile: async () => {
      // Prevent concurrent calls to avoid race conditions
      if (reloadProfileInProgress.current) {
        if (isDev) {
          console.log("[ProfileContext] reloadProfile already in progress, skipping");
        }
        return;
      }

      try {
        reloadProfileInProgress.current = true;

        const {
          data: { session },
          error: sessionError,
        } = await auth.getSession();

        // Handle errors from getSession()
        if (sessionError) {
          console.error("[ProfileContext] Error getting session in reloadProfile:", sessionError);
          setError(sessionError.message || "Failed to get session");
          return;
        }

        // If no session, silently return (existing behavior)
        if (!session) {
          if (isDev) {
            console.log("[ProfileContext] No session available for reloadProfile");
          }
          return;
        }

        // Load profile with error handling
        try {
          await loadProfile(session);
        } catch (profileError: any) {
          console.error("[ProfileContext] Error loading profile in reloadProfile:", profileError);
          setError(profileError?.message || "Failed to reload profile");
          // Don't rethrow - let the function complete gracefully
        }
      } catch (err: any) {
        console.error("[ProfileContext] Unexpected error in reloadProfile:", err);
        setError(err?.message || "Failed to reload profile");
      } finally {
        reloadProfileInProgress.current = false;
      }
    },
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}
