import { useState, useEffect, useRef, useCallback } from "react";
import * as datasetsApi from "@/lib/api/datasets";
import type { AugmentationStatus } from "@/lib/api/datasets";

const POLL_INTERVAL_MS = 4000;

export type AugmentationStatusState =
  | "not_started"
  | "running"
  | "succeeded"
  | "failed";

export interface UseAugmentationStatusResult {
  status: AugmentationStatusState;
  progress: number;
  error: string | null;
  lastUpdated: Date | null;
  isPolling: boolean;
  startPolling: (overrideDatasetId?: string) => void;
  stopPolling: () => void;
  syncFromStatus: (augStatus: AugmentationStatus | undefined, augError?: string) => void;
  resetToIdle: () => void;
}

/**
 * Hook to track augmentation status for a dataset with polling.
 * - Polls GET /api/dataset/:datasetId/status every 3-5 seconds when running
 * - Uses time-based heuristic for progress (10 at start, +5 per poll max 90, 100 on done)
 * - Stops polling on succeeded/failed or when datasetId changes
 */
export function useAugmentationStatus(datasetId: string | null): UseAugmentationStatusResult {
  const [status, setStatus] = useState<AugmentationStatusState>("not_started");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const prevDatasetIdRef = useRef<string | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const startPolling = useCallback((overrideDatasetId?: string) => {
    const id = overrideDatasetId ?? datasetId;
    if (!id) return;
    stopPolling();
    progressRef.current = 10;
    setProgress(10);
    setStatus("running");
    setIsPolling(true);
    pollRef.current = window.setInterval(async () => {
      try {
        const res = await datasetsApi.fetchDatasetStatus(id);
        const augStatus = (res.augmentation_status ?? "not_started") as AugmentationStatus;
        setLastUpdated(new Date());
        setError(res.augmentation_error ?? null);

        if (augStatus === "succeeded" || augStatus === "failed") {
          setStatus(augStatus);
          setProgress(100);
          stopPolling();
        } else if (augStatus === "running") {
          setStatus("running");
          progressRef.current = Math.min(progressRef.current + 5, 90);
          setProgress(progressRef.current);
        }
      } catch (err) {
        console.error("Augmentation poll error:", err);
      }
    }, POLL_INTERVAL_MS);
  }, [datasetId, stopPolling]);

  // Sync from datasetDetails when available (e.g. initial load or refetch)
  const syncFromStatus = useCallback((augStatus: AugmentationStatus | undefined, augError?: string) => {
    if (!augStatus) return;
    setStatus(augStatus as AugmentationStatusState);
    setError(augError ?? null);
    setLastUpdated(new Date());
    if (augStatus === "succeeded" || augStatus === "failed") {
      setProgress(100);
      stopPolling();
    } else if (augStatus === "running") {
      setProgress((p) => (p === 0 ? 10 : Math.min(p, 90)));
    }
  }, [stopPolling]);

  // Reset to idle (e.g. after user cancels augmentation) so progress UI disappears immediately
  const resetToIdle = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setIsPolling(false);
    progressRef.current = 0;
    setProgress(0);
    setStatus("not_started");
    setError(null);
    setLastUpdated(null);
  }, []);

  // Stop polling when datasetId changes
  useEffect(() => {
    if (prevDatasetIdRef.current !== null && prevDatasetIdRef.current !== datasetId) {
      stopPolling();
    }
    prevDatasetIdRef.current = datasetId;
    return () => stopPolling();
  }, [datasetId, stopPolling]);

  return {
    status,
    progress,
    error,
    lastUpdated,
    isPolling,
    startPolling,
    stopPolling,
    syncFromStatus,
    resetToIdle,
  };
}
