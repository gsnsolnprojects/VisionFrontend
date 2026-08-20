// SimulationView.tsx
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeInUpVariants, staggerContainerVariants } from "@/utils/animations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Play, Loader2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { getAuthHeaders, API_BASE_URL } from "@/lib/api/config";
import * as datasetsApi from "@/lib/api/datasets";
import { useAugmentationStatus, type AugmentationStatusState } from "@/hooks/useAugmentationStatus";
import { ProtectedComponent } from "@/components/permissions/ProtectedComponent";
import { ModelDownloadButton } from "@/components/training/ModelDownloadButton";
import { ModelDeployButton } from "@/components/training/ModelDeployButton";
import { ModelMetricsChatbot } from "@/components/models/ModelMetricsChatbot";
import { HyperparametersChatbot } from "@/components/training/HyperparametersChatbot";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AugmentVersionNameModal } from "@/components/datasets/AugmentVersionNameModal";
import {
  saveTrainingState,
  loadTrainingState,
  clearTrainingState,
  FinalMetrics,
  HyperparametersSnapshot,
  ModelInfoSnapshot,
} from "@/utils/trainingPersistence";
import type { TrainModelType } from "@/types/training";
import * as annotationsApi from "@/lib/api/annotations";
import { mapApiRecordToAnnotation } from "@/lib/utils/mapApiAnnotation";

type TrainedModelSummary = {
  modelId: string;
  modelVersion?: string;
  modelType?: string;
  status?: string;
  datasetVersion?: string;
  datasetId?: string | null;
  metrics?: any;
  insights?: any;
  createdAt?: string;
};

interface SimulationViewProps {
  projects: any[];
  profile: any;
}

// Shared API base resolution from central config
const API_BASE: string = API_BASE_URL || "/api";

console.info("[SimulationView] API_BASE =", API_BASE);

// fallback static YOLO list (used only if base-models fetch fails)
const FALLBACK_YOLO_MODELS: Array<{
  type: "base";
  version: string;
  size: string;
  key: string;
  name: string;
}> = [
  { type: "base", version: "v8", size: "n", key: "base-v8n", name: "YOLOv8 Nano" },
  { type: "base", version: "v8", size: "s", key: "base-v8s", name: "YOLOv8 Small" },
  { type: "base", version: "v8", size: "m", key: "base-v8m", name: "YOLOv8 Medium" },
  { type: "base", version: "v8", size: "l", key: "base-v8l", name: "YOLOv8 Large" },
  { type: "base", version: "v8", size: "x", key: "base-v8x", name: "YOLOv8 XLarge" },
];

/** Offline fallback when base-models fetch fails and user selected YOLO segmentation. */
const FALLBACK_YOLO_SEG_MODELS: Array<{
  type: "base";
  version: string;
  size: string;
  key: string;
  name: string;
  modelType: string;
}> = [
  { type: "base", version: "v8", size: "n", key: "base-v8n-seg", name: "YOLOv8 Nano (Seg)", modelType: "YOLO_SEG" },
  { type: "base", version: "v8", size: "s", key: "base-v8s-seg", name: "YOLOv8 Small (Seg)", modelType: "YOLO_SEG" },
  { type: "base", version: "v8", size: "m", key: "base-v8m-seg", name: "YOLOv8 Medium (Seg)", modelType: "YOLO_SEG" },
];

/** Offline fallback when base-models fetch fails and user selected RF-DETR. */
const FALLBACK_RF_DETR_MODELS: Array<{
  type: "base";
  size: string;
  key: string;
  name: string;
  modelType: string;
}> = [
  {
    type: "base",
    size: "n",
    key: "base-rfdetr-n",
    name: "RF-DETR Nano (detection)",
    modelType: "RF_DETR",
  },
];

type BaseModelRow = {
  type?: "base" | "trained";
  key?: string;
  filename?: string;
  size?: string;
  name?: string;
  sizeMB?: number;
  label?: string;
  version?: string;
  modelId?: string;
  modelVersion?: string;
  modelType?: string;
};

function mapFallbackToBaseModelRow(
  m: { type: "base"; size: string; key: string; name: string; modelType?: string; version?: string },
  idx: number,
  prefix: string
): BaseModelRow {
  return {
    type: "base" as const,
    key: m.key ?? `${prefix}-${m.size}-${idx}`,
    size: m.size,
    name: m.name,
    label: m.name,
    version: m.version,
    modelType: m.modelType ?? "YOLO",
  };
}

function getFallbackBaseModels(selected: TrainModelType): BaseModelRow[] {
  if (selected === "RF_DETR") {
    return FALLBACK_RF_DETR_MODELS.map((m, idx) => mapFallbackToBaseModelRow(m, idx, "fallback-rfdetr"));
  }
  if (selected === "YOLO_SEG") {
    return FALLBACK_YOLO_SEG_MODELS.map((m, idx) => mapFallbackToBaseModelRow(m, idx, "fallback-seg"));
  }
  return FALLBACK_YOLO_MODELS.map((m, idx) => ({
    type: "base" as const,
    key: m.key ?? `fallback-${m.size}-${idx}`,
    size: m.size,
    name: m.name,
    label: m.name,
    version: m.version,
    modelType: "YOLO" as const,
  }));
}

function matchesSelectedTrainType(m: BaseModelRow, selected: TrainModelType): boolean {
  const mt = String(m.modelType ?? "").toUpperCase();
  if (selected === "RF_DETR") return mt === "RF_DETR";
  if (selected === "YOLO_SEG") return isSegLikelyModel(m);
  if (selected === "YOLO") return !isSegLikelyModel(m) && mt !== "RF_DETR";
  return false;
}

function isSegLikelyModel(m: {
  modelType?: string;
  name?: string;
  label?: string;
  key?: string;
  filename?: string;
}): boolean {
  const mt = String(m.modelType ?? "").toUpperCase();
  if (mt === "YOLO_SEG") return true;
  if (mt === "YOLO") return false;
  const t = `${m.name ?? ""} ${m.label ?? ""} ${m.key ?? ""} ${m.filename ?? ""}`.toLowerCase();
  return /\bseg\b|segmentation|\bsegment\b|mask|yolo.?seg|-seg/i.test(t);
}

