import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const ROUTE_STORAGE_KEY = "visionm_last_route";

/**
 * Hook to persist and restore the current route on page refresh
 * Saves route to localStorage and restores it after session hydration
 * Only works when user is authenticated
 */
export const useRoutePersistence = (isSessionReady: boolean, user: any) => {
  const location = useLocation();
  const navigate = useNavigate();
  const hasRestored = useRef(false);
  const initialRoute = useRef<string | null>(null);
  const lastNavigationTime = useRef<number>(0);
  const isNavigatingRef = useRef(false);

  // Capture initial route on mount (before any saves happen)
  useEffect(() => {
    if (initialRoute.current === null) {
      initialRoute.current = location.pathname + location.search;
    }
  }, []);

  // Save route to localStorage on navigation changes (only for app routes)
  // Only save AFTER we've restored (to avoid overwriting saved route during initial load)
  // Only save when user is authenticated
  useEffect(() => {
    // Only save if we've already restored (session is ready and restore has happened) and user is authenticated
    if (isSessionReady && user && hasRestored.current) {
      const isAppRoute = location.pathname.startsWith("/dashboard") || 
                        location.pathname.startsWith("/account") ||
                        location.pathname.startsWith("/dataset") ||
                        location.pathname.startsWith("/project") ||
                        location.pathname.startsWith("/annotation");
      
      if (isAppRoute && location.pathname !== "/auth") {
        try {
          localStorage.setItem(ROUTE_STORAGE_KEY, location.pathname + location.search);
        } catch (error) {
          console.warn("Failed to save route to localStorage:", error);
        }
      }
    }
  }, [location.pathname, location.search, isSessionReady, user]);

  // Restore route after session is ready and user is authenticated (only once)
  useEffect(() => {
    if (!isSessionReady || !user || hasRestored.current) return;

    try {
      const savedRoute = localStorage.getItem(ROUTE_STORAGE_KEY);
      const currentRoute = location.pathname + location.search;
      
      // If no saved route exists, save the current route (user's first visit or cleared storage)
      if (!savedRoute) {
        const isAppRoute = location.pathname.startsWith("/dashboard") || 
                          location.pathname.startsWith("/account") ||
                          location.pathname.startsWith("/dataset") ||
                          location.pathname.startsWith("/annotation");
        
        if (isAppRoute && location.pathname !== "/auth") {
          try {
            localStorage.setItem(ROUTE_STORAGE_KEY, currentRoute);
            hasRestored.current = true;
            return;
          } catch (error) {
            console.warn("Failed to save initial route:", error);
          }
        }
        hasRestored.current = true;
        return;
      }
      
      // Early exit if routes already match - prevents unnecessary navigation
      if (savedRoute === currentRoute) {
        hasRestored.current = true;
        return;
      }
      
      // Always restore if we have a saved route that's different from current
      // This handles the case where user refreshes on a sub-route
      if (savedRoute !== currentRoute) {
        // Validate that saved route is a valid app route
        const isSavedRouteValid = 
          savedRoute.startsWith("/dashboard") || 
          savedRoute.startsWith("/account") || 
          savedRoute.startsWith("/dataset") ||
          savedRoute.startsWith("/project") ||
          savedRoute.startsWith("/annotation");
        
        // Check if current route is a default/landing route that should be replaced
        const isDefaultRoute = 
          location.pathname === "/dashboard" || 
          location.pathname === "/" ||
          location.pathname === "/auth";
        
        // Check if current route is a valid app route
        const isCurrentRouteValid = 
          location.pathname.startsWith("/dashboard") || 
          location.pathname.startsWith("/account") || 
          location.pathname.startsWith("/dataset") ||
          location.pathname.startsWith("/project") ||
          location.pathname.startsWith("/annotation");
        
        // Restore if saved route is valid and different from current
        // This handles all cases:
        // - User refreshes on /dashboard/projects → stays on /dashboard/projects (routes match, no restore needed)
        // - User refreshes but React Router redirects to /dashboard → restore to /dashboard/projects
        // - User is on default route but has saved route → restore to saved route
        if (isSavedRouteValid) {
          console.log("[RoutePersistence] Checking route restore:", { 
            savedRoute, 
            currentRoute, 
            isDefaultRoute, 
            isCurrentRouteValid,
            shouldRestore: isDefaultRoute || !isCurrentRouteValid || savedRoute !== currentRoute
          });
          
          // Restore if:
          // 1. We're on a default route (should always restore)
          // 2. Current route is not valid (might have been redirected)
          // 3. Saved route is different from current (user was on different route)
          if (isDefaultRoute || !isCurrentRouteValid || savedRoute !== currentRoute) {
            // Double-check route equality to prevent loops
            const normalizedSaved = savedRoute.split('?')[0];
            const normalizedCurrent = currentRoute.split('?')[0];
            if (normalizedSaved === normalizedCurrent) {
              // Routes are the same (only query params differ) - no navigation needed
              hasRestored.current = true;
              return;
            }
            
            // Debounce navigation to prevent rapid navigations (increased from 1s to 2s)
            const now = Date.now();
            if (now - lastNavigationTime.current < 2000 || isNavigatingRef.current) {
              // Skip if navigation happened recently or is in progress
              hasRestored.current = true;
              return;
            }
            
            lastNavigationTime.current = now;
            isNavigatingRef.current = true;
            hasRestored.current = true;
            
            // Use setTimeout to ensure navigation happens after current render cycle
            setTimeout(() => {
              // Final check before navigation to prevent loops
              const finalCurrentRoute = location.pathname + location.search;
              if (finalCurrentRoute !== savedRoute) {
                navigate(savedRoute, { replace: true });
              }
              isNavigatingRef.current = false;
            }, 0);
          } else {
            // Already on the correct route
            hasRestored.current = true;
          }
        } else {
          // Saved route is not valid, mark as restored
          hasRestored.current = true;
        }
      } else {
        // Routes match or no saved route - mark as restored
        hasRestored.current = true;
      }
    } catch (error) {
      console.warn("Failed to restore route from localStorage:", error);
      hasRestored.current = true;
    }
  }, [isSessionReady, user, location.pathname, location.search, navigate]);

  return null;
};

