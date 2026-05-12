// src/pages/PredictionPage.tsx
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useProfile } from "@/hooks/useProfile";
import { useBreadcrumbs } from "@/components/app-shell/breadcrumb-context";
import { ProtectedComponent } from "@/components/permissions/ProtectedComponent";
import { supabase } from "@/integrations/supabase/client";
import { getAuthHeaders } from "@/lib/api/config";
import { PageHeader } from "@/components/pages/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  BrainCircuit,
  Play,
  Loader2,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Image as ImageIcon,
  Video,
  Camera,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Info,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { fadeInUpVariants, staggerContainerVariants } from "@/utils/animations";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").trim();

/** Default "good" classes for live verdict when user hasn't customized yet */
function defaultLiveGoodClasses(classNames: string[] | undefined): string[] {
  const names = classNames ?? [];
  if (names.includes("product")) return ["product"];
  if (names.length > 0) return [names[0]];
  return ["product"];
}

/**
 * Unwrap /api/inference/models rows: stable modelId, classNames from classNames or class_names.
 */
function normalizeInferenceModelFromApi(raw: unknown): Model {
  const r = raw as Record<string, unknown> & Partial<Model> & {
    id?: string;
    class_names?: unknown;
  };
  const modelId = String(r.modelId ?? r.id ?? r._id ?? "");
  const cn = r.classNames ?? r.class_names;
  const classNames = Array.isArray(cn) ? cn.map((x) => String(x)) : undefined;
  return {
    ...(r as Model),
    modelId,
    classNames,
  };
}

function modelRowMatchesId(m: Model, selectedId: string | null): boolean {
  if (!selectedId) return false;
  const idField = (m as Model & { id?: string }).id;
  return m.modelId === selectedId || m._id === selectedId || idField === selectedId;
}

function canonicalInferenceRowId(m: Model): string {
  const idField = (m as Model & { id?: string }).id;
  return String(m.modelId || idField || m._id || "");
}

const apiUrl = (path: string) => {
  const base = API_BASE_URL.replace(/\/+$/, "");
  const p = path.replace(/^\/+/, "");
  return base ? `${base}/${p}` : `/${p}`;
};

interface Dataset {
  datasetId: string; // MongoDB _id from backend
  _id?: string; // Fallback for compatibility
  id?: string; // Fallback for compatibility
  version?: string;
  testCount?: number;
  totalImages?: number;
  createdAt?: string;
  status?: string;
  company?: string;
  project?: string;
}

interface Model {
  modelId: string; // Canonical id from backend (modelId or id)
  _id?: string; // Fallback for compatibility
  id?: string; // Some responses use `id` instead of modelId
  modelVersion?: string;
  modelType?: string;
  name?: string;
  /** From backend: class index order, matches inference detection `class` strings */
  classNames?: string[];
  metrics?: {
    mAP50?: number;
    precision?: number;
    recall?: number;
  };
  createdAt?: string;
}

interface InferenceStatus {
  inferenceId?: string;
  status: "idle" | "queued" | "running" | "completed" | "failed" | "cancelled";
  progress?: {
    totalImages?: number;
    processedImages?: number;
    progressPercent?: number;
  } | number; // Support both nested (backend) and flat (legacy)
  processedImages?: number; // Legacy flat structure
  totalImages?: number; // Legacy flat structure
  message?: string;
  startedAt?: string;
  completedAt?: string | null;
  error?: string | null;
}

interface InferenceResults {
  // Backend returns nested structure: { results: { ... } }
  // This interface represents the inner results object
  totalDetections: number;
  averageConfidence: number;
  detectionsByClass: Array<{
    className: string;
    count: number;
    avgConfidence?: number; // Backend uses "avgConfidence"
    averageConfidence?: number; // Fallback
  }>;
  // Support both new structure (object with good/defect/all) and old structure (flat array)
  annotatedImages: {
    good: Array<{ filename: string; url: string; tag: 'good' }>;
    defect: Array<{ filename: string; url: string; tag: 'defect' }>;
    all: Array<{ filename: string; url: string; tag: 'good' | 'defect' | 'unreviewed' }>;
  } | Array<{
    filename: string;
    url: string;
    tag?: string;
    detections?: Array<{
      className: string;
      confidence: number;
      bbox?: number[];
    }>;
  }>;
  statistics?: {
    total: number;        // Total files (images + videos)
    totalImages?: number; // Optional: number of images
    totalVideos?: number; // Optional: number of videos
    good: number;
    defect: number;
    hasTags: boolean; // Indicates if job has tagging (new jobs)
  };
  // Optional videos array from backend (additive, backward compatible)
  videos?: Array<{
    filename: string;
    url: string;
    fileType?: string;
  }>;
  // Optional metadata block from backend (may contain richer file info)
  metadata?: {
    totalFiles?: number;
    totalImages?: number;
    totalVideos?: number;
    videos?: any[];
    images?: any[];
    files?: any[];
  };
}

interface InferenceJob {
  inferenceId: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  sourceType?: string;
  progress?: {
    totalImages?: number;
    processedImages?: number;
    progressPercent?: number;
  };
  model?: {
    modelId: string;
    modelVersion?: string;
    modelType?: string;
    metrics?: {
      mAP50?: number;
      precision?: number;
      recall?: number;
    };
  };
  dataset?: {
    datasetId: string;
    version?: string;
    testCount?: number;
  };
  results?: {
    totalDetections?: number;
    averageConfidence?: number;
    detectionsByClass?: Array<{
      className: string;
      count: number;
      avgConfidence?: number;
    }>;
    hasAnnotatedImages?: boolean;
  };
  startedAt?: string;
  completedAt?: string | null;
  cancelledAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface LiveFrameResponse {
  annotatedImage?: string; // base64 data URL (optional when returnAnnotatedImage: false)
  detections: Array<{
    class: string;
    confidence: number;
    bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  }>;
  totalDetections: number;
  processingTime?: number;
  imageWidth?: number; // Original image width sent to backend
  imageHeight?: number; // Original image height sent to backend
}

/** Single entry from edge live inference (GET /inference/edge/live). Stored for History of live logs. */
interface LiveLogEntry {
  id: string;
  timestamp: string;
  imageBase64: string;
  defectClasses: Array<{ className: string; count?: number; confidence?: number } | string>;
}

interface LiveDefectLogEntry {
  id: string;
  timestamp: string;
  imageBase64: string;
  verdict: "NOT_OK";
  defectClasses: string[];
}

interface LiveRunAnalytics {
  framesProcessed: number;
  totalProducts: number;
  goodProducts: number;
  badProducts: number;
  classCounts: Record<string, number>;
  runStartedAt: string | null;
  runEndedAt: string | null;
}

const STORAGE_PREFIX = "prediction_";
const LIVE_LOGS_HISTORY_KEY = "liveLogsHistory";
const LIVE_LOGS_HISTORY_CAP = 100;
const LIVE_LOGS_POLL_INTERVAL_MS = 5000;
const LIVE_CENTER_REGION_DEFAULT_PERCENT = 40;
const LIVE_CENTER_REGION_MIN_PERCENT = 40;
const LIVE_CENTER_REGION_MAX_PERCENT = 95;
const LIVE_DEFECT_LOG_CAP = 200;
const LIVE_ANALYTICS_PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))"];
type InferenceMode = "dataset" | "custom";

