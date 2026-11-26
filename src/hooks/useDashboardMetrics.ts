import { useState, useEffect, useRef } from "react";
import { startOfWeek, isAfter, isWithinInterval } from "date-fns";
import { useProfile } from "@/hooks/useProfile";
import { apiUrl, getAuthHeaders } from "@/lib/api/config";
import { useBackendStatus } from "@/hooks/useBackendStatus";

interface LastPrediction {
  imagesAnalyzed: number | null;
  status: string | null;
  timestamp: string | null;
}

interface DashboardMetrics {
  activeProjects: number;
  projectsThisWeek: number;
  datasets: number;
  newDatasets: number;
  completedInferences: number;
  lastPrediction: LastPrediction | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch dashboard metrics
 * 
 * Fetches:
 * - Active Projects (from projects prop - no fetch needed)
 * - Datasets count from the API
 * - Last Prediction from backend API
 * 
 * @param projects - Array of projects (from Dashboard state)
 * @param companyId - Company ID to filter datasets
 */
export const useDashboardMetrics = (
  projects: any[],
  companyId: string | null
): DashboardMetrics => {
  const { profile, company } = useProfile();
  const { isOnline, wasOffline } = useBackendStatus();
  const [datasets, setDatasets] = useState<number>(0);
  const [newDatasets, setNewDatasets] = useState<number>(0);
  const [completedInferences, setCompletedInferences] = useState<number>(0);
  const [lastPrediction, setLastPrediction] = useState<LastPrediction | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const fetchTriggerRef = useRef<number>(0);

  // Calculate projects metrics (no fetch needed)
  const activeProjects = projects.length;
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
  const projectsThisWeek = projects.filter((project) => {
    if (!project.created_at) return false;
    const createdDate = new Date(project.created_at);
    return isAfter(createdDate, weekStart) || isWithinInterval(createdDate, {
      start: weekStart,
      end: new Date(),
    });
  }).length;

  // Fetch summary metrics from dashboard overview endpoint
  useEffect(() => {
    if (!companyId) {
      setDatasets(0);
      setNewDatasets(0);
      setCompletedInferences(0);
      setLastPrediction(null);
      setLoading(false);
      return;
    }

    // Don't fetch if backend is offline (unless it just came online)
    if (!isOnline && !wasOffline) {
      // Backend is offline and wasn't just detected as coming online
      // Keep existing data, don't show error
      return;
    }

    setLoading(true);
    setError(null);

    const fetchOverview = async () => {
      try {
        // Derive company name for the overview API
        const companyName =
          company?.name ||
          (profile as any)?.companies?.name ||
          "";

        if (!companyName) {
          setDatasets(0);
          setNewDatasets(0);
          setCompletedInferences(0);
          setLastPrediction(null);
          setLoading(false);
          return;
        }

        const headers = await getAuthHeaders();
        const params = new URLSearchParams({
          company: String(companyName),
        });
        const url = apiUrl(`/dashboard/overview?${params.toString()}`);

        const resp = await fetch(url, { headers });
        if (!resp.ok) {
          console.error("Error fetching dashboard overview:", resp.status);
          setError("Failed to load dashboard overview");
          setDatasets(0);
          setNewDatasets(0);
          setCompletedInferences(0);
          setLastPrediction(null);
          setLoading(false);
          return;
        }

        const json = await resp.json();
        const summary = json.summary || {};

        // Use trained models count for the middle card (instead of raw datasets)
        const modelsCount =
          summary.totalModels ??
          summary.modelsCount ??
          0;
        setDatasets(modelsCount);

        // We currently don't have \"new models this week\" in the summary;
        // keep this as 0 for now to avoid guessing.
        setNewDatasets(0);

        // Completed inferences across all projects (from inferenceJobsByStatus.completed)
        const inferenceByStatus = json.inferenceJobsByStatus || {};
        const completedCount =
          inferenceByStatus.completed !== undefined
            ? Number(inferenceByStatus.completed) || 0
            : 0;
        setCompletedInferences(completedCount);

        // Map lastPrediction into the local shape if present
        if (json.lastPrediction) {
          const latest = json.lastPrediction;
          setLastPrediction({
            imagesAnalyzed:
              latest.totalImages ||
              latest.imagesAnalyzed ||
              latest.imageCount ||
              null,
            status: latest.status || "completed",
            timestamp:
              latest.createdAt ||
              latest.timestamp ||
              latest.created_at ||
              null,
          });
        } else {
          setLastPrediction(null);
        }
      } catch (err) {
        console.error("Error in fetchOverview:", err);
        setError("Failed to load dashboard overview");
        setCompletedInferences(0);
        setLastPrediction(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
    // Increment trigger ref to force re-fetch when backend comes online
    fetchTriggerRef.current += 1;
  }, [companyId, company, profile, isOnline, wasOffline]);

  return {
    activeProjects,
    projectsThisWeek,
    datasets,
    newDatasets,
    completedInferences,
    lastPrediction,
    loading,
    error,
  };
};