export const SimulationView: React.FC<SimulationViewProps> = ({ projects, profile }) => {
  const { toast } = useToast();
  const { sessionReady, profile: userProfile } = useProfile();
  const navigate = useNavigate();
  
  // Get user role for permission checks
  const userRole = userProfile?.role || profile?.role;

  // selections
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [datasetList, setDatasetList] = useState<any[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [datasetDetails, setDatasetDetails] = useState<any | null>(null);

  // model selection states
  const [modelType, setModelType] = useState<TrainModelType>("YOLO");
  const [baseModels, setBaseModels] = useState<BaseModelRow[]>([]);
  // NOTE: this now stores the selected model key (for both base and trained models)
  const [selectedModelSize, setSelectedModelSize] = useState<string>(""); // key for selected model

  // defaults and hyperparams
  const [defaultParams, setDefaultParams] = useState<any | null>(null);
  const [useDefaults, setUseDefaults] = useState<boolean>(true);
  const [epochs, setEpochs] = useState<number>(100);
  const [batchSize, setBatchSize] = useState<number>(16);
  const [imgSize, setImgSize] = useState<number>(640);
  const [learningRate, setLearningRate] = useState<number>(0.01);
  const [workers, setWorkers] = useState<number>(4);
  const [augmentationPreset, setAugmentationPreset] = useState<string>("none");

  /** User-facing name for the new trained model (sent as `modelVersion` to POST /train). */
  const [trainingModelName, setTrainingModelName] = useState<string>("");
  const userEditedTrainingNameRef = useRef(false);

  // UI / loading / job state
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [loadingDatasetDetails, setLoadingDatasetDetails] = useState(false);
  const [showSimulateConfirm, setShowSimulateConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const [isSimulating, setIsSimulating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [simulationProgress, setSimulationProgress] = useState<number>(0);
  const [simulationStatus, setSimulationStatus] = useState<
    "idle" | "queued" | "running" | "completed" | "failed" | "cancelled"
  >("idle");
  const [simulationMetrics, setSimulationMetrics] = useState<any | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [epochInfo, setEpochInfo] = useState<{ current: number; total: number } | null>(null);
  const [finalMetrics, setFinalMetrics] = useState<FinalMetrics | null>(null);
  const [hyperparametersSnapshot, setHyperparametersSnapshot] = useState<HyperparametersSnapshot | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfoSnapshot | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [autoScrollLogs, setAutoScrollLogs] = useState<boolean>(true);
  const [trainedModels, setTrainedModels] = useState<TrainedModelSummary[]>([]);
  const [trainedModelsLoading, setTrainedModelsLoading] = useState(false);
  const [trainedModelsError, setTrainedModelsError] = useState<string | null>(null);
  const [expandedModelId, setExpandedModelId] = useState<string | null>(null);
  const [modelToDelete, setModelToDelete] = useState<TrainedModelSummary | null>(null);
  const [deletingModelId, setDeletingModelId] = useState<string | null>(null);
  const [showDeleteModelDialog, setShowDeleteModelDialog] = useState(false);
  // annotationMode removed - now using separate route for annotation page
  // Augmentation UI state (frontend-only; backend handles heavy lifting)
  const [showAugmentDialog, setShowAugmentDialog] = useState(false);
  const [augmentingDataset, setAugmentingDataset] = useState(false);
  const [cancellingAugmentation, setCancellingAugmentation] = useState(false);
  const [showCancelAugmentDialog, setShowCancelAugmentDialog] = useState(false);

  const {
    status: augmentationStatus,
    progress: augmentationProgress,
    error: augmentationError,
    isPolling: augmentationIsPolling,
    startPolling: startAugmentationPolling,
    stopPolling: stopAugmentationPolling,
    syncFromStatus: syncAugmentationFromStatus,
    resetToIdle: resetAugmentationToIdle,
  } = useAugmentationStatus(selectedDatasetId || null);

  // refs
  const pollIntervalRef = useRef<number | null>(null);
  const logsPollIntervalRef = useRef<number | null>(null);
  const logsAbortRef = useRef<AbortController | null>(null);
  const datasetDetailsAbortRef = useRef<AbortController | null>(null);
  const isRestoringRef = useRef<boolean>(false);
  const hasRestoredRef = useRef<boolean>(false);
  const completionToastShownRef = useRef<boolean>(false);
  const logsContainerRef = useRef<HTMLDivElement | null>(null);
  const consecutivePollingFailuresRef = useRef<number>(0);
  const backendErrorToastShownRef = useRef<boolean>(false);
  const queuedAtRef = useRef<number | null>(null);

  const COMPLETION_TOAST_PREFIX = "visionm_training_completed_toast_";

  const hasCompletionToastShown = (id: string) => {
    try {
      return localStorage.getItem(COMPLETION_TOAST_PREFIX + id) === "1";
    } catch {
      return false;
    }
  };

  const markCompletionToastShown = (id: string) => {
    try {
      localStorage.setItem(COMPLETION_TOAST_PREFIX + id, "1");
    } catch {
      // ignore storage errors
    }
  };

  // Helper function to detect network/backend errors and format user-friendly error messages
  const getBackendErrorMessage = (err: any): { title: string; description: string; isNetworkError: boolean } => {
    const errorMessage = err?.message || String(err || "Unknown error");
    const errorName = err?.name || "";

    // Detect network errors (backend offline, connection refused, etc.)
    if (
      errorName === "TypeError" ||
      errorMessage.includes("Failed to fetch") ||
      errorMessage.includes("NetworkError") ||
      errorMessage.includes("Network request failed") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ERR_NETWORK") ||
      errorMessage.includes("ERR_CONNECTION_REFUSED") ||
      errorMessage.includes("ERR_INTERNET_DISCONNECTED")
    ) {
      return {
        title: "Backend Connection Failed",
        description: "Unable to connect to the training server. The backend may be offline or unreachable. Training has been halted.",
        isNetworkError: true,
      };
    }

    // Detect timeout errors
    if (errorMessage.includes("timeout") || errorMessage.includes("Timeout")) {
      return {
        title: "Request Timeout",
        description: "The training server did not respond in time. Please check your connection and try again.",
        isNetworkError: true,
      };
    }

    // Handle HTTP status codes
    if (errorMessage.includes("500") || errorMessage.includes("Status fetch failed (500)")) {
      return {
        title: "Server Error",
        description: "The training server encountered an internal error. Please try again later or contact support.",
        isNetworkError: false,
      };
    }

    if (errorMessage.includes("503") || errorMessage.includes("Status fetch failed (503)")) {
      return {
        title: "Service Unavailable",
        description: "The training service is temporarily unavailable. Please try again later.",
        isNetworkError: false,
      };
    }

    if (errorMessage.includes("502") || errorMessage.includes("Status fetch failed (502)")) {
      return {
        title: "Bad Gateway",
        description: "The training server is experiencing connectivity issues. Please try again later.",
        isNetworkError: true,
      };
    }

    // Generic error fallback
    return {
      title: "Training Error",
      description: errorMessage.length > 100 ? `${errorMessage.substring(0, 100)}...` : errorMessage,
      isNetworkError: false,
    };
  };

  // Helper function to halt training and show error
  const haltTrainingWithError = (errorInfo: { title: string; description: string; isNetworkError: boolean }, showToast: boolean = true) => {
    // Stop polling
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (logsPollIntervalRef.current) {
      window.clearInterval(logsPollIntervalRef.current);
      logsPollIntervalRef.current = null;
    }

    // Update state to failed
    setIsSimulating(false);
    setSimulationStatus("failed");

    // Show toast notification (only once per session to avoid spam)
    if (showToast && !backendErrorToastShownRef.current) {
      toast({
        title: errorInfo.title,
        description: errorInfo.description,
        variant: "destructive",
      });
      backendErrorToastShownRef.current = true;
    }

    // Clear persisted state for network errors (backend offline)
    if (errorInfo.isNetworkError) {
      clearTrainingState();
      setJobId(null);
      setEpochInfo(null);
      setStartedAt(null);
      setCompletedAt(null);
      setFinalMetrics(null);
      setHyperparametersSnapshot(null);
      setModelInfo(null);
    }
  };

  // Sync augmentation status from datasetDetails and start polling if already running
  useEffect(() => {
    if (datasetDetails?.augmentation_status) {
      syncAugmentationFromStatus(
        datasetDetails.augmentation_status,
        datasetDetails.augmentation_error
      );
      if (datasetDetails.augmentation_status === "running" && !augmentationIsPolling) {
        startAugmentationPolling();
      }
    }
  }, [datasetDetails?.augmentation_status, datasetDetails?.augmentation_error, syncAugmentationFromStatus, augmentationIsPolling, startAugmentationPolling]);

  const augmentationHandledRef = useRef<string | null>(null);
  const prevAugmentationStatusRef = useRef<AugmentationStatusState | null>(null);
  /** Dataset ID that started the current augmentation (used for cancel so we cancel the correct job). */
  const augmentationSourceDatasetIdRef = useRef<string | null>(null);
  useEffect(() => {
    const key = `${selectedDatasetId}-${augmentationStatus}`;
    const prevStatus = prevAugmentationStatusRef.current;

    // Only show notification when transitioning from "running" to "succeeded" or "failed"
    // This prevents showing notifications when viewing already-completed datasets
    const isTransitionToSucceeded =
      prevStatus === "running" && augmentationStatus === "succeeded";
    const isTransitionToFailed =
      prevStatus === "running" && augmentationStatus === "failed";

    if (isTransitionToSucceeded) {
      if (augmentationHandledRef.current === key) return;
      augmentationHandledRef.current = key;
      augmentationSourceDatasetIdRef.current = null;
      toast({
        title: "Augmentation completed",
        description: "The dataset has been successfully augmented and replaced.",
        variant: "default",
      });
      if (selectedDatasetId && selectedProjectId) {
        stopAugmentationPolling();
        setTimeout(() => {
          void fetchDatasets(selectedProjectId);
          void fetchDatasetDetails(selectedDatasetId);
        }, 100);
      }
    } else if (isTransitionToFailed) {
      if (augmentationHandledRef.current === key) return;
      augmentationHandledRef.current = key;
      augmentationSourceDatasetIdRef.current = null;
      toast({
        title: "Augmentation failed",
        description:
          augmentationError ||
          "Dataset augmentation failed. The original dataset is unchanged.",
        variant: "destructive",
      });
    }

    // Update previous status ref
    prevAugmentationStatusRef.current = augmentationStatus;
  }, [
    augmentationStatus,
    augmentationError,
    selectedDatasetId,
    // Intentionally omit selectedProjectId / fetchDatasets / fetchDatasetDetails
    // to avoid TDZ runtime errors; this effect only cares about status transitions.
    stopAugmentationPolling,
    toast,
  ]);

  const handleCancelAugmentation = async () => {
    const datasetIdToCancel = augmentationSourceDatasetIdRef.current ?? selectedDatasetId;
    if (!datasetIdToCancel) return;
    setShowCancelAugmentDialog(false);
    setCancellingAugmentation(true);
    try {
      await datasetsApi.cancelAugmentation(datasetIdToCancel);
      augmentationSourceDatasetIdRef.current = null;
      stopAugmentationPolling();
      resetAugmentationToIdle();
      await fetchDatasetDetails(datasetIdToCancel);
      if (selectedProjectId) {
        void fetchDatasets(selectedProjectId);
      }
      toast({
        title: "Augmentation cancelled",
        description: "The augmentation process has been cancelled.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel augmentation";
      toast({
        title: "Failed to cancel augmentation",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setCancellingAugmentation(false);
    }
  };

  // Helper function to format duration from start and end timestamps
  const formatTrainingDuration = (startedAt: string | null, completedAt: string | null): string | null => {
    if (!startedAt || !completedAt) return null;
    
    try {
      const start = new Date(startedAt).getTime();
      const end = new Date(completedAt).getTime();
      const durationMs = end - start;
      
      if (durationMs < 0) return null;
      
      const seconds = Math.floor(durationMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      
      const remainingHours = hours % 24;
      const remainingMinutes = minutes % 60;
      const remainingSeconds = seconds % 60;
      
      const parts: string[] = [];
      if (days > 0) parts.push(`${days}d`);
      if (remainingHours > 0) parts.push(`${remainingHours}h`);
      if (remainingMinutes > 0) parts.push(`${remainingMinutes}m`);
      if (remainingSeconds > 0 && parts.length === 0) parts.push(`${remainingSeconds}s`);
      
      return parts.length > 0 ? parts.join(" ") : "0s";
    } catch {
      return null;
    }
  };

  const showCompletionToast = (id: string, metrics: FinalMetrics | null | undefined) => {
    if (completionToastShownRef.current) return;
    if (hasCompletionToastShown(id)) return;

    const bestEpoch = metrics?.bestEpoch;
    toast({
      title: "Training Completed Successfully",
      description:
        bestEpoch !== undefined
          ? `Model training finished with best epoch ${bestEpoch}`
          : "Model training finished successfully.",
    });

    completionToastShownRef.current = true;
    markCompletionToastShown(id);
  };

  // helper headers
  // Removed local getFetchHeaders() - using centralized getAuthHeaders() from @/lib/api/config

  // Delete a trained model by modelId using DELETE /api/models/:modelId
  const handleDeleteModel = async () => {
    if (!modelToDelete) return;
    const modelId = modelToDelete.modelId;

    setDeletingModelId(modelId);
    try {
      const url = `${API_BASE}/models/${encodeURIComponent(modelId)}`;
      const headers = await getAuthHeaders();
      const resp = await fetch(url, {
        method: "DELETE",
        headers,
      });

      if (!resp.ok) {
        let message = "Failed to delete model.";
        try {
          const body = await resp.json();
          if (body?.error) {
            message = body.error;
          } else if (resp.status === 404) {
            message = "Model not found. It may have already been deleted.";
          }
        } catch {
          if (resp.status === 404) {
            message = "Model not found. It may have already been deleted.";
          }
        }
        throw new Error(message);
      }

      // Remove model from local state so UI updates
      setTrainedModels((prev) => prev.filter((m) => m.modelId !== modelId));
      if (expandedModelId === modelId) {
        setExpandedModelId(null);
      }

      toast({
        title: "Model deleted",
        description: "Model and files deleted successfully.",
      });
    } catch (err: any) {
      console.error("[SimulationView] delete model error:", err);
      toast({
        title: "Delete failed",
        description: err?.message || "Could not delete this model.",
        variant: "destructive",
      });
    } finally {
      setDeletingModelId(null);
      setModelToDelete(null);
      setShowDeleteModelDialog(false);
    }
  };

  // --- fetch list of ready datasets for selected project ---
  const fetchDatasets = async (projectId: string) => {
    if (!projectId || !sessionReady) {
      setDatasetList([]);
      return;
    }
    setLoadingDatasets(true);
    try {
      // find project object to get its canonical name if available
      const selectedProjectObj = projects.find(
        (p) => String(p.id) === String(projectId) || String(p.name) === String(projectId)
      );
      const projectName = selectedProjectObj?.name ?? "";
      const companyName =
        (profile as any)?.companies?.name ??
        (profile as any)?.company?.name ??
        (userProfile as any)?.companies?.name ??
        (userProfile as any)?.company?.name ??
        "";

      // Backend expects company and project; also send projectId for compatibility
      const qs = new URLSearchParams({
        includeInactive: "true",
        ...(companyName ? { company: String(companyName) } : {}),
        ...(projectName ? { project: String(projectName) } : {}),
        ...(projectId ? { projectId: String(projectId) } : {}),
      });
      const url = `${API_BASE}/datasets?${qs.toString()}`;
      console.info("[fetchDatasets] url:", url, { selectedProjectObj });

      const headers = await getAuthHeaders();
      const resp = await fetch(url, { headers });

      if (!resp.ok) {
        const body = await resp.text().catch(() => "<unreadable>");
        console.warn("[fetchDatasets] non-ok response:", resp.status, body);
        if (resp.status === 404) {
          setDatasetList([]);
          return;
        }
        throw new Error(`Failed to load datasets: ${resp.status}`);
      }

      const contentType = resp.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        const text = await resp.text().catch(() => "");
        console.error("[fetchDatasets] non-json response body:", text);
        toast({
          title: "Server error",
          description: "Datasets endpoint returned non-JSON. Check server logs / network tab.",
          variant: "destructive",
        });
        setDatasetList([]);
        return;
      }

      const json = await resp.json();
      const rawList = Array.isArray(json) ? json : json.datasets ?? [];
      console.info("[fetchDatasets] raw count:", rawList.length);

      // defensive client-side filter: match dataset to selected project by any common fields
      const filtered = rawList.filter((d: any) => {
        // collect possible project-identifying fields from dataset record
        const projectFields = [
          d.project,
          d.projectId,
          d.project_id,
          d.project_uuid,
          d.projectName,
          d.project_name,
          d.company,
        ]
          .filter((v) => v !== undefined && v !== null)
          .map((v) => String(v));

        const matchesName = projectName ? projectFields.includes(String(projectName)) : false;
        const matchesId = projectId ? projectFields.includes(String(projectId)) : false;

        // If project fields are empty (server didn't include project info), accept all (server likely filtered)
        const hasProjectFields = projectFields.length > 0;

        return hasProjectFields ? (matchesName || matchesId) : true;
      });

      console.info(`[fetchDatasets] filtered -> ${filtered.length} of ${rawList.length}`);

      // normalize id to _id string for client usage and alias augmentation flags
      const normalized = filtered.map((d: any) => {
        const rawId = d._id ?? d.id ?? d.datasetId ?? d.uuid ?? d._id_str ?? "";
        return {
          ...d,
          _id: rawId !== undefined && rawId !== null ? String(rawId) : "",
          // Ensure both camelCase and snake_case are available for augmentation flags
          is_augmented: d.is_augmented ?? d.isAugmented ?? false,
          augmentation_status: d.augmentation_status ?? d.augmentationStatus,
          labelSource: d.labelSource ?? d.label_source ?? null,
        };
      });

      setDatasetList(normalized);
    } catch (err: any) {
      console.error("fetchDatasets error:", err);
      toast({
        title: "Failed to load datasets",
        description: err?.message ?? "Could not fetch datasets.",
        variant: "destructive",
      });
      setDatasetList([]);
    } finally {
      setLoadingDatasets(false);
    }
  };

  // --- fetch dataset details ---
  const fetchDatasetDetails = async (datasetId: string) => {
    if (!datasetId || !sessionReady) {
      setDatasetDetails(null);
      return;
    }
    setLoadingDatasetDetails(true);

    if (datasetDetailsAbortRef.current) {
      datasetDetailsAbortRef.current.abort();
      datasetDetailsAbortRef.current = null;
    }
    const abort = new AbortController();
    datasetDetailsAbortRef.current = abort;

    try {
      const url = `${API_BASE}/dataset/${encodeURIComponent(datasetId)}`;
      console.info("[fetchDatasetDetails] url:", url);

      const headers = await getAuthHeaders();
      const resp = await fetch(url, { headers, signal: abort.signal });

      if (!resp.ok) {
        if (resp.status === 404) {
          setDatasetDetails(null);
          return;
        }
        const text = await resp.text().catch(() => "");
        console.error("[fetchDatasetDetails] non-ok:", resp.status, text);
        throw new Error(`Failed to fetch dataset (${resp.status})`);
      }

      const contentType = resp.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        const text = await resp.text().catch(() => "");
        console.error("[fetchDatasetDetails] non-json response body:", text);
        toast({
          title: "Server error",
          description: "Dataset details endpoint returned non-JSON. Check server logs.",
          variant: "destructive",
        });
        setDatasetDetails(null);
        return;
      }

      const json = await resp.json();
      console.log("[SimulationView] fetchDatasetDetails response:", {
        datasetId,
        status: json.status,
        unlabeledImages: json.unlabeledImages,
        unlabeled_images: json.unlabeled_images,
        labeledImages: json.labeledImages,
        labeled_images: json.labeled_images,
        totalImages: json.totalImages,
        augmentation_status: json.augmentation_status,
        is_augmented: json.is_augmented,
        fullResponse: json,
      });
      setDatasetDetails(json);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("fetchDatasetDetails error:", err);
      toast({
        title: "Failed to load dataset details",
        description: err?.message ?? "Could not fetch dataset details.",
        variant: "destructive",
      });
      setDatasetDetails(null);
    } finally {
      setLoadingDatasetDetails(false);
      datasetDetailsAbortRef.current = null;
    }
  };

  // --- fetch base and trained models (YOLO) ---
  const fetchBaseModels = async () => {
    try {
      // Try to include company and project context if available
      const companyName =
        (profile as any)?.companies?.name ??
        (profile as any)?.company?.name ??
        "";

      const selectedProjectObj = projects.find(
        (p) => String(p.id) === String(selectedProjectId) || String(p.name) === String(selectedProjectId)
      );
      const projectName = selectedProjectObj?.name ?? "";

      const qs = new URLSearchParams();
      if (companyName) qs.append("company", String(companyName));
      if (projectName) qs.append("project", String(projectName));

      const url =
        qs.toString().length > 0
          ? `${API_BASE}/train/base-models?${qs.toString()}`
          : `${API_BASE}/train/base-models`;
      console.info("[fetchBaseModels] url:", url);
      const headers = await getAuthHeaders();
      const resp = await fetch(url, { headers });

      if (!resp.ok) {
        console.warn("[fetchBaseModels] non-ok:", resp.status);
        setBaseModels(getFallbackBaseModels(modelType));
        return;
      }

      const contentType = resp.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        console.warn("[fetchBaseModels] non-json response");
        setBaseModels(getFallbackBaseModels(modelType));
        return;
      }

      const json = await resp.json();

      const baseModelsRaw: any[] = Array.isArray(json.baseModels) ? json.baseModels : [];
      const trainedModelsRaw: any[] = Array.isArray(json.trainedModels) ? json.trainedModels : [];

      // ✅ Use backend key/version to keep dropdown values unique across YOLO versions
      const mappedBase = baseModelsRaw.map((m: any, idx: number) => {
        const size = m.size ?? m.sizeMB ?? m.filename ?? "";
        const version = m.version ? String(m.version) : "";
        const derivedKey = version && size ? `base-${version}${size}` : `base-${size || idx}`;
        const key = m.key ?? derivedKey;
        const name = m.name ?? m.filename ?? `model-${version}${size}`;
        return {
          type: "base" as const,
          key,
          size: size ? String(size) : undefined,
          name,
          sizeMB: m.sizeMB,
          filename: m.filename,
          label: name,
          version: version || undefined,
          modelType: m.modelType != null ? String(m.modelType) : undefined,
        };
      });

      const mappedTrained = trainedModelsRaw.map((m: any, idx: number) => {
        const key = `trained-${m.modelId ?? idx}`;
        const name = m.name ?? `Model ${m.modelVersion ?? ""}`;
        return {
          type: "trained" as const,
          key,
          name,
          modelId: m.modelId,
          modelVersion: m.modelVersion,
          modelType: m.modelType != null ? String(m.modelType) : undefined,
          label: name,
        };
      });

      const combined = [...mappedBase, ...mappedTrained];

      if (combined.length === 0) {
        setBaseModels(getFallbackBaseModels(modelType));
      } else {
        setBaseModels(combined.filter((m) => matchesSelectedTrainType(m, modelType)));
      }
    } catch (err) {
      console.error("fetchBaseModels error:", err);
      setBaseModels(getFallbackBaseModels(modelType));
    }
  };

  /** True if dataset has any saved polygon (segmentation) annotations — blocks RF-DETR training. */
  const datasetHasPolygonAnnotations = async (datasetId: string): Promise<boolean> => {
    try {
      const data = await annotationsApi.getAnnotations(datasetId);
      const list = (data.annotations ?? []).map((raw) =>
        mapApiRecordToAnnotation(raw as unknown as Record<string, unknown>)
      );
      return list.some((a) => a.polygon && a.polygon.length >= 3);
    } catch (e) {
      console.warn("[SimulationView] polygon annotation probe failed:", e);
      return false;
    }
  };

  const handleOpenTrainConfirm = async () => {
    if (modelType === "RF_DETR" && selectedDatasetId) {
      const hasPoly = await datasetHasPolygonAnnotations(selectedDatasetId);
      if (hasPoly) {
        toast({
          title: "Cannot train RF-DETR on this dataset",
          description:
            "This dataset uses polygon (segmentation) annotations. RF-DETR requires bounding-box labels. Use Box annotation mode on a bbox-only dataset version, or create a new version.",
          variant: "destructive",
        });
        return;
      }
    }
    setShowSimulateConfirm(true);
  };

  // --- fetch trained models for current company/project ---
  const fetchTrainedModels = async () => {
    try {
      const companyName =
        (profile as any)?.companies?.name ??
        (profile as any)?.company?.name ??
        "";

      const selectedProjectObj = projects.find(
        (p) => String(p.id) === String(selectedProjectId) || String(p.name) === String(selectedProjectId)
      );
      const projectName = selectedProjectObj?.name ?? "";

      if (!companyName || !projectName) {
        setTrainedModels([]);
        return;
      }

      setTrainedModelsLoading(true);
      setTrainedModelsError(null);

      const qs = new URLSearchParams({
        company: String(companyName),
        project: String(projectName),
      });
      const url = `${API_BASE}/models?${qs.toString()}`;
      console.info("[fetchTrainedModels] url:", url);

      const headers = await getAuthHeaders();
      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        throw new Error(`Failed to load trained models (${resp.status})`);
      }

      const json = await resp.json();
      const models: TrainedModelSummary[] = Array.isArray(json.models) ? json.models : [];
      setTrainedModels(models);
    } catch (err: any) {
      console.error("fetchTrainedModels error:", err);
      setTrainedModels([]);
      setTrainedModelsError(err?.message || "Failed to load trained models.");
    } finally {
      setTrainedModelsLoading(false);
    }
  };

  // --- fetch default hyperparameters for selected modelType ---
  const fetchDefaultParams = async (mType: string) => {
    try {
      const url = `${API_BASE}/train/defaults?modelType=${encodeURIComponent(mType)}`;
      console.info("[fetchDefaultParams] url:", url);
      const headers = await getAuthHeaders();
      const resp = await fetch(url, { headers });

      if (!resp.ok) {
        console.warn("[fetchDefaultParams] non-ok:", resp.status);
        setDefaultParams(null);
        return;
      }

      const contentType = resp.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        console.warn("[fetchDefaultParams] non-json response");
        setDefaultParams(null);
        return;
      }

      const json = await resp.json();
      const defs = json.defaults ?? null;
      setDefaultParams(defs);

      // Apply defaults to inputs if useDefaults is true
      if (defs) {
        if (useDefaults) {
          setEpochs(Number(defs.epochs ?? 100));
          setBatchSize(Number(defs.batchSize ?? 16));
          setImgSize(Number(defs.imgSize ?? 640));
          setLearningRate(Number(defs.learningRate ?? 0.01));
          setWorkers(Number(defs.workers ?? 4));
        }
      }
    } catch (err) {
      console.error("fetchDefaultParams error:", err);
      setDefaultParams(null);
    }
  };

  // Stable company name so we refetch when profile loads (fixes "no models" when profile was late)
  const companyNameForModels =
    (profile as any)?.companies?.name ?? (profile as any)?.company?.name ?? "";

  // when project changes, load datasets and trained models
  useEffect(() => {
    // Don't reset training state if training is active
    const isTrainingActive = isSimulating || (jobId && ["queued", "running"].includes(simulationStatus));
    
    setSelectedDatasetId("");
    setDatasetDetails(null);
    setSelectedModelSize("");
    setSimulationMetrics(null);
    
    // Only reset training-related state if training is not active
    if (!isTrainingActive) {
      setSimulationStatus("idle");
      setJobId(null);
      setSimulationProgress(0);
    }
    
    if (selectedProjectId) {
      void fetchDatasets(selectedProjectId);
      // Also refresh trained models when a valid project is selected
      void fetchTrainedModels();
    } else {
      setDatasetList([]);
      setTrainedModels([]);
    }
    // Refetch when company name becomes available (profile may load after first run)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, sessionReady, companyNameForModels]);

  // When the Trained Models card is visible but list is empty, refetch once (handles late profile or stale state)
  useEffect(() => {
    if (
      selectedProjectId &&
      selectedDatasetId &&
      trainedModels.length === 0 &&
      !trainedModelsLoading &&
      companyNameForModels
    ) {
      void fetchTrainedModels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDatasetId]);

  // when dataset changes, fetch details
  useEffect(() => {
    // Don't reset training state if training is active
    const isTrainingActive = isSimulating || (jobId && ["queued", "running"].includes(simulationStatus));
    
    setSelectedModelSize("");
    setSimulationMetrics(null);
    
    // Only reset training-related state if training is not active
    if (!isTrainingActive) {
      setSimulationStatus("idle");
      setJobId(null);
      setSimulationProgress(0);
    }
    
    if (selectedDatasetId) {
      void fetchDatasetDetails(selectedDatasetId);
    } else {
      setDatasetDetails(null);
    }
    
    // Cleanup: abort any pending dataset details request when dataset changes or component unmounts
    return () => {
      if (datasetDetailsAbortRef.current) {
        datasetDetailsAbortRef.current.abort();
        datasetDetailsAbortRef.current = null;
      }
      // Augmentation polling cleans up via useAugmentationStatus when datasetId changes
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDatasetId, sessionReady]);

  // Reset custom-name edit flag when switching dataset
  useEffect(() => {
    if (!selectedDatasetId) {
      setTrainingModelName("");
      userEditedTrainingNameRef.current = false;
      return;
    }
    userEditedTrainingNameRef.current = false;
  }, [selectedDatasetId]);

  // Default trained model name: `<dataset version>-<YYYY-MM-DD>` (until user edits)
  useEffect(() => {
    if (!selectedDatasetId || userEditedTrainingNameRef.current) return;
    const fromList = datasetList.find(
      (d) => String(d._id ?? d.id ?? d.datasetId ?? "") === String(selectedDatasetId)
    );
    const verRaw = fromList?.version ?? datasetDetails?.version;
    const base =
      verRaw != null && String(verRaw).trim() !== "" ? String(verRaw).trim() : "model";
    const stamp = new Date().toISOString().slice(0, 10);
    setTrainingModelName(`${base}-${stamp}`);
  }, [selectedDatasetId, datasetList, datasetDetails?.version]);

  // RF-DETR: augmentation presets are YOLO-only — force none
  useEffect(() => {
    if (modelType === "RF_DETR") {
      setAugmentationPreset("none");
    }
  }, [modelType]);

  const trainUsesModelPicker =
    modelType === "YOLO" || modelType === "YOLO_SEG" || modelType === "RF_DETR";

  // when modelType changes => fetch defaults and base-models
  useEffect(() => {
    void fetchDefaultParams(modelType);
    setSelectedModelSize("");

    if (trainUsesModelPicker) {
      void fetchBaseModels();
    } else {
      setBaseModels([]);
      setSelectedModelSize("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelType]);

  // if useDefaults toggled ON, apply defaultParams to inputs
  useEffect(() => {
    if (useDefaults && defaultParams) {
      setEpochs(Number(defaultParams.epochs ?? 100));
      setBatchSize(Number(defaultParams.batchSize ?? 16));
      setImgSize(Number(defaultParams.imgSize ?? 640));
      setLearningRate(Number(defaultParams.learningRate ?? 0.01));
      setWorkers(Number(defaultParams.workers ?? 4));
    }
  }, [useDefaults, defaultParams]);

  // Restore training state from localStorage on mount
  useEffect(() => {
    if (!sessionReady || hasRestoredRef.current) return;

    const restoreTrainingState = async () => {
      const savedState = loadTrainingState();
      if (!savedState || !savedState.jobId) {
        hasRestoredRef.current = true;
        return;
      }

      isRestoringRef.current = true;
      console.log("[SimulationView] Restoring training state:", savedState.jobId);

      try {
        // Fetch current status from backend
        const headers = await getAuthHeaders();
        const resp = await fetch(`${API_BASE}/train/${encodeURIComponent(savedState.jobId)}/status`, {
          headers,
        });

        if (!resp.ok) {
          // Job not found or invalid - clear persisted state
          if (resp.status === 404 || resp.status === 400) {
            console.warn("[SimulationView] Saved job not found, clearing persisted state");
            clearTrainingState();
            hasRestoredRef.current = true;
            isRestoringRef.current = false;
            consecutivePollingFailuresRef.current = 0;
            backendErrorToastShownRef.current = false;
            queuedAtRef.current = null;
            return;
          }
          // For server errors during restore, show error but don't halt (job might still exist)
          if (resp.status >= 500) {
            const errorInfo = getBackendErrorMessage(new Error(`Status fetch failed (${resp.status})`));
            console.error("[SimulationView] Server error during restore:", errorInfo);
            toast({
              title: errorInfo.title,
              description: "Unable to restore training state. " + errorInfo.description,
              variant: "destructive",
            });
            clearTrainingState();
            hasRestoredRef.current = true;
            isRestoringRef.current = false;
            consecutivePollingFailuresRef.current = 0;
            backendErrorToastShownRef.current = false;
            queuedAtRef.current = null;
            return;
          }
          throw new Error(`Status fetch failed (${resp.status})`);
        }

        const data = await resp.json();
        const status = data.status ?? "idle";

        // Restore UI state
        setJobId(savedState.jobId);
        setSimulationStatus(status);

        const progressPercent =
          data.progress?.progressPercent ??
          (() => {
            const cur = data.progress?.currentEpoch ?? 0;
            const tot = data.progress?.totalEpochs ?? 0;
            return tot ? Math.round((cur / tot) * 100) : 0;
          })();
        if (data.progress) {
          setEpochInfo({
            current: data.progress.currentEpoch ?? 0,
            total: data.progress.totalEpochs ?? 0,
          });
        }
        setSimulationProgress(progressPercent);
        setSimulationMetrics(data.metrics ?? null);
        if (data.startedAt) {
          setStartedAt(data.startedAt);
        }
        if (data.completedAt) {
          setCompletedAt(data.completedAt);
        }

        if (data.finalMetrics) {
          setFinalMetrics(data.finalMetrics as FinalMetrics);
        }
        if (data.hyperparameters) {
          setHyperparametersSnapshot(data.hyperparameters as HyperparametersSnapshot);
        }
        if (data.model) {
          const model = data.model as { modelId?: string; modelVersion?: string; downloadUrl?: string };
          setModelInfo({
            modelId: model.modelId,
            modelVersion: model.modelVersion,
            downloadUrl: model.downloadUrl,
          });
        }

        if (data.logsSummary && Array.isArray(data.logsSummary)) {
          setLogs(data.logsSummary);
        }

        // Restore selections if available
        if (savedState.projectId && !selectedProjectId) {
          setSelectedProjectId(savedState.projectId);
        }
        if (savedState.datasetId && !selectedDatasetId) {
          setSelectedDatasetId(savedState.datasetId);
        }
        if (savedState.modelType && !modelType) {
          const restored = String(savedState.modelType).toUpperCase();
          if (restored === "YOLO_SEG") setModelType("YOLO_SEG");
          else if (restored === "RF_DETR") setModelType("RF_DETR");
          else setModelType("YOLO");
        }

        // Persist latest snapshot for this job
        saveTrainingState(savedState.jobId, {
          projectId: savedState.projectId,
          datasetId: savedState.datasetId,
          modelType: data.modelType ?? savedState.modelType,
          modelSize: data.modelSize ?? savedState.modelSize,
          status,
          startedAt: data.startedAt ?? savedState.startedAt ?? null,
          completedAt: data.completedAt ?? savedState.completedAt ?? null,
          finalMetrics: (data.finalMetrics as FinalMetrics) ?? null,
          hyperparameters: (data.hyperparameters as HyperparametersSnapshot) ?? null,
          modelInfo: data.model
            ? {
                modelId: data.model.modelId,
                modelVersion: data.model.modelVersion,
                downloadUrl: data.model.downloadUrl,
              }
            : savedState.modelInfo ?? null,
        });

        // Resume polling if training is still active
        if (["queued", "running"].includes(status)) {
          setIsSimulating(true);
          startPollingJob(savedState.jobId);
          startLogsPolling(savedState.jobId);
          console.log("[SimulationView] Resumed polling for active training");
        } else if (status === "completed") {
          // Completed: show results from snapshot, no polling, no clearing
          setIsSimulating(false);
          showCompletionToast(savedState.jobId, data.finalMetrics as FinalMetrics | null | undefined);
          // Refresh trained models list to show newly completed model
          void fetchTrainedModels();
        } else {
          // Failed or cancelled - clear persisted state
          clearTrainingState();
          setIsSimulating(false);
        }
      } catch (err: any) {
        console.error("[SimulationView] Error restoring training state:", err);
        // Check if it's a network error
        const errorInfo = getBackendErrorMessage(err);
        if (errorInfo.isNetworkError) {
          toast({
            title: errorInfo.title,
            description: "Unable to restore training state. " + errorInfo.description,
            variant: "destructive",
          });
        }
        // On error, clear persisted state to avoid getting stuck
        clearTrainingState();
        setIsSimulating(false);
        consecutivePollingFailuresRef.current = 0;
        backendErrorToastShownRef.current = false;
        queuedAtRef.current = null;
      } finally {
        isRestoringRef.current = false;
        hasRestoredRef.current = true;
      }
    };

    void restoreTrainingState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionReady]);

  // cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (logsPollIntervalRef.current) {
        window.clearInterval(logsPollIntervalRef.current);
        logsPollIntervalRef.current = null;
      }
      if (logsAbortRef.current) {
        logsAbortRef.current.abort();
        logsAbortRef.current = null;
      }
      if (datasetDetailsAbortRef.current) {
        datasetDetailsAbortRef.current.abort();
        datasetDetailsAbortRef.current = null;
      }
      // Augmentation polling cleans up via useAugmentationStatus on unmount
    };
  }, []);

  // --- auto-scroll logs to bottom while user is near the bottom ---
  useEffect(() => {
    if (!autoScrollLogs) return;
    const el = logsContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logs, autoScrollLogs]);

  // --- start training: POST /api/train ---
  const startTraining = async () => {
    if (!selectedDatasetId || !modelType) {
      toast({
        title: "Missing inputs",
        description: "Select dataset and model type before starting training.",
        variant: "destructive",
      });
      return;
    }

    // Validate dataset is trainable: trainCount > 0 and status ready
    const trainCount = datasetDetails?.trainCount ?? 0;
    const status = datasetDetails?.status;
    const isReady = status === "ready" || status === "ready_to_train";
    if (trainCount <= 0) {
      toast({
        title: "Dataset has no training images",
        description: "This dataset has no training images. Add labeled images or select a different version.",
        variant: "destructive",
      });
      return;
    }
    if (!isReady) {
      toast({
        title: "Dataset not ready for training",
        description: `Dataset status is "${status ?? "unknown"}". Only datasets with status "ready" or "ready_to_train" can be used for training.`,
        variant: "destructive",
      });
      return;
    }

    const trimmedModelName = trainingModelName.trim();
    if (trimmedModelName.length > 120) {
      toast({
        title: "Model name too long",
        description: "Please use 120 characters or fewer.",
        variant: "destructive",
      });
      return;
    }

    // Prepare payload based on selected model option
    const selectedModel = baseModels.find((m) => m.key === selectedModelSize);

    if (modelType === "RF_DETR") {
      const hasPoly = await datasetHasPolygonAnnotations(selectedDatasetId);
      if (hasPoly) {
        toast({
          title: "Cannot train RF-DETR on this dataset",
          description:
            "This dataset uses polygon (segmentation) annotations. RF-DETR requires bounding-box labels. Use Box annotation mode on a bbox-only dataset version, or create a new version.",
          variant: "destructive",
        });
        return;
      }
    }

    const payload: any = {
      datasetId: selectedDatasetId,
      ...(selectedProjectId ? { projectId: selectedProjectId } : {}),
    };
    payload.augmentationPreset = modelType === "RF_DETR" ? "none" : augmentationPreset;

    if (trimmedModelName.length > 0) {
      // Backend: optional display/version string for the resulting trained model (matches list UI `modelVersion`).
      payload.modelVersion = trimmedModelName;
    }

    if (selectedModel && selectedModel.type === "trained" && selectedModel.modelId) {
      // Continue/improve an existing trained model
      payload.modelId = selectedModel.modelId;
    } else {
      // ✅ Use modelKey to disambiguate versions like v5/v8/v26
      payload.modelType = (selectedModel?.modelType as string) || modelType;
      if (selectedModel?.key) {
        payload.modelKey = selectedModel.key;
      } else if (selectedModelSize) {
        payload.modelKey = selectedModelSize;
      }
      if (modelType === "RF_DETR") {
        if (!payload.modelKey) payload.modelKey = "base-rfdetr-n";
        if (!payload.modelId) payload.modelSize = "n";
      } else if (!payload.modelKey && selectedModel?.size) {
        payload.modelSize = String(selectedModel.size);
      }
    }

    // Add hyperparameters only if user opted to customize
    if (!useDefaults) {
      payload.hyperparameters = {
        epochs,
        batchSize,
        imgSize,
        learningRate,
        workers,
      };
    }

    console.info("[startTraining] payload:", payload);
    console.log("Training with augmentation preset:", augmentationPreset);

    // Clear any existing persisted training state before starting new training
    clearTrainingState();

    setShowSimulateConfirm(false);
    setIsSimulating(true);
    setSimulationStatus("queued");
    setSimulationProgress(0);
    setSimulationMetrics(null);
    setStartedAt(null);
    setCompletedAt(null);
    setEpochInfo(null);
    setFinalMetrics(null);
    setHyperparametersSnapshot(null);
    setModelInfo(null);
    setLogs([]);

    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${API_BASE}/train`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (resp.status === 400 || resp.status === 409) {
        const json = await resp.json().catch(() => null);
        throw new Error(json?.error ?? `Server returned ${resp.status}`);
      }

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(text || `Failed to start training (${resp.status})`);
      }

      const data = await resp.json();
      const newJobId = data.jobId ?? data.job_id ?? null;
      if (!newJobId) {
        console.warn("startTraining: missing jobId in response", data);
        throw new Error("Server did not return jobId");
      }

      setJobId(newJobId);
      setSimulationStatus(data.status ?? "queued");
      
      // Reset error tracking when starting new training
      consecutivePollingFailuresRef.current = 0;
      backendErrorToastShownRef.current = false;
      queuedAtRef.current = null;
      
      // Save training state to localStorage for persistence across reloads
      saveTrainingState(newJobId, {
        projectId: selectedProjectId,
        datasetId: selectedDatasetId,
        modelType,
      });
      
      startPollingJob(newJobId);
      startLogsPolling(newJobId);
    } catch (err: any) {
      console.error("startTraining error:", err);
      toast({
        title: "Failed to start training",
        description: err?.message ?? "An unexpected error occurred.",
        variant: "destructive",
      });
      setIsSimulating(false);
      setSimulationStatus("failed");
      // Ensure no stale persisted state remains after failed start
      clearTrainingState();
    }
  };

  // --- poll job status every 3s ---
  const startPollingJob = (jobIdToPoll: string) => {
    // Prevent duplicate polling
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    const fetchStatusAndMaybeLogs = async () => {
      try {
        const headers = await getAuthHeaders();
        const resp = await fetch(`${API_BASE}/train/${encodeURIComponent(jobIdToPoll)}/status`, {
          headers,
        });
        
        if (!resp.ok) {
          // If job not found or invalid, clear persisted state
          if (resp.status === 404 || resp.status === 400) {
            console.warn("[SimulationView] Job not found or invalid during polling, clearing persisted state");
            clearTrainingState();
            if (pollIntervalRef.current) {
              window.clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            if (logsPollIntervalRef.current) {
              window.clearInterval(logsPollIntervalRef.current);
              logsPollIntervalRef.current = null;
            }
            setIsSimulating(false);
            setJobId(null);
            setSimulationStatus("idle");
            setEpochInfo(null);
            setStartedAt(null);
            consecutivePollingFailuresRef.current = 0;
            backendErrorToastShownRef.current = false;
            return;
          }
          // For server errors (500, 502, 503), increment failure counter
          if (resp.status >= 500) {
            consecutivePollingFailuresRef.current += 1;
            // Halt after 2 consecutive failures
            if (consecutivePollingFailuresRef.current >= 2) {
              const errorInfo = getBackendErrorMessage(new Error(`Status fetch failed (${resp.status})`));
              console.error(`[SimulationView] Server error ${resp.status} detected after ${consecutivePollingFailuresRef.current} consecutive failures`);
              haltTrainingWithError(errorInfo, true);
              return;
            }
          }
          throw new Error(`Status fetch failed (${resp.status})`);
        }
        
        // Reset consecutive failures counter on successful response
        consecutivePollingFailuresRef.current = 0;
        backendErrorToastShownRef.current = false;
        
        const data = await resp.json();
        const status = data.status ?? simulationStatus;
        
        // Track when status becomes "queued" and detect if stuck for too long
        const QUEUED_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
        const currentTime = Date.now();
        
        if (status === "queued") {
          // If status is "queued", track when it first became queued
          if (queuedAtRef.current === null) {
            queuedAtRef.current = currentTime;
          } else {
            // Check if it's been queued for too long
            const timeQueued = currentTime - queuedAtRef.current;
            if (timeQueued > QUEUED_TIMEOUT_MS) {
              console.error(`[SimulationView] Training stuck in "queued" status for ${Math.round(timeQueued / 1000)}s, halting`);
              const errorInfo = {
                title: "Training Worker Unavailable",
                description: "Training has been queued for more than 2 minutes without starting. The training worker may be offline or unresponsive. Please check the backend and try again.",
                isNetworkError: true,
              };
              haltTrainingWithError(errorInfo, true);
              return;
            }
          }
        } else {
          // If status changed from "queued" to something else, reset the timer
          if (queuedAtRef.current !== null && status !== "queued") {
            queuedAtRef.current = null;
          }
        }
        
        setSimulationStatus(status);

        const progressPercent =
          data.progress?.progressPercent ??
          (() => {
            const cur = data.progress?.currentEpoch ?? 0;
            const tot = data.progress?.totalEpochs ?? 0;
            return tot ? Math.round((cur / tot) * 100) : 0;
          })();
        if (data.progress) {
          setEpochInfo({
            current: data.progress.currentEpoch ?? 0,
            total: data.progress.totalEpochs ?? 0,
          });
        }
        setSimulationProgress(progressPercent);
        setSimulationMetrics(data.metrics ?? null);
        if (data.startedAt) {
          setStartedAt(data.startedAt);
        }
        if (data.completedAt) {
          setCompletedAt(data.completedAt);
        }

        if (data.finalMetrics) {
          setFinalMetrics(data.finalMetrics as FinalMetrics);
        }
        if (data.hyperparameters) {
          setHyperparametersSnapshot(data.hyperparameters as HyperparametersSnapshot);
        }
        if (data.model) {
          const model = data.model as { modelId?: string; modelVersion?: string; downloadUrl?: string };
          setModelInfo({
            modelId: model.modelId,
            modelVersion: model.modelVersion,
            downloadUrl: model.downloadUrl,
          });
        }

        if (data.logsSummary && Array.isArray(data.logsSummary)) {
          setLogs(data.logsSummary);
        }

        // Persist latest snapshot
        saveTrainingState(jobIdToPoll, {
          modelType: data.modelType,
          modelSize: data.modelSize,
          status,
          startedAt: data.startedAt ?? null,
          completedAt: data.completedAt ?? null,
          finalMetrics: (data.finalMetrics as FinalMetrics) ?? null,
          hyperparameters: (data.hyperparameters as HyperparametersSnapshot) ?? null,
          modelInfo: data.model
            ? {
                modelId: data.model.modelId,
                modelVersion: data.model.modelVersion,
                downloadUrl: data.model.downloadUrl,
              }
            : undefined,
        });

        if (["completed", "failed", "cancelled"].includes(status)) {
          if (pollIntervalRef.current) {
            window.clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          if (logsPollIntervalRef.current) {
            window.clearInterval(logsPollIntervalRef.current);
            logsPollIntervalRef.current = null;
          }
          setIsSimulating(false);
          // Reset consecutive failures counter on successful status update
          consecutivePollingFailuresRef.current = 0;
          backendErrorToastShownRef.current = false;
          // Reset queued timer when training ends
          queuedAtRef.current = null;
          if (status === "completed") {
            showCompletionToast(jobIdToPoll, data.finalMetrics as FinalMetrics | null | undefined);
            // Refresh trained models list to show newly completed model
            void fetchTrainedModels();
          } else {
            // Clear persisted training state when training fails/cancels
            clearTrainingState();
            setEpochInfo(null);
            setStartedAt(null);
            setCompletedAt(null);
            setFinalMetrics(null);
            setHyperparametersSnapshot(null);
            setModelInfo(null);
          }
        }
      } catch (err: any) {
        console.error("Polling status error:", err);
        
        // Increment consecutive failures counter
        consecutivePollingFailuresRef.current += 1;

        // If we get a 404 or 400, the job might be invalid - clear persisted state
        if (err?.message?.includes("404") || err?.message?.includes("400")) {
          console.warn("[SimulationView] Job not found or invalid, clearing persisted state");
          clearTrainingState();
          if (pollIntervalRef.current) {
            window.clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          if (logsPollIntervalRef.current) {
            window.clearInterval(logsPollIntervalRef.current);
            logsPollIntervalRef.current = null;
          }
          setIsSimulating(false);
          setJobId(null);
          setSimulationStatus("idle");
          setEpochInfo(null);
          setStartedAt(null);
          consecutivePollingFailuresRef.current = 0;
          backendErrorToastShownRef.current = false;
          queuedAtRef.current = null;
          return;
        }

        // For other errors (network, 500, etc.), check if we should halt training
        // Halt after 2 consecutive failures to avoid false positives from transient issues
        if (consecutivePollingFailuresRef.current >= 2) {
          const errorInfo = getBackendErrorMessage(err);
          console.error(`[SimulationView] Backend error detected after ${consecutivePollingFailuresRef.current} consecutive failures:`, errorInfo);
          haltTrainingWithError(errorInfo, true);
        }
      }
    };

    void fetchStatusAndMaybeLogs();
    const id = window.setInterval(() => {
      void fetchStatusAndMaybeLogs();
    }, 3000);
    pollIntervalRef.current = id as unknown as number;
  };

  // --- fetch logs for a specific job (used by logs polling) ---
  const fetchLogsForJob = async (jobIdToPoll: string, limit = 200, silent = true) => {
    if (!jobIdToPoll) return;
    if (logsAbortRef.current) {
      logsAbortRef.current.abort();
      logsAbortRef.current = null;
    }
    const abort = new AbortController();
    logsAbortRef.current = abort;
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${API_BASE}/train/${encodeURIComponent(jobIdToPoll)}/logs?limit=${limit}`, {
        headers,
        signal: abort.signal,
      });
      if (!resp.ok) throw new Error(`Failed to fetch logs (${resp.status})`);
      const json = await resp.json();
      setLogs(Array.isArray(json.logs) ? json.logs : json.logs ?? []);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("fetchLogs error:", err);
      if (!silent) {
        toast({
          title: "Failed to load logs",
          description: err?.message ?? "Could not fetch training logs.",
          variant: "destructive",
        });
      }
    } finally {
      logsAbortRef.current = null;
    }
  };

  // --- poll logs every 2–3s while training is active ---
  const startLogsPolling = (jobIdToPoll: string, intervalMs = 3000) => {
    if (!jobIdToPoll) return;
    if (logsPollIntervalRef.current) {
      window.clearInterval(logsPollIntervalRef.current);
      logsPollIntervalRef.current = null;
    }

    const tick = () => {
      void fetchLogsForJob(jobIdToPoll, 200, true);
    };

    tick(); // initial fetch immediately
    const id = window.setInterval(tick, intervalMs);
    logsPollIntervalRef.current = id as unknown as number;
  };

  // cancel job
  const cancelJob = async () => {
    if (!jobId) return;
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${API_BASE}/train/${encodeURIComponent(jobId)}/cancel`, {
        method: "POST",
        headers,
      });
      const json = await resp.json().catch(() => null);
      if (!resp.ok) {
        throw new Error(json?.error ?? `Cancel failed (${resp.status})`);
      }
      setSimulationStatus(json?.status ?? "cancelled");
      toast({ title: "Cancelled", description: "Training cancelled.", variant: "default" });
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (logsPollIntervalRef.current) {
        window.clearInterval(logsPollIntervalRef.current);
        logsPollIntervalRef.current = null;
      }
      setIsSimulating(false);
      // Reset error tracking when cancelled
      consecutivePollingFailuresRef.current = 0;
      backendErrorToastShownRef.current = false;
      queuedAtRef.current = null;
      // Clear persisted training state when cancelled
      clearTrainingState();
    } catch (err: any) {
      console.error("cancelJob error:", err);
      const errorInfo = getBackendErrorMessage(err);
      toast({
        title: "Cancel failed",
        description: errorInfo.isNetworkError ? errorInfo.description : (err?.message ?? "Could not cancel job."),
        variant: "destructive",
      });
    }
  };

  // retry job
  const retryJob = async () => {
    if (!jobId) return;
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${API_BASE}/train/${encodeURIComponent(jobId)}/retry`, {
        method: "POST",
        headers,
      });
      const json = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(json?.error ?? `Retry failed (${resp.status})`);
      const newId = json?.jobId ?? json?.job_id ?? null;
      if (!newId) throw new Error("No new job id returned from retry.");
      setJobId(newId);
      setSimulationStatus("queued");
      setIsSimulating(true);
      setSimulationProgress(0);
      
      // Reset error tracking when retrying
      consecutivePollingFailuresRef.current = 0;
      backendErrorToastShownRef.current = false;
      queuedAtRef.current = null;
      
      // Save new training state to localStorage
      saveTrainingState(newId, {
        projectId: selectedProjectId,
        datasetId: selectedDatasetId,
        modelType,
      });
      
      startPollingJob(newId);
      startLogsPolling(newId);
      toast({ title: "Retry started", description: `New job ${newId} started`, variant: "default" });
    } catch (err: any) {
      console.error("retryJob error:", err);
      const errorInfo = getBackendErrorMessage(err);
      toast({
        title: "Retry failed",
        description: errorInfo.isNetworkError ? errorInfo.description : (err?.message ?? "Could not retry job."),
        variant: "destructive",
      });
    }
  };

  // UI helpers
  const selectedProject = projects.find(
    (p) => String(p.id) === String(selectedProjectId) || String(p.name) === String(selectedProjectId)
  );
  const selectedDataset = datasetList.find((d) => d._id === selectedDatasetId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        variants={fadeInUpVariants}
        initial="hidden"
        animate="visible"
      >
        <h3 className="text-2xl font-semibold mb-2">Simulation (Training)</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Follow the training workflow: select dataset → choose model & hyperparameters → start training.
        </p>
      </motion.div>

      {/* Main Content Container */}
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-6 max-w-4xl"
      >
        {/* Project Selection - Always Visible */}
        <motion.div variants={fadeInUpVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Select Project
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex cursor-help">
                        <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="start" className="max-w-sm">
                      <p className="text-xs">
                        Choose the project that contains your datasets. Training and model selection will be scoped to this project.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
              <CardDescription>Choose project scope for datasets</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.length === 0 ? (
                    <SelectItem value="no-projects" disabled>
                      No projects available
                    </SelectItem>
                  ) : (
                    projects.map((project) => (
                      <SelectItem key={String(project.id)} value={String(project.id)}>
                        {project.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </motion.div>

        {/* Dataset Selection - Conditional on selectedProjectId */}
        <AnimatePresence mode="wait">
          {selectedProjectId && (
            <motion.div
              key="dataset-selection"
              variants={fadeInUpVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Select Dataset Version
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex cursor-help">
                            <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" className="max-w-sm">
                          <p className="text-xs">
                            Pick a dataset version that has finished processing. Ready versions can be used for training. Unlabeled = images only. Pre-Labelled = uploaded with labels. Manually Labelled = annotated in app. Augmented = created via augmentation.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </CardTitle>
                  <CardDescription>Choose a ready dataset for the selected project</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingDatasets ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading dataset versions...
                    </div>
                  ) : datasetList.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No ready datasets found for this project.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {datasetList.map((dataset, index) => {
                        const id = dataset._id ?? dataset.id ?? String(index);
                        const key = id || `dataset-${index}`;
                        return (
                          <div
                            key={key}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                              selectedDatasetId === id
                                ? "border-primary bg-primary/5"
                                : "hover:bg-muted"
                            }`}
                            onClick={() => {
                              setSelectedDatasetId(String(id));
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelectedDatasetId(String(id));
                              }
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">
                                  Version: {dataset.version ?? "unknown"}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {(dataset.trainCount != null || dataset.valCount != null || dataset.testCount != null)
                                    ? `Train: ${dataset.trainCount ?? 0}, Val: ${dataset.valCount ?? 0}, Test: ${dataset.testCount ?? 0}`
                                    : `${(dataset.totalImages ?? 0)} images`}
                                  {" • "}
                                  {new Date(
                                    dataset.createdAt ?? dataset.created_at ?? Date.now(),
                                  ).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {dataset.augmentation_status === "running" && (
                                  <Badge variant="secondary" className="text-xs animate-pulse">
                                    Augmenting…
                                  </Badge>
                                )}
                                {(!dataset.datasetType || dataset.status) && (
                                  <Badge
                                    variant={
                                      dataset.status === "ready" || dataset.status === "ready_to_train"
                                        ? "default"
                                        : dataset.status === "processing"
                                        ? "secondary"
                                        : "destructive"
                                    }
                                  >
                                    {dataset.status === "ready" || dataset.status === "ready_to_train"
                                      ? "Ready"
                                      : (dataset.status ?? "unknown")}
                                  </Badge>
                                )}
                                {/* Source badge: Unlabeled | Pre-Labelled | Manually Labeled (one of these) */}
                                {(() => {
                                  const ls = dataset.labelSource ?? dataset.label_source;
                                  let label: string | null =
                                    ls === "manually_labeled"
                                      ? "Manually Labelled"
                                      : ls === "pre_labelled"
                                        ? "Pre-Labelled"
                                        : ls === "unlabeled"
                                          ? "Unlabeled"
                                          : null;
                                  // When labelSource is missing (old datasets): for augmented, infer from source in list
                                  if (!label && dataset.is_augmented && datasetList.length > 0) {
                                    const v = dataset.augmentedFromVersion ?? dataset.augmented_from_version;
                                    const sid = dataset.backup_dataset_id ?? dataset.sourceDatasetId ?? dataset.source_dataset_id;
                                    const source = datasetList.find(
                                      (s) =>
                                        (v != null && (s.version === v || s.version === `v${v}` || String(s.version) === String(v))) ||
                                        (sid && (s._id ?? s.id ?? s.datasetId) === sid)
                                    );
                                    if (source?.status === "ready_to_train") label = "Manually Labelled";
                                    else if (source?.datasetType === "labeled" && source?.status === "ready") label = "Pre-Labelled";
                                    else if (source?.datasetType === "unlabeled" || (!source?.datasetType && source?.status === "ready")) label = "Unlabeled";
                                    else label = "Manually Labelled"; // default for augmented when source unknown (common: annotate → augment)
                                  }
                                  if (label) {
                                    return (
                                      <Badge
                                        variant="outline"
                                        className={
                                          label === "Manually Labelled"
                                            ? "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/40"
                                            : label === "Pre-Labelled"
                                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                                              : "text-xs"
                                        }
                                      >
                                        {label}
                                      </Badge>
                                    );
                                  }
                                  // Fallback for non-augmented datasets without labelSource
                                  return dataset.status === "ready_to_train" ? (
                                    <Badge
                                      variant="outline"
                                      className="bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/40"
                                    >
                                      Manually Labelled
                                    </Badge>
                                  ) : dataset.datasetType === "labeled" && dataset.status === "ready" ? (
                                    <Badge
                                      variant="outline"
                                      className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                                    >
                                      Pre-Labelled
                                    </Badge>
                                  ) : (dataset.datasetType === "unlabeled" ||
                                      (!dataset.datasetType && dataset.status === "ready")) ? (
                                    <Badge variant="outline" className="text-xs">
                                      Unlabeled
                                    </Badge>
                                  ) : null;
                                })()}
                                {dataset.is_augmented &&
                                  (dataset.augmentation_status === "succeeded" ||
                                    dataset.augmentationStatus === "succeeded") && (
                                    <Badge
                                      variant="outline"
                                      className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40"
                                    >
                                      Augmented
                                    </Badge>
                                  )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Annotate / edit labels — any ready dataset with images (unlabeled, pre-labeled, or fully labeled) */}
        {selectedDatasetId &&
          datasetDetails &&
          (() => {
            const isReady =
              datasetDetails.status === "ready" || datasetDetails.status === "ready_to_train";
            const unlabeled =
              Number(
                datasetDetails.unlabeledImagesCount ??
                  datasetDetails.unlabeledImages ??
                  datasetDetails.unlabeled_images ??
                  0
              ) || 0;
            const labeled =
              Number(datasetDetails.labeledImages ?? datasetDetails.labeled_images ?? 0) || 0;
            const totalImages =
              Number(datasetDetails.totalImages ?? 0) ||
              (unlabeled + labeled > 0 ? unlabeled + labeled : 0) ||
              Number(datasetDetails.trainCount ?? 0) +
                Number(datasetDetails.valCount ?? datasetDetails.validationCount ?? 0) +
                Number(datasetDetails.testCount ?? 0);
            const canOpenAnnotation = isReady && totalImages > 0;
            if (!canOpenAnnotation) return null;
            const label =
              unlabeled > 0 ? "Annotate Data" : "Edit annotations";
            return (
              <ProtectedComponent requiredPermission="annotateDatasets">
                <motion.div
                  key="annotation-toggle"
                  variants={fadeInUpVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex justify-end gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex">
                              <Button
                                variant="outline"
                                type="button"
                                onClick={() => {
                                  navigate(`/annotation/${selectedDatasetId}`);
                                }}
                              >
                                {label}
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-sm">
                            <p className="text-xs">
                              Open the annotation workspace for this dataset version. Pre-labeled
                              images load boxes from label files when you open each image.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    {modelType === "RF_DETR" && (
                      <p className="text-xs text-muted-foreground text-right max-w-md">
                        RF-DETR uses bounding boxes. Annotate with <strong>Box</strong> mode, then
                        Save &amp; convert (detection labels).
                      </p>
                    )}
                  </div>
                </motion.div>
              </ProtectedComponent>
            );
          })()}

        {/* Augment Dataset / Cancel Augmentation - allow for any ready dataset with all images labeled */}
        {selectedDatasetId &&
          datasetDetails && (() => {
            const unlabeledCount = datasetDetails.unlabeledImagesCount ?? datasetDetails.unlabeledImages ?? datasetDetails.unlabeled_images ?? 0;
            const isReady = datasetDetails.status === "ready" || datasetDetails.status === "ready_to_train";
            const canAugment = isReady && unlabeledCount === 0;
            const disabledReason = !canAugment
              ? unlabeledCount > 0
                ? "Complete annotation of all images before augmenting"
                : !isReady
                  ? "Dataset not ready for augmentation"
                  : undefined
              : undefined;
            return (
              <ProtectedComponent requiredPermission="annotateDatasets">
                <motion.div
                  key="augment-dataset-toggle"
                  variants={fadeInUpVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <div className="flex flex-col gap-2 mt-2">
                    {(augmentationStatus === "running" || datasetDetails.augmentation_status === "running") && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {cancellingAugmentation ? "Cancelling…" : "Augmenting dataset…"}
                          </span>
                        </div>
                        <Progress
                          value={augmentationStatus === "running" ? augmentationProgress : 100}
                          className="h-2"
                          indicatorClassName={augmentationStatus === "running" ? "progress-striped progress-animated" : undefined}
                        />
                      </div>
                    )}
                    {augmentationStatus === "succeeded" && (
                      <div className="text-sm text-green-600 dark:text-green-400">
                        Augmentation completed
                      </div>
                    )}
                    {augmentationStatus === "failed" && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-sm text-destructive cursor-help">
                              Augmentation failed
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{augmentationError || "An error occurred"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <div className="flex justify-end gap-2">
                    {(augmentationStatus === "running" || datasetDetails.augmentation_status === "running") ? (
                      <Button
                        variant="destructive"
                        type="button"
                        disabled={cancellingAugmentation}
                        onClick={() => setShowCancelAugmentDialog(true)}
                      >
                        {cancellingAugmentation ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Cancelling…
                          </>
                        ) : (
                          "Cancel Augmentation"
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        type="button"
                        disabled={!canAugment}
                        onClick={() => setShowAugmentDialog(true)}
                        title={disabledReason}
                      >
                        Augment Dataset
                      </Button>
                    )}
                    </div>
                  </div>
                </motion.div>
              </ProtectedComponent>
            );
          })()}

        {/* Training view content */}
        {(
          <>
            {/* Delete trained model confirmation dialog */}
            <Dialog open={showDeleteModelDialog} onOpenChange={setShowDeleteModelDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete trained model?</DialogTitle>
                  <DialogDescription>
                    This will permanently delete the trained model and its files. Training and
                    inference jobs that used this model will remain in history, but this model
                    will no longer be available for new training or inference.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteModelDialog(false)}
                    disabled={!!deletingModelId}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteModel}
                    disabled={!!deletingModelId}
                  >
                    {deletingModelId ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete Model"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dataset Summary + Trained Models - Conditional on selectedDatasetId */}
            <AnimatePresence mode="wait">
              {selectedDatasetId && (
                <motion.div
                  key="dataset-details"
                  variants={staggerContainerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Dataset Summary
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex cursor-help">
                          <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="start" className="max-w-sm">
                        <p className="text-xs">
                          Overview of the selected dataset: version, image counts, train/val/test split, and annotation status. This data is used for training configuration.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
                <CardDescription>Metadata fetched from GET /api/dataset/:datasetId</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingDatasetDetails ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading dataset...
                  </div>
                ) : datasetDetails ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-sm text-muted-foreground">Version</div>
                    <div className="font-medium">{datasetDetails.version}</div>

                    <div className="text-sm text-muted-foreground">Total Images</div>
                    <div className="font-medium">{datasetDetails.totalImages}</div>

                    <div className="text-sm text-muted-foreground">Labeled</div>
                    <div className="font-medium">{datasetDetails.labeledImages ?? datasetDetails.trainCount ?? 0}</div>

                    <div className="text-sm text-muted-foreground">Unlabeled</div>
                    <div className="font-medium">{datasetDetails.unlabeledImages ?? 0}</div>

                    <div className="text-sm text-muted-foreground">Train / Val / Test</div>
                    <div className="font-medium">
                      {[
                        datasetDetails.trainCount ?? 0,
                        datasetDetails.valCount ?? 0,
                        datasetDetails.testCount ?? 0,
                      ].join(" / ")}
                    </div>

                    <div className="text-sm text-muted-foreground">Status</div>
                    <div className="font-medium">
                      {datasetDetails.status === "ready" || datasetDetails.status === "ready_to_train"
                        ? "Ready"
                        : (datasetDetails.status ?? "unknown")}
                    </div>
                    {datasetDetails.annotationStatus != null && (
                      <>
                        <div className="text-sm text-muted-foreground">Annotation</div>
                        <div className="font-medium">
                          {datasetDetails.annotationStatus === "completed" ? "Completed" : "Pending"}
                        </div>
                      </>
                    )}
                    {datasetDetails.augmentation_status != null && (
                      <>
                        <div className="text-sm text-muted-foreground">Augmentation</div>
                        <div className="font-medium">
                          {datasetDetails.augmentation_status}
                          {datasetDetails.augmentation_status === "failed" && datasetDetails.augmentation_error && (
                            <span className="text-destructive text-xs block mt-1">{datasetDetails.augmentation_error}</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No dataset details available.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Trained Models
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex cursor-help">
                          <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="start" className="max-w-sm">
                        <p className="text-xs">
                          Models trained on your datasets. Each shows mAP@0.5 (mean Average Precision). You can download, deploy, or delete models from here.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
                <CardDescription>Models trained for this project</CardDescription>
              </CardHeader>
              <CardContent>
                {trainedModelsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading trained models...
                  </div>
                ) : trainedModelsError ? (
                  <div className="text-sm text-red-500">{trainedModelsError}</div>
                ) : trainedModels.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No trained models found for this project yet.</p>
                ) : (
                  <div className="space-y-2 text-sm">
                    {trainedModels.map((model) => {
                      const isExpanded = expandedModelId === model.modelId;
                      const bestM = model.metrics?.mAP50;
                      const displayName =
                        `${model.modelType ?? "Model"} - ${model.modelVersion ?? ""}`.trim() +
                        (bestM != null ? ` (mAP@0.5: ${(bestM * 100).toFixed(1)}%)` : "");
                      return (
                        <div
                          key={model.modelId}
                          className="border rounded p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              className="flex-1 text-left"
                              onClick={() =>
                                setExpandedModelId(isExpanded ? null : model.modelId)
                              }
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-medium">{displayName}</div>
                                {model.status && (
                                  <Badge
                                    variant={
                                      model.status === "completed"
                                        ? "default"
                                        : model.status === "failed"
                                        ? "destructive"
                                        : "secondary"
                                    }
                                    className="justify-center leading-none shrink-0 translate-y-px"
                                  >
                                    {model.status}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Version {model.modelVersion ?? "?"} •{" "}
                                {model.createdAt
                                  ? new Date(model.createdAt).toLocaleString()
                                  : "Created time unknown"}
                              </div>
                              {(model.datasetVersion || model.datasetId) && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Trained on dataset:{" "}
                                  <span className="font-medium text-foreground">
                                    {model.datasetVersion ?? "Unknown version"}
                                  </span>
                                  {model.datasetId ? ` (${model.datasetId})` : ""}
                                </div>
                              )}
                            </button>
                            {/* Delete button - hidden for viewer and operator roles */}
                            {userRole !== 'viewer' && userRole !== 'operator' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  setModelToDelete(model);
                                  setShowDeleteModelDialog(true);
                                }}
                                disabled={deletingModelId === model.modelId}
                              >
                                {deletingModelId === model.modelId ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                  </>
                                ) : (
                                  "Delete"
                                )}
                              </Button>
                            )}
                          </div>

                          {isExpanded && (
                            <div className="mt-3 space-y-3">
                              {/* Key metrics */}
                              {model.metrics && (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                  {model.metrics.bestEpoch !== undefined && (
                                    <div className="p-2 border rounded">
                                      <div className="text-xs text-muted-foreground">
                                        Best Epoch
                                      </div>
                                      <div className="font-semibold text-sm">
                                        {model.metrics.bestEpoch}
                                      </div>
                                    </div>
                                  )}
                                  {model.metrics.bestLoss !== undefined && (
                                    <div className="p-2 border rounded">
                                      <div className="text-xs text-muted-foreground">
                                        Best Loss
                                      </div>
                                      <div className="font-semibold text-sm">
                                        {model.metrics.bestLoss.toFixed(4)}
                                      </div>
                                    </div>
                                  )}
                                  {model.metrics.precision !== undefined && (
                                    <div className="p-2 border rounded">
                                      <div className="text-xs text-muted-foreground">
                                        Precision
                                      </div>
                                      <div className="font-semibold text-sm">
                                        {(model.metrics.precision * 100).toFixed(2)}%
                                      </div>
                                    </div>
                                  )}
                                  {model.metrics.recall !== undefined && (
                                    <div className="p-2 border rounded">
                                      <div className="text-xs text-muted-foreground">
                                        Recall
                                      </div>
                                      <div className="font-semibold text-sm">
                                        {(model.metrics.recall * 100).toFixed(2)}%
                                      </div>
                                    </div>
                                  )}
                                  {model.metrics.mAP50 !== undefined && (
                                    <div className="p-2 border rounded">
                                      <div className="text-xs text-muted-foreground">
                                        mAP@0.5
                                      </div>
                                      <div className="font-semibold text-sm">
                                        {(model.metrics.mAP50 * 100).toFixed(2)}%
                                      </div>
                                    </div>
                                  )}
                                  {model.metrics.mAP50_95 !== undefined && (
                                    <div className="p-2 border rounded">
                                      <div className="text-xs text-muted-foreground">
                                        mAP@0.5–0.95
                                      </div>
                                      <div className="font-semibold text-sm">
                                        {(model.metrics.mAP50_95 * 100).toFixed(2)}%
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Per-label stats */}
                              {model.metrics?.perLabelStats &&
                                Array.isArray(model.metrics.perLabelStats) &&
                                model.metrics.perLabelStats.length > 0 && (
                                  <div>
                                    <div className="text-xs font-semibold mb-1">
                                      Per-label Stats
                                    </div>
                                    <div className="border rounded overflow-hidden">
                                      <div className="grid grid-cols-4 bg-muted text-xs font-medium px-2 py-1">
                                        <div>Label</div>
                                        <div>Precision</div>
                                        <div>Recall</div>
                                        <div>mAP@0.5</div>
                                      </div>
                                      {model.metrics.perLabelStats.map((s: any, idx: number) => (
                                        <div
                                          key={`${model.modelId}-label-${idx}`}
                                          className="grid grid-cols-4 text-xs px-2 py-1 border-t"
                                        >
                                          <div>{s.label}</div>
                                          <div>{(s.precision * 100).toFixed(1)}%</div>
                                          <div>{(s.recall * 100).toFixed(1)}%</div>
                                          <div>{(s.mAP50 * 100).toFixed(1)}%</div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                              {/* Insights */}
                              {model.insights && (
                                <div className="space-y-2">
                                  {(model.insights.bestAccuracy != null ||
                                    model.insights.bestmAP != null) && (
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                      {model.insights.bestAccuracy != null && (
                                        <div>
                                          <div className="text-muted-foreground">
                                            Best Accuracy
                                          </div>
                                          <div className="font-semibold">
                                            {(model.insights.bestAccuracy * 100).toFixed(
                                              2
                                            )}
                                            %
                                          </div>
                                        </div>
                                      )}
                                      {model.insights.bestmAP != null && (
                                        <div>
                                          <div className="text-muted-foreground">
                                            Best mAP
                                          </div>
                                          <div className="font-semibold">
                                            {(model.insights.bestmAP * 100).toFixed(2)}%
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {Array.isArray(model.insights.weakestLabels) &&
                                    model.insights.weakestLabels.length > 0 && (
                                      <div>
                                        <div className="text-xs font-semibold">
                                          Weakest Labels
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {model.insights.weakestLabels.map(
                                            (lbl: string, idx: number) => (
                                              <span
                                                key={`${model.modelId}-weak-${idx}`}
                                                className="px-2 py-0.5 rounded-full bg-muted text-xs"
                                              >
                                                {lbl}
                                              </span>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    )}

                                  {Array.isArray(model.insights.classImbalanceWarnings) &&
                                    model.insights.classImbalanceWarnings.length > 0 && (
                                      <div>
                                        <div className="text-xs font-semibold">
                                          Class Imbalance Warnings
                                        </div>
                                        <ul className="list-disc list-inside text-xs mt-1">
                                          {model.insights.classImbalanceWarnings.map(
                                            (w: string, idx: number) => (
                                              <li
                                                key={`${model.modelId}-imb-${idx}`}
                                              >
                                                {w}
                                              </li>
                                            )
                                          )}
                                        </ul>
                                      </div>
                                    )}

                                  {Array.isArray(model.insights.recommendations) &&
                                    model.insights.recommendations.length > 0 && (
                                      <div>
                                        <div className="text-xs font-semibold">
                                          Recommendations
                                        </div>
                                        <ul className="list-disc list-inside text-xs mt-1">
                                          {model.insights.recommendations.map(
                                            (r: string, idx: number) => (
                                              <li
                                                key={`${model.modelId}-rec-${idx}`}
                                              >
                                                {r}
                                              </li>
                                            )
                                          )}
                                        </ul>
                                      </div>
                                    )}
                                </div>
                              )}

                              {/* AI Chatbot for Model Analysis */}
                              {model.modelId && (
                                <ModelMetricsChatbot model={model} />
                              )}

                              {/* Download Model and Deploy Model Buttons - hidden for viewer role */}
                              {model.modelId && userRole !== 'viewer' && (
                                <div className="pt-3 border-t space-y-3">
                                  <div className="text-xs font-semibold mb-2">Model Actions</div>
                                  <div className="flex flex-wrap gap-2">
                                    <ModelDownloadButton
                                      modelId={model.modelId}
                                      modelName={displayName}
                                      availableFormats={["pt", "onnx", "zip"]}
                                    />
                                    <ModelDeployButton
                                      modelId={model.modelId}
                                      modelName={displayName}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Cancel augmentation confirmation dialog */}
            <AlertDialog open={showCancelAugmentDialog} onOpenChange={setShowCancelAugmentDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel augmentation?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cancel augmentation for this dataset? The process will stop and partial results may be discarded.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={cancellingAugmentation}>Keep running</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      void handleCancelAugmentation();
                    }}
                    disabled={cancellingAugmentation}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {cancellingAugmentation ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cancelling…
                      </>
                    ) : (
                      "Cancel augmentation"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Augmentation confirmation dialog for currently selected dataset */}
            <AugmentVersionNameModal
              open={showAugmentDialog}
              onOpenChange={setShowAugmentDialog}
              currentVersion={
                datasetList.find(
                  (d) => String(d._id ?? d.id) === selectedDatasetId
                )?.version
              }
              isLoading={augmentingDataset}
              title="Augment this dataset?"
              description="Enter a name for the new augmented version. The original dataset will be backed up and replaced only after augmentation completes successfully."
              cancelLabel="Cancel"
              confirmLabel="Start Augmentation"
              onConfirm={async (versionName, options) => {
                if (!selectedDatasetId || augmentingDataset) return;
                setAugmentingDataset(true);
                try {
                  await datasetsApi.augmentDataset(selectedDatasetId, versionName, options);
                  augmentationSourceDatasetIdRef.current = selectedDatasetId;
                  toast({
                    title: "Augmentation started",
                    description:
                      "Dataset augmentation has been started in the background. You can continue working while it finishes.",
                  });
                  startAugmentationPolling();
                  setShowAugmentDialog(false);
                } catch (error: unknown) {
                  const msg = error instanceof Error ? error.message : String(error ?? "");
                  const is409 = msg.includes("409") || msg.includes("Augmentation already running");
                  if (is409) {
                    toast({
                      title: "Augmentation already running",
                      description: "Augmentation already running for this dataset.",
                      variant: "default",
                    });
                    startAugmentationPolling();
                    setShowAugmentDialog(false);
                  } else {
                    // For 400 errors (validation errors), show backend error message as-is
                    // Keep modal open so user can fix the version name
                    toast({
                      title: "Failed to start augmentation",
                      description: msg || "An error occurred while starting dataset augmentation.",
                      variant: "destructive",
                    });
                    // Modal stays open for user to correct the version name
                  }
                } finally {
                  setAugmentingDataset(false);
                }
              }}
            />

        {/* Model Type + Model Size + Hyperparameters - Conditional on selectedDatasetId */}
        <AnimatePresence mode="wait">
          {selectedDatasetId && (
            <motion.div
              key="model-config"
              variants={fadeInUpVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Select Model & Hyperparameters
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex cursor-help">
                        <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="start" className="max-w-sm">
                      <p className="text-xs">
                        Choose a base model (e.g. YOLO) and adjust hyperparameters like epochs, batch size, and learning rate before starting training.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
              <CardDescription>Choose a model and tune hyperparameters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 space-y-2">
                <Label htmlFor="training-model-name">Trained model name</Label>
                <Input
                  id="training-model-name"
                  value={trainingModelName}
                  onChange={(e) => {
                    userEditedTrainingNameRef.current = true;
                    setTrainingModelName(e.target.value);
                  }}
                  placeholder="e.g. my-detector-v1"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Change the name or leave it as default
                </p>
              </div>

              {/* Model type selector */}
              <div className="mb-4">
                <Label>Model Type</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                  <Button variant={modelType === "YOLO" ? "default" : "ghost"} onClick={() => setModelType("YOLO")}>
                    YOLO
                  </Button>
                  <Button
                    variant={modelType === "YOLO_SEG" ? "default" : "ghost"}
                    onClick={() => setModelType("YOLO_SEG")}
                  >
                    YOLO_SEG
                  </Button>
                  <Button
                    variant={modelType === "RF_DETR" ? "default" : "ghost"}
                    onClick={() => setModelType("RF_DETR")}
                  >
                    RF-DETR
                  </Button>
                </div>
              </div>

              {trainUsesModelPicker && (
                <div className="mb-4">
                  <div className="flex items-center gap-1.5">
                    <Label>
                      {modelType === "RF_DETR" ? "RF-DETR Base / Trained Model" : "YOLO Base / Trained Model"}
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" className="max-w-sm">
                          <p className="text-xs">
                            The YOLOv8 family (n/s/m/l/x) shares the same core architecture but scales depth and width:
                            as you move from Nano to X-Large, accuracy and model size increase while inference speed
                            decreases. In general, YOLOv8n is best for edge/CPU or mobile, YOLOv8s for fast real-time
                            inspection, YOLOv8m for a balanced trade-off, YOLOv8l for higher-accuracy server workloads,
                            and YOLOv8x for maximum accuracy on powerful GPUs. Smaller variants like YOLOv5n,
                            YOLOv11-small, or YOLOv2-6n follow the same idea: they are lighter, faster models suited for
                            limited hardware but with slightly lower mAP than their larger counterparts.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select
                    value={selectedModelSize}
                    onValueChange={setSelectedModelSize}
                    onOpenChange={(open) => {
                      // Always refetch models when the dropdown is opened so trained models stay in sync
                      if (open && trainUsesModelPicker) {
                        void fetchBaseModels();
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          baseModels.length
                            ? modelType === "RF_DETR"
                              ? "Select RF-DETR model"
                              : "Select YOLO model"
                            : "Loading models..."
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {baseModels.length === 0 ? (
                        <SelectItem value="fallback" disabled>
                          No models available
                        </SelectItem>
                      ) : (
                        baseModels.map((m, i) => {
                          const val = m.key ?? `model-${i}`;
                          const label = m.name ?? m.label ?? String(m.filename ?? val);
                          return (
                            <SelectItem key={String(val) + "-" + i} value={String(val)}>
                              {m.type === "trained" ? `Trained: ${label}` : label}
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Defaults card */}
              <TooltipProvider>
              <div className="mb-4 p-3 border rounded">
                  <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">Default Training Parameters</div>
                  </div>
                  <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={useDefaults}
                        onChange={(e) => setUseDefaults(e.target.checked)}
                      />
                        <span>Use defaults</span>
                    </label>
                    {selectedDatasetId && datasetDetails && modelType !== "RF_DETR" && (
                      <HyperparametersChatbot
                        datasetInfo={{
                          datasetId: selectedDatasetId,
                          totalImages: datasetDetails.totalImages,
                          labeledImages: datasetDetails.labeledImages ?? datasetDetails.trainCount,
                          unlabeledImages: datasetDetails.unlabeledImages,
                          trainCount: datasetDetails.trainCount,
                          valCount: datasetDetails.valCount,
                          testCount: datasetDetails.testCount,
                          numClasses: datasetDetails.numClasses,
                          version: datasetDetails.version,
                          status: datasetDetails.status
                        }}
                        modelType={modelType}
                        currentParams={{
                          epochs,
                          batchSize,
                          imgSize,
                          learningRate,
                          workers,
                        }}
                        onParamsSuggested={(params, modelKey) => {
                          setEpochs(params.epochs || 100);
                          setBatchSize(params.batchSize || 16);
                          setImgSize(params.imgSize || 640);
                          setLearningRate(params.learningRate || 0.01);
                          setWorkers(params.workers || 4);
                          setUseDefaults(false);

                          // If AI suggestions were for a specific YOLO variant,
                          // try to select a matching base model in the YOLO dropdown.
                          if (modelKey && trainUsesModelPicker && baseModels.length > 0) {
                            const lowerKey = modelKey.toLowerCase();
                            const match = baseModels.find((m) => {
                              const label = (m.name ?? m.label ?? m.filename ?? "").toLowerCase();
                              return label.includes(lowerKey);
                            });
                            if (match?.key) {
                              setSelectedModelSize(String(match.key));
                            }
                          }
                        }}
                      />
                    )}
                  </div>
                </div>

                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    {/* Epochs */}
                    <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <span>Epochs</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" align="start">
                            <p className="max-w-xs text-xs">
                              Number of full passes the model makes over the training dataset.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="text-sm font-semibold">
                        {defaultParams?.epochs ?? 100}
                </div>
              </div>

                    {/* Batch Size */}
                    <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <span>Batch Size</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" align="start">
                            <p className="max-w-xs text-xs">
                              Number of images processed together in one training step.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="text-sm font-semibold">
                        {defaultParams?.batchSize ?? 16}
                      </div>
                    </div>

                    {/* Image Size */}
                    <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <span>Image Size</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" align="start">
                            <p className="max-w-xs text-xs">
                              Resolution (in pixels) that all images are resized to before training.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="text-sm font-semibold">
                        {defaultParams?.imgSize ?? 640}
                      </div>
                    </div>

                    {/* Learning Rate */}
                    <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <span>Learning Rate</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" align="start">
                            <p className="max-w-xs text-xs">
                              How aggressively the model updates its weights during training.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="text-sm font-semibold">
                        {defaultParams?.learningRate ?? 0.01}
                      </div>
                    </div>

                    {/* Workers */}
                    <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <span>Workers</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" align="start">
                            <p className="max-w-xs text-xs">
                              Number of parallel workers used for loading and preprocessing data.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="text-sm font-semibold">
                        {defaultParams?.workers ?? 4}
                      </div>
                    </div>
                  </div>
                </div>
              </TooltipProvider>

              {/* Customization form (visible when useDefaults === false) */}
              {!useDefaults && (
                <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-3xl">
                  <div>
                    <Label className="text-sm font-medium">Epochs</Label>
                    <Input
                      type="number"
                      value={epochs}
                      min={1}
                      max={1000}
                      onChange={(e) => setEpochs(Number(e.target.value))}
                      className="mt-1 w-full"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Batch Size</Label>
                    <Input
                      type="number"
                      value={batchSize}
                      min={1}
                      max={512}
                      onChange={(e) => setBatchSize(Number(e.target.value))}
                      className="mt-1 w-full"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Image Size</Label>
                    <Input
                      type="number"
                      value={imgSize}
                      min={128}
                      max={2048}
                      onChange={(e) => setImgSize(Number(e.target.value))}
                      className="mt-1 w-full"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Learning Rate</Label>
                    <Input
                      type="number"
                      value={learningRate}
                      step={0.0001}
                      min={0.000001}
                      max={1}
                      onChange={(e) => setLearningRate(Number(e.target.value))}
                      className="mt-1 w-full"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Workers</Label>
                    <Input
                      type="number"
                      value={workers}
                      min={1}
                      max={64}
                      onChange={(e) => setWorkers(Number(e.target.value))}
                      className="mt-1 w-full"
                    />
                  </div>
                </div>
              )}

              <div className="mt-3 max-w-sm">
                <div className="flex items-center gap-1.5">
                  <Label className="text-sm font-medium">Augmentation Preset</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent side="top" align="start" className="max-w-sm">
                        <p className="text-xs">
                          Improve model robustness for specific conditions like color variation or low light.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select
                  value={augmentationPreset}
                  onValueChange={setAugmentationPreset}
                  disabled={modelType === "RF_DETR"}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Select preset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="color_invariant">Color Invariant Detection</SelectItem>
                    <SelectItem value="small_defect">Small Defect Detection</SelectItem>
                    <SelectItem value="low_light">Low Light Optimization</SelectItem>
                    <SelectItem value="robust">Industrial Robust Mode</SelectItem>
                  </SelectContent>
                </Select>
                {modelType === "RF_DETR" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Augmentation presets apply to YOLO training only. RF-DETR uses none.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress - Conditional on jobId */}
        <AnimatePresence mode="wait">
          {jobId && (
            <motion.div
              key="training-progress"
              variants={fadeInUpVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
          <Card>
            <CardHeader>
              <CardTitle>Training Status</CardTitle>
              <CardDescription>Job ID: {jobId} — Status: {simulationStatus}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* metadata */}
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                {startedAt && (
                  <div>
                    <div className="text-muted-foreground">Started</div>
                    <div className="font-medium">{new Date(startedAt).toLocaleString()}</div>
                  </div>
                )}
                {completedAt && (
                  <div>
                    <div className="text-muted-foreground">Completed</div>
                    <div className="font-medium">{new Date(completedAt).toLocaleString()}</div>
                  </div>
                )}
                {epochInfo && (
                  <div>
                    <div className="text-muted-foreground">Epoch</div>
                    <div className="font-medium">
                      {epochInfo.current}/{epochInfo.total || "?"}
                    </div>
                  </div>
                )}
              </div>

              <Progress
                value={simulationProgress}
                indicatorClassName={cn(
                  ["queued", "running"].includes(simulationStatus) &&
                    "progress-striped progress-animated",
                  simulationStatus === "completed" && "bg-[hsl(var(--success))]",
                  simulationStatus === "failed" && "bg-[hsl(var(--destructive))]"
                )}
              />
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{simulationProgress}%</span>
              </div>

              {/* Training results summary (only after completion) */}
              {simulationStatus === "completed" && (
                <div className="mt-4 space-y-4">
                  {/* Overview */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Training Overview</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-muted-foreground">Model Type</div>
                        <div className="font-medium">{modelType}</div>
                      </div>
                      {selectedModelSize && (
                        <div>
                          <div className="text-muted-foreground">Model Size</div>
                          <div className="font-medium">{selectedModelSize}</div>
                        </div>
                      )}
                      {selectedDatasetId && (
                        <div>
                          <div className="text-muted-foreground">Dataset ID</div>
                          <div className="font-medium">{selectedDatasetId}</div>
                        </div>
                      )}
                      {hyperparametersSnapshot?.epochs !== undefined && (
                        <div>
                          <div className="text-muted-foreground">Total Epochs</div>
                          <div className="font-medium">{hyperparametersSnapshot.epochs}</div>
                        </div>
                      )}
                      {hyperparametersSnapshot?.batchSize !== undefined && (
                        <div>
                          <div className="text-muted-foreground">Batch Size</div>
                          <div className="font-medium">{hyperparametersSnapshot.batchSize}</div>
                        </div>
                      )}
                      {hyperparametersSnapshot?.imgSize !== undefined && (
                        <div>
                          <div className="text-muted-foreground">Image Size</div>
                          <div className="font-medium">{hyperparametersSnapshot.imgSize}</div>
                        </div>
                      )}
                      {hyperparametersSnapshot?.learningRate !== undefined && (
                        <div>
                          <div className="text-muted-foreground">Learning Rate</div>
                          <div className="font-medium">{hyperparametersSnapshot.learningRate}</div>
                        </div>
                      )}
                      {hyperparametersSnapshot?.workers !== undefined && (
                        <div>
                          <div className="text-muted-foreground">Workers</div>
                          <div className="font-medium">{hyperparametersSnapshot.workers}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Final metrics */}
                  {finalMetrics && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Final Metrics</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        {formatTrainingDuration(startedAt, completedAt) && (
                          <div className="p-3 border rounded">
                            <div className="text-muted-foreground">Training Duration</div>
                            <div className="font-semibold mt-1">
                              {formatTrainingDuration(startedAt, completedAt)}
                            </div>
                          </div>
                        )}
                        {finalMetrics.bestEpoch !== undefined && (
                          <div className="p-3 border rounded">
                            <div className="text-muted-foreground">Best Epoch</div>
                            <div className="font-semibold mt-1">{finalMetrics.bestEpoch}</div>
                          </div>
                        )}
                        {finalMetrics.bestLoss !== undefined && (
                          <div className="p-3 border rounded">
                            <div className="text-muted-foreground">Best Loss</div>
                            <div className="font-semibold mt-1">
                              {finalMetrics.bestLoss.toFixed(4)}
                            </div>
                          </div>
                        )}
                        {finalMetrics.precision !== undefined && (
                          <div className="p-3 border rounded">
                            <div className="text-muted-foreground">Precision</div>
                            <div className="font-semibold mt-1">
                              {(finalMetrics.precision * 100).toFixed(2)}%
                            </div>
                          </div>
                        )}
                        {finalMetrics.recall !== undefined && (
                          <div className="p-3 border rounded">
                            <div className="text-muted-foreground">Recall</div>
                            <div className="font-semibold mt-1">
                              {(finalMetrics.recall * 100).toFixed(2)}%
                            </div>
                          </div>
                        )}
                        {finalMetrics.mAP50 !== undefined && (
                          <div className="p-3 border rounded">
                            <div className="text-muted-foreground">mAP@0.5</div>
                            <div className="font-semibold mt-1">
                              {(finalMetrics.mAP50 * 100).toFixed(2)}%
                            </div>
                          </div>
                        )}
                        {finalMetrics.mAP50_95 !== undefined && (
                          <div className="p-3 border rounded">
                            <div className="text-muted-foreground">mAP@0.5–0.95</div>
                            <div className="font-semibold mt-1">
                              {(finalMetrics.mAP50_95 * 100).toFixed(2)}%
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Model information */}
                  {modelInfo && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Model Information</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {modelInfo.modelId && (
                          <div>
                            <div className="text-muted-foreground">Model ID</div>
                            <div className="font-medium">{modelInfo.modelId}</div>
                          </div>
                        )}
                        {modelInfo.modelVersion && (
                          <div>
                            <div className="text-muted-foreground">Version</div>
                            <div className="font-medium">{modelInfo.modelVersion}</div>
                          </div>
                        )}
                        {/* Download button - hidden for viewer role */}
                        {modelInfo.modelId && userRole !== 'viewer' && (
                          <div>
                            <div className="text-muted-foreground mb-2">Download</div>
                            <ModelDownloadButton
                              modelId={modelInfo.modelId}
                              modelName={modelInfo.modelVersion || modelInfo.modelId}
                              availableFormats={["pt", "onnx", "zip"]}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* metrics */}
              {simulationMetrics && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                  {simulationMetrics.currentLoss !== undefined && (
                    <div className="p-3 border rounded">
                      <div className="text-sm text-muted-foreground">Loss</div>
                      <div className="font-semibold mt-1">{simulationMetrics.currentLoss}</div>
                    </div>
                  )}
                  {simulationMetrics.mAP50 !== undefined && (
                    <div className="p-3 border rounded">
                      <div className="text-sm text-muted-foreground">mAP@0.5</div>
                      <div className="font-semibold mt-1">{simulationMetrics.mAP50}</div>
                    </div>
                  )}
                  {simulationMetrics.currentLR !== undefined && (
                    <div className="p-3 border rounded">
                      <div className="text-sm text-muted-foreground">Learning Rate</div>
                      <div className="font-semibold mt-1">{simulationMetrics.currentLR}</div>
                    </div>
                  )}
                </div>
              )}

              {/* logs preview - auto-refreshed and auto-scrolling while user is at bottom */}
              <div className="mt-4">
                <div className="text-sm text-muted-foreground">Logs</div>
                <div
                  ref={logsContainerRef}
                  className="mt-2 max-h-40 overflow-auto bg-surface p-2 rounded text-xs"
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    const isNearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 10;
                    setAutoScrollLogs(isNearBottom);
                  }}
                >
                  {logs.length === 0 ? (
                    <div className="text-muted-foreground">No logs yet.</div>
                  ) : (
                    logs.map((l, i) => <div key={i}>{l}</div>)
                  )}
                </div>
              </div>

              {/* Cancel / Retry */}
              <div className="mt-4 flex gap-2">
                {(simulationStatus === "queued" || simulationStatus === "running") && (
                  <Button
                    variant="destructive"
                    onClick={() => setShowCancelConfirm(true)}
                  >
                    Cancel
                  </Button>
                )}

                {(simulationStatus === "failed" || simulationStatus === "cancelled") && (
                  <Button onClick={retryJob}>Retry</Button>
                )}
              </div>
            </CardContent>
          </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start Simulation CTA - Conditional */}
        <AnimatePresence mode="wait">
          {selectedProjectId &&
            selectedDatasetId &&
            modelType &&
            !isSimulating &&
            !jobId && (
              <ProtectedComponent requiredPermission="startTraining">
                <motion.div
                  key="start-training"
                  variants={fadeInUpVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="flex justify-end"
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            onClick={() => void handleOpenTrainConfirm()}
                            size="lg"
                            className="gap-2"
                            disabled={
                              (datasetDetails?.trainCount ?? 0) <= 0 ||
                              !(datasetDetails?.status === "ready" || datasetDetails?.status === "ready_to_train")
                            }
                          >
                            <Play className="h-4 w-4" />
                            Start Training
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {(datasetDetails?.trainCount ?? 0) <= 0
                          ? "Dataset has no training images"
                          : !(datasetDetails?.status === "ready" || datasetDetails?.status === "ready_to_train")
                            ? `Dataset not ready (status: ${datasetDetails?.status ?? "unknown"})`
                            : "Start training with selected configuration"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </motion.div>
              </ProtectedComponent>
            )}
        </AnimatePresence>
          </>
        )}
      </motion.div>

      {/* Start training confirmation dialog */}
      <Dialog open={showSimulateConfirm} onOpenChange={setShowSimulateConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Training</DialogTitle>
            <DialogDescription>Start training with selected configuration?</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Project:</span><span className="text-sm font-medium">{selectedProject?.name}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Dataset:</span><span className="text-sm font-medium">{selectedDataset?.version ?? datasetDetails?.version}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Train / Val / Test:</span><span className="text-sm font-medium">{[datasetDetails?.trainCount ?? 0, datasetDetails?.valCount ?? 0, datasetDetails?.testCount ?? 0].join(" / ")}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Model Type:</span><span className="text-sm font-medium">{modelType}</span></div>
            {trainUsesModelPicker && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Base model key:</span>
                <span className="text-sm font-medium">{selectedModelSize || "not selected"}</span>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span className="text-sm text-muted-foreground shrink-0">Model name:</span>
              <span className="text-sm font-medium text-right">
                {trainingModelName.trim() || "(server default)"}
              </span>
            </div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Epochs:</span><span className="text-sm font-medium">{epochs}</span></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSimulateConfirm(false)}>Cancel</Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={startTraining}
                      disabled={
                        (datasetDetails?.trainCount ?? 0) <= 0 ||
                        !(datasetDetails?.status === "ready" || datasetDetails?.status === "ready_to_train")
                      }
                    >
                      {isSimulating ? <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting... </> : "Confirm & Start"}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {(datasetDetails?.trainCount ?? 0) <= 0
                    ? "Dataset has no training images"
                    : !(datasetDetails?.status === "ready" || datasetDetails?.status === "ready_to_train")
                      ? `Dataset not ready (status: ${datasetDetails?.status ?? "unknown"})`
                      : "Start training"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stop training confirmation dialog */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop training?</DialogTitle>
            <DialogDescription>
              Are you sure you want to stop this training run? Progress for this run will be stopped.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelConfirm(false)}
            >
              No, keep training
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setShowCancelConfirm(false);
                await cancelJob();
              }}
              disabled={!(simulationStatus === "queued" || simulationStatus === "running")}
            >
              Yes, stop training
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SimulationView;