// VideoPlayer component with error handling and loading state
const VideoPlayer = ({ 
  video, 
  detectionCount 
}: { 
  video: { filename: string; url: string; fileType?: string }; 
  detectionCount?: number;
}) => {
  const [videoError, setVideoError] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);

  return (
    <div className="space-y-2">
      <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
        {videoLoading && !videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {videoError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-sm p-4 text-center">
            Failed to load video
          </div>
        ) : (
          <video
            controls
            className="w-full h-full object-contain"
            onLoadedData={() => setVideoLoading(false)}
            onError={() => {
              setVideoError(true);
              setVideoLoading(false);
            }}
          >
            <source src={video.url} type="video/mp4" />
            <source src={video.url} type="video/webm" />
            <source src={video.url} type="video/avi" />
            Your browser does not support the video tag.
          </video>
        )}
      </div>
      <div className="text-xs text-muted-foreground truncate">
        {video.filename}
      </div>
      {detectionCount !== undefined && detectionCount > 0 && (
        <div className="text-xs text-muted-foreground">
          {detectionCount} detection{detectionCount !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
};

const PredictionPage = () => {
  const { profile, company, sessionReady, hasPermission } = useProfile();
  
  // Helper function to safely build authenticated request headers
  const buildAuthHeaders = useCallback((headers: HeadersInit, includeContentType: boolean = false): HeadersInit => {
    const authHeader = headers["Authorization"];
    if (!authHeader || typeof authHeader !== "string") {
      throw new Error("Missing authorization token. Please log in again.");
    }
    
    const requestHeaders: HeadersInit = {
      "Authorization": authHeader,
    };
    
    if (includeContentType) {
      requestHeaders["Content-Type"] = "application/json";
    }
    
    // Add custom auth headers safely
    if (headers["X-User-Id"] && typeof headers["X-User-Id"] === "string") {
      requestHeaders["X-User-Id"] = headers["X-User-Id"];
    }
    if (headers["X-User-Role"] && typeof headers["X-User-Role"] === "string") {
      requestHeaders["X-User-Role"] = headers["X-User-Role"];
    }
    if (headers["X-User-Email"] && typeof headers["X-User-Email"] === "string") {
      requestHeaders["X-User-Email"] = headers["X-User-Email"];
    }
    if (headers["X-User-Company"] && typeof headers["X-User-Company"] === "string") {
      requestHeaders["X-User-Company"] = headers["X-User-Company"];
    }
    if (headers["X-User-Company-Id"] && typeof headers["X-User-Company-Id"] === "string") {
      requestHeaders["X-User-Company-Id"] = headers["X-User-Company-Id"];
    }
    
    return requestHeaders;
  }, []);
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setItems: setBreadcrumbs } = useBreadcrumbs();

  // State
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.25);
  const [inferenceId, setInferenceId] = useState<string | null>(null);
  const [inferenceStatus, setInferenceStatus] = useState<"idle" | "queued" | "running" | "completed" | "failed" | "cancelled">("idle");
  const [inferenceProgress, setInferenceProgress] = useState<number>(0);
  const [processedImages, setProcessedImages] = useState<number>(0);
  const [totalImages, setTotalImages] = useState<number>(0);
  const [results, setResults] = useState<InferenceResults | null>(null);

  // Loading states
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [startingInference, setStartingInference] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [cancellingInference, setCancellingInference] = useState(false);
  const [deletingInference, setDeletingInference] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // History view state - initialize from URL query parameter
  const [viewMode, setViewMode] = useState<"new" | "history" | "live-logs">(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "history") return "history";
    if (tabParam === "live-logs") return "live-logs";
    return "new";
  });
  const [pastInferences, setPastInferences] = useState<InferenceJob[]>([]);
  const [loadingPastInferences, setLoadingPastInferences] = useState(false);
  const [selectedPastInferenceId, setSelectedPastInferenceId] = useState<string | null>(null);
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("all");

  // Live Logs tab: latest from API and stored history
  const [liveLogsLatest, setLiveLogsLatest] = useState<LiveLogEntry | null>(null);
  const [liveLogsHistory, setLiveLogsHistory] = useState<LiveLogEntry[]>([]);
  const [liveLogsLoading, setLiveLogsLoading] = useState(false);
  const [liveLogsError, setLiveLogsError] = useState<string | null>(null);
  const [liveLogsEndpointUnavailable, setLiveLogsEndpointUnavailable] = useState(false);
  const liveLogsPollIntervalRef = useRef<number | null>(null);
  const liveLogsLastAddedTimestampRef = useRef<string | null>(null);
  
  // Image filter state for tagged inference results
  const [imageFilter, setImageFilter] = useState<'all' | 'good' | 'defect'>('all');

  // Cache for authenticated image object URLs
  const imageObjectUrlCache = useRef<Map<string, string>>(new Map());

  // Annotated image viewer state
  type AnnotatedImageItem = {
    filename: string;
    url: string;
    tag?: string;
    detections?: any[];
  };
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerImages, setImageViewerImages] = useState<AnnotatedImageItem[]>([]);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [imageZoom, setImageZoom] = useState(1);

  // Inference mode: dataset-based vs custom upload
  const [inferenceMode, setInferenceMode] = useState<InferenceMode>("dataset");

  // Local UI state for test inputs (drag-and-drop, select image/video)
  const [testFiles, setTestFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Live camera inference state
  const [liveCameraMode, setLiveCameraMode] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Set breadcrumbs
  useEffect(() => {
    const breadcrumbItems = [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Projects", href: "/dashboard/projects" },
      { label: "Prediction" },
    ];

    setBreadcrumbs(breadcrumbItems);

    return () => {
      setBreadcrumbs(null);
    };
  }, [setBreadcrumbs]);
  const [cameraPermission, setCameraPermission] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [liveInferenceId, setLiveInferenceId] = useState<string | null>(null);
  const [isLiveInferenceRunning, setIsLiveInferenceRunning] = useState<boolean>(false);
  const [annotatedFrame, setAnnotatedFrame] = useState<string | null>(null); // base64 image URL
  const [frameKey, setFrameKey] = useState<number>(0); // Key to force image re-render
  const [currentDetections, setCurrentDetections] = useState<number>(0);
  const [verdict, setVerdict] = useState<"NO_PRODUCT" | "OK" | "NOT_OK">("NO_PRODUCT");
  const [isProcessingFrame, setIsProcessingFrame] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(0); // Optional: FPS counter
  const [liveSessionConfidenceThreshold, setLiveSessionConfidenceThreshold] = useState<number | null>(null); // Value returned from live/start (optional display)
  /** Classes treated as "good product present" for live camera verdict (subset of model.classNames) */
  const [liveGoodClassNames, setLiveGoodClassNames] = useState<string[]>(["product"]);
  /** Live frame returned detection.class values not listed on the selected model (possible wrong model or stale class list) */
  const [liveDetectionClassMismatch, setLiveDetectionClassMismatch] = useState<string | null>(null);
  const [liveDefectLogs, setLiveDefectLogs] = useState<LiveDefectLogEntry[]>([]);
  const [isLiveDefectLoggingEnabled, setIsLiveDefectLoggingEnabled] = useState(true);
  const [showRunAnalytics, setShowRunAnalytics] = useState(false);
  const [liveRunAnalytics, setLiveRunAnalytics] = useState<LiveRunAnalytics>({
    framesProcessed: 0,
    totalProducts: 0,
    goodProducts: 0,
    badProducts: 0,
    classCounts: {},
    runStartedAt: null,
    runEndedAt: null,
  });
  const [centerGuideSizePercent, setCenterGuideSizePercent] = useState<number>(LIVE_CENTER_REGION_DEFAULT_PERCENT);

  // Refs
  const pollIntervalRef = useRef<number | null>(null);
  const projectIdRef = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const annotatedCanvasRef = useRef<HTMLCanvasElement>(null);
  const captureIntervalRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const pendingFrameRequestRef = useRef<boolean>(false);
  const verdictHistoryRef = useRef<string[]>([]);
  const liveGoodClassNamesRef = useRef<string[]>(["product"]);
  const liveGoodClassesInitForModelIdRef = useRef<string | null>(null);
  /** When classNames for the same modelId change after refetch, re-sync good-class defaults */
  const liveGoodClassNamesSigRef = useRef<string | null>(null);
  const selectedModelSnapshotRef = useRef<Model | null>(null);
  const liveInferenceIdRef = useRef<string | null>(null);
  const isLiveInferenceRunningRef = useRef<boolean>(false);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const hasRestoredStateRef = useRef<string | null>(null);
  const incidentLockRef = useRef<boolean>(false);
  const analyticsIncidentLockRef = useRef<boolean>(false);
  const analyticsIncidentClassesRef = useRef<Set<string>>(new Set());
  const analyticsIncidentVerdictRef = useRef<"OK" | "NOT_OK" | null>(null);
  const isLiveDefectLoggingEnabledRef = useRef<boolean>(true);
  const centerGuideSizeRatioRef = useRef<number>(LIVE_CENTER_REGION_DEFAULT_PERCENT / 100);

  const navigate = useNavigate();

  // Removed local getAuthHeaders() - using centralized getAuthHeaders() from @/lib/api/config

  // Get company name
  const companyName = company?.name || profile?.companies?.name || "";
  
  // Get project name from selected project
  const selectedProject = projects.find(
    (p) => String(p.id) === String(selectedProjectId) || String(p.name) === String(selectedProjectId)
  );
  const projectName = selectedProject?.name || "";

  useEffect(() => {
    liveGoodClassNamesRef.current = liveGoodClassNames;
  }, [liveGoodClassNames]);

  useEffect(() => {
    centerGuideSizeRatioRef.current = centerGuideSizePercent / 100;
  }, [centerGuideSizePercent]);

  useEffect(() => {
    isLiveDefectLoggingEnabledRef.current = isLiveDefectLoggingEnabled;
  }, [isLiveDefectLoggingEnabled]);

  const liveRunTotalClasses = useMemo(
    () => Object.keys(liveRunAnalytics.classCounts).length,
    [liveRunAnalytics.classCounts]
  );

  const liveRunPieData = useMemo(
    () => [
      { key: "good", label: "Good Products", count: liveRunAnalytics.goodProducts },
      { key: "bad", label: "Bad Products", count: liveRunAnalytics.badProducts },
    ],
    [liveRunAnalytics.badProducts, liveRunAnalytics.goodProducts]
  );

  const liveRunClassBarData = useMemo(
    () =>
      Object.entries(liveRunAnalytics.classCounts)
        .map(([className, count]) => ({ className, count }))
        .sort((a, b) => b.count - a.count),
    [liveRunAnalytics.classCounts]
  );

  const liveRunAnalyticsChartConfig = useMemo(
    () =>
      ({
        count: {
          label: "Count",
          color: "hsl(var(--primary))",
        },
        good: {
          label: "Good Products",
          color: "hsl(var(--primary))",
        },
        bad: {
          label: "Bad Products",
          color: "hsl(var(--destructive))",
        },
      }) satisfies ChartConfig,
    []
  );

  const resetAnalyticsIncidentTracking = useCallback(() => {
    analyticsIncidentLockRef.current = false;
    analyticsIncidentClassesRef.current = new Set();
    analyticsIncidentVerdictRef.current = null;
  }, []);

  const flushAnalyticsIncident = useCallback(() => {
    const incidentClasses = Array.from(analyticsIncidentClassesRef.current);
    const incidentVerdict = analyticsIncidentVerdictRef.current;

    if (!incidentVerdict || incidentClasses.length === 0) {
      resetAnalyticsIncidentTracking();
      return;
    }

    setLiveRunAnalytics((prev) => {
      const nextClassCounts = { ...prev.classCounts };
      incidentClasses.forEach((className) => {
        nextClassCounts[className] = (nextClassCounts[className] ?? 0) + 1;
      });

      return {
        framesProcessed: prev.framesProcessed + 1,
        totalProducts: prev.totalProducts + 1,
        goodProducts: prev.goodProducts + (incidentVerdict === "OK" ? 1 : 0),
        badProducts: prev.badProducts + (incidentVerdict === "NOT_OK" ? 1 : 0),
        classCounts: nextClassCounts,
        runStartedAt: prev.runStartedAt,
        runEndedAt: prev.runEndedAt,
      };
    });

    resetAnalyticsIncidentTracking();
  }, [resetAnalyticsIncidentTracking]);

  // When the selected model changes — or its classNames payload changes after a refetch — reset live "good classes".
  useEffect(() => {
    if (!selectedModelId) {
      liveGoodClassesInitForModelIdRef.current = null;
      liveGoodClassNamesSigRef.current = null;
      return;
    }
    const m = models.find((x) => modelRowMatchesId(x, selectedModelId));
    if (!m) return;
    const sig = JSON.stringify({ id: selectedModelId, names: m.classNames ?? [] });
    const modelBecameSelected = liveGoodClassesInitForModelIdRef.current !== selectedModelId;
    const classListChanged = liveGoodClassNamesSigRef.current !== sig;
    if (modelBecameSelected || classListChanged) {
      liveGoodClassesInitForModelIdRef.current = selectedModelId;
      liveGoodClassNamesSigRef.current = sig;
      setLiveGoodClassNames(defaultLiveGoodClasses(m.classNames));
    }
  }, [selectedModelId, models]);

  // Snapshot for processFrame (avoids stale closure; includes latest classNames).
  useEffect(() => {
    if (!selectedModelId) {
      selectedModelSnapshotRef.current = null;
      return;
    }
    selectedModelSnapshotRef.current =
      models.find((x) => modelRowMatchesId(x, selectedModelId)) ?? null;
  }, [selectedModelId, models]);

  useEffect(() => {
    setLiveDetectionClassMismatch(null);
  }, [selectedModelId]);

  useEffect(() => {
    if (!import.meta.env.DEV || !selectedModelId) return;
    const m = models.find((x) => modelRowMatchesId(x, selectedModelId));
    if (!m) return;
    console.info("[PredictionPage] live model binding:", {
      selectedModelId,
      resolvedModelId: m.modelId,
      classNames: m.classNames,
    });
  }, [selectedModelId, models]);

  // Persistence helpers
  const saveToStorage = (key: string, value: any) => {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
    } catch {
      // ignore storage errors
    }
  };

  const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const clearStorage = () => {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch {
      // ignore
    }
  };

  // Sync viewMode with URL query parameter when URL changes
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "history") {
      setViewMode("history");
    } else if (tabParam === "live-logs") {
      setViewMode("live-logs");
    }
    // If no tab param, keep current viewMode (initialized from URL on mount)
  }, [searchParams]); // Only depend on searchParams to sync URL -> State

  // Load Live Logs history from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${LIVE_LOGS_HISTORY_KEY}`);
      if (raw) {
        const parsed = JSON.parse(raw) as LiveLogEntry[];
        if (Array.isArray(parsed)) {
          setLiveLogsHistory(parsed.slice(0, LIVE_LOGS_HISTORY_CAP));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Restore inference mode on mount
  useEffect(() => {
    const savedMode = loadFromStorage<InferenceMode>("inferenceMode", "dataset");
    setInferenceMode(savedMode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load projects when company_id is available
  useEffect(() => {
    if (!sessionReady || !profile?.company_id) {
      setProjects([]);
      return;
    }

    const loadProjects = async () => {
      setLoadingProjects(true);
      try {
        const { data: projectsData, error } = await supabase
          .from("projects")
          .select("id, name, description")
          .eq("company_id", profile.company_id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error loading projects:", error);
          return;
        }

        if (projectsData) {
          setProjects(projectsData);
          
          // Restore project selection if available
          const savedProjectId = loadFromStorage<string | null>("projectId", null);
          if (savedProjectId) {
            // Validate that the saved project still exists
            const projectExists = projectsData.some(
              (p) => String(p.id) === String(savedProjectId)
            );
            if (projectExists) {
              setSelectedProjectId(String(savedProjectId));
            } else {
              // Clear invalid project from storage
              saveToStorage("projectId", null);
            }
          }
        }
      } catch (err) {
        console.error("Error loading projects:", err);
      } finally {
        setLoadingProjects(false);
      }
    };

    loadProjects();
  }, [sessionReady, profile?.company_id]);

  // Restore state on mount (after projects are loaded and project is selected)
  // Use a ref to ensure we only restore once per project selection
  useEffect(() => {
    if (!sessionReady || !selectedProjectId || loadingProjects) {
      // Clear selections if no project selected or still loading
      if (!selectedProjectId) {
      setSelectedDatasetId(null);
      setSelectedModelId(null);
        hasRestoredStateRef.current = null;
      }
      return;
    }

    // Only restore once per project selection
    if (hasRestoredStateRef.current === selectedProjectId) {
      return;
    }

    hasRestoredStateRef.current = selectedProjectId;

    const savedDatasetId = loadFromStorage<string | null>("datasetId", null);
    const savedModelId = loadFromStorage<string | null>("modelId", null);
    const savedConfidence = loadFromStorage<number>("confidenceThreshold", 0.25);

    // Only restore dataset/model if they belong to the current project
    // (We'll validate this when fetching - if they don't exist, they'll be cleared)
    if (savedDatasetId) setSelectedDatasetId(savedDatasetId);
    if (savedModelId) setSelectedModelId(savedModelId);
    setConfidenceThreshold(savedConfidence);
  }, [sessionReady, selectedProjectId, loadingProjects]);

  // Restore inference state separately (after functions are defined)
  useEffect(() => {
    if (!sessionReady || !selectedProjectId) return;
    
    const savedInferenceId = loadFromStorage<string | null>("inferenceId", null);
    if (savedInferenceId) {
      setInferenceId(savedInferenceId);
      // Check status immediately - functions are now defined
      void checkInferenceStatus(savedInferenceId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionReady, selectedProjectId]);

  // Fetch datasets
  const fetchDatasets = useCallback(async () => {
    if (!companyName || !projectName || !sessionReady || !selectedProjectId) {
      setDatasets([]);
      return;
    }

    setLoadingDatasets(true);
    try {
      const headers = await getAuthHeaders();
      const qs = new URLSearchParams({
        company: companyName,
        project: projectName,
      });
      const url = apiUrl(`/inference/datasets?${qs.toString()}`);
      const res = await fetch(url, { headers });

      if (!res.ok) {
        if (res.status !== 404) {
          console.error("Failed to fetch datasets:", res.status);
        }
        setDatasets([]);
        // Clear selected dataset if fetch fails
        setSelectedDatasetId(null);
        saveToStorage("datasetId", null);
        return;
      }

      const json = await res.json();
      const datasetsList = Array.isArray(json) ? json : json.datasets || [];
      setDatasets(datasetsList);
      
      // Validate that selected dataset still exists in the list
      setSelectedDatasetId((currentId) => {
        if (currentId) {
          const datasetExists = datasetsList.some(
            (d) => d.datasetId === currentId || d._id === currentId || d.id === currentId
          );
          if (!datasetExists) {
            saveToStorage("datasetId", null);
            return null;
          }
        }
        return currentId;
      });
    } catch (err) {
      console.error("Error fetching datasets:", err);
      setDatasets([]);
      setSelectedDatasetId(null);
      saveToStorage("datasetId", null);
    } finally {
      setLoadingDatasets(false);
    }
  }, [companyName, projectName, sessionReady, selectedProjectId]);

  // Fetch models
  const fetchModels = useCallback(async () => {
    if (!companyName || !projectName || !sessionReady || !selectedProjectId) {
      setModels([]);
      return;
    }

    setLoadingModels(true);
    try {
      const headers = await getAuthHeaders();
      const qs = new URLSearchParams({
        company: companyName,
        project: projectName,
      });
      const url = apiUrl(`/inference/models?${qs.toString()}`);
      const res = await fetch(url, { headers });

      if (!res.ok) {
        if (res.status !== 404) {
          console.error("Failed to fetch models:", res.status);
        }
        setModels([]);
        // Clear selected model if fetch fails
        setSelectedModelId(null);
        saveToStorage("modelId", null);
        return;
      }

      const json = await res.json();
      const rawList: unknown[] = Array.isArray(json)
        ? json
        : json.models || json.data?.models || [];
      const modelsList = rawList.map(normalizeInferenceModelFromApi);
      setModels(modelsList);

      // Validate that selected model still exists in the list
      setSelectedModelId((currentId) => {
        if (currentId) {
          const modelExists = modelsList.some((m) => modelRowMatchesId(m, currentId));
          if (!modelExists) {
            saveToStorage("modelId", null);
            return null;
          }
        }
        return currentId;
      });
    } catch (err) {
      console.error("Error fetching models:", err);
      setModels([]);
      setSelectedModelId(null);
      saveToStorage("modelId", null);
    } finally {
      setLoadingModels(false);
    }
  }, [companyName, projectName, sessionReady, selectedProjectId]);

  // Load datasets and models when project is selected
  useEffect(() => {
    if (sessionReady && companyName && projectName && selectedProjectId) {
      void fetchDatasets();
      void fetchModels();
    } else {
      // Clear datasets and models if no project selected
      setDatasets([]);
      setModels([]);
    }
  }, [sessionReady, companyName, projectName, selectedProjectId, fetchDatasets, fetchModels]);

  // Handle project selection
  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    // Clear dependent selections when project changes
    setSelectedDatasetId(null);
    setSelectedModelId(null);
    saveToStorage("projectId", projectId);
    saveToStorage("datasetId", null);
    saveToStorage("modelId", null);
  };

  // Handle dataset selection
  const handleDatasetSelect = (datasetId: string) => {
    setSelectedDatasetId(datasetId);
    saveToStorage("datasetId", datasetId);
  };

  // Handle inference mode change
  const handleInferenceModeChange = (mode: InferenceMode) => {
    setInferenceMode(mode);
    saveToStorage("inferenceMode", mode);
  };

  // Handle test image additions (UI only – no API changes)
  const handleAddTestFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const allowedExtensions = ["jpg", "jpeg", "png"];
    const incoming = Array.from(files);

    const validFiles = incoming.filter((file) => {
      const ext = file.name.toLowerCase().split(".").pop() || "";
      return allowedExtensions.includes(ext);
    });

    if (validFiles.length !== incoming.length) {
      toast({
        title: "Some files were ignored",
        description: "Only JPG, JPEG, and PNG image files are supported for custom upload.",
        variant: "destructive",
      });
    }

    if (validFiles.length === 0) {
      return;
    }

    setTestFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const next: File[] = [...prev];
      validFiles.forEach((file) => {
        // Avoid duplicate file entries by name
        if (!existingNames.has(file.name)) {
          next.push(file);
          existingNames.add(file.name);
        }
      });
      return next;
    });
  };

  // Handle test video addition (single video, UI only – no API changes)
  const handleAddTestVideo = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const incoming = Array.from(files);

    // Enforce single video selection
    if (incoming.length > 1) {
      toast({
        title: "Only one video allowed",
        description: "Please select a single video file.",
        variant: "destructive",
      });
    }

    const videoFile = incoming[0];
    if (!videoFile) return;

    const allowedVideoExtensions = ["mp4", "mov", "avi", "mkv"];
    const ext = videoFile.name.toLowerCase().split(".").pop() || "";
    if (!allowedVideoExtensions.includes(ext)) {
      toast({
        title: "Unsupported video format",
        description: "Only MP4, MOV, AVI, or MKV video files are supported.",
        variant: "destructive",
      });
      return;
    }

    setTestFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      if (existingNames.has(videoFile.name)) {
        return prev;
      }
      return [...prev, videoFile];
    });
  };

  // Remove a single custom test file by name
  const handleRemoveTestFile = (fileName: string) => {
    setTestFiles((prev) => prev.filter((file) => file.name !== fileName));
  };

  // Handle model selection
  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(modelId);
    saveToStorage("modelId", modelId);
  };

  // Handle confidence threshold change
  const handleConfidenceChange = (value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    setConfidenceThreshold(clamped);
    saveToStorage("confidenceThreshold", clamped);
  };

  const toggleLiveGoodClass = (className: string, checked: boolean) => {
    setLiveGoodClassNames((prev) => {
      if (checked) return prev.includes(className) ? prev : [...prev, className];
      return prev.filter((c) => c !== className);
    });
  };

  // Request camera access
  const requestCameraAccess = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({
        title: "Camera not supported",
        description: "Your browser does not support camera access.",
        variant: "destructive",
      });
      return false;
    }

    setCameraPermission('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user', // Front camera (laptop)
        },
      });

      setCameraStream(stream);
      cameraStreamRef.current = stream; // Also store in ref
      setCameraPermission('granted');
      
      // Attach stream to video element and wait for it to be ready
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        
        // For live streams, use 'playing' event instead of 'loadedmetadata'
        // Live streams don't always fire loadedmetadata reliably
        return new Promise<boolean>((resolve) => {
          let resolved = false;
          
          const onPlaying = () => {
            if (resolved) return;
            resolved = true;
            video.removeEventListener('playing', onPlaying);
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('error', onError);
            
            // Give it a moment to ensure dimensions are set
            setTimeout(() => {
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                console.log(`Video ready: ${video.videoWidth}x${video.videoHeight}`);
                resolve(true);
              } else {
                console.warn("Video element has zero dimensions after playing");
                // Still resolve true - dimensions might update later
                resolve(true);
              }
            }, 100);
          };

          const onLoadedMetadata = () => {
            if (resolved) return;
            // If metadata loads, check dimensions
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              console.log(`Video metadata loaded: ${video.videoWidth}x${video.videoHeight}`);
              if (!resolved) {
                resolved = true;
                video.removeEventListener('playing', onPlaying);
                video.removeEventListener('loadedmetadata', onLoadedMetadata);
                video.removeEventListener('canplay', onCanPlay);
                video.removeEventListener('error', onError);
                resolve(true);
              }
            }
          };

          const onCanPlay = () => {
            if (resolved) return;
            // Try to play if not already playing
            if (video.paused) {
              video.play().catch((err) => {
                console.error("Error playing video in canplay:", err);
              });
            }
          };

          const onError = (err: Event) => {
            if (resolved) return;
            resolved = true;
            video.removeEventListener('playing', onPlaying);
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('error', onError);
            console.error("Video element error:", err);
            resolve(false);
          };

          // Add multiple event listeners for better compatibility
          video.addEventListener('playing', onPlaying);
          video.addEventListener('loadedmetadata', onLoadedMetadata);
          video.addEventListener('canplay', onCanPlay);
          video.addEventListener('error', onError);
          
          // Start playing
          video.play().catch((err) => {
            console.error("Error starting video playback:", err);
            if (!resolved) {
              resolved = true;
              video.removeEventListener('playing', onPlaying);
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('canplay', onCanPlay);
              video.removeEventListener('error', onError);
              resolve(false);
            }
          });

          // Timeout after 5 seconds
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              video.removeEventListener('playing', onPlaying);
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('canplay', onCanPlay);
              video.removeEventListener('error', onError);
              console.warn("Video readiness timeout");
              // Still resolve true - video might work anyway
              resolve(true);
            }
          }, 5000);
        });
      }

      return true;
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraPermission('denied');
      setCameraStream(null);
      cameraStreamRef.current = null;
      
      let errorMessage = "Failed to access camera.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = "Camera permission denied. Please allow camera access in your browser settings.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = "No camera found. Please connect a camera and try again.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = "Camera is already in use by another application.";
      }

      toast({
        title: "Camera access failed",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  };

  // Stop camera stream
  const stopCameraStream = () => {
    // Only stop if we're actually stopping inference
    // Don't stop camera when just starting or during normal operation
    if (cameraStream && !isLiveInferenceRunningRef.current) {
      console.log("Stopping camera stream");
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    // Don't clear video srcObject if inference is still running
    if (videoRef.current && !isLiveInferenceRunningRef.current) {
      videoRef.current.srcObject = null;
    }
    if (!isLiveInferenceRunningRef.current) {
      setCameraPermission('idle');
    }
  };

  // Capture frame from video
  const captureFrame = (): string | null => {
    if (!videoRef.current) {
      console.warn("captureFrame: videoRef.current is null");
      return null;
    }

    if (!canvasRef.current) {
      console.warn("captureFrame: canvasRef.current is null");
      return null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Validate video is ready and has valid dimensions
    if (video.readyState < 2) {
      // Video not ready (HAVE_CURRENT_DATA = 2)
      console.warn("captureFrame: video not ready, readyState:", video.readyState);
      return null;
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      // Video has no dimensions yet
      console.warn("captureFrame: video has zero dimensions", {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight
      });
      return null;
    }
    
    // Set canvas dimensions to match video (or scaled down for optimization)
    const targetWidth = 640; // Optimize: reduce resolution
    const targetHeight = 480;
    
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Draw video frame to canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn("captureFrame: failed to get canvas context");
      return null;
    }

    try {
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

      // Convert to base64 JPEG (quality 0.8 for compression)
      const base64 = canvas.toDataURL('image/jpeg', 0.8);
      
      // Validate base64 string
      if (!base64 || base64.length < 100) {
        console.warn("captureFrame: invalid base64 string", base64?.substring(0, 50));
        return null;
      }
      
      return base64;
    } catch (err) {
      console.error("Error capturing frame:", err);
      return null;
    }
  };

  // Process frame with backend
  const processFrame = async (frameBase64: string, inferenceId?: string) => {
    const currentInferenceId = inferenceId || liveInferenceId;
    if (!currentInferenceId) {
      console.warn("processFrame: no inferenceId");
      return;
    }

    // Skip if previous request is still pending to avoid overwhelming backend
    // But log it so we know frames are being skipped
    if (pendingFrameRequestRef.current) {
      // Skip this frame - previous one still processing
      // This is normal if backend is slow
      return;
    }

    pendingFrameRequestRef.current = true;
    setIsProcessingFrame(true);

    try {
      const headers = await getAuthHeaders();
      const url = apiUrl(`/inference/live/${encodeURIComponent(currentInferenceId)}/frame`);
      
      console.log("Sending frame to backend (overlay mode):", {
        url,
        frameSize: frameBase64.length,
        inferenceId: currentInferenceId,
        timestamp: new Date().toISOString()
      });

      // Ensure all auth headers are explicitly included with validation
      const requestHeaders = buildAuthHeaders(headers, true);

      const res = await fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({
          image: frameBase64,
          confidenceThreshold: confidenceThreshold,
          returnAnnotatedImage: false, // use overlay mode
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.error || `Frame processing failed: ${res.status}`;
        console.error("Frame processing failed:", errorMsg, res.status);
        throw new Error(errorMsg);
      }

      const data: LiveFrameResponse = await res.json();
      const detections = data.detections || [];

      const snap = selectedModelSnapshotRef.current;
      const expectedNames = snap?.classNames;
      if (expectedNames && expectedNames.length > 0) {
        const seen = new Set(detections.map((d) => d.class));
        const unknown = [...seen].filter((c) => !expectedNames.includes(c));
        if (unknown.length > 0) {
          setLiveDetectionClassMismatch(unknown.slice(0, 12).join(", ") + (unknown.length > 12 ? "…" : ""));
        } else {
          setLiveDetectionClassMismatch(null);
        }
      } else {
        setLiveDetectionClassMismatch(null);
      }

      const goodClasses = liveGoodClassNamesRef.current;

      const productDetected =
        goodClasses.length > 0 &&
        detections.some(
          (d) => goodClasses.includes(d.class) && d.confidence >= 0.45
        );

      const defectDetected = detections.some(
        (d) => !goodClasses.includes(d.class) && d.confidence >= 0.35
      );

      // Frame verdict
      let frameVerdict: "NO_PRODUCT" | "OK" | "NOT_OK";

      if (!productDetected) {
        frameVerdict = "NO_PRODUCT";
      } else if (defectDetected) {
        frameVerdict = "NOT_OK";
      } else {
        frameVerdict = "OK";
      }

      const history = verdictHistoryRef.current;
      history.push(frameVerdict);
      if (history.length > 7) history.shift();

      // Count values
      const counts = history.reduce((acc, v) => {
        acc[v] = (acc[v] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      let finalVerdict = verdict;

      // Rules
      if (counts["NOT_OK"] >= 2) {
        finalVerdict = "NOT_OK";
      } else if (counts["OK"] >= 5) {
        finalVerdict = "OK";
      } else if (counts["NO_PRODUCT"] >= 5) {
        finalVerdict = "NO_PRODUCT";
      }

      setVerdict(finalVerdict);

      const imageWidth = data.imageWidth || 640;
      const imageHeight = data.imageHeight || 480;
      const centerRatio = centerGuideSizeRatioRef.current;
      const centerBox = {
        left: imageWidth * ((1 - centerRatio) / 2),
        right: imageWidth * (1 - (1 - centerRatio) / 2),
        top: imageHeight * ((1 - centerRatio) / 2),
        bottom: imageHeight * (1 - (1 - centerRatio) / 2),
      };

      const productDetections = detections
        .filter((d) => goodClasses.includes(d.class) && d.confidence >= 0.45)
        .sort((a, b) => b.confidence - a.confidence);
      const primaryProductDetection = productDetections[0];
      const productInsideCenterRegion = !!primaryProductDetection &&
        primaryProductDetection.bbox[0] >= centerBox.left &&
        primaryProductDetection.bbox[1] >= centerBox.top &&
        primaryProductDetection.bbox[2] <= centerBox.right &&
        primaryProductDetection.bbox[3] <= centerBox.bottom;

      if (finalVerdict === "NO_PRODUCT") {
        if (analyticsIncidentLockRef.current) {
          flushAnalyticsIncident();
        }
      } else if (
        productInsideCenterRegion &&
        (frameVerdict === "OK" || frameVerdict === "NOT_OK")
      ) {
        // Accumulate classes across the whole product incident so defects that
        // appear in later frames are still represented in analytics.
        const qualifyingClassesForFrame = [
          ...new Set(
            detections
              .filter((d) =>
                goodClasses.includes(d.class)
                  ? d.confidence >= 0.45
                  : d.confidence >= 0.35
              )
              .map((d) => d.class || "unknown")
          ),
        ];

        qualifyingClassesForFrame.forEach((className) => {
          analyticsIncidentClassesRef.current.add(className);
        });

        if (frameVerdict === "NOT_OK" || finalVerdict === "NOT_OK") {
          analyticsIncidentVerdictRef.current = "NOT_OK";
        } else if (!analyticsIncidentVerdictRef.current) {
          analyticsIncidentVerdictRef.current = "OK";
        }

        analyticsIncidentLockRef.current = true;
      }

      if (finalVerdict === "NO_PRODUCT") {
        incidentLockRef.current = false;
      } else if (
        isLiveDefectLoggingEnabledRef.current &&
        frameVerdict === "NOT_OK" &&
        !incidentLockRef.current &&
        productInsideCenterRegion
      ) {
        const defects = detections
          .filter((d) => !goodClasses.includes(d.class))
          .sort((a, b) => b.confidence - a.confidence);
        const defectClassesRaw = [...new Set(defects.map((d) => d.class).filter(Boolean))];
        const defectClasses = defectClassesRaw.length > 0 ? defectClassesRaw : ["unknown_defect"];

        const logEntry: LiveDefectLogEntry = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date().toISOString(),
          imageBase64: frameBase64,
          verdict: "NOT_OK",
          defectClasses,
        };

        setLiveDefectLogs((prev) => [logEntry, ...prev].slice(0, LIVE_DEFECT_LOG_CAP));
        incidentLockRef.current = true;
      }
      console.log("Frame processed successfully (overlay mode):", {
        totalDetections: data.totalDetections,
        detectionsCount: data.detections?.length ?? 0,
        detectionClassesSample: detections.slice(0, 8).map((d) => d.class),
        expectedModelClassNames: snap?.classNames,
        modelRowId: snap?.modelId,
        timestamp: new Date().toISOString(),
      });

      // Treat successful live frame processing as user activity for inactivity tracking
      try {
        sessionStorage.setItem("visionm_last_user_activity", Date.now().toString());
      } catch {
        // Ignore storage errors
      }

      // Draw detections on overlay canvas
      const canvas = annotatedCanvasRef.current;
      const video = videoRef.current;
      if (canvas && video) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // ✅ Get container dimensions (entire visible area)
          const containerWidth = video.clientWidth;
          const containerHeight = video.clientHeight;

          // ✅ Get actual video stream dimensions (not the captured frame size)
          const videoWidth = video.videoWidth;
          const videoHeight = video.videoHeight;

          // ✅ Calculate object-contain scaling
          // object-contain scales to fit while maintaining aspect ratio
          // It uses the smaller scale factor to ensure entire video fits
          const scale = Math.min(containerWidth / videoWidth, containerHeight / videoHeight);

          // ✅ Calculate actual displayed video dimensions (excluding letterbox/pillarbox)
          const displayedVideoWidth = videoWidth * scale;
          const displayedVideoHeight = videoHeight * scale;

          // ✅ Calculate offset to center video in container (letterbox/pillarbox)
          const offsetX = (containerWidth - displayedVideoWidth) / 2;
          const offsetY = (containerHeight - displayedVideoHeight) / 2;

          // ✅ Set canvas size to container size (canvas covers entire container including black bars)
          if (containerWidth > 0 && containerHeight > 0) {
            canvas.width = containerWidth;
            canvas.height = containerHeight;
          }

          // Clear previous annotations
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // ✅ Get original image dimensions from API response
          // Should be 640x480 (the size sent to backend)
          const imageWidth = data.imageWidth || 640;
          const imageHeight = data.imageHeight || 480;

          // Safety checks for valid dimensions
          if (imageWidth > 0 && imageHeight > 0 && videoWidth > 0 && videoHeight > 0) {
            // ✅ Scale from original image (640x480) to displayed video area (not container!)
            const scaleX = displayedVideoWidth / imageWidth;
            const scaleY = displayedVideoHeight / imageHeight;

            const detections = data.detections || [];
            detections.forEach((det) => {
              const [x1, y1, x2, y2] = det.bbox;
              
              // ✅ Scale coordinates to displayed video area, then add offset for letterboxing/pillarboxing
              const scaledX1 = (x1 * scaleX) + offsetX;
              const scaledY1 = (y1 * scaleY) + offsetY;
              const scaledX2 = (x2 * scaleX) + offsetX;
              const scaledY2 = (y2 * scaleY) + offsetY;

              const width = scaledX2 - scaledX1;
              const height = scaledY2 - scaledY1;
              const label = `${det.class} ${(det.confidence * 100).toFixed(0)}%`;

              // Draw bounding box using scaled and offset coordinates
              ctx.strokeStyle = "#00FF00";
              ctx.lineWidth = 2;
              ctx.strokeRect(scaledX1, scaledY1, width, height);

              // Draw label background using scaled and offset coordinates
              ctx.font = "bold 14px Arial";
              const textMetrics = ctx.measureText(label);
              const labelWidth = textMetrics.width + 10;
              const labelHeight = 20;
              const labelY = Math.max(offsetY, scaledY1 - labelHeight); // ✅ Ensure label doesn't go above video area

              ctx.fillStyle = "rgba(0,255,0,0.7)";
              ctx.fillRect(scaledX1, labelY, labelWidth, labelHeight);

              ctx.fillStyle = "#000000";
              ctx.fillText(label, scaledX1 + 5, labelY + labelHeight - 6);
            });
          } else {
            // Fallback: use coordinates as-is if dimensions invalid (backward compatibility)
            console.warn("Invalid dimensions, using coordinates as-is", {
              imageWidth,
              imageHeight,
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
              containerWidth,
              containerHeight
            });

            const detections = data.detections || [];
            detections.forEach((det) => {
              const [x1, y1, x2, y2] = det.bbox;
              const width = x2 - x1;
              const height = y2 - y1;
              const label = `${det.class} ${(det.confidence * 100).toFixed(0)}%`;

              ctx.strokeStyle = "#00FF00";
              ctx.lineWidth = 2;
              ctx.strokeRect(x1, y1, width, height);

              ctx.font = "bold 14px Arial";
              const textMetrics = ctx.measureText(label);
              const labelWidth = textMetrics.width + 10;
              const labelHeight = 20;
              const labelY = Math.max(0, y1 - labelHeight);

              ctx.fillStyle = "rgba(0,255,0,0.7)";
              ctx.fillRect(x1, labelY, labelWidth, labelHeight);

              ctx.fillStyle = "#000000";
              ctx.fillText(label, x1 + 5, labelY + labelHeight - 6);
            });
          }
        }
      }
      
      // Update state
      setFrameKey(prev => prev + 1);
      setAnnotatedFrame(null); // no longer used for live overlay
      setCurrentDetections(data.totalDetections ?? (data.detections?.length ?? 0));

      // Update FPS calculation
      const now = Date.now();
      const elapsed = now - lastFrameTimeRef.current;
      if (elapsed > 0) {
        setFps(Math.round(1000 / elapsed));
      }
      lastFrameTimeRef.current = now;

    } catch (err: any) {
      console.error("Frame processing error:", err);
      // Don't show toast for every frame error to avoid spam
      // Only show for critical errors
      if (err?.message?.includes('404') || err?.message?.includes('inference')) {
        toast({
          title: "Inference stopped",
          description: "The live inference session has ended.",
          variant: "destructive",
        });
        handleStopLiveInference();
      }
    } finally {
      setIsProcessingFrame(false);
      pendingFrameRequestRef.current = false;
    }
  };

  const exportLiveDefectLogs = useCallback(async () => {
    if (liveDefectLogs.length === 0) {
      toast({
        title: "No logs to export",
        description: "Run live inference and capture at least one NOT_OK event.",
      });
      return;
    }

    try {
      const { Workbook } = await import("exceljs");
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet("LiveDefectLogs");
      worksheet.columns = [
        { header: "SrNo", key: "srNo", width: 8 },
        { header: "Timestamp", key: "timestamp", width: 24 },
        { header: "Verdict", key: "verdict", width: 12 },
        { header: "DefectClasses", key: "defectClasses", width: 28 },
        { header: "LoggedFrom", key: "loggedFrom", width: 18 },
        { header: "Snapshot", key: "snapshot", width: 28 },
      ];

      liveDefectLogs.forEach((entry, idx) => {
        const rowNumber = idx + 2;
        worksheet.addRow({
          srNo: idx + 1,
          timestamp: new Date(entry.timestamp).toLocaleString(),
          verdict: entry.verdict,
          defectClasses: entry.defectClasses.join(", "),
          loggedFrom: "Live Camera",
          snapshot: "",
        });

        const imageExtension = entry.imageBase64.includes("image/png") ? "png" : "jpeg";
        const imageId = workbook.addImage({
          base64: entry.imageBase64,
          extension: imageExtension,
        });
        worksheet.addImage(imageId, {
          tl: { col: 6, row: rowNumber - 1 + 0.08 },
          ext: { width: 160, height: 90 },
          editAs: "oneCell",
        });
        worksheet.getRow(rowNumber).height = 72;
      });

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };
      headerRow.height = 24;
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.alignment = { vertical: "middle", wrapText: true };
        }
      });

      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `live-defect-logs-${stamp}.xlsx`;
      const wbArray = await workbook.xlsx.writeBuffer();
      const blob = new Blob([wbArray], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export complete",
        description: `Exported ${liveDefectLogs.length} log entries to Excel.`,
      });
    } catch (error) {
      console.error("Failed to export live defect logs:", error);
      toast({
        title: "Export failed",
        description: "Could not generate Excel file. Please try again.",
        variant: "destructive",
      });
    }
  }, [liveDefectLogs, toast]);

  // Start frame capture loop
  const startFrameCaptureLoop = (inferenceId: string) => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }

    // Store in ref immediately so it's available in the closure
    liveInferenceIdRef.current = inferenceId;
    isLiveInferenceRunningRef.current = true;

    // Verify video is ready before starting
    if (!videoRef.current) {
      console.warn("Video element not available for frame capture");
      return;
    }

    const video = videoRef.current;
    console.log("Starting frame capture loop", {
      readyState: video.readyState,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      inferenceId
    });

    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn("Video not ready yet, waiting for video to be ready...", {
        readyState: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight
      });
      // Wait a bit and retry
      setTimeout(() => {
        if (isLiveInferenceRunningRef.current && liveInferenceIdRef.current) {
          startFrameCaptureLoop(liveInferenceIdRef.current);
        }
      }, 500);
      return;
    }

    // Target: 10-15 FPS (capture every 66-100ms)
    const captureInterval = 100; // 10 FPS (100ms)
    
    let frameCount = 0;
    
    // Define capture function that will be called by interval
    const captureAndProcess = () => {
      // Use refs instead of state - they're immediately available
      const currentInferenceId = liveInferenceIdRef.current;
      const isRunning = isLiveInferenceRunningRef.current;
      
      if (!isRunning || !currentInferenceId) {
        console.log("Stopping capture loop - inference not running", {
          isRunning,
          currentInferenceId
        });
        if (captureIntervalRef.current) {
          clearInterval(captureIntervalRef.current);
          captureIntervalRef.current = null;
        }
        return;
      }
      
      // Double-check video is still ready
      if (!videoRef.current) {
        console.warn("Video element lost during capture");
        return;
      }

      const currentVideo = videoRef.current;
      if (currentVideo.readyState < 2 || 
          currentVideo.videoWidth === 0 || currentVideo.videoHeight === 0) {
        if (frameCount < 3) {
          console.warn("Video not ready during capture", {
            readyState: currentVideo.readyState,
            videoWidth: currentVideo.videoWidth,
            videoHeight: currentVideo.videoHeight
          });
        }
        return;
      }
      
      const frame = captureFrame();
      if (frame) {
        frameCount++;
        if (frameCount <= 5 || frameCount % 10 === 0) {
          console.log(`[Frame ${frameCount}] Captured frame, size: ${frame.length} bytes`);
        }
        // Use currentInferenceId from ref
        void processFrame(frame, currentInferenceId);
      } else {
        if (frameCount < 5) {
          console.warn(`[Frame ${frameCount}] captureFrame returned null`);
        }
      }
    };

    // Initial capture
    console.log("Starting initial frame capture...");
    captureAndProcess();

    // Set up interval - this will continue capturing frames continuously
    // Use arrow function to maintain closure over captureAndProcess
    captureIntervalRef.current = setInterval(() => {
      // Double-check we're still running using refs
      if (!isLiveInferenceRunningRef.current || !liveInferenceIdRef.current) {
        console.log("Stopping capture loop - inference stopped");
        if (captureIntervalRef.current) {
          clearInterval(captureIntervalRef.current);
          captureIntervalRef.current = null;
        }
        return;
      }
      // Call the capture function
      captureAndProcess();
    }, captureInterval) as unknown as number;
    
    console.log("Frame capture loop started with interval:", captureInterval, "ms");
  };

  // Start live inference
  const handleStartLiveInference = async () => {
    if (!selectedModelId) {
      toast({
        title: "Model required",
        description: "Please select a model before starting live inference.",
        variant: "destructive",
      });
      return;
    }

    const modelForLive = models.find((x) => modelRowMatchesId(x, selectedModelId));
    if (
      modelForLive?.classNames &&
      modelForLive.classNames.length > 0 &&
      liveGoodClassNames.length === 0
    ) {
      toast({
        title: "Good classes required",
        description: "Select at least one class that counts as a good product for the live verdict.",
        variant: "destructive",
      });
      return;
    }

    setLiveDetectionClassMismatch(null);
    setLiveDefectLogs([]);
    setShowRunAnalytics(false);
    setLiveRunAnalytics({
      framesProcessed: 0,
      totalProducts: 0,
      goodProducts: 0,
      badProducts: 0,
      classCounts: {},
      runStartedAt: null,
      runEndedAt: null,
    });
    setCenterGuideSizePercent(LIVE_CENTER_REGION_DEFAULT_PERCENT);
    incidentLockRef.current = false;
    resetAnalyticsIncidentTracking();

    // Request camera access first and wait for video to be ready
    const cameraGranted = await requestCameraAccess();
    if (!cameraGranted) {
      toast({
        title: "Camera not ready",
        description: "Failed to initialize camera. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Additional check: ensure video element has valid dimensions
    if (videoRef.current) {
      const video = videoRef.current;
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        // Wait a bit more for video to initialize
        await new Promise(resolve => setTimeout(resolve, 300));
        
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          toast({
            title: "Camera initialization failed",
            description: "Camera stream is not ready. Please try again.",
            variant: "destructive",
          });
          stopCameraStream();
          return;
        }
      }
    }

    setStartingInference(true);
    try {
      const headers = await getAuthHeaders();
      const url = apiUrl('/inference/live/start');
      
      // Ensure all auth headers are explicitly included with validation
      const requestHeaders = buildAuthHeaders(headers, true);
      
      const res = await fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({
          modelId: selectedModelId,
          confidenceThreshold: confidenceThreshold,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to start live inference: ${res.status}`);
      }

      const data = await res.json();
      const newInferenceId = data.inferenceId;
      const sessionThreshold = typeof data.confidenceThreshold === "number" ? data.confidenceThreshold : confidenceThreshold;

      if (!newInferenceId) {
        throw new Error("No inference ID returned from server");
      }

      // Update refs immediately (before state updates)
      liveInferenceIdRef.current = newInferenceId;
      isLiveInferenceRunningRef.current = true;

      // Set state (include confidence threshold in use for optional display)
      setLiveInferenceId(newInferenceId);
      setIsLiveInferenceRunning(true);
      setLiveSessionConfidenceThreshold(sessionThreshold);
      setAnnotatedFrame(null);
      setCurrentDetections(0);
      setLiveRunAnalytics((prev) => ({
        ...prev,
        runStartedAt: new Date().toISOString(),
        runEndedAt: null,
      }));

      toast({
        title: "Live inference started",
        description: "Camera feed is now being processed in real-time.",
      });

      // Start frame capture loop immediately with the inferenceId
      // Refs are already set, so the loop will work
      startFrameCaptureLoop(newInferenceId);

    } catch (err: any) {
      console.error("Error starting live inference:", err);
      toast({
        title: "Failed to start live inference",
        description: err?.message || "An unexpected error occurred.",
        variant: "destructive",
      });
      stopCameraStream();
    } finally {
      setStartingInference(false);
    }
  };

  // Stop live inference
  const handleStopLiveInference = async () => {
    // Stop frame capture loop
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }

    // Update refs immediately
    isLiveInferenceRunningRef.current = false;
    const currentInferenceId = liveInferenceIdRef.current;

    // Stop camera stream
    stopCameraStream();

    // Stop backend inference if inferenceId exists
    if (currentInferenceId) {
      try {
        const headers = await getAuthHeaders();
        const url = apiUrl(`/inference/live/${encodeURIComponent(currentInferenceId)}/stop`);
        
        await fetch(url, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
        });
      } catch (err) {
        console.error("Error stopping live inference:", err);
        // Don't show error toast - user is stopping anyway
      }
    }

    // Reset state and refs
    setLiveInferenceId(null);
    setIsLiveInferenceRunning(false);
    setLiveSessionConfidenceThreshold(null);
    setAnnotatedFrame(null);
    setFrameKey(0);
    setCurrentDetections(0);
    setFps(0);
    pendingFrameRequestRef.current = false;
    liveInferenceIdRef.current = null;
    setLiveDetectionClassMismatch(null);
    incidentLockRef.current = false;
    if (analyticsIncidentLockRef.current) {
      flushAnalyticsIncident();
    } else {
      resetAnalyticsIncidentTracking();
    }
    setLiveRunAnalytics((prev) => ({
      ...prev,
      runEndedAt: new Date().toISOString(),
    }));

    toast({
      title: "Live inference stopped",
      description: "Camera feed processing has been stopped.",
    });
  };

  // Check inference status
  const checkInferenceStatus = async (id: string) => {
    try {
      const headers = await getAuthHeaders();
      const url = apiUrl(`/inference/${encodeURIComponent(id)}/status`);
      // Ensure all auth headers are explicitly included with validation
      const requestHeaders = buildAuthHeaders(headers, false);
      
      const res = await fetch(url, { headers: requestHeaders });

      if (!res.ok) {
        if (res.status === 404) {
          // Inference not found, clear it
          setInferenceId(null);
          setInferenceStatus("idle");
          clearStorage();
          return;
        }
        throw new Error(`Status check failed: ${res.status}`);
      }

      const data: InferenceStatus = await res.json();
      setInferenceStatus(data.status);
      
      // Handle nested progress structure from backend
      if (data.progress !== undefined) {
        if (typeof data.progress === "object" && data.progress !== null) {
          // Backend nested structure: { progress: { totalImages, processedImages, progressPercent } }
          const progressObj = data.progress as { totalImages?: number; processedImages?: number; progressPercent?: number };
          if (progressObj.progressPercent !== undefined) {
            setInferenceProgress(progressObj.progressPercent);
          }
          if (progressObj.processedImages !== undefined) {
            setProcessedImages(progressObj.processedImages);
          }
          if (progressObj.totalImages !== undefined) {
            setTotalImages(progressObj.totalImages);
          }
        } else if (typeof data.progress === "number") {
          // Legacy flat structure
          setInferenceProgress(data.progress);
        }
      }
      
      // Fallback to top-level fields (legacy support)
      if (data.processedImages !== undefined) {
        setProcessedImages(data.processedImages);
      }
      if (data.totalImages !== undefined) {
        setTotalImages(data.totalImages);
      }

      // Save state
      const progressValue = typeof data.progress === "object" && data.progress !== null
        ? (data.progress as { progressPercent?: number }).progressPercent ?? 0
        : (typeof data.progress === "number" ? data.progress : 0);
      const processedValue = data.processedImages ?? (typeof data.progress === "object" && data.progress !== null ? (data.progress as { processedImages?: number }).processedImages ?? 0 : 0);
      const totalValue = data.totalImages ?? (typeof data.progress === "object" && data.progress !== null ? (data.progress as { totalImages?: number }).totalImages ?? 0 : 0);
      saveToStorage("status", data.status);
      saveToStorage("progress", progressValue);
      saveToStorage("processedImages", processedValue);
      saveToStorage("totalImages", totalValue);

      // Stop polling if completed/failed/cancelled
      if (["completed", "failed", "cancelled"].includes(data.status)) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }

        if (data.status === "completed") {
          // Fetch results
          void fetchResults(id);
        } else if (data.status === "failed" || data.status === "cancelled") {
          // Clear inference ID on failure
          setInferenceId(null);
          clearStorage();
        }
      }
    } catch (err: any) {
      console.error("Error checking inference status:", err);
      if (err?.message?.includes("404")) {
        setInferenceId(null);
        setInferenceStatus("idle");
        clearStorage();
      }
    }
  };

  // Start polling
  const startPolling = (id: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    // Check immediately
    void checkInferenceStatus(id);

    // Then poll every 2-3 seconds
    const interval = setInterval(() => {
      void checkInferenceStatus(id);
    }, 2500);
    pollIntervalRef.current = interval as unknown as number;
  };

  // Cancel inference
  const cancelInference = async () => {
    if (!inferenceId) return;

    setCancellingInference(true);
    try {
      const headers = await getAuthHeaders();
      const url = apiUrl(`/inference/${encodeURIComponent(inferenceId)}/cancel`);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.error || `Failed to cancel inference: ${res.status}`;

        // Handle specific error cases
        if (res.status === 400) {
          toast({
            title: "Cannot cancel",
            description: errorMessage,
            variant: "destructive",
          });
        } else if (res.status === 404) {
          toast({
            title: "Inference not found",
            description: "The inference job was not found.",
            variant: "destructive",
          });
          // Clear invalid inference ID
          setInferenceId(null);
          setInferenceStatus("idle");
          clearStorage();
        } else {
          throw new Error(errorMessage);
        }
        return;
      }

      const data = await res.json();

      // Stop polling immediately
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      // Update status to cancelled
      setInferenceStatus("cancelled");

      // Clear persisted state
      setInferenceId(null);
      clearStorage();

      toast({
        title: "Inference cancelled",
        description: data.message || "Inference job cancelled successfully.",
      });
    } catch (err: any) {
      console.error("Error cancelling inference:", err);
      toast({
        title: "Cancel failed",
        description: err?.message || "Could not cancel inference.",
        variant: "destructive",
      });
    } finally {
      setCancellingInference(false);
    }
  };

  // Delete inference
  const deleteInference = async () => {
    if (!inferenceId) return;

    setDeletingInference(true);
    try {
      const headers = await getAuthHeaders();
      const url = apiUrl(`/inference/${encodeURIComponent(inferenceId)}`);
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.error || `Failed to delete inference: ${res.status}`;

        // Handle specific error cases
        if (res.status === 400) {
          toast({
            title: "Cannot delete",
            description: errorData.message || "Cannot delete a running or queued job. Please cancel it first.",
            variant: "destructive",
          });
        } else if (res.status === 404) {
          toast({
            title: "Inference not found",
            description: "The inference job was not found. It may have already been deleted.",
            variant: "destructive",
          });
          // Clear invalid inference ID
          setInferenceId(null);
          setInferenceStatus("idle");
          clearStorage();
        } else {
          throw new Error(errorMessage);
        }
        return;
      }

      const data = await res.json();

      // Clear all inference-related state
      setInferenceId(null);
      setInferenceStatus("idle");
      setInferenceProgress(0);
      setProcessedImages(0);
      setTotalImages(0);
      setResults(null);
      clearStorage();

      toast({
        title: "Inference deleted",
        description: data.message || "Inference job and results deleted successfully.",
      });

      // Refresh history list if in history view
      if (viewMode === "history") {
        void fetchPastInferences();
      }

      // Scroll to top to show configuration section
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error("Error deleting inference:", err);
      toast({
        title: "Delete failed",
        description: err?.message || "Could not delete inference.",
        variant: "destructive",
      });
    } finally {
      setDeletingInference(false);
      setShowDeleteDialog(false);
    }
  };

  // Fetch past inference jobs
  const fetchPastInferences = useCallback(async () => {
    if (!companyName || !projectName || !sessionReady || !selectedProjectId) {
      setPastInferences([]);
      return;
    }

    setLoadingPastInferences(true);
    try {
      const headers = await getAuthHeaders();
      const qs = new URLSearchParams({
        company: companyName,
        project: projectName,
      });
      if (historyStatusFilter && historyStatusFilter !== "all") {
        qs.append("status", historyStatusFilter);
      }
      const url = apiUrl(`/inference/history?${qs.toString()}`);
      const res = await fetch(url, { headers });

      if (!res.ok) {
        if (res.status !== 404) {
          console.error("Failed to fetch past inferences:", res.status);
        }
        setPastInferences([]);
        return;
      }

      const json = await res.json();
      const jobsList = Array.isArray(json.inferenceJobs) ? json.inferenceJobs : (json.inferenceJobs || []);
      // Hide live-camera sessions from History tab by request; keep only non-live jobs.
      const nonLiveJobs = jobsList.filter((job: InferenceJob) => {
        const source = (job.sourceType || "").toLowerCase();
        return source !== "live" && source !== "live_camera";
      });
      setPastInferences(nonLiveJobs);
    } catch (err) {
      console.error("Error fetching past inferences:", err);
      setPastInferences([]);
    } finally {
      setLoadingPastInferences(false);
    }
  }, [companyName, projectName, sessionReady, selectedProjectId, historyStatusFilter]);

  // Fetch past inferences when in history view and project is selected
  useEffect(() => {
    if (viewMode === "history" && sessionReady && companyName && projectName && selectedProjectId) {
      void fetchPastInferences();
    }
  }, [viewMode, sessionReady, companyName, projectName, selectedProjectId, historyStatusFilter, fetchPastInferences]);

  // Normalize API defectClasses to { className, count?, confidence? }[]
  const normalizeDefectClasses = useCallback(
    (raw: Array<{ className: string; count?: number; confidence?: number } | string> | undefined): Array<{ className: string; count?: number; confidence?: number }> => {
      if (!Array.isArray(raw)) return [];
      return raw.map((item) =>
        typeof item === "string"
          ? { className: item }
          : { className: item.className, count: item.count, confidence: item.confidence }
      );
    },
    []
  );

  // Fetch latest live log from edge API and optionally append to history
  const fetchLiveLogsLatest = useCallback(async () => {
    if (!sessionReady) return;
    setLiveLogsLoading(true);
    setLiveLogsError(null);
    try {
      let headers = await getAuthHeaders();
      // Backend requires X-User-Id; ensure it is always set (fallback from profile if needed)
      const headersObj = headers as Record<string, string>;
      if (headersObj && (typeof headersObj === "object") && !Array.isArray(headersObj)) {
        if (!headersObj["X-User-Id"] && profile?.id) {
          headersObj["X-User-Id"] = profile.id;
        }
        if (!headersObj["X-User-Id"]) {
          setLiveLogsError("Session required for live logs. Please sign in again.");
          setLiveLogsLoading(false);
          return;
        }
      }
      const url = apiUrl("/inference/edge/live");
      const res = await fetch(url, { headers });

      // 404 = endpoint not implemented yet; stop polling to avoid console/network spam
      if (res.status === 404) {
        setLiveLogsLoading(false);
        setLiveLogsEndpointUnavailable(true);
        if (liveLogsPollIntervalRef.current) {
          clearInterval(liveLogsPollIntervalRef.current);
          liveLogsPollIntervalRef.current = null;
        }
        return;
      }

      if (res.status === 204) {
        setLiveLogsLoading(false);
        return;
      }

      if (res.status === 401) {
        setLiveLogsLoading(false);
        setLiveLogsEndpointUnavailable(true);
        if (liveLogsPollIntervalRef.current) {
          clearInterval(liveLogsPollIntervalRef.current);
          liveLogsPollIntervalRef.current = null;
        }
        try {
          const body = await res.json();
          const msg = body?.message || body?.error || "Authentication required for live logs.";
          setLiveLogsError(msg);
        } catch {
          setLiveLogsError("Authentication required for live logs.");
        }
        return;
      }

      if (!res.ok) {
        const errText = await res.text();
        setLiveLogsError(errText || `Failed to fetch live logs (${res.status})`);
        setLiveLogsLoading(false);
        return;
      }

      const data = await res.json();
      const timestamp = data?.timestamp ?? new Date().toISOString();
      const imageBase64 = data?.imageBase64 ?? "";
      const defectClasses = normalizeDefectClasses(data?.defectClasses);

      if (!imageBase64 && defectClasses.length === 0) {
        setLiveLogsLoading(false);
        return;
      }

      const entry: LiveLogEntry = {
        id: `${timestamp}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp,
        imageBase64: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
        defectClasses,
      };

      setLiveLogsLatest(entry);

      // Only append to history when this is a new entry (avoid duplicates from repeated polls)
      const lastAdded = liveLogsLastAddedTimestampRef.current;
      if (lastAdded !== entry.timestamp) {
        liveLogsLastAddedTimestampRef.current = entry.timestamp;
        setLiveLogsHistory((prev) => {
          const next = [entry, ...prev].slice(0, LIVE_LOGS_HISTORY_CAP);
          try {
            localStorage.setItem(`${STORAGE_PREFIX}${LIVE_LOGS_HISTORY_KEY}`, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch live logs";
      setLiveLogsError(message);
    } finally {
      setLiveLogsLoading(false);
    }
  }, [sessionReady, profile?.id, normalizeDefectClasses]);

  // Poll live logs every 5s when Live Logs tab is active; stop on 404/401 to avoid spam
  useEffect(() => {
    if (viewMode !== "live-logs") {
      if (liveLogsPollIntervalRef.current) {
        clearInterval(liveLogsPollIntervalRef.current);
        liveLogsPollIntervalRef.current = null;
      }
      setLiveLogsEndpointUnavailable(false);
      return;
    }
    if (liveLogsEndpointUnavailable) {
      if (liveLogsPollIntervalRef.current) {
        clearInterval(liveLogsPollIntervalRef.current);
        liveLogsPollIntervalRef.current = null;
      }
      return;
    }
    void fetchLiveLogsLatest();
    const interval = setInterval(() => {
      void fetchLiveLogsLatest();
    }, LIVE_LOGS_POLL_INTERVAL_MS);
    liveLogsPollIntervalRef.current = interval as unknown as number;
    return () => {
      if (liveLogsPollIntervalRef.current) {
        clearInterval(liveLogsPollIntervalRef.current);
        liveLogsPollIntervalRef.current = null;
      }
    };
  }, [viewMode, liveLogsEndpointUnavailable, fetchLiveLogsLatest]);

  // View results for a past inference (navigate to dedicated details page)
  const loadPastInferenceResults = (inferenceId: string) => {
    setSelectedPastInferenceId(inferenceId);
    navigate(`/project/prediction/history/${encodeURIComponent(inferenceId)}`);
  };

  // Helper function to fetch image as blob with authentication
  const fetchImageAsObjectUrl = useCallback(async (imageUrl: string): Promise<string | null> => {
    // Check cache first
    if (imageObjectUrlCache.current.has(imageUrl)) {
      return imageObjectUrlCache.current.get(imageUrl) || null;
    }

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(imageUrl, { headers });

      if (!res.ok) {
        console.warn(`Failed to fetch image: ${imageUrl}`, res.status);
        return null;
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      imageObjectUrlCache.current.set(imageUrl, objectUrl);
      return objectUrl;
    } catch (error) {
      console.error("Error fetching image:", error);
      return null;
    }
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      imageObjectUrlCache.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      imageObjectUrlCache.current.clear();
    };
  }, []);

  // Authenticated Image Component
  const AuthenticatedImage: React.FC<{
    src: string;
    alt: string;
    className?: string;
    onClick?: () => void;
    style?: React.CSSProperties;
  }> = ({ src, alt, className, onClick, style }) => {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
      let isMounted = true;
      let currentObjectUrl: string | null = null;

      const loadImage = async () => {
        try {
          setLoading(true);
          setError(false);
          const url = await fetchImageAsObjectUrl(src);
          if (isMounted) {
            currentObjectUrl = url;
            setObjectUrl(url);
            setLoading(false);
            if (!url) {
              setError(true);
            }
          }
        } catch (err) {
          if (isMounted) {
            setError(true);
            setLoading(false);
          }
        }
      };

      loadImage();

      return () => {
        isMounted = false;
        // Cleanup: If component unmounts before image loads and URL was created but not cached,
        // revoke it to prevent memory leak
        if (currentObjectUrl && !imageObjectUrlCache.current.has(src)) {
          try {
            URL.revokeObjectURL(currentObjectUrl);
          } catch (err) {
            // Ignore errors when revoking (e.g., already revoked)
            console.warn("Error revoking object URL:", err);
          }
        }
      };
    }, [src, fetchImageAsObjectUrl]);

    if (error) {
      return (
        <div className={`${className} bg-muted flex items-center justify-center`} style={style}>
          <span className="text-xs text-muted-foreground">Failed to load</span>
        </div>
      );
    }

    if (loading || !objectUrl) {
      return (
        <div className={`${className} bg-muted flex items-center justify-center`} style={style}>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    return (
      <img
        src={objectUrl}
        alt={alt}
        className={className}
        onClick={onClick}
        style={style}
        loading="lazy"
      />
    );
  };

  // Helper function to normalize annotated images from either structure
  const normalizeAnnotatedImages = (
    images: any,
    inferenceId: string
  ): Array<{ filename: string; url: string; tag: string; detections?: any[] }> => {
    if (!images) return [];
    
    // Check if new structure (object with good/defect/all)
    if (images && typeof images === 'object' && !Array.isArray(images) && 'all' in images) {
      // New structure: use 'all' array (already filtered by backend)
      const allImages = images.all || [];
      return allImages.map((img: any) => {
        const rawPath =
          img.url && img.url.startsWith("/api/")
            ? img.url.slice(4)
            : img.url ||
              `/inference/${encodeURIComponent(inferenceId)}/image/${encodeURIComponent(img.filename)}`;
        return {
          ...img,
          url: apiUrl(rawPath),
          tag: img.tag || 'unreviewed',
        };
      });
    } else if (Array.isArray(images)) {
      // Old structure: flat array
      return images.map((img: any) => {
        const rawPath =
          img.url && img.url.startsWith("/api/")
            ? img.url.slice(4)
            : img.url ||
              `/inference/${encodeURIComponent(inferenceId)}/image/${encodeURIComponent(img.filename)}`;
        return {
          ...img,
          url: apiUrl(rawPath),
          tag: img.tag || 'unreviewed',
        };
      });
    }
    
    return [];
  };

  // Helper function to normalize videos from backend response
  const normalizeVideos = (
    videos: any[] | undefined,
    inferenceId: string
  ): Array<{ filename: string; url: string; fileType?: string }> => {
    if (!videos || !Array.isArray(videos)) return [];

    return videos.map((vid) => {
      // Ensure filename is always present
      const filename = vid.filename || "";
      
      // Construct URL: videos are always in annotated/ folder, no folder query param needed
      const rawPath = vid.url && typeof vid.url === "string" && vid.url.startsWith("/api/")
        ? vid.url.slice(4) // remove leading "/api"
        : vid.url || `/inference/${encodeURIComponent(inferenceId)}/image/${encodeURIComponent(filename)}`;

      // Remove any folder query parameters (videos don't use folder param)
      const cleanPath = rawPath.split('?')[0];

      return {
        filename,
        url: apiUrl(cleanPath),
        fileType: "video",
      };
    });
  };

  // Fetch results
  const fetchResults = async (id: string, filter: 'all' | 'good' | 'defect' = 'all') => {
    setLoadingResults(true);
    try {
      const headers = await getAuthHeaders();
      const url = apiUrl(`/inference/${encodeURIComponent(id)}/results?filter=${filter}`);
      const res = await fetch(url, { headers });

      if (!res.ok) {
        if (res.status === 400 || res.status === 404) {
          toast({
            title: "Results not available",
            description: "Results are not ready yet or not found.",
            variant: "destructive",
          });
        }
        return;
      }

      const response = await res.json();
      // Backend returns nested structure: { results: { ... } }
      // Extract the inner results object
      const data = response.results || response;

      // Normalize annotated images from either structure
      const normalizedImages = normalizeAnnotatedImages(data.annotatedImages, id);
      // Normalize videos (if any) from new response structure
      const normalizedVideos = normalizeVideos(
        (data.videos as any[]) || (data.metadata?.videos as any[]) || [],
        id
      );

      // Normalize detectionsByClass to use consistent field names
      const normalizedData: InferenceResults = {
        ...data,
        detectionsByClass:
          data.detectionsByClass?.map((item: any) => ({
            ...item,
            averageConfidence: item.avgConfidence ?? item.averageConfidence ?? 0,
          })) || [],
        annotatedImages: normalizedImages,
        videos: normalizedVideos,
        statistics: data.statistics || {
          total: normalizedImages.length + normalizedVideos.length,
          totalImages: normalizedImages.length,
          totalVideos: normalizedVideos.length,
          good: 0,
          defect: 0,
          hasTags: false,
        },
        metadata: data.metadata, // Preserve metadata for video detection info
      };

      setResults(normalizedData);
    } catch (err: any) {
      console.error("Error fetching results:", err);
      toast({
        title: "Failed to load results",
        description: err?.message || "Could not fetch inference results.",
        variant: "destructive",
      });
    } finally {
      setLoadingResults(false);
    }
  };

  // Start inference
  const handleStartInference = async () => {
    // Check if live camera is active
    if (liveCameraMode) {
      toast({
        title: "Live camera active",
        description: "Please stop live camera inference before starting a new inference job.",
        variant: "destructive",
      });
      return;
    }

    // Model is always required
    if (!selectedModelId) {
      toast({
        title: "Model required",
        description: "Please select a model before starting inference.",
        variant: "destructive",
      });
      return;
    }

    if (inferenceMode === "dataset") {
      if (!selectedDatasetId) {
        toast({
          title: "Dataset required",
          description: "Please select a dataset when using dataset mode.",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Custom images mode
      if (testFiles.length === 0) {
        toast({
          title: "Test images required",
          description: "Add at least one image or video when using custom upload mode.",
          variant: "destructive",
        });
        return;
      }
    }

    setStartingInference(true);
    try {
      const headers = await getAuthHeaders();
      const url = apiUrl("/inference/start");

      let res: Response;

      if (inferenceMode === "dataset") {
        // Existing JSON-based dataset inference
        // Ensure all auth headers are explicitly included with validation
        const requestHeaders = buildAuthHeaders(headers, true);
        
        res = await fetch(url, {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify({
            modelId: selectedModelId,
            datasetId: selectedDatasetId,
            confidenceThreshold: confidenceThreshold,
          }),
        });
      } else {
        // New custom upload inference using multipart/form-data
        const formData = new FormData();
        formData.append("modelId", selectedModelId);
        formData.append("confidenceThreshold", confidenceThreshold.toString());
        testFiles.forEach((file) => {
          formData.append("files", file);
        });

        // For FormData, ensure auth headers are included but don't set Content-Type
        const requestHeaders = buildAuthHeaders(headers, false);

        res = await fetch(url, {
          method: "POST",
          headers: requestHeaders,
          body: formData,
        });
      }

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        let errorMessage = `Failed to start inference: ${res.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch {
          if (errorText) errorMessage = errorText;
        }

        if (res.status === 400 || res.status === 404) {
          toast({
            title: "Invalid request",
            description: errorMessage,
            variant: "destructive",
          });
        } else {
          throw new Error(errorMessage);
        }
        return;
      }

      const json = await res.json();
      const newInferenceId = json.inferenceId || json.id || json._id;
      if (!newInferenceId) {
        throw new Error("No inference ID returned from server");
      }

      setInferenceId(newInferenceId);
      setInferenceStatus("queued");
      setInferenceProgress(0);
      setResults(null);
      saveToStorage("inferenceId", newInferenceId);
      saveToStorage("status", "queued");

      toast({
        title: "Inference started",
        description: "Prediction job has been queued.",
      });

      // Start polling
      startPolling(newInferenceId);
    } catch (err: any) {
      console.error("Error starting inference:", err);
      toast({
        title: "Failed to start inference",
        description: err?.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setStartingInference(false);
    }
  };

  // Refetch results when filter changes (only for new jobs with tags)
  useEffect(() => {
    if (!inferenceId || !results || results.statistics?.hasTags !== true) return;
    if (inferenceStatus !== 'completed') return;
    
    // Debounce to avoid too many requests
    const timeoutId = setTimeout(() => {
      void fetchResults(inferenceId, imageFilter);
    }, 300);
    
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageFilter]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  // Cleanup live camera on unmount only (not on state changes)
  useEffect(() => {
    return () => {
      // Only cleanup on component unmount, not on state changes
      console.log("Component unmounting - cleaning up live camera");
      
      // Stop frame capture
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
      
      // Stop camera stream using refs (not state) to avoid dependency issues
      const currentStream = cameraStreamRef.current;
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        cameraStreamRef.current = null;
      }
      
      // Try to stop backend inference if running (fire and forget)
      const currentInferenceId = liveInferenceIdRef.current;
      const isRunning = isLiveInferenceRunningRef.current;
      if (currentInferenceId && isRunning) {
        getAuthHeaders().then(headers => {
          const url = apiUrl(`/inference/live/${encodeURIComponent(currentInferenceId)}/stop`);
          // Ensure all auth headers are explicitly included with validation
          try {
            const requestHeaders = buildAuthHeaders(headers, true);
            fetch(url, {
              method: 'POST',
              headers: requestHeaders,
            }).catch(() => {
              // Ignore errors during cleanup
            });
          } catch (err) {
            // Ignore auth errors during cleanup
            console.warn("Failed to build auth headers during cleanup:", err);
          }
        }).catch(() => {
          // Ignore errors during cleanup
        });
      }
    };
    // Empty dependency array - only run on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attach camera stream to video element when stream is available
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      const video = videoRef.current;
      // Only attach if not already attached or if srcObject is null
      if (!video.srcObject || video.srcObject !== cameraStream) {
        console.log("Attaching stream to video element");
        video.srcObject = cameraStream;
        
        video.play().catch((err) => {
          console.error("Error playing video in useEffect:", err);
        });
      }
    }
  }, [cameraStream]);

  // Pause/resume camera when tab becomes hidden/visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isLiveInferenceRunning) {
        // Pause frame capture when tab is hidden
        if (captureIntervalRef.current) {
          clearInterval(captureIntervalRef.current);
          captureIntervalRef.current = null;
        }
      } else if (!document.hidden && isLiveInferenceRunning && liveInferenceId) {
        // Resume frame capture when tab becomes visible
        startFrameCaptureLoop(liveInferenceId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLiveInferenceRunning, liveInferenceId]);

  // Get status badge for inference job
  const getStatusBadgeForJob = (status: string) => {
    switch (status) {
      case "queued":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="mr-1 h-3 w-3" />
            Queued
          </Badge>
        );
      case "running":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Running
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <XCircle className="mr-1 h-3 w-3" />
            Cancelled
          </Badge>
        );
      default:
        return null;
    }
  };

  // Get status badge
  const getStatusBadge = () => {
    switch (inferenceStatus) {
      case "queued":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="mr-1 h-3 w-3" />
            Queued
          </Badge>
        );
      case "running":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Running
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <XCircle className="mr-1 h-3 w-3" />
            Cancelled
          </Badge>
        );
      default:
        return null;
    }
  };

  const selectedDataset = datasets.find((d) => d.datasetId === selectedDatasetId || d._id === selectedDatasetId || d.id === selectedDatasetId);
  const selectedModel = models.find((m) => modelRowMatchesId(m, selectedModelId));

  return (
    <motion.div
      className="container mx-auto py-6 space-y-6"
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeInUpVariants}>
        <PageHeader
          title="Prediction (Testing)"
          description="Test and evaluate your trained models with new data"
        />
      </motion.div>

      {/* Tabs for New Inference and History */}
      <motion.div variants={fadeInUpVariants}>
      <Tabs value={viewMode} onValueChange={(value) => {
        const newMode = value as "new" | "history" | "live-logs";
        setViewMode(newMode);
        // Update URL query parameter
        const newSearchParams = new URLSearchParams(searchParams);
        if (newMode === "history") {
          newSearchParams.set("tab", "history");
        } else if (newMode === "live-logs") {
          newSearchParams.set("tab", "live-logs");
        } else {
          newSearchParams.delete("tab");
        }
        setSearchParams(newSearchParams, { replace: true });
      }}>
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="new">New Inference</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="live-logs">Live Logs</TabsTrigger>
        </TabsList>

        {/* Project Selection */}
        <AnimatePresence mode="wait">
          {(inferenceStatus === "idle" || viewMode === "history") && (
            <motion.div
              key="project-selection"
              variants={fadeInUpVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
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
                            Choose the project that contains your trained models. Inference will use models from this project.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </CardTitle>
                  <CardDescription>Choose project scope for datasets and models</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={selectedProjectId} onValueChange={handleProjectSelect} disabled={loadingProjects}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingProjects ? (
                        <SelectItem value="loading" disabled>
                          Loading projects...
                        </SelectItem>
                      ) : projects.length === 0 ? (
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
                  {!selectedProjectId && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Select a project to continue
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* New Inference Tab */}
        <TabsContent value="new" className="space-y-6">
          {/* Inference mode toggle */}
          {inferenceStatus === "idle" && selectedProjectId && !liveCameraMode && (
            <motion.div
              className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
              variants={fadeInUpVariants}
              initial="hidden"
              animate="visible"
            >
              <div className="inline-flex rounded-md border bg-muted/50 p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={inferenceMode === "dataset" ? "default" : "ghost"}
                  className="rounded-sm"
                  onClick={() => handleInferenceModeChange("dataset")}
                >
                  Use dataset
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={inferenceMode === "custom" ? "default" : "ghost"}
                  className="rounded-sm"
                  onClick={() => handleInferenceModeChange("custom")}
                >
                  Upload custom images
                </Button>
              </div>
            </motion.div>
          )}

          {/* Live Camera View - Only show when liveCameraMode is active */}
          <AnimatePresence mode="wait">
          {liveCameraMode && (
            <motion.div
              key="live-camera"
              variants={fadeInUpVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
            <Card className="col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Live Camera Inference</CardTitle>
                    <CardDescription>
                      Real-time defect detection on camera feed
                      {fps > 0 && <span className="ml-2">• {fps} FPS</span>}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (isLiveInferenceRunning) {
                          void handleStopLiveInference();
                        } else {
                          setLiveCameraMode(false);
                        }
                      }}
                    >
                      Back to New Inference
                    </Button>
                    {isLiveInferenceRunning && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Running
                      </Badge>
                    )}
                    {isProcessingFrame && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Processing...
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Camera feed with overlay canvas for detections */}
                <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                <div className="space-y-2">
                  <div className="relative aspect-video bg-black rounded-md overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-contain"
                      onLoadedMetadata={() => {
                        console.log("Video loadedmetadata event fired", {
                          videoWidth: videoRef.current?.videoWidth,
                          videoHeight: videoRef.current?.videoHeight,
                          readyState: videoRef.current?.readyState
                        });
                      }}
                      onPlaying={() => {
                        console.log("Video playing event fired", {
                          videoWidth: videoRef.current?.videoWidth,
                          videoHeight: videoRef.current?.videoHeight,
                          readyState: videoRef.current?.readyState
                        });
                      }}
                      onCanPlay={() => {
                        console.log("Video canplay event fired", {
                          videoWidth: videoRef.current?.videoWidth,
                          videoHeight: videoRef.current?.videoHeight,
                          readyState: videoRef.current?.readyState
                        });
                      }}
                      onError={(e) => {
                        console.error("Video element error:", e);
                      }}
                    />
                    <canvas
                      ref={annotatedCanvasRef}
                      className="absolute inset-0 w-full h-full pointer-events-none"
                    />
                    <div
                      className="pointer-events-none absolute rounded-md border-2 border-dashed border-cyan-300/80"
                      style={{
                        width: `${centerGuideSizePercent}%`,
                        height: `${centerGuideSizePercent}%`,
                        left: `${(100 - centerGuideSizePercent) / 2}%`,
                        top: `${(100 - centerGuideSizePercent) / 2}%`,
                      }}
                    />
                    <div
                      className={cn(
                        "absolute top-3 left-3 rounded-xl border-2 px-5 py-3.5 shadow-lg backdrop-blur-sm sm:top-4 sm:left-4 sm:px-2 sm:py-1",
                        verdict === "OK" && "bg-green-50/95 text-green-700 border-green-200",
                        verdict === "NOT_OK" && "bg-red-50/95 text-red-700 border-red-200",
                        verdict === "NO_PRODUCT" && "bg-gray-50/95 text-gray-700 border-gray-200"
                      )}
                    >
                      <div className="flex items-center gap-4 sm:gap-5">
                        <span
                          className={cn(
                            "inline-block h-12 w-12 shrink-0 rounded-full border-[3px] shadow-[0_0_18px_rgba(0,0,0,0.25)] sm:h-14 sm:w-14",
                            verdict === "OK" && "bg-green-500 border-green-600 shadow-green-500/70",
                            verdict === "NOT_OK" &&
                              "bg-red-500 border-red-600 shadow-red-500/80 animate-pulse",
                            verdict === "NO_PRODUCT" && "bg-gray-400 border-gray-500 shadow-gray-400/60"
                          )}
                        />
                        <span className="text-xl font-bold tracking-wide sm:text-2xl">
                          {verdict === "NO_PRODUCT" ? "NO PRODUCT" : verdict}
                        </span>
                      </div>
                    </div>
                    {cameraPermission === 'requesting' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                      </div>
                    )}
                    {cameraPermission === 'denied' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-center p-4">
                        <div>
                          <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Camera access denied</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">Defect Logger</CardTitle>
                        <CardDescription>Logs NOT_OK products in center only</CardDescription>
                      </div>
                      {!isLiveInferenceRunning && (
                        <div className="flex items-center gap-2">
                          {liveRunAnalytics.framesProcessed > 0 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setShowRunAnalytics(true)}
                            >
                              View Analytics
                            </Button>
                          )}
                          {isLiveDefectLoggingEnabled && liveDefectLogs.length > 0 && (
                            <Button type="button" size="sm" variant="outline" onClick={exportLiveDefectLogs}>
                              <Download className="mr-2 h-4 w-4" />
                              Export Logs (.xlsx)
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-md border p-2">
                        <p className="text-xs text-muted-foreground">NOT_OK logs</p>
                        <p className="text-xl font-semibold">{liveDefectLogs.length}</p>
                      </div>
                      <div className="rounded-md border p-2">
                        <p className="text-xs text-muted-foreground">Mode</p>
                        <p className="text-sm font-semibold">{isLiveInferenceRunning ? "Capturing" : "Stopped"}</p>
                      </div>
                    </div>
                    <div className="space-y-2 rounded-md border p-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">Center guide size</p>
                        <p className="text-xs font-medium">{centerGuideSizePercent}%</p>
                      </div>
                      <input
                        type="range"
                        min={LIVE_CENTER_REGION_MIN_PERCENT}
                        max={LIVE_CENTER_REGION_MAX_PERCENT}
                        step={1}
                        value={centerGuideSizePercent}
                        onChange={(e) => setCenterGuideSizePercent(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
                      {!isLiveDefectLoggingEnabled ? (
                        <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                          Defect logging is disabled for this run. Enable it before starting live inference to capture NOT_OK incidents.
                        </p>
                      ) : liveDefectLogs.length === 0 ? (
                        <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                          No NOT_OK incidents logged yet. Logs are added once per incident only when the product is fully inside the center guide.
                        </p>
                      ) : (
                        liveDefectLogs.map((entry) => (
                          <div key={entry.id} className="space-y-2 rounded-md border p-2">
                            <div className="relative aspect-video overflow-hidden rounded bg-muted">
                              <img src={entry.imageBase64} alt={`Defect ${entry.timestamp}`} className="h-full w-full object-contain" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</p>
                              <p className="text-xs font-medium text-red-600">{entry.verdict}</p>
                              <p className="text-xs text-muted-foreground">Defects: {entry.defectClasses.join(", ") || "Unknown"}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Dialog open={showRunAnalytics} onOpenChange={setShowRunAnalytics}>
                  <DialogContent className="max-w-5xl">
                    <DialogHeader>
                      <DialogTitle>Run Analytics</DialogTitle>
                      <DialogDescription>
                        Summary and chart view for the most recent live inference run.
                      </DialogDescription>
                    </DialogHeader>

                    {liveRunAnalytics.framesProcessed > 0 ? (
                      <div className="space-y-4">
                        <div className="grid gap-2 rounded-md border p-2 text-xs text-muted-foreground md:grid-cols-2">
                          <p>
                            Run started:{" "}
                            <span className="font-medium text-foreground">
                              {liveRunAnalytics.runStartedAt
                                ? new Date(liveRunAnalytics.runStartedAt).toLocaleString()
                                : "-"}
                            </span>
                          </p>
                          <p>
                            Run ended:{" "}
                            <span className="font-medium text-foreground">
                              {liveRunAnalytics.runEndedAt
                                ? new Date(liveRunAnalytics.runEndedAt).toLocaleString()
                                : "Running"}
                            </span>
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                          <div className="rounded-md border p-2">
                            <p className="text-xs text-muted-foreground">Total Products</p>
                            <p className="text-xl font-semibold">{liveRunAnalytics.totalProducts}</p>
                          </div>
                          <div className="rounded-md border p-2">
                            <p className="text-xs text-muted-foreground">Good Products</p>
                            <p className="text-xl font-semibold text-emerald-600">{liveRunAnalytics.goodProducts}</p>
                          </div>
                          <div className="rounded-md border p-2">
                            <p className="text-xs text-muted-foreground">Bad Products</p>
                            <p className="text-xl font-semibold text-red-600">{liveRunAnalytics.badProducts}</p>
                          </div>
                          <div className="rounded-md border p-2">
                            <p className="text-xs text-muted-foreground">Total Classes</p>
                            <p className="text-xl font-semibold">{liveRunTotalClasses}</p>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-md border p-2">
                            <p className="mb-2 text-xs text-muted-foreground">Good vs Bad</p>
                            <ChartContainer config={liveRunAnalyticsChartConfig} className="h-[260px] w-full">
                              <PieChart>
                                <Pie data={liveRunPieData} dataKey="count" nameKey="label" innerRadius={50} outerRadius={90}>
                                  {liveRunPieData.map((entry, index) => (
                                    <Cell key={entry.key} fill={LIVE_ANALYTICS_PIE_COLORS[index % LIVE_ANALYTICS_PIE_COLORS.length]} />
                                  ))}
                                </Pie>
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <ChartLegend content={<ChartLegendContent />} />
                              </PieChart>
                            </ChartContainer>
                          </div>

                          <div className="rounded-md border p-2">
                            <p className="mb-2 text-xs text-muted-foreground">Class Counts</p>
                            <ChartContainer config={liveRunAnalyticsChartConfig} className="h-[260px] w-full">
                              <BarChart data={liveRunClassBarData}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="className" tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={52} />
                                <YAxis allowDecimals={false} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="var(--color-count)" />
                              </BarChart>
                            </ChartContainer>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                        No analytics data available yet. Start and stop a live inference run first.
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
                </div>

                {/* Detection Statistics */}
                {isLiveInferenceRunning && (
                  <div className="grid gap-4 md:grid-cols-3 pt-2 border-t">
                    <div>
                      <div className="text-2xl font-bold">{currentDetections}</div>
                      <div className="text-sm text-muted-foreground">Current Detections</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{fps}</div>
                      <div className="text-sm text-muted-foreground">FPS</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {isProcessingFrame ? (
                          <Loader2 className="h-6 w-6 animate-spin inline" />
                        ) : (
                          '✓'
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">Status</div>
                    </div>
                  </div>
                )}

                {/* Confidence Threshold - same as image/video inference (0–1, default 0.25) */}
                <div className="space-y-2 pt-2 border-t">
                  <Label htmlFor="live-confidence">Confidence Threshold</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="live-confidence"
                      type="number"
                      min={0}
                      max={1}
                      step={0.01}
                      value={confidenceThreshold}
                      onChange={(e) => handleConfidenceChange(parseFloat(e.target.value) || 0)}
                      className="w-32"
                      disabled={!hasPermission("runInference")}
                    />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={confidenceThreshold}
                      onChange={(e) => handleConfidenceChange(parseFloat(e.target.value))}
                      className="flex-1"
                      disabled={!hasPermission("runInference")}
                    />
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {confidenceThreshold.toFixed(2)}
                    </span>
                  </div>
                  {isLiveInferenceRunning && liveSessionConfidenceThreshold != null && (
                    <p className="text-xs text-muted-foreground">
                      Session threshold in use: {liveSessionConfidenceThreshold.toFixed(2)}
                      {liveSessionConfidenceThreshold !== confidenceThreshold && " (you can change the slider for next frames)"}
                    </p>
                  )}
                </div>

                {liveDetectionClassMismatch && (
                  <Alert variant="destructive" className="py-3">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Detection labels don&apos;t match this model&apos;s class list</AlertTitle>
                    <AlertDescription>
                      Live frames include: <span className="font-mono">{liveDetectionClassMismatch}</span>
                      , which are not in the selected model&apos;s{" "}
                      <span className="font-mono">classNames</span>. Confirm the correct model is selected,
                      hard-refresh if you updated the backend, and check the Network tab for{" "}
                      <span className="font-mono">inference/models</span> for this row.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Good classes for live verdict (matches inference `class` strings from model) */}
                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-sm font-medium leading-tight shrink-0 pt-0.5">
                    Good classes
                  </Label>
                  {selectedModel?.classNames && selectedModel.classNames.length > 0 ? (
                    <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-md border bg-muted/30 p-3">
                      {selectedModel.classNames.map((cls) => (
                        <label
                          key={cls}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <Checkbox
                            checked={liveGoodClassNames.includes(cls)}
                            onCheckedChange={(v) => toggleLiveGoodClass(cls, v === true)}
                            disabled={!hasPermission("runInference") || isLiveInferenceRunning}
                          />
                          <span className="font-mono text-xs">{cls}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground rounded-md border border-dashed p-3 bg-muted/20">
                      This model did not return a class list yet. Verdict uses the default &quot;product&quot;
                      only. Re-fetch models after backend deploy, or pick another model.
                    </p>
                  )}
                </div>

                {/* Control Buttons */}
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center gap-2 rounded-md border p-2">
                    <Checkbox
                      id="live-defect-logging-toggle"
                      checked={isLiveDefectLoggingEnabled}
                      onCheckedChange={(checked) =>
                        setIsLiveDefectLoggingEnabled(checked === true)
                      }
                      disabled={isLiveInferenceRunning}
                    />
                    <Label
                      htmlFor="live-defect-logging-toggle"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Enable defect logging
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                  {!isLiveInferenceRunning ? (
                    hasPermission("runInference") ? (
                      <Button
                        onClick={handleStartLiveInference}
                        disabled={
                          !selectedModelId ||
                          startingInference ||
                          cameraPermission === "denied" ||
                          (!!(selectedModel?.classNames?.length) && liveGoodClassNames.length === 0)
                        }
                        className="flex-1"
                      >
                        {startingInference ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Starting...
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Start Live Inference
                          </>
                        )}
                      </Button>
                    ) : null
                  ) : (
                    <Button
                      onClick={handleStopLiveInference}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Stop Inference
                    </Button>
                  )}
                  </div>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          )}
          </AnimatePresence>

          {/* Configuration Section */}
          {inferenceStatus === "idle" && selectedProjectId && !liveCameraMode && (
        <div className="grid gap-6 md:grid-cols-2">
              {/* Left: dataset selector in dataset mode, custom upload in custom mode */}
              {inferenceMode === "dataset" ? (
          <Card>
            <CardHeader>
              <CardTitle>Select Dataset</CardTitle>
                    <CardDescription>Choose a dataset with test images for inference</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingDatasets ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : datasets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No ready datasets available for this project. Datasets must have test images.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-auto">
                  {datasets.map((dataset, idx) => {
                    const datasetId = dataset.datasetId || dataset._id || dataset.id || "";
                    const isSelected = datasetId === selectedDatasetId;
                    const datasetKey = datasetId || `dataset-${idx}`;
                    return (
                      <button
                        key={datasetKey}
                        onClick={() => handleDatasetSelect(datasetId)}
                        className={cn(
                          "w-full text-left p-3 rounded-md border transition-colors",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted"
                        )}
                      >
                        <div className="font-medium">{dataset.version || "Unversioned"}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Test: {dataset.testCount || 0} • Total: {dataset.totalImages || 0}
                        </div>
                        {dataset.createdAt && (
                          <div className="text-xs text-muted-foreground">
                            {new Date(dataset.createdAt).toLocaleDateString()}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Test Inputs
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex cursor-help">
                              <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" align="start" className="max-w-sm">
                            <p className="text-xs">
                              Provide images or video for prediction. Drag and drop files, select from disk, or use live camera for real-time inference.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </CardTitle>
                    <CardDescription>Upload custom images or use your camera for inference</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Drag & Drop Area */}
                    <div
                      className={cn(
                        "border-2 border-dashed rounded-lg px-4 py-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer",
                        isDragging
                          ? "border-primary bg-primary/5"
                          : "border-muted-foreground/30 bg-muted/20 hover:bg-muted/30"
                      )}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        handleAddTestFiles(e.dataTransfer.files);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          const input = document.getElementById("prediction-test-files-input");
                          if (input) {
                            (input as HTMLInputElement).click();
                          }
                        }
                      }}
                    >
                      <BrainCircuit className="h-8 w-8 text-primary mb-3" />
                      <p className="text-sm font-medium">
                        Drag &amp; drop test images here
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Supported formats: JPG, JPEG, PNG
                      </p>
                    </div>

                    {/* Hidden file inputs for Select image / Select video */}
                    <input
                      id="prediction-test-files-input"
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        handleAddTestVideo(e.target.files);
                      }}
                    />
                    <input
                      id="prediction-test-image-input"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        handleAddTestFiles(e.target.files);
                      }}
                    />

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex items-center gap-2"
                        onClick={() => {
                          const input = document.getElementById("prediction-test-image-input");
                          if (input) {
                            (input as HTMLInputElement).click();
                          }
                        }}
                      >
                        <ImageIcon className="h-4 w-4" />
                        Select image
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex items-center gap-2"
                        onClick={() => {
                          const input = document.getElementById("prediction-test-files-input");
                          if (input) {
                            (input as HTMLInputElement).click();
                          }
                        }}
                      >
                        <Video className="h-4 w-4" />
                        Select video
                      </Button>
                      <Button
                        type="button"
                        variant={liveCameraMode ? "default" : "outline"}
                        className="flex items-center gap-2"
                        onClick={() => {
                          if (liveCameraMode) {
                            // Exit live camera mode
                            handleStopLiveInference();
                            setLiveCameraMode(false);
                          } else {
                            // Require trained model before entering live camera mode
                            if (!selectedModelId) {
                              toast({
                                title: "Select a trained model",
                                description: "Please select a trained model before starting live camera inference.",
                                variant: "destructive",
                              });
                              return;
                            }

                            // Enter live camera mode
                            setLiveCameraMode(true);
                            setInferenceMode("custom"); // Ensure we're in custom mode
                          }
                        }}
                      >
                        <Camera className="h-4 w-4" />
                        {liveCameraMode ? "Exit Live Camera" : "Live camera"}
                      </Button>
                    </div>

                    {/* Selected files summary (UI only) */}
                    {testFiles.length > 0 && (
                      <div className="mt-2 rounded-md bg-muted/40 border border-dashed border-muted-foreground/30 px-3 py-2 text-xs">
                        <div className="font-medium mb-1">
                          {testFiles.length} file{testFiles.length !== 1 ? "s" : ""} selected
                        </div>
                        <div className="space-y-0.5 max-h-20 overflow-auto">
                          {testFiles.slice(0, 3).map((file) => (
                            <div
                              key={file.name}
                              className="flex items-center justify-between gap-2"
                            >
                              <span className="truncate text-muted-foreground">
                                {file.name}
                              </span>
                              <button
                                type="button"
                                className="shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() => handleRemoveTestFile(file.name)}
                                aria-label={`Remove ${file.name}`}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          {testFiles.length > 3 && (
                            <div className="text-muted-foreground">
                              + {testFiles.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Right: model selection (always visible) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Select Model
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex cursor-help">
                        <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="start" className="max-w-sm">
                      <p className="text-xs">
                        Pick a trained model to run predictions. Metrics like mAP50, precision, and recall help you compare model performance.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
              <CardDescription>Choose a trained model for inference</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingModels ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : models.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No trained models available.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-auto">
                  {models.map((model, idx) => {
                    const modelId = canonicalInferenceRowId(model);
                    const isSelected = modelRowMatchesId(model, selectedModelId);
                    const modelKey = modelId || `model-${idx}`;
                    return (
                      <button
                        key={modelKey}
                        onClick={() => handleModelSelect(modelId)}
                        className={cn(
                          "w-full text-left p-3 rounded-md border transition-colors",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted"
                        )}
                      >
                        <div className="font-medium">
                          {model.name || model.modelVersion || model.modelId || "Unnamed Model"}
                        </div>
                        {model.metrics && (
                          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                            {model.metrics.mAP50 !== undefined && (
                              <div>mAP50: {model.metrics.mAP50.toFixed(3)}</div>
                            )}
                            {model.metrics.precision !== undefined && (
                              <div>Precision: {model.metrics.precision.toFixed(3)}</div>
                            )}
                            {model.metrics.recall !== undefined && (
                              <div>Recall: {model.metrics.recall.toFixed(3)}</div>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confidence Threshold & Start Button */}
      {inferenceStatus === "idle" && selectedProjectId && !liveCameraMode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Inference Settings
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex cursor-help">
                      <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="start" className="max-w-sm">
                    <p className="text-xs">
                      Set the confidence threshold to filter detections. Higher values reduce false positives; lower values catch more objects but may include noise.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription>Configure confidence threshold and start prediction</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confidence">Confidence Threshold</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="confidence"
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={confidenceThreshold}
                  onChange={(e) => handleConfidenceChange(parseFloat(e.target.value) || 0)}
                  className="w-32"
                />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={confidenceThreshold}
                  onChange={(e) => handleConfidenceChange(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {confidenceThreshold.toFixed(2)}
                </span>
              </div>
            </div>

            {(() => {
              const canStart =
                inferenceMode === "dataset"
                  ? !!selectedProjectId && !!selectedDatasetId && !!selectedModelId
                  : !!selectedProjectId && !!selectedModelId && testFiles.length > 0;
              const canRunInference = hasPermission("runInference");
              return canRunInference ? (
            <Button
              onClick={handleStartInference}
                  disabled={!canStart || startingInference}
              className="w-full"
            >
              {startingInference ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Prediction
                </>
              )}
            </Button>
              ) : null;
            })()}
          </CardContent>
        </Card>
      )}

      {/* Progress Section - only in New Inference view */}
      {viewMode === "new" && inferenceStatus !== "idle" && hasPermission("monitorInference") && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Inference Progress</CardTitle>
              <div className="flex items-center gap-2">
                {getStatusBadge()}
                {/* Cancel Button - Show only when queued or running */}
                {(inferenceStatus === "queued" || inferenceStatus === "running") && (
                  <Button
                    onClick={cancelInference}
                    variant="outline"
                    size="sm"
                    disabled={cancellingInference}
                    className="text-destructive hover:text-destructive"
                  >
                    {cancellingInference ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-2 h-4 w-4" />
                        Cancel
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
            <CardDescription>
              {selectedDataset && `Dataset: ${selectedDataset.version || "Unversioned"}`}
              {selectedModel && ` • Model: ${selectedModel.modelVersion || selectedModel.modelId}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Progress
                value={
                  inferenceProgress > 0
                    ? Math.min(Math.max(inferenceProgress, 0), 100)
                    : inferenceStatus === "queued" || inferenceStatus === "running"
                    ? 100
                    : 0
                }
                className="h-2"
                indicatorClassName={cn(
                  (inferenceStatus === "queued" || inferenceStatus === "running") &&
                    inferenceProgress === 0 &&
                    "progress-striped progress-animated",
                  inferenceStatus === "completed" && "bg-[hsl(var(--success))]",
                  inferenceStatus === "failed" && "bg-[hsl(var(--destructive))]"
                )}
              />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  {inferenceProgress > 0
                    ? `${inferenceProgress}%`
                    : inferenceStatus === "queued"
                    ? "Queued"
                    : inferenceStatus === "running"
                    ? "Initializing..."
                    : "0%"}
                </span>
              </div>
              {totalImages > 0 && (
                <div className="text-sm text-muted-foreground">
                  Processed: {processedImages} / {totalImages} images
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

          {/* Results Section */}
          {inferenceStatus === "completed" && (
        <>
          {loadingResults ? (
            <Card>
              <CardContent className="py-8">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ) : results ? (
            <>
              {/* Action Buttons - Above Results Summary */}
              <div className="flex items-center justify-end gap-2">
                <Button
                  onClick={() => {
                    setInferenceId(null);
                    setInferenceStatus("idle");
                    setInferenceProgress(0);
                    setProcessedImages(0);
                    setTotalImages(0);
                    setResults(null);
                    clearStorage();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  variant="outline"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start New Inference
                </Button>
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Results
                </Button>
              </div>

              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Results Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <div className="text-2xl font-bold">{results.totalDetections}</div>
                      <div className="text-sm text-muted-foreground">Total Detections</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {(results.averageConfidence * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Average Confidence</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {results.detectionsByClass.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Classes Detected</div>
                    </div>
                  </div>
                  {/* Statistics row for tagged inference jobs */}
                  {results.statistics && results.statistics.hasTags && (
                    <div className="grid gap-4 md:grid-cols-3 mt-4 pt-4 border-t">
                      <div>
                        <div className="text-2xl font-bold">
                          {results.statistics.total}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total Files (Images + Videos)
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {results.statistics.totalImages ??
                            (Array.isArray(results.annotatedImages)
                              ? results.annotatedImages.length
                              : 0)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total Images
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {results.statistics.totalVideos ??
                            (results.videos ? results.videos.length : 0)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total Videos
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Detections by Class */}
              {results.detectionsByClass.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Detections by Class</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Class</th>
                            <th className="text-right p-2">Count</th>
                            <th className="text-right p-2">Avg Confidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.detectionsByClass.map((item, idx) => (
                            <tr key={item.className || `class-${idx}`} className="border-b">
                              <td className="p-2 font-medium">{item.className}</td>
                              <td className="p-2 text-right">{item.count}</td>
                              <td className="p-2 text-right">
                                {(item.averageConfidence * 100).toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Annotated Images with Filter Tabs */}
              {(() => {
                // Get images array (handle both old and new structures)
                const imagesArray: AnnotatedImageItem[] = Array.isArray(results.annotatedImages)
                  ? results.annotatedImages
                  : results.annotatedImages && typeof results.annotatedImages === 'object' && 'all' in results.annotatedImages
                  ? results.annotatedImages.all
                  : [];
                
                if (imagesArray.length === 0) return null;
                
                // Determine if we should show filter tabs (only for new jobs with tags)
                const showFilters = results.statistics?.hasTags === true;
                
                // Get images to display based on filter
                let imagesToDisplay: AnnotatedImageItem[] = imagesArray;
                if (showFilters && imageFilter !== 'all') {
                  imagesToDisplay = imagesArray.filter((img) => img.tag === imageFilter);
                }

                const openImageViewerAt = (index: number, list: AnnotatedImageItem[]) => {
                  setImageViewerImages(list);
                  setImageViewerIndex(index);
                  setImageZoom(1);
                  setImageViewerOpen(true);
                };
                
                return (
                <Card>
                  <CardHeader>
                    <CardTitle>Annotated Images</CardTitle>
                    <CardDescription>
                        {showFilters
                          ? `${results.statistics?.total || imagesArray.length} total images`
                          : `${imagesArray.length} image${imagesArray.length !== 1 ? "s" : ""} with detections`
                        }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                      {showFilters ? (
                        <Tabs value={imageFilter} onValueChange={(value) => setImageFilter(value as 'all' | 'good' | 'defect')}>
                          <TabsList className="grid w-full max-w-md grid-cols-3 mb-4">
                            <TabsTrigger value="all">
                              All ({results.statistics?.total || 0})
                            </TabsTrigger>
                            <TabsTrigger value="good">
                              Good ({results.statistics?.good || 0})
                            </TabsTrigger>
                            <TabsTrigger value="defect">
                              Defect ({results.statistics?.defect || 0})
                            </TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="all" className="mt-0">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                              {imagesArray.map((img, idx) => (
                        <div
                          key={img.filename || img.url || `image-${idx}`}
                          className="space-y-2 cursor-zoom-in"
                          onClick={() => openImageViewerAt(idx, imagesArray)}
                        >
                          <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
                            <AuthenticatedImage
                              src={img.url}
                              alt={img.filename}
                              className="w-full h-full object-contain"
                            />
                                    {img.tag && img.tag !== 'unreviewed' && (
                                      <Badge
                                        variant="outline"
                                        className={
                                          img.tag === 'good'
                                            ? "bg-green-50 text-green-700 border-green-200 absolute top-2 right-2"
                                            : "bg-red-50 text-red-700 border-red-200 absolute top-2 right-2"
                                        }
                                      >
                                        {img.tag === 'good' ? '✅ Good' : '❌ Defect'}
                                      </Badge>
                                    )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {img.filename}
                          </div>
                          {img.detections && img.detections.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {img.detections.length} detection
                              {img.detections.length !== 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                          </TabsContent>
                          <TabsContent value="good" className="mt-0">
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                              {imagesArray.filter((img) => img.tag === 'good').map((img, idx) => (
                                <div
                                  key={img.filename || img.url || `image-${idx}`}
                                  className="space-y-2 cursor-zoom-in"
                                  onClick={() =>
                                    openImageViewerAt(
                                      idx,
                                      imagesArray.filter((img) => img.tag === 'good'),
                                    )
                                  }
                                >
                                  <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
                                    <AuthenticatedImage
                                      src={img.url}
                                      alt={img.filename}
                                      className="w-full h-full object-contain"
                                    />
                                    <Badge
                                      variant="outline"
                                      className="bg-green-50 text-green-700 border-green-200 absolute top-2 right-2"
                                    >
                                      ✅ Good
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {img.filename}
                                  </div>
                                  {img.detections && img.detections.length > 0 && (
                                    <div className="text-xs text-muted-foreground">
                                      {img.detections.length} detection
                                      {img.detections.length !== 1 ? "s" : ""}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </TabsContent>
                          <TabsContent value="defect" className="mt-0">
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                              {imagesArray.filter((img) => img.tag === 'defect').map((img, idx) => (
                                <div
                                  key={img.filename || img.url || `image-${idx}`}
                                  className="space-y-2 cursor-zoom-in"
                                  onClick={() =>
                                    openImageViewerAt(
                                      idx,
                                      imagesArray.filter((img) => img.tag === 'defect'),
                                    )
                                  }
                                >
                                  <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
                                    <AuthenticatedImage
                                      src={img.url}
                                      alt={img.filename}
                                      className="w-full h-full object-contain"
                                    />
                                    <Badge
                                      variant="outline"
                                      className="bg-red-50 text-red-700 border-red-200 absolute top-2 right-2"
                                    >
                                      ❌ Defect
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {img.filename}
                                  </div>
                                  {img.detections && img.detections.length > 0 && (
                                    <div className="text-xs text-muted-foreground">
                                      {img.detections.length} detection
                                      {img.detections.length !== 1 ? "s" : ""}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </TabsContent>
                        </Tabs>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {imagesArray.map((img, idx) => (
                            <div
                              key={img.filename || img.url || `image-${idx}`}
                              className="space-y-2 cursor-zoom-in"
                              onClick={() => openImageViewerAt(idx, imagesArray)}
                            >
                              <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
                                <AuthenticatedImage
                                  src={img.url}
                                  alt={img.filename}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {img.filename}
                              </div>
                              {img.detections && img.detections.length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  {img.detections.length} detection
                                  {img.detections.length !== 1 ? "s" : ""}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                  </CardContent>
                </Card>
                );
              })()}

              {/* Annotated Image Viewer Dialog */}
              <Dialog
                open={imageViewerOpen}
                onOpenChange={(open) => {
                  setImageViewerOpen(open);
                  if (!open) {
                    setImageZoom(1);
                  }
                }}
              >
                <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>
                      {imageViewerImages[imageViewerIndex]?.filename || "Annotated image"}
                    </DialogTitle>
                    <DialogDescription>
                      {imageViewerImages.length > 0 &&
                        `${imageViewerIndex + 1} of ${imageViewerImages.length}`}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="flex-1 overflow-auto flex items-center justify-center bg-muted rounded-md">
                    {imageViewerImages[imageViewerIndex] && (
                      <AuthenticatedImage
                        src={imageViewerImages[imageViewerIndex].url}
                        alt={imageViewerImages[imageViewerIndex].filename}
                        className="max-h-[80vh] object-contain transition-transform"
                        style={{
                          transform: `scale(${imageZoom})`,
                          transformOrigin: "center center",
                        }}
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setImageZoom((z) => Math.min(z + 0.25, 4))}
                        aria-label="Zoom in"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setImageZoom((z) => Math.max(z - 0.25, 0.5))}
                        aria-label="Zoom out"
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(imageZoom * 100)}%
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setImageViewerIndex((idx) => Math.max(idx - 1, 0))
                        }
                        disabled={imageViewerIndex <= 0}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setImageViewerIndex((idx) =>
                            Math.min(idx + 1, imageViewerImages.length - 1),
                          )
                        }
                        disabled={imageViewerIndex >= imageViewerImages.length - 1}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Videos (if any) */}
              {results.videos && results.videos.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Videos</CardTitle>
                    <CardDescription>
                      {results.statistics?.totalVideos ?? results.videos.length} video
                      {(results.statistics?.totalVideos ?? results.videos.length) !== 1 ? "s" : ""} processed
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {results.videos.map((video, idx) => {
                        // Find detection count from metadata
                        const videoMetadata = results.metadata?.videos?.find(
                          (v) => v.filePath?.includes(video.filename) || v.filePath === video.filename
                        );
                        const detectionCount = videoMetadata?.detectionCount ?? videoMetadata?.detections?.length ?? 0;
                        
                        return (
                          <VideoPlayer
                            key={video.filename || video.url || `video-${idx}`}
                            video={video}
                            detectionCount={detectionCount}
                          />
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  Results are not available yet.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

          {/* Error State */}
          {inferenceStatus === "failed" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-destructive">Inference Failed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  The inference job failed. Please try again or check the logs for more details.
                </p>
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => {
                      setInferenceId(null);
                      setInferenceStatus("idle");
                      setInferenceProgress(0);
                      setResults(null);
                      clearStorage();
                    }}
                    variant="outline"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Start New Inference
                  </Button>
                  <Button
                    onClick={() => setShowDeleteDialog(true)}
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cancelled State */}
          {inferenceStatus === "cancelled" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-muted-foreground">Inference Cancelled</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  The inference job has been cancelled. You can start a new inference when ready.
                </p>
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => {
                      setInferenceId(null);
                      setInferenceStatus("idle");
                      setInferenceProgress(0);
                      setResults(null);
                      clearStorage();
                    }}
                    variant="outline"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Start New Inference
                  </Button>
                  <Button
                    onClick={() => setShowDeleteDialog(true)}
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          {!selectedProjectId ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  Please select a project to view inference history.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>Inference History</CardTitle>
                    <CardDescription>View past inference jobs and their results</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label htmlFor="status-filter" className="whitespace-nowrap text-sm">
                      Filter by Status:
                    </Label>
                    <Select value={historyStatusFilter} onValueChange={setHistoryStatusFilter}>
                      <SelectTrigger id="status-filter" className="w-40 md:w-48 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="running">Running</SelectItem>
                        <SelectItem value="queued">Queued</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {loadingPastInferences ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pastInferences.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No inference jobs found
                    {historyStatusFilter !== "all" ? ` with status "${historyStatusFilter}"` : ""}.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pastInferences.map((job) => (
                      <Card key={job.inferenceId} className="border-muted">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <CardTitle className="text-sm font-semibold truncate">
                                Inference: {job.inferenceId}
                              </CardTitle>
                              {getStatusBadgeForJob(job.status)}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {(job.status === "completed" ||
                                job.status === "failed" ||
                                job.status === "cancelled") && (
                                <>
                                  {job.status === "completed" && (
                                    <Button
                                      onClick={() => loadPastInferenceResults(job.inferenceId)}
                                      variant="outline"
                                      size="sm"
                                    >
                                      <Play className="mr-2 h-4 w-4" />
                                      View Results
                                    </Button>
                                  )}
                                  <ProtectedComponent requiredPermission="deleteOwnInference">
                                    <Button
                                      onClick={() => {
                                        setInferenceId(job.inferenceId);
                                        setShowDeleteDialog(true);
                                      }}
                                      variant="outline"
                                      size="sm"
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </Button>
                                  </ProtectedComponent>
                                </>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 text-xs md:text-sm">
                            {job.model && (
                              <div>
                                <div className="text-muted-foreground">Model</div>
                                <div className="font-medium">
                                  {job.model.modelType} - {job.model.modelVersion || "v1"}
                                </div>
                              </div>
                            )}
                            {job.dataset && (
                              <div>
                                <div className="text-muted-foreground">Dataset</div>
                                <div className="font-medium">
                                  {job.dataset.version || "Unversioned"} ({job.dataset.testCount || 0} test images)
                                </div>
                              </div>
                            )}
                            {job.startedAt && (
                              <div>
                                <div className="text-muted-foreground">Started</div>
                                <div className="font-medium">
                                  {new Date(job.startedAt).toLocaleString()}
                                </div>
                              </div>
                            )}
                            {job.completedAt && (
                              <div>
                                <div className="text-muted-foreground">Completed</div>
                                <div className="font-medium">
                                  {new Date(job.completedAt).toLocaleString()}
                                </div>
                              </div>
                            )}
                            {job.progress && typeof job.progress === "object" && (
                              <div>
                                <div className="text-muted-foreground">Progress</div>
                                <div className="font-medium">
                                  {job.progress.processedImages || 0} / {job.progress.totalImages || 0} images
                                  {job.progress.progressPercent !== undefined && ` (${job.progress.progressPercent}%)`}
                                </div>
                              </div>
                            )}
                            {job.results && (
                              <>
                                <div>
                                  <div className="text-muted-foreground">Total Detections</div>
                                  <div className="font-medium">{job.results.totalDetections || 0}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Avg Confidence</div>
                                  <div className="font-medium">
                                    {job.results.averageConfidence
                                      ? `${(job.results.averageConfidence * 100).toFixed(1)}%`
                                      : "N/A"}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                          {job.results?.detectionsByClass && job.results.detectionsByClass.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="text-xs md:text-sm text-muted-foreground mb-2">Detections by Class</div>
                              <div className="flex flex-wrap gap-2">
                                {job.results.detectionsByClass.map((item, idx) => (
                                  <Badge key={idx} variant="outline">
                                    {item.className}: {item.count}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Live Logs Tab */}
        <TabsContent value="live-logs" className="space-y-6">
          {/* Live view: latest entry from edge (polled every 5s) */}
          <Card>
            <CardHeader>
              <CardTitle>Live view</CardTitle>
              <CardDescription>
                Latest inference from the edge device (updates every 5 seconds)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {liveLogsError && (
                <p className="text-sm text-destructive">{liveLogsError}</p>
              )}
              {liveLogsLoading && !liveLogsLatest && (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Waiting for edge device…
                </div>
              )}
              {liveLogsEndpointUnavailable && !liveLogsLatest && !liveLogsError && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Edge live API not available. Add GET /inference/edge/live to your backend, then switch to another tab and back to retry.
                </p>
              )}
              {!liveLogsLoading && !liveLogsLatest && !liveLogsError && !liveLogsEndpointUnavailable && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Connect your edge device. Data will appear here when the backend receives live inference results.
                </p>
              )}
              {liveLogsLatest && (
                <motion.div
                  key={liveLogsLatest.id}
                  variants={fadeInUpVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {new Date(liveLogsLatest.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="relative aspect-video bg-muted rounded-md overflow-hidden max-w-2xl">
                    <img
                      src={liveLogsLatest.imageBase64}
                      alt="Latest inference"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  {liveLogsLatest.defectClasses.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm font-medium">Defect classes:</span>
                      {normalizeDefectClasses(liveLogsLatest.defectClasses).map((dc, idx) => (
                        <Badge key={idx} variant="outline">
                          {dc.className}
                          {dc.count != null ? ` (${dc.count})` : ""}
                          {dc.confidence != null ? ` ${dc.confidence <= 1 ? (dc.confidence * 100).toFixed(0) : dc.confidence.toFixed(0)}%` : ""}
                        </Badge>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* History of live logs (stored from live fetch) */}
          <Card>
            <CardHeader>
              <CardTitle>History of live logs</CardTitle>
              <CardDescription>
                Past live log entries received from the edge device (stored locally, max {LIVE_LOGS_HISTORY_CAP})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {liveLogsHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No live log history yet. Entries will appear here as they are received.
                </p>
              ) : (
                <div className="space-y-4 max-h-[480px] overflow-auto">
                  {liveLogsHistory.map((entry) => (
                    <Card key={entry.id} className="border-muted overflow-hidden">
                      <CardContent className="p-3 space-y-2">
                        <div className="text-xs text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleString()}
                        </div>
                        <div className="relative aspect-video bg-muted rounded overflow-hidden max-w-md">
                          <img
                            src={entry.imageBase64}
                            alt={`Inference ${entry.timestamp}`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        {entry.defectClasses.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {normalizeDefectClasses(entry.defectClasses).map((dc, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {dc.className}
                                {dc.count != null ? ` ${dc.count}` : ""}
                                {dc.confidence != null ? ` ${dc.confidence <= 1 ? (dc.confidence * 100).toFixed(0) : dc.confidence.toFixed(0)}%` : ""}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inference Results?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this inference result?
              <br /><br />
              This will permanently delete:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All annotated images</li>
                <li>Metadata and results</li>
                <li>The inference job record</li>
              </ul>
              <br />
              <strong>This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingInference}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteInference}
              disabled={deletingInference}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingInference ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
};

export default PredictionPage;

