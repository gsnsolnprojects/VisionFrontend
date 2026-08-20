import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "@/lib/api/config";

interface BackendStatus {
  isOnline: boolean;
  isLoading: boolean;
  wasOffline: boolean; // Track if backend was previously offline (for detecting when it comes back online)
}

const POLL_INTERVAL_ONLINE_MS = 30000; // 30 seconds when online
const POLL_INTERVAL_OFFLINE_MS = 5000; // 5 seconds when offline (faster detection)
const REQUEST_TIMEOUT_MS = 3000; // 3 seconds timeout

/**
 * Hook to check backend API health status
 * Polls every 30 seconds when online, every 5 seconds when offline
 * 
 * @returns {BackendStatus} Object with isOnline (boolean), isLoading (boolean), and wasOffline (boolean)
 */
export const useBackendStatus = (): BackendStatus => {
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previousStatusRef = useRef<boolean | null>(null);

  const checkBackendHealth = async (): Promise<void> => {
    // Get API base URL from environment
    const apiBaseUrl = API_BASE_URL.trim();
    
    // If no API URL configured, consider backend offline
    if (!apiBaseUrl) {
      setIsOnline(false);
      setIsLoading(false);
      return;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);

    try {
      // Try multiple endpoints in order of preference
      // Health endpoint is at root level (not under /api), so strip /api if present
      const baseWithoutApi = apiBaseUrl.replace(/\/api\/?$/, "").replace(/\/+$/, "");
      const endpoints = [
        `${baseWithoutApi}/health`, // Try /health first (root level, not /api/health)
        `${apiBaseUrl.replace(/\/+$/, "")}/datasets?limit=1`, // Fallback to lightweight endpoint
      ];

      let success = false;

      // Try each endpoint until one succeeds
      for (const endpoint of endpoints) {
        let timeoutId: NodeJS.Timeout | null = null;
        try {
          // Create timeout controller
          timeoutId = setTimeout(() => {
            abortController.abort();
          }, REQUEST_TIMEOUT_MS);

          const response = await fetch(endpoint, {
            method: "GET",
            signal: abortController.signal,
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (timeoutId) clearTimeout(timeoutId);

          // If we get any response (even 404), backend is online
          if (response.status >= 200 && response.status < 500) {
            success = true;
            break;
          }
        } catch (error) {
          if (timeoutId) clearTimeout(timeoutId);
          // If it's an abort error, don't try next endpoint
          if (error instanceof Error && error.name === "AbortError") {
            return; // Component unmounted or new check started
          }
          // Otherwise, try next endpoint
          continue;
        }
      }

      // If all endpoints failed, try simple base URL check
      if (!success) {
        let timeoutId: NodeJS.Timeout | null = null;
        try {
          const baseUrl = apiBaseUrl.replace(/\/+$/, "");
          
          // Create timeout controller
          timeoutId = setTimeout(() => {
            abortController.abort();
          }, REQUEST_TIMEOUT_MS);

          const response = await fetch(baseUrl, {
            method: "GET",
            signal: abortController.signal,
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (timeoutId) clearTimeout(timeoutId);

          if (response.status >= 200 && response.status < 500) {
            success = true;
          }
        } catch (error) {
          if (timeoutId) clearTimeout(timeoutId);
          // Ignore errors - backend is offline
          if (error instanceof Error && error.name === "AbortError") {
            return; // Component unmounted
          }
        }
      }

      // Track previous status to detect when backend comes online
      const previousStatus = previousStatusRef.current;
      previousStatusRef.current = success;
      
      // If backend was offline and now comes online, set wasOffline flag
      if (previousStatus === false && success === true) {
        setWasOffline(true);
        // Reset the flag after a short delay (so components can react to it)
        setTimeout(() => {
          setWasOffline(false);
        }, 1000);
      }
      
      setIsOnline(success);
    } catch (error) {
      // Network error or timeout - backend is offline
      if (error instanceof Error && error.name === "AbortError") {
        return; // Component unmounted, don't update state
      }
      const previousStatus = previousStatusRef.current;
      previousStatusRef.current = false;
      setIsOnline(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial check
    checkBackendHealth();

    // Function to set up polling with dynamic interval
    const setupPolling = () => {
      // Clear existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Use shorter interval when offline, longer when online
      // Use current isOnline state value
      const pollInterval = isOnline ? POLL_INTERVAL_ONLINE_MS : POLL_INTERVAL_OFFLINE_MS;
      
      intervalRef.current = setInterval(() => {
        checkBackendHealth();
      }, pollInterval);
    };

    // Set up initial polling (will use current isOnline state)
    setupPolling();

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOnline]); // Re-setup polling when isOnline changes to adjust interval

  return { isOnline, isLoading, wasOffline };
};

