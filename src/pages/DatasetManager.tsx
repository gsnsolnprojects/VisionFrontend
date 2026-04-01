// src/pages/DatasetManager.tsx
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { getAuthHeaders } from "@/lib/api/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { List, X, FileText, Search, ZoomIn, ZoomOut, RotateCcw, Maximize2, ChevronLeft, ChevronRight, Grid3x3, LayoutGrid, Folder, ChevronRight as ChevronRightIcon, ChevronDown, Trash2, Loader2, Upload, ArrowRight, Info, Pencil, Download, MoreVertical } from "lucide-react";
import { useBreadcrumbs } from "@/components/app-shell/breadcrumb-context";
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
import { motion, AnimatePresence } from "framer-motion";
import { fadeInUpVariants, staggerContainerVariants } from "@/utils/animations";
import { ClassNameDialog } from "@/components/dataset/ClassNameDialog";
import { getDetectedClasses, type DetectedClassesResponse } from "@/lib/api/categories";
import { ProtectedComponent } from "@/components/permissions/ProtectedComponent";
import { DeleteProjectModal } from "@/components/dashboard/DeleteProjectModal";
import { EditProjectModal } from "@/components/dashboard/EditProjectModal";
import * as datasetsApi from "@/lib/api/datasets";
import { useAugmentationStatus, type AugmentationStatusState } from "@/hooks/useAugmentationStatus";
import { AugmentVersionNameModal } from "@/components/datasets/AugmentVersionNameModal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").trim();
const apiUrl = (path: string) => {
  const base = API_BASE_URL.replace(/\/+$/, "");
  const p = path.replace(/^\/+/, "");
  return base ? `${base}/${p}` : `/${p}`;
};

type UploadStatus = "idle" | "uploading" | "processing" | "ready" | "failed";

interface DatasetMetadata {
  id: string;
  status?: string;
  totalImages?: number;
  sizeBytes?: number;
  thumbnailsGenerated?: boolean;
  trainCount?: number;
  valCount?: number;
  testCount?: number;
  is_augmented?: boolean;
  isAugmented?: boolean;
  labelSource?: string;
  label_source?: string;
  folders?: Record<string, { images: number; labels: number }>;
  previews?: Array<{ path: string; url?: string; thumbUrl?: string; thumbData?: string }>;
  files?: Array<{
    id?: string;
    _id?: string;
    storedName?: string;
    originalName?: string;
    name?: string;
    type?: string;
    size?: number;
    folder?: string;
    storedPath?: string;
    path?: string;
    thumbnailAvailable?: boolean;
    url?: string;
  }>;
}

interface StatusResponse {
  status: string;
  // any of these might be present depending on backend
  processed?: number;
  processedCount?: number;
  processed_files?: number;
  total?: number;
  totalImages?: number;
  total_files?: number;
  percent?: number;
  trainCount?: number;
  valCount?: number;
  testCount?: number;
}

interface VersionEntry {
  version?: string;
  datasetId: string;
  createdAt?: string;
  status?: string;
  [k: string]: any;
}

interface FileEntry {
  id: string;
  storedName?: string;
  originalName: string;
  type?: string;
  size?: number;
  folder?: string;
  storedPath: string;
  thumbnailAvailable?: boolean;
  thumbnailUrl?: string | null; // Full URL from backend (preferred over constructing from id)
  url?: string;
  // Legacy fields for backward compatibility
  name?: string;
  path?: string;
  thumbUrl?: string;
  mime?: string;
}

const MAX_FILES = 10000;
const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB - adjust if needed

const DatasetManager = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { sessionReady, user, hasPermission } = useProfile();
  const [project, setProject] = useState<any>(null);
  const [companyName, setCompanyName] = useState<string>("");
  const [version, setVersion] = useState<string>("");
  const [versionError, setVersionError] = useState<string | null>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [selectedFolderName, setSelectedFolderName] = useState<string | null>(null);
  const [selectedFolderType, setSelectedFolderType] = useState<"labelled" | "unlabelled" | null>(null);
  const [labelledFolderError, setLabelledFolderError] = useState<string | null>(null);
  const [unlabelledFolderError, setUnlabelledFolderError] = useState<string | null>(null);

  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("Idle");
  const [statusPercent, setStatusPercent] = useState<number | null>(null);

  const [currentDatasetId, setCurrentDatasetId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [statusProgress, setStatusProgress] = useState<StatusResponse | null>(null);

  const [labelledOpen, setLabelledOpen] = useState<boolean>(false);
  const [unlabelledOpen, setUnlabelledOpen] = useState<boolean>(false);

  // Class name dialog state
  const [showClassNameDialog, setShowClassNameDialog] = useState(false);
  const [detectedClassesData, setDetectedClassesData] = useState<DetectedClassesResponse | null>(null);
  const hasShownClassNamePopupRef = useRef<Set<string>>(new Set());

  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [selectedVersionDatasetId, setSelectedVersionDatasetId] = useState<string | null>(null);
  const [augmentingDatasetId, setAugmentingDatasetId] = useState<string | null>(null);
  const [augmentingSourceDatasetId, setAugmentingSourceDatasetId] = useState<string | null>(null);
  const [cancellingAugmentationId, setCancellingAugmentationId] = useState<string | null>(null);
  const [showCancelAugmentDialog, setShowCancelAugmentDialog] = useState(false);
  const [cancelAugmentDatasetId, setCancelAugmentDatasetId] = useState<string | null>(null);
  const [downloadingDatasetId, setDownloadingDatasetId] = useState<string | null>(null);

  const augmentingVersion = versions.find((v) => v.augmentation_status === "running");
  const datasetIdToPoll =
    augmentingSourceDatasetId ??
    augmentingVersion?.datasetId ??
    (versions.find((v) => v.datasetId === selectedVersionDatasetId)?.augmentation_status === "running"
      ? selectedVersionDatasetId
      : null);

  const {
    status: augmentationStatus,
    progress: augmentationProgress,
    startPolling: startAugmentationPolling,
    stopPolling: stopAugmentationPolling,
    resetToIdle: resetAugmentationToIdle,
  } = useAugmentationStatus(datasetIdToPoll);

  // Start polling when any version is augmenting (so status bar shows even without selection)
  useEffect(() => {
    if (datasetIdToPoll) {
      startAugmentationPolling(datasetIdToPoll);
    }
  }, [datasetIdToPoll, startAugmentationPolling]);

  // Refresh versions list periodically while augmentation is running (keeps "Augmenting…" badge in sync)
  useEffect(() => {
    if (augmentationStatus !== "running") return;
    const interval = setInterval(() => void fetchVersions(), 8000);
    return () => clearInterval(interval);
  }, [augmentationStatus]);

  const augmentationHandledRef = useRef<string | null>(null);
  const prevAugmentationStatusRef = useRef<AugmentationStatusState | null>(null);
  useEffect(() => {
    const key = `${datasetIdToPoll}-${augmentationStatus}`;
    const prevStatus = prevAugmentationStatusRef.current;

    // Only show notification when transitioning from "running" to "succeeded" or "failed"
    const isTransitionToSucceeded = prevStatus === "running" && augmentationStatus === "succeeded";
    const isTransitionToFailed = prevStatus === "running" && augmentationStatus === "failed";

    if (isTransitionToSucceeded) {
      if (augmentationHandledRef.current === key) return;
      augmentationHandledRef.current = key;
      setAugmentingSourceDatasetId(null);
      toast({
        title: "Augmentation completed",
        description: "The dataset has been successfully augmented and replaced.",
        variant: "default",
      });
      fetchVersions().then((normalized) => {
        const active = (normalized || []).find((v) => v.isActive || v.is_active);
        if (active?.datasetId) {
          onSelectVersion(active.datasetId);
        }
      });
    } else if (isTransitionToFailed) {
      if (augmentationHandledRef.current === key) return;
      augmentationHandledRef.current = key;
      setAugmentingSourceDatasetId(null);
      toast({
        title: "Augmentation failed",
        description: "Dataset augmentation failed. The original dataset is unchanged.",
        variant: "destructive",
      });
    }

    prevAugmentationStatusRef.current = augmentationStatus;
  }, [augmentationStatus, datasetIdToPoll, toast]);
  const [fileManifest, setFileManifest] = useState<FileEntry[]>([]);
  const [thumbnailCache, setThumbnailCache] = useState<Record<string, string>>({});
  // Track in-flight thumbnail requests to prevent duplicate fetches
  const thumbnailFetchInProgressRef = useRef<Map<string, Promise<string | null>>>(new Map());
  // Ref for upload section to scroll to
  const uploadSectionRef = useRef<HTMLDivElement>(null);
  // AbortController for dataset view fetches - aborted when user closes the view
  const datasetViewAbortControllerRef = useRef<AbortController | null>(null);
  // Ref to access latest cache without recreating callback
  const thumbnailCacheRef = useRef<Record<string, string>>({});
  
  // Request queue and throttling to prevent backend overload
  const thumbnailQueueRef = useRef<Array<{ resolve: (value: string | null) => void; reject: (error: any) => void; datasetId: string; fileId: string; abortController?: AbortController }>>([]);
  const activeThumbnailRequestsRef = useRef<number>(0);
  const MAX_CONCURRENT_THUMBNAILS = 3; // Reduced to 3 concurrent requests to prevent backend overload
  const THUMBNAIL_LOAD_DELAY_MS = 100; // Small delay before loading to batch rapid scrolls
  
  // Keep ref in sync with state
  useEffect(() => {
    thumbnailCacheRef.current = thumbnailCache;
  }, [thumbnailCache]);

  // Cleanup: Cancel pending thumbnail requests when dataset changes or component unmounts
  useEffect(() => {
    return () => {
      // Cancel all pending requests in queue
      thumbnailQueueRef.current.forEach((item) => {
        if (item.abortController) {
          item.abortController.abort();
        }
        item.reject(new Error('Request cancelled due to dataset change'));
      });
      thumbnailQueueRef.current = [];
      activeThumbnailRequestsRef.current = 0;
    };
  }, [selectedVersionDatasetId]); // Cleanup when dataset changes
  
  // File manager view state
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [selectedFolderInSidebar, setSelectedFolderInSidebar] = useState<string | "all">("all");
  
  // Drive-style preview state
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [folderFiles, setFolderFiles] = useState<FileEntry[]>([]);
  const [folderFilesLoading, setFolderFilesLoading] = useState(false);
  const [folderFilesPage, setFolderFilesPage] = useState(1);
  const [folderFilesTotal, setFolderFilesTotal] = useState(0);
  const [folderFilesTotalPages, setFolderFilesTotalPages] = useState(0);
  const [fileTypeFilter, setFileTypeFilter] = useState<"all" | "image" | "label">("all");
  const [fileSort, setFileSort] = useState<"name" | "size">("name");
  const [fileSortOrder, setFileSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedImageFile, setSelectedImageFile] = useState<FileEntry | null>(null);
  const [selectedLabelFile, setSelectedLabelFile] = useState<FileEntry | null>(null);
  const [labelFileContent, setLabelFileContent] = useState<string | null>(null);
  const [labelFileLoadFailed, setLabelFileLoadFailed] = useState<boolean>(false);
  const [labelFileLoading, setLabelFileLoading] = useState<boolean>(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterType, setFilterType] = useState<"all" | "image" | "label">("all");
  const [filterFolder, setFilterFolder] = useState<string>("all");

  // Keyboard navigation state
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(-1);
  const [navigableFiles, setNavigableFiles] = useState<FileEntry[]>([]);

  // Image zoom & pan state
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Authenticated blob URL for raw dataset image in modal (so img request includes auth)
  const [modalImageObjectUrl, setModalImageObjectUrl] = useState<string | null>(null);

  const zoomContainerRef = useRef<HTMLDivElement | null>(null);

  // Delete project state (modal uses dashboard API: GET summary, DELETE project)
  const [showDeleteProjectDialog, setShowDeleteProjectDialog] = useState<boolean>(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState<boolean>(false);

  // Delete version state
  const [versionToDelete, setVersionToDelete] = useState<string | null>(null);
  const [showDeleteVersionDialog, setShowDeleteVersionDialog] = useState<boolean>(false);
  const [deletingVersion, setDeletingVersion] = useState<boolean>(false);
  const [versionDependencies, setVersionDependencies] = useState<{
    hasDependencies: boolean;
    dependencies: {
      trainingJobs: Array<{ jobId: string; status: string; createdAt: string }>;
      models: Array<{ modelId: string; modelVersion: string; modelType: string; createdAt: string }>;
      inferenceJobs: Array<any>;
    };
    counts: {
      trainingJobs: number;
      models: number;
      inferenceJobs: number;
    };
  } | null>(null);
  const [loadingDependencies, setLoadingDependencies] = useState<boolean>(false);

  // Augment options dialog state
  const [showAugmentOptionsDialog, setShowAugmentOptionsDialog] = useState(false);
  const [augmentOptionsDatasetId, setAugmentOptionsDatasetId] = useState<string | null>(null);

  // Removed local getAuthHeaders() - using centralized getAuthHeaders() from @/lib/api/config

  // Process thumbnail queue when slots become available (throttled to prevent backend overload)
  const processThumbnailQueue = useCallback(() => {
    while (
      thumbnailQueueRef.current.length > 0 && 
      activeThumbnailRequestsRef.current < MAX_CONCURRENT_THUMBNAILS
    ) {
      const item = thumbnailQueueRef.current.shift();
      if (!item) break;
      
      activeThumbnailRequestsRef.current++;
      const cacheKey = `${item.datasetId}:${item.fileId}`;
      
      // Create AbortController for this request
      const abortController = new AbortController();
      item.abortController = abortController;
      
      (async () => {
        try {
          const headers = await getAuthHeaders();
          const url = apiUrl(`/dataset/${encodeURIComponent(item.datasetId)}/file/${encodeURIComponent(item.fileId)}/thumbnail`);
          const res = await fetch(url, { 
            method: "GET", 
            headers,
            signal: abortController.signal // Support cancellation
          });
          
          // Check if request was aborted
          if (abortController.signal.aborted) {
            return;
          }
          
          if (res.status === 404) {
            setThumbnailCache((s) => ({ ...s, [cacheKey]: null as any }));
            item.resolve(null);
          } else if (!res.ok) {
            throw new Error("thumbnail fetch failed");
          } else {
            const blob = await res.blob();
            const objUrl = URL.createObjectURL(blob);
            setThumbnailCache((s) => ({ ...s, [cacheKey]: objUrl }));
            item.resolve(objUrl);
          }
        } catch (err: any) {
          // Don't log or cache aborted requests
          if (err.name === 'AbortError' || abortController.signal.aborted) {
            return;
          }
          console.warn("fetchThumbnailAsObjectUrl failed:", err);
          setThumbnailCache((s) => ({ ...s, [cacheKey]: null as any }));
          item.reject(err);
        } finally {
          activeThumbnailRequestsRef.current--;
          // Process next item in queue with small delay to prevent rapid-fire requests
          setTimeout(() => {
            processThumbnailQueue();
          }, THUMBNAIL_LOAD_DELAY_MS);
        }
      })();
    }
  }, []);

  // ------- Init: load auth + project + company -------
  useEffect(() => {
    // Early return if session not ready
    if (!sessionReady) return;

    // Redirect if no user
    if (sessionReady && !user) {
      navigate("/auth?mode=signin");
      return;
    }

    const init = async () => {
      if (!projectId) {
        toast({
          title: "Invalid URL",
          description: "Project ID is missing.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      // DB request - Supabase client automatically includes Authorization header
      // Session is already ready and user exists (checked above)
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("id, name, description, company_id")
        .eq("id", projectId)
        .single();

      if (projectError || !projectData) {
        toast({
          title: "Project not found",
          description: "Unable to load this project.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setProject(projectData);

      if (projectData.company_id) {
        const { data: companyData } = await supabase
          .from("companies")
          .select("name")
          .eq("id", projectData.company_id)
          .single();

        if (companyData?.name) {
          setCompanyName(companyData.name);
        }
      }
    };

    // Only run init when session is ready and user exists
    if (sessionReady && user) {
      void init();
    }
  }, [sessionReady, user, projectId, navigate, toast]);

  const displayProjectName = project?.name ?? "Unnamed Project";
  const { setItems: setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    const breadcrumbItems = [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Projects", href: "/dashboard/projects" },
      { label: displayProjectName || "Project", href: projectId ? `/dataset/${projectId}` : undefined },
      { label: "Upload dataset" },
    ];

    setBreadcrumbs(breadcrumbItems);

    return () => {
      setBreadcrumbs(null);
    };
  }, [displayProjectName, projectId, setBreadcrumbs]);

  // ------- Build files from FileList: do NOT filter by extension; include all files -------
  const buildFilesFromFileList = (fileList: FileList): { files: File[] } => {
    const selectedFiles = Array.from(fileList);

    if (selectedFiles.length > MAX_FILES) {
      throw new Error(`You can upload at most ${MAX_FILES} files.`);
    }

    const validFiles: File[] = [];

    for (const file of selectedFiles) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new Error(`${file.name} exceeds ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))} MB file size limit.`);
      }
      // preserve everything — don't filter by extension
      validFiles.push(file);
    }

    return { files: validFiles };
  };

  // ------- Deselect folder -------
  const handleDeselectFolder = () => {
    setFiles([]);
    setSelectedFolderName(null);
    setSelectedFolderType(null);
    setStatusMessage("Idle");
    setUploadStatus("idle");
    setLabelledFolderError(null);
    setUnlabelledFolderError(null);
    // Clear file inputs
    const labelledInput = document.getElementById("labelled-folder-input") as HTMLInputElement | null;
    const unlabelledInput = document.getElementById("unlabelled-folder-input") as HTMLInputElement | null;
    if (labelledInput) labelledInput.value = "";
    if (unlabelledInput) unlabelledInput.value = "";
  };

  // ------- File selection -------
  const handleFilesSelected = (fileList: FileList | null, isLabelled: boolean = true) => {
    // Clear previous errors immediately for the appropriate input
    if (isLabelled) {
      setLabelledFolderError(null);
    } else {
      setUnlabelledFolderError(null);
    }

    if (!fileList || fileList.length === 0) {
      const errorMsg = "Please select a folder with files.";
      if (isLabelled) {
        setLabelledFolderError(errorMsg);
      } else {
        setUnlabelledFolderError(errorMsg);
      }
      toast({
        title: "Invalid selection",
        description: errorMsg,
        variant: "destructive",
      });
      return;
    }

    // Run validation immediately after folder selection
    try {
      const selectedFiles = Array.from(fileList);

      // Check for .txt files FIRST (immediate validation)
      const txtFiles = selectedFiles.filter(file => 
        file.name.toLowerCase().endsWith('.txt')
      );

      if (isLabelled) {
        // Labelled folder must contain at least one .txt file
        if (txtFiles.length === 0) {
          const errorMsg = "Please include at least one .txt file in this folder.";
          setLabelledFolderError(errorMsg);
          toast({
            title: "Invalid selection",
            description: errorMsg,
            variant: "destructive",
          });
          return;
        }
      } else {
        // Unlabelled folder must contain zero .txt files
        if (txtFiles.length > 0) {
          const errorMsg = "Remove all .txt files from this folder to proceed.";
          setUnlabelledFolderError(errorMsg);
          toast({
            title: "Invalid selection",
            description: errorMsg,
            variant: "destructive",
          });
          return;
        }
      }

      // Check file count
      if (selectedFiles.length > MAX_FILES) {
        const errorMsg = `You can upload at most ${MAX_FILES} files. Selected folder contains ${selectedFiles.length} files.`;
        if (isLabelled) {
          setLabelledFolderError(errorMsg);
        } else {
          setUnlabelledFolderError(errorMsg);
        }
        toast({
          title: "Too many files",
          description: errorMsg,
          variant: "destructive",
        });
        return;
      }

      // Check file sizes
      const oversizedFiles: string[] = [];
      for (const file of selectedFiles) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          oversizedFiles.push(file.name);
        }
      }

      if (oversizedFiles.length > 0) {
        const maxSizeMB = Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024));
        const errorMsg = oversizedFiles.length === 1
          ? `${oversizedFiles[0]} exceeds ${maxSizeMB} MB file size limit.`
          : `${oversizedFiles.length} file(s) exceed ${maxSizeMB} MB file size limit.`;
        if (isLabelled) {
          setLabelledFolderError(errorMsg);
        } else {
          setUnlabelledFolderError(errorMsg);
        }
        toast({
          title: "File size limit exceeded",
          description: errorMsg,
          variant: "destructive",
        });
        return;
      }

      // All validations passed - process files
      const { files: validFiles } = buildFilesFromFileList(fileList);

      // Extract folder name from first file's webkitRelativePath
      let folderName = "Selected Folder";
      if (validFiles.length > 0) {
        // @ts-ignore webkitRelativePath available in supported browsers
        const relPath = (validFiles[0] as any).webkitRelativePath || validFiles[0].name;
        const pathParts = relPath.split('/').filter(Boolean);
        if (pathParts.length > 1) {
          folderName = pathParts[0]; // First directory is the folder name
        } else {
          folderName = validFiles[0].name; // Fallback to filename if no path
        }
      }

      setFiles(validFiles);
      setSelectedFolderName(folderName);
      setSelectedFolderType(isLabelled ? "labelled" : "unlabelled");
      setStatusMessage(`Selected ${validFiles.length} files.`);
      setUploadStatus("idle");
      setMetadata(null);
      setStatusProgress(null);
      setStatusPercent(null);
      // Clear errors for both inputs on success
      setLabelledFolderError(null);
      setUnlabelledFolderError(null);
    } catch (err: any) {
      const errorMsg = err.message ?? "File selection failed.";
      if (isLabelled) {
        setLabelledFolderError(errorMsg);
      } else {
        setUnlabelledFolderError(errorMsg);
      }
      toast({
        title: "Invalid selection",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  // ------- Versions: GET /api/datasets?company&project -------
  const fetchVersions = async () => {
    try {
      if (!companyName || !displayProjectName) return;
      const headers = await getAuthHeaders();
      const q = new URLSearchParams({ company: companyName, project: displayProjectName, includeInactive: "true",});
      const url = apiUrl(`/datasets?${q.toString()}`);
      // console.log("fetchVersions ->", url);
      const res = await fetch(url, { method: "GET", headers });
      if (!res.ok) {
        console.warn("fetchVersions -> 404 or other:", res.status);
        return;
      }
      const json = await res.json();
      const items: any[] = (json as any).datasets || json;
      const normalized: VersionEntry[] = items.map((it: any) => ({
        version: it.version,
        datasetId: it.id || it.datasetId || it._id,
        createdAt: it.created_at || it.createdAt || it.created,
        status: it.status,
        isActive: it.isActive ?? it.is_active,
        ...it,
      }));
      setVersions(normalized);
      return normalized;
    } catch (err) {
      console.warn("fetchVersions error:", err);
      return [];
    }
  };

  useEffect(() => {
    if (companyName && displayProjectName) {
      void fetchVersions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyName, project]);

  // Clear version-related state when project changes
  useEffect(() => {
    if (datasetViewAbortControllerRef.current) {
      datasetViewAbortControllerRef.current.abort();
      datasetViewAbortControllerRef.current = null;
    }
    // Clear version selection and details when project changes
    setSelectedVersionDatasetId(null);
    setMetadata(null);
    setMetadataLoading(false);
    setFileManifest([]);
    setSelectedFolder(null);
    setSelectedFolderInSidebar("all");
    setSelectedImageFile(null);
    setSelectedLabelFile(null);
    setLabelFileContent(null);
  }, [projectId, project]);

  // ------- File manifest pagination & fetch helpers -------
  const fetchFileManifest = async (
    datasetId: string, 
    page = 1, 
    limit = 1000,
    folder?: string,
    type?: string,
    sort?: string,
    order?: string,
    signal?: AbortSignal
  ) => {
    console.log('🔍 [DEBUG] fetchFileManifest called:', {
      datasetId,
      page,
      limit,
      folder,
      type
    });
    
    try {
      const headers = await getAuthHeaders();
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (folder) qs.append("folder", folder);
      if (type && type !== "all") qs.append("type", type);
      if (sort) qs.append("sort", sort);
      if (order) qs.append("order", order);
      const url = apiUrl(`/dataset/${encodeURIComponent(datasetId)}/files?${qs.toString()}`);
      console.log('🔍 [DEBUG] Fetching from URL:', url);
      const res = await fetch(url, { method: "GET", headers, signal });
      if (!res.ok) {
        throw new Error(`files fetch failed ${res.status}`);
      }
      const json = await res.json();
      // API returns: { files: [...], items: [...], totalFiles, total, totalPages, page, limit, datasetId }
      // Handle both 'files' and 'items' response formats
      const rawFiles = json.files || json.items || [];
      
      console.log('🔍 [DEBUG] Files response:', {
        totalFiles: json.totalFiles,
        filesCount: rawFiles.length,
        firstFileId: rawFiles[0]?.id,
        firstFileThumbnailAvailable: rawFiles[0]?.thumbnailAvailable,
        firstFile: rawFiles[0] ? {
          id: rawFiles[0].id,
          fileId: rawFiles[0].fileId,
          thumbnailAvailable: rawFiles[0].thumbnailAvailable,
          originalName: rawFiles[0].originalName || rawFiles[0].name
        } : null
      });
      
      // Map API response fields to FileEntry interface
      // Prefer explicit id/fileId, but fall back to MongoDB _id when needed
      const list: FileEntry[] = rawFiles.map((file: any) => ({
        id: file.id || file.fileId || file._id,
        storedName: file.storedName,
        originalName: file.originalName || file.name || "",
        type: file.type,
        size: file.size,
        folder: file.folder,
        storedPath: file.storedPath || file.path || (file.folder ? `${file.folder}/${file.originalName || file.name}` : file.originalName || file.name || ""),
        thumbnailAvailable: file.thumbnailAvailable,
        thumbnailUrl: file.thumbnailUrl || null, // Use thumbnailUrl from backend (preferred)
        url: file.url,
        // Legacy fields for backward compatibility
        name: file.originalName || file.name,
        path: file.storedPath || file.path,
        thumbUrl: file.thumbUrl,
        mime: file.mime,
      }));
      
      console.log('🔍 [DEBUG] Mapped FileEntry list:', {
        totalMapped: list.length,
        filesWithIds: list.filter(f => f.id).length,
        filesWithThumbnails: list.filter(f => f.thumbnailAvailable === true).length,
        filesWithThumbnailUrl: list.filter(f => f.thumbnailUrl).length,
        sampleMapped: list[0] ? {
          id: list[0].id,
          thumbnailAvailable: list[0].thumbnailAvailable,
          thumbnailUrl: list[0].thumbnailUrl ? 'present' : 'missing',
          originalName: list[0].originalName
        } : null
      });
      
      return { 
        list, 
        meta: {
          ...json,
          totalFiles: json.totalFiles || json.total || 0,
          totalPages: json.totalPages || Math.ceil((json.totalFiles || json.total || 0) / limit),
        }
      };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') throw err;
      console.error('❌ [DEBUG] fetchFileManifest error:', err);
      return { list: [] as FileEntry[], meta: null };
    }
  };

  const fetchAllFiles = async (datasetId: string, signal?: AbortSignal) => {
    console.log('🔍 [DEBUG] fetchAllFiles called for datasetId:', datasetId);
    
    const all: FileEntry[] = [];
    let page = 1;
    const limit = 1000;
    while (true) {
      if (signal?.aborted) break;
      const { list } = await fetchFileManifest(datasetId, page, limit, undefined, undefined, undefined, undefined, signal);
      if (!list || list.length === 0) break;
      all.push(...list);
      if (list.length < limit) break;
      page += 1;
    }
    
    console.log('🔍 [DEBUG] fetchAllFiles result:', {
      totalFiles: all.length,
      filesWithIds: all.filter(f => f.id).length,
      filesWithThumbnails: all.filter(f => f.thumbnailAvailable === true).length,
      sampleFile: all[0] ? {
        id: all[0].id,
        thumbnailAvailable: all[0].thumbnailAvailable,
        originalName: all[0].originalName
      } : null
    });
    
    return all;
  };

  // ------- Lazy-load files for a specific folder -------
  const fetchFolderFiles = async (datasetId: string, folderName: string, page = 1, reset = false) => {
    if (reset) {
      setFolderFiles([]);
      setFolderFilesPage(1);
    }
    setFolderFilesLoading(true);
    try {
      const { list, meta } = await fetchFileManifest(
        datasetId,
        page,
        50, // Smaller limit for folder view
        folderName,
        fileTypeFilter !== "all" ? fileTypeFilter : undefined,
        fileSort,
        fileSortOrder
      );
      if (reset) {
        setFolderFiles(list);
      } else {
        setFolderFiles((prev) => [...prev, ...list]);
      }
      if (meta) {
        setFolderFilesTotal(meta.totalFiles || 0);
        setFolderFilesTotalPages(meta.totalPages || 1);
      }
      setFolderFilesPage(page);
    } catch (err) {
      console.warn("fetchFolderFiles error:", err);
      toast({
        title: "Error",
        description: "Failed to load folder files.",
        variant: "destructive",
      });
    } finally {
      setFolderFilesLoading(false);
    }
  };

  // ------- Load more files (pagination) -------
  const loadMoreFolderFiles = () => {
    const datasetId = selectedVersionDatasetId || currentDatasetId;
    if (!datasetId || !selectedFolder) return;
    if (folderFilesPage < folderFilesTotalPages) {
      fetchFolderFiles(datasetId, selectedFolder, folderFilesPage + 1, false);
    }
  };


  // ------- Handle image click -------
  // Filter files based on search query and filters
  // Deduplicate files to ensure no duplicates in display
  // Must be defined before useEffect that uses it
  const deduplicateFiles = useCallback((filesList: FileEntry[]): FileEntry[] => {
    const fileMap = new Map<string, FileEntry>();
    
    for (const f of filesList) {
      const pathToUse = f.storedPath || (f.folder ? `${f.folder}/${f.originalName || f.name || ""}` : f.originalName || f.name || f.path || "");
      const normalizedPath = pathToUse.toLowerCase();
      
      // Check if this is a processed copy (train/val/test)
      const isProcessedCopy = normalizedPath.startsWith("train/") || 
                               normalizedPath.startsWith("val/") || 
                               normalizedPath.startsWith("test/") || 
                               normalizedPath.startsWith("images/train/") || 
                               normalizedPath.startsWith("images/val/") || 
                               normalizedPath.startsWith("images/test/") ||
                               normalizedPath.startsWith("labels/train/") || 
                               normalizedPath.startsWith("labels/val/") || 
                               normalizedPath.startsWith("labels/test/");
      
      // Create a unique key: normalize filename (extract just filename from path) + type
      // This handles cases where originalName might be a full path or just filename
      const normalizeFileName = (name: string): string => {
        if (!name) return "";
        // Extract just the filename from path (handle both "path/to/file.jpg" and "file.jpg")
        const parts = name.split("/").filter(Boolean);
        return parts[parts.length - 1] || name;
      };
      const fileName = normalizeFileName(f.originalName || f.name || f.storedName || "");
      const dedupeKey = `${fileName}_${f.type || "image"}`;
      
      if (!fileMap.has(dedupeKey)) {
        // First occurrence - add it
        fileMap.set(dedupeKey, f);
      } else {
        // Duplicate found - merge metadata intelligently
        const existing = fileMap.get(dedupeKey)!;
        const existingPath = existing.storedPath || (existing.folder ? `${existing.folder}/${existing.originalName || existing.name || ""}` : existing.originalName || existing.name || existing.path || "");
        const existingNormalized = existingPath.toLowerCase();
        const existingIsProcessed = existingNormalized.startsWith("train/") || 
                                    existingNormalized.startsWith("val/") || 
                                    existingNormalized.startsWith("test/") || 
                                    existingNormalized.startsWith("images/train/") || 
                                    existingNormalized.startsWith("images/val/") || 
                                    existingNormalized.startsWith("images/test/") ||
                                    existingNormalized.startsWith("labels/train/") || 
                                    existingNormalized.startsWith("labels/val/") || 
                                    existingNormalized.startsWith("labels/test/");
        
        // Strategy: Always prefer original folder structure for display, but merge thumbnail metadata from processed copies
        if (existingIsProcessed && !isProcessedCopy) {
          // Existing is processed, new is original - replace with original but merge thumbnail if processed has it
          const merged: FileEntry = {
            ...f,
            thumbnailAvailable: f.thumbnailAvailable || existing.thumbnailAvailable,
            thumbUrl: f.thumbUrl || existing.thumbUrl,
            url: f.url || existing.url,
          };
          fileMap.set(dedupeKey, merged);
        } else if (!existingIsProcessed && isProcessedCopy) {
          // Existing is original, new is processed - keep original but merge thumbnail from processed
          const merged: FileEntry = {
            ...existing,
            thumbnailAvailable: existing.thumbnailAvailable || f.thumbnailAvailable,
            thumbUrl: existing.thumbUrl || f.thumbUrl,
            url: existing.url || f.url,
          };
          fileMap.set(dedupeKey, merged);
        } else if (!existingIsProcessed && !isProcessedCopy) {
          // Both are original - prefer the one with better metadata (thumbnail, etc.)
          if ((f.thumbnailAvailable && !existing.thumbnailAvailable) || 
              (f.id && !existing.id) ||
              (f.storedPath && !existing.storedPath)) {
            fileMap.set(dedupeKey, f);
          }
          // Otherwise keep existing
        }
        // If both are processed, keep the first one (shouldn't happen often)
      }
    }
    
    return Array.from(fileMap.values());
  }, []);

  const getFilteredFiles = useCallback(() => {
    let filtered = fileManifest;
    
    // Apply type filter
    if (filterType !== "all") {
      filtered = filtered.filter(f => f.type === filterType);
    }
    
    // Apply folder filter
    if (filterFolder !== "all") {
      filtered = filtered.filter(f => f.folder === filterFolder);
    }
    
    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(f => 
        f.originalName?.toLowerCase().includes(query) ||
        f.name?.toLowerCase().includes(query) ||
        f.folder?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [fileManifest, filterType, filterFolder, searchQuery]);

  // Update navigable files when filters change - apply same deduplication
  useEffect(() => {
    const filtered = getFilteredFiles();
    // Apply same deduplication logic to ensure navigation matches display
    const deduplicated = deduplicateFiles(filtered);
    setNavigableFiles(deduplicated);
  }, [getFilteredFiles, deduplicateFiles]);

  // Image-only list for full image viewer (backend serves images only at GET /dataset/:id/file/:fileId)
  const navigableImageFiles = useMemo(
    () => navigableFiles.filter((f) => f.type === "image"),
    [navigableFiles]
  );

  // Keyboard event handler will be defined after navigation functions

  // Zoom and pan functions
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanX(0);
    setPanY(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPanX(e.clientX - dragStart.x);
      setPanY(e.clientY - dragStart.y);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoomLevel(prev => Math.max(0.5, Math.min(5, prev + delta)));
    }
  };

  // Non-passive wheel listener so preventDefault works (stops page scroll when zooming)
  useEffect(() => {
    const el = zoomContainerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoomLevel(prev => Math.max(0.5, Math.min(5, prev + delta)));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [selectedImageFile?.id]);

  const handleImageClick = useCallback(async (file: FileEntry) => {
    setSelectedImageFile(file);
    // Reset zoom and pan when opening new image
    setZoomLevel(1);
    setPanX(0);
    setPanY(0);
    
    // Find associated label file
    const datasetId = selectedVersionDatasetId || currentDatasetId;
    if (datasetId && file.type === "image") {
      // Try to find label file in current folder files, or search in all files
      const baseName = file.originalName.replace(/\.(jpg|jpeg|png)$/i, "");
      let labelFile = folderFiles.find(
        (f) => f.type === "label" && f.originalName === `${baseName}.txt`
      );
      
      // If not found in folder files, search in fileManifest
      if (!labelFile && fileManifest.length > 0) {
        labelFile = fileManifest.find(
          (f) => f.type === "label" && f.originalName === `${baseName}.txt` && f.folder === file.folder
        );
      }
      
      if (labelFile) {
        setSelectedLabelFile(labelFile);
        setLabelFileLoadFailed(false);
        // Fetch label file content via API
        try {
          const headers = await getAuthHeaders();
          const url = apiUrl(`/dataset/${encodeURIComponent(datasetId)}/file/${encodeURIComponent(labelFile.id)}`);
          const res = await fetch(url, { method: "GET", headers });
          
          if (res.ok) {
            const text = await res.text();
            setLabelFileContent(text);
          } else {
            setLabelFileContent(null);
          }
        } catch (err) {
          console.warn("Failed to fetch label file:", err);
          setLabelFileContent(null);
        }
      } else {
        setSelectedLabelFile(null);
        setLabelFileContent(null);
      }
    }
    
    // Set current file index for keyboard navigation - use image-only list for image viewer
    const index = navigableImageFiles.findIndex(f => f.id === file.id);
    setCurrentFileIndex(index >= 0 ? index : -1);
  }, [selectedVersionDatasetId, currentDatasetId, folderFiles, fileManifest, navigableImageFiles]);

  // Resolve to image file id for GET /dataset/:id/file/:fileId (backend serves both images and label files)
  const getImageFileIdForViewer = useCallback(
    (file: FileEntry | null, manifest: FileEntry[]): string | null => {
      if (!file?.id) return null;
      if (file.type === "image") return file.id;
      // Edge case: if we ever have a label selected for image viewer, resolve to paired image
      const labelBase = file.originalName?.replace(/\.txt$/i, "");
      const paired = manifest.find(
        (f) =>
          f.type === "image" &&
          f.folder === file.folder &&
          (f.originalName?.replace(/\.(jpg|jpeg|png)$/i, "") === labelBase ||
            f.originalName?.replace(/\.(jpg|jpeg|png)$/i, "") === file.originalName?.replace(/\.txt$/i, ""))
      );
      return paired?.id ?? null;
    },
    []
  );

  // Fetch raw dataset image with auth for modal (browser cannot send headers on img src)
  useEffect(() => {
    const imageFileId = getImageFileIdForViewer(selectedImageFile, fileManifest);
    if (!imageFileId) {
      setModalImageObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    const datasetId = selectedVersionDatasetId || currentDatasetId || "";
    if (!datasetId) return;

    let cancelled = false;
    const thumbnailUrl = apiUrl(`/dataset/${encodeURIComponent(datasetId)}/file/${encodeURIComponent(imageFileId)}/thumbnail`);
    const rawUrl = apiUrl(`/dataset/${encodeURIComponent(datasetId)}/file/${encodeURIComponent(imageFileId)}`);

    const loadWithAuth = async () => {
      const headers = await getAuthHeaders();
      // Prefer raw file first so modal shows full-size image (not small/blurry thumbnail)
      let res = await fetch(rawUrl, { method: "GET", headers });
      if (!res.ok) res = await fetch(thumbnailUrl, { method: "GET", headers });
      if (cancelled) return;
      if (!res.ok) {
        setModalImageObjectUrl(null);
        return;
      }
      const blob = await res.blob();
      if (cancelled) return;
      const url = URL.createObjectURL(blob);
      setModalImageObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    };
    loadWithAuth();

    return () => {
      cancelled = true;
      setModalImageObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [selectedImageFile, fileManifest, getImageFileIdForViewer, selectedVersionDatasetId, currentDatasetId]);

  const handleLabelClick = useCallback(async (file: FileEntry) => {
    setSelectedLabelFile(file);
    setSelectedImageFile(null); // Clear image if any
    setLabelFileContent(null);
    setLabelFileLoadFailed(false);
    setLabelFileLoading(true);
    // Reset zoom and pan
    setZoomLevel(1);
    setPanX(0);
    setPanY(0);
    
    const datasetId = selectedVersionDatasetId || currentDatasetId;
    if (datasetId && file.type === "label") {
      try {
        const headers = await getAuthHeaders();
        const url = apiUrl(`/dataset/${encodeURIComponent(datasetId)}/file/${encodeURIComponent(file.id)}`);
        const res = await fetch(url, { method: "GET", headers });
        
        if (res.ok) {
          const text = await res.text();
          setLabelFileContent(text);
          setLabelFileLoadFailed(false);
        } else {
          setLabelFileContent(null);
          setLabelFileLoadFailed(true);
        }
      } catch (err) {
        console.warn("Failed to fetch label file:", err);
        setLabelFileContent(null);
        setLabelFileLoadFailed(true);
      }
    }
    setLabelFileLoading(false);
    
    // Set current file index for keyboard navigation - use navigableFiles (already deduplicated)
    const index = navigableFiles.findIndex(f => f.id === file.id);
    setCurrentFileIndex(index >= 0 ? index : -1);
  }, [selectedVersionDatasetId, currentDatasetId, navigableFiles]);

  // Keyboard navigation functions - defined after handleImageClick and handleLabelClick
  // Calculate index directly from current file to avoid stale state issues
  // When viewing image, step through image-only list
  const navigateToNextFile = useCallback(() => {
    const currentFile = selectedImageFile || selectedLabelFile;
    if (!currentFile) return;
    const list = selectedImageFile ? navigableImageFiles : navigableFiles;
    if (list.length === 0) return;
    const currentIndex = list.findIndex(f => f.id === currentFile.id);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % list.length;
    const nextFile = list[nextIndex];
    if (nextFile.type === "image") {
      handleImageClick(nextFile);
    } else if (nextFile.type === "label") {
      handleLabelClick(nextFile);
    }
  }, [navigableImageFiles, navigableFiles, selectedImageFile, selectedLabelFile, handleImageClick, handleLabelClick]);

  const navigateToPreviousFile = useCallback(() => {
    const currentFile = selectedImageFile || selectedLabelFile;
    if (!currentFile) return;
    const list = selectedImageFile ? navigableImageFiles : navigableFiles;
    if (list.length === 0) return;
    const currentIndex = list.findIndex(f => f.id === currentFile.id);
    if (currentIndex === -1) return;
    const prevIndex = currentIndex <= 0 ? list.length - 1 : currentIndex - 1;
    const prevFile = list[prevIndex];
    if (prevFile.type === "image") {
      handleImageClick(prevFile);
    } else if (prevFile.type === "label") {
      handleLabelClick(prevFile);
    }
  }, [navigableImageFiles, navigableFiles, selectedImageFile, selectedLabelFile, handleImageClick, handleLabelClick]);

  // Keyboard event handler - defined after navigation functions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if modal is open
      if (!selectedImageFile && !selectedLabelFile) return;
      
      // Prevent default if we're handling the key
      if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Escape") {
        e.preventDefault();
      }
      
      if (e.key === "ArrowRight") {
        navigateToNextFile();
      } else if (e.key === "ArrowLeft") {
        navigateToPreviousFile();
      } else if (e.key === "Escape") {
        setSelectedImageFile(null);
        setSelectedLabelFile(null);
        setLabelFileContent(null);
        setZoomLevel(1);
        setPanX(0);
        setPanY(0);
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImageFile, selectedLabelFile, navigateToNextFile, navigateToPreviousFile]);

  const fetchFolderSummary = async (datasetId: string, signal?: AbortSignal) => {
    try {
      const headers = await getAuthHeaders();
      const url = apiUrl(`/dataset/${encodeURIComponent(datasetId)}/folders`);
      const res = await fetch(url, { method: "GET", headers, signal });
      if (!res.ok) return null;
      const json = await res.json();
      return json;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') throw err;
      console.warn("fetchFolderSummary error:", err);
      return null;
    }
  };


  // ------- Helper: compute percent robustly from status object -------
  const computePercentFromStatus = (s: StatusResponse | null): number | null => {
    if (!s) return null;
    if (typeof s.percent === "number") {
      const p = Math.round(Math.max(0, Math.min(100, s.percent)));
      return p;
    }
    // try common field names for processed and total
    const processed = (s as any).processed ?? (s as any).processedCount ?? (s as any).processed_files ?? (s as any).processed_files_count;
    const total = (s as any).total ?? (s as any).totalImages ?? (s as any).total_files ?? (s as any).total_files_count;
    if (typeof processed === "number" && typeof total === "number" && total > 0) {
      const p = Math.round((processed / total) * 100);
      return Math.max(0, Math.min(100, p));
    }
    return null;
  };

  // ------- Check for detected class IDs and show popup if needed -------
  const checkForDetectedClasses = useCallback(
    async (datasetId: string) => {
      // Prevent duplicate popups for the same dataset
      if (hasShownClassNamePopupRef.current.has(datasetId)) {
        return;
      }

      try {
        const detectedClasses = await getDetectedClasses(datasetId);

        // Debug: log what backend returned (helps diagnose why popup may not show)
        const willShow = detectedClasses.totalClasses > 0 && !detectedClasses.hasCategories;
        console.log(
          "[checkForDetectedClasses] totalClasses:",
          detectedClasses.totalClasses,
          "| hasCategories:",
          detectedClasses.hasCategories,
          "| classIds:",
          detectedClasses.classIds,
          "| willShowPopup:",
          willShow
        );

        // Only show popup if:
        // 1. Class IDs were detected (totalClasses > 0)
        // 2. Categories don't exist yet (hasCategories === false)
        if (detectedClasses.totalClasses > 0 && !detectedClasses.hasCategories) {
          setDetectedClassesData(detectedClasses);
          setShowClassNameDialog(true);
          hasShownClassNamePopupRef.current.add(datasetId);
        }
      } catch (error: any) {
        // Non-blocking: Log error but don't show popup
        // This allows normal dataset usage even if the check fails
        console.warn("Error checking detected classes:", error);
        
        // Don't show popup on error - user can proceed normally
        // Errors like 404 (dataset not found) or 500 (server error) are handled silently
      }
    },
    []
  );

  // ------- Poll dataset status (GET /dataset/:datasetId/status) -------
  const pollDatasetStatus = useCallback(
    async (datasetId: string, isUnlabeled?: boolean) => {
      setUploadStatus("processing");
      setStatusMessage("Processing dataset...");

      const interval = setInterval(async () => {
        try {
          const headers = await getAuthHeaders();
          const url = apiUrl(`/dataset/${encodeURIComponent(datasetId)}/status`);
          const res = await fetch(url, { method: "GET", headers });

          if (!res.ok) {
            throw new Error(`Status check failed with ${res.status}`);
          }

          const json: StatusResponse = await res.json();
          setStatusProgress(json);

          // compute percent and set to state (used by progress bar)
          const pct = computePercentFromStatus(json);
          setStatusPercent(pct);

          if (json.status === "ready" || json.status === "failed") {
            clearInterval(interval);

            if (json.status === "ready") {
              setUploadStatus("ready");
              setStatusMessage("Dataset is ready.");
              setStatusPercent(100);

              // fetch final metadata
              try {
                const headers2 = await getAuthHeaders();
                const metaUrl = apiUrl(`/dataset/${encodeURIComponent(datasetId)}`);
                const metaRes = await fetch(metaUrl, { headers: headers2 });
                if (metaRes.ok) {
                  const metaJson = await metaRes.json();
                  setMetadata(metaJson);
                  
                  // Phase 1: Show notification for unlabeled dataset upload completion
                  if (isUnlabeled) {
                    toast({
                      title: "Upload completed",
                      description: "Please go to Simulation and annotate the images before training.",
                      variant: "default",
                    });
                  }
                }
              } catch (err) {
                console.warn("Failed to fetch final metadata:", err);
              }

              // Check for detected class IDs (only for labeled datasets)
              if (!isUnlabeled) {
                // Delay to ensure backend has parsed labels and populated detected-classes
                const delayMs = 2000;
                setTimeout(() => {
                  checkForDetectedClasses(datasetId);
                }, delayMs);
              }

              // fetch full file manifest
              try {
                const allFiles = await fetchAllFiles(datasetId);
                setFileManifest(allFiles || []);
              } catch (err) {
                console.warn("Failed to fetch files after ready:", err);
              }
            } else {
              setUploadStatus("failed");
              setStatusMessage("Dataset processing failed.");
            }
          } else {
            // still processing, update the UI text if backend provides more detail
            setStatusMessage((prev) => {
              // if backend provides processed/total, show brief detail
              const processed = (json as any).processed ?? (json as any).processedCount ?? (json as any).processed_files;
              const total = (json as any).total ?? (json as any).totalImages ?? (json as any).total_files;
              if (typeof processed === "number" && typeof total === "number") {
                return `Processing — ${processed} / ${total}`;
              }
              return "Processing dataset on server...";
            });
          }
        } catch (err: any) {
          clearInterval(interval);
          setUploadStatus("failed");
          setStatusMessage("Failed to check dataset status.");
          setStatusPercent(null);
          toast({
            title: "Status error",
            description: err.message ?? "Could not check dataset status.",
            variant: "destructive",
          });
        }
      }, 3000);
    },
    [toast, checkForDetectedClasses],
  );

  // ------- Scroll to upload section handler -------
  const handleScrollToUpload = () => {
    if (uploadSectionRef.current) {
      uploadSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      // Open the labelled data card after a short delay
      setTimeout(() => {
        setLabelledOpen(true);
        setUnlabelledOpen(false);
      }, 300);
    }
  };

  // ------- Upload handler (POST /dataset/upload) -------
  const handleUpload = async () => {
    const trimmedVersion = version.trim();

    if (!project) {
      toast({
        title: "Missing project",
        description: "Project information is missing.",
        variant: "destructive",
      });
      return;
    }

    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select a folder with supported files first.",
        variant: "destructive",
      });
      return;
    }

    if (!trimmedVersion) {
      setVersionError("Please enter a version before uploading.");
      toast({
        title: "Version required",
        description: "Please enter a version before uploading.",
        variant: "destructive",
      });
      return;
    }
    setVersionError(null);

    const projectName = displayProjectName;
    const company = companyName || "Unknown";

    try {
      setUploadStatus("uploading");
      setStatusMessage("Uploading files...");
      setStatusPercent(null);

      const formData = new FormData();
      formData.append("company", company);
      formData.append("project", projectName);
      formData.append("version", trimmedVersion);

      // Build fileMeta array: map each file's originalName to its folder
      const fileMeta = files.map((file) => {
        // @ts-ignore webkitRelativePath available in supported browsers
        const relPath = (file as any).webkitRelativePath || file.name;
        // Extract folder from path (full path including subfolders, or "dataset" as default)
        const pathParts = relPath.split('/').filter(Boolean);
        const folder = pathParts.length > 1 
          ? pathParts.slice(0, -1).join('/')  // All directories except filename, joined with '/'
          : 'dataset';
        
        return {
          originalName: file.name,
          folder: folder,
        };
      });

      // Append fileMeta as JSON string to FormData
      formData.append('fileMeta', JSON.stringify(fileMeta));

      // Append every file with its relative path (preserve folder hierarchy)
      files.forEach((file) => {
        // @ts-ignore webkitRelativePath available in supported browsers
        const relPath = (file as any).webkitRelativePath || file.name;
        formData.append("files", file, relPath);
      });

      const uploadUrl = apiUrl("/dataset/upload");
      // Get all authentication headers including custom X-User-* headers
      const headers = await getAuthHeaders();
      // For FormData, remove Content-Type to let browser set it with boundary
      const uploadHeaders: HeadersInit = { ...headers };
      delete (uploadHeaders as any)["Content-Type"];
      
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: uploadHeaders,
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Upload failed: ${res.status} - ${errorText}`);
      }

      const json = await res.json();
      const datasetId = json.datasetId || json.id;
      if (!datasetId) throw new Error("No datasetId returned from server.");

      setCurrentDatasetId(datasetId);
      setStatusProgress({
        status: json.status,
        totalImages: json.totalImages,
      });

      toast({
        title: "Upload queued",
        description: `Dataset ${datasetId} queued with ${json.totalImages} files.`,
      });

      // Capture before clearing state — used for detected-classes popup (labeled vs unlabeled)
      const isUnlabeledUpload = selectedFolderType === "unlabelled";

      // Clear folder selection after successful upload
      setFiles([]);
      setSelectedFolderName(null);
      setSelectedFolderType(null);
      // Clear file inputs
      const labelledInput = document.getElementById("labelled-folder-input") as HTMLInputElement | null;
      const unlabelledInput = document.getElementById("unlabelled-folder-input") as HTMLInputElement | null;
      if (labelledInput) labelledInput.value = "";
      if (unlabelledInput) unlabelledInput.value = "";

      // refresh versions
      await fetchVersions();

      // fetch folder summary and initial manifest if available
      try {
        const summary = await fetchFolderSummary(datasetId);
        if (summary) {
          setMetadata((prev) => ({ ...(prev ?? {}), ...summary }));
        }
      } catch (err) {
        console.warn("Failed to fetch folder summary:", err);
      }

      try {
        const allFiles = await fetchAllFiles(datasetId);
        setFileManifest(allFiles || []);
      } catch (err) {
        console.warn("Failed to fetch initial files:", err);
      }

      // start polling for server-side processing
      await pollDatasetStatus(datasetId, isUnlabeledUpload);
    } catch (err: any) {
      setUploadStatus("failed");
      setStatusMessage("Upload failed.");
      setStatusPercent(null);
      toast({
        title: "Upload failed",
        description: err.message ?? "Something went wrong during upload.",
        variant: "destructive",
      });
    }
  };

  // ------- Select a version and load everything to resume work -------
  const onSelectVersion = async (datasetId: string) => {
    console.log('🔍 [DEBUG] onSelectVersion called for datasetId:', datasetId);

    // Abort any in-flight fetches from a previous selection
    if (datasetViewAbortControllerRef.current) {
      datasetViewAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    datasetViewAbortControllerRef.current = abortController;
    const signal = abortController.signal;
    
    try {
      setSelectedVersionDatasetId(datasetId);
      setSelectedFolder(null); // Reset folder selection
      setMetadata(null); // Clear stale metadata immediately to avoid showing previous dataset's info
      setMetadataLoading(true);

      // Fetch full dataset metadata first (lightweight)
      let metaJson: any = null;
      try {
        const headers = await getAuthHeaders();
        const metaUrl = apiUrl(`/dataset/${encodeURIComponent(datasetId)}`);
        console.log('🔍 [DEBUG] Fetching metadata from:', metaUrl);
        const metaRes = await fetch(metaUrl, { headers, signal });
        if (metaRes.ok) {
          metaJson = await metaRes.json();
          setMetadata(metaJson);
          
          console.log('🔍 [DEBUG] Metadata fetched (using /files endpoint for file list)');
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') throw err;
        console.warn("Failed to fetch metadata for selected version:", err);
      }

      // Also try folder summary for folder counts
      try {
        const sum = await fetchFolderSummary(datasetId, signal);
        if (sum) setMetadata((prev) => ({ ...(prev ?? {}), ...sum }));
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') throw err;
        console.warn("fetchFolderSummary failed for version select:", err);
      }

      // Use files from dataset doc (GET /api/dataset/:datasetId) when available, else fetch from /files endpoint
      // Ensures file browser uses the correct dataset (e.g. augmented) whose files array is authoritative
      let allFiles: FileEntry[] = [];
      const metaFiles = metaJson?.files;
      if (Array.isArray(metaFiles) && metaFiles.length > 0) {
        const orig = (f: Record<string, unknown>) => (f.originalName ?? f.name ?? "") as string;
        const pathOr = (f: Record<string, unknown>) =>
          (f.storedPath ?? f.path ?? (f.folder ? `${f.folder}/${orig(f)}` : orig(f))) as string;
        allFiles = metaFiles.map((file: Record<string, unknown>) => ({
          id: String(file.id ?? file.fileId ?? file._id ?? ""),
          storedName: file.storedName as string | undefined,
          originalName: orig(file),
          type: file.type as string | undefined,
          size: file.size as number | undefined,
          folder: file.folder as string | undefined,
          storedPath: pathOr(file) || "unknown",
          thumbnailAvailable: file.thumbnailAvailable as boolean | undefined,
          url: file.url as string | undefined,
          name: orig(file),
          path: pathOr(file),
        })) as FileEntry[];
        console.log('🔍 [DEBUG] Using files from dataset doc:', allFiles.length);
      }
      if (allFiles.length === 0) {
        console.log('🔍 [DEBUG] Fetching files using GET /api/dataset/:datasetId/files endpoint');
        try {
          const fetched = await fetchAllFiles(datasetId, signal);
          allFiles = fetched || [];
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') throw err;
          console.warn("Failed to fetch files for selected version:", err);
        }
      }
      try {
        setFileManifest(allFiles);
        const previews = allFiles.slice(0, 50).map((f) => ({
          path: f.storedPath || f.path || (f.folder ? `${f.folder}/${f.originalName || f.name || ""}` : f.originalName || f.name || ""),
          fileId: f.id,
          thumbnailAvailable: f.thumbnailAvailable,
          url: f.url,
          thumbUrl: f.thumbUrl,
        }));
        setMetadata((prev) => {
          if (!prev) return null;
          return { ...prev, previews: previews as any };
        });
      } catch (err) {
        console.warn("Failed to fetch files for selected version:", err);
      }

      // optionally fetch current status for that version to show progress
      try {
        const headers = await getAuthHeaders();
        const statusRes = await fetch(apiUrl(`/dataset/${encodeURIComponent(datasetId)}/status`), { method: "GET", headers, signal });
        if (statusRes.ok) {
          const sjson = await statusRes.json();
          setStatusProgress(sjson);
          setStatusPercent(computePercentFromStatus(sjson));
          setUploadStatus(sjson.status === "processing" ? "processing" : sjson.status === "ready" ? "ready" : "idle");
          setStatusMessage(sjson.status === "processing" ? "Processing dataset..." : `Status: ${sjson.status}`);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') throw err;
        // non-fatal
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      toast({
        title: "Error",
        description: "Could not load version contents",
        variant: "destructive",
      });
    } finally {
      setMetadataLoading(false);
    }
  };

  // ------- Close dataset view (dataset summary + file browser) and stop all fetches -------
  const handleCloseDatasetView = useCallback(() => {
    if (datasetViewAbortControllerRef.current) {
      datasetViewAbortControllerRef.current.abort();
      datasetViewAbortControllerRef.current = null;
    }
    setSelectedVersionDatasetId(null);
    setMetadata(null);
    setFileManifest([]);
    setSelectedFolder(null);
    setSelectedFolderInSidebar("all");
    setSelectedImageFile(null);
    setSelectedLabelFile(null);
    setLabelFileContent(null);
  }, []);

  // ------- Fetch version dependencies before deletion -------
  const fetchVersionDependencies = async (datasetId: string) => {
    setLoadingDependencies(true);
    try {
      const headers = await getAuthHeaders();
      const depsUrl = apiUrl(`/dataset/${encodeURIComponent(datasetId)}/dependencies`);
      const res = await fetch(depsUrl, {
        method: "GET",
        headers: headers || {},
      });

      if (!res.ok) {
        // If dependencies endpoint fails, still allow deletion (maybe old API)
        console.warn("Failed to fetch dependencies, proceeding with deletion");
        setVersionDependencies(null);
        return;
      }

      const depsData = await res.json();
      setVersionDependencies(depsData);
    } catch (error) {
      console.error("Error fetching dependencies:", error);
      // Continue without dependencies info
      setVersionDependencies(null);
    } finally {
      setLoadingDependencies(false);
    }
  };

  // ------- Handle delete button click - fetch dependencies first -------
  const handleDeleteVersionClick = async (datasetId: string) => {
    setVersionToDelete(datasetId);
    // Fetch dependencies before showing dialog
    await fetchVersionDependencies(datasetId);
    setShowDeleteVersionDialog(true);
  };

  // ------- Download dataset handler (flat = true → single folder; false/omit → train/val/test) -------
  const handleDownloadDataset = async (datasetId: string, flat: boolean) => {
    setDownloadingDatasetId(datasetId);
    try {
      await datasetsApi.downloadDataset(datasetId, { flat });
      toast({
        title: "Download complete",
        description: flat ? "Dataset downloaded as flat structure (images/, labels/)." : "Dataset downloaded with full structure (train/val/test).",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Download failed";
      toast({
        title: "Download failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setDownloadingDatasetId(null);
    }
  };

  // ------- Delete version handler -------
  const handleDeleteVersion = async () => {
    if (!versionToDelete) {
      toast({
        title: "Error",
        description: "Version ID is missing.",
        variant: "destructive",
      });
      return;
    }

    setDeletingVersion(true);

    try {
      // Clear selection before delete to stop file browser from loading images/thumbnails.
      // This reduces EPERM (file in use) on Windows when backend serves files from disk.
      if (selectedVersionDatasetId === versionToDelete) {
        setSelectedVersionDatasetId(null);
        setMetadata(null);
        setFileManifest([]);
      }
      // Brief delay so backend can release file handles from any in-flight requests. Reduces EPERM.
      await new Promise((r) => setTimeout(r, 1500));

      const headers = await getAuthHeaders();
      const deleteUrl = apiUrl(`/dataset/${encodeURIComponent(versionToDelete)}`);
      const res = await fetch(deleteUrl, {
        method: "DELETE",
        headers: headers ? { ...headers, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let errorMessage = errorData.error || errorData.message || `Failed to delete version: ${res.status}`;

        if (res.status === 400) {
          // Dataset is processing
          errorMessage = errorData.message || "Cannot delete dataset while processing. Please wait for preprocessing to complete.";
        } else if (res.status === 410) {
          // Already deleted
          errorMessage = "Dataset already deleted.";
        } else if (res.status === 404) {
          errorMessage = "Version not found. It may have already been deleted.";
        } else if (res.status === 403 || res.status === 401) {
          errorMessage = "You don't have permission to delete this version.";
        } else if (res.status === 500) {
          errorMessage = "Server error. Please try again later.";
        }

        throw new Error(errorMessage);
      }

      const data = await res.json();

      // Success - remove version from list and clear selection if needed
      setVersions((prev) => prev.filter((v) => v.datasetId !== versionToDelete));

      // If the deleted version was selected, clear selection and related state
      if (selectedVersionDatasetId === versionToDelete) {
        setSelectedVersionDatasetId(null);
        setMetadata(null);
        setMetadataLoading(false);
        setFileManifest([]);
        setStatusProgress(null);
        setStatusPercent(null);
        setUploadStatus("idle");
        setStatusMessage("Idle");
      }

      // Refresh versions list
      await fetchVersions();

      toast({
        title: "Version deleted",
        description: data.message || "The version has been successfully deleted.",
      });

      setShowDeleteVersionDialog(false);
      setVersionToDelete(null);
      setVersionDependencies(null);
    } catch (error: any) {
      console.error("Error deleting version:", error);
      toast({
        title: "Failed to delete version",
        description: error.message || "An unexpected error occurred while deleting the version.",
        variant: "destructive",
      });
      // Keep dialog open on error so user can try again
    } finally {
      setDeletingVersion(false);
    }
  };

  // ------- Augment version -------
  const openAugmentOptionsDialog = (datasetId: string) => {
    setAugmentOptionsDatasetId(datasetId);
    setShowAugmentOptionsDialog(true);
  };

  const handleConfirmCancelAugmentation = async () => {
    const datasetId = cancelAugmentDatasetId;
    if (!datasetId) return;
    setShowCancelAugmentDialog(false);
    setCancelAugmentDatasetId(null);
    setCancellingAugmentationId(datasetId);
    try {
      await datasetsApi.cancelAugmentation(datasetId);
      setAugmentingSourceDatasetId(null);
      stopAugmentationPolling();
      resetAugmentationToIdle();
      toast({
        title: "Augmentation cancelled",
        description: "The augmentation process has been cancelled.",
      });
      await fetchVersions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel augmentation";
      toast({
        title: "Failed to cancel augmentation",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setCancellingAugmentationId(null);
    }
  };

  // ------- Thumbnail helper: fetch protected thumbnail as blob if needed -------
  const fetchThumbnailAsObjectUrl = useCallback(async (datasetId: string, fileId: string) => {
    const cacheKey = `${datasetId}:${fileId}`;
    
    // Check cache first (includes both successes and failures - failures are cached as null)
    // Use ref to access latest cache without recreating callback on every cache update
    const cached = thumbnailCacheRef.current[cacheKey];
    if (cached !== undefined) {
      return cached; // Returns string URL or null (for cached failures)
    }

    // Check if a request for this thumbnail is already in-flight
    const inFlight = thumbnailFetchInProgressRef.current.get(cacheKey);
    if (inFlight) {
      return inFlight; // Return existing promise to prevent duplicate requests
    }

    // Create a promise that will be resolved when the queue processes this request
    const fetchPromise = new Promise<string | null>((resolve, reject) => {
      // Add to queue with AbortController for cancellation support
      const abortController = new AbortController();
      thumbnailQueueRef.current.push({ resolve, reject, datasetId, fileId, abortController });
      
      // Delay processing slightly to batch rapid requests (debounce)
      setTimeout(() => {
        processThumbnailQueue();
      }, THUMBNAIL_LOAD_DELAY_MS);
    });

    // Track in-flight request
    thumbnailFetchInProgressRef.current.set(cacheKey, fetchPromise);
    
    // Clean up tracking when promise resolves/rejects
    fetchPromise.finally(() => {
      thumbnailFetchInProgressRef.current.delete(cacheKey);
    });
    
    return fetchPromise;
  }, [processThumbnailQueue]); // Include processThumbnailQueue in deps

  // Group files by folder for display
  const groupedFiles = useMemo(() => {
    const groups = new Map<string, FileEntry[]>();
    
    navigableFiles.forEach(file => {
      const folder = file.folder || "Uncategorized";
      if (!groups.has(folder)) {
        groups.set(folder, []);
      }
      groups.get(folder)!.push(file);
    });
    
    // Convert to array and sort by folder name
    return Array.from(groups.entries())
      .map(([folder, files]) => ({
        folder,
        files: files.sort((a, b) => a.originalName.localeCompare(b.originalName))
      }))
      .sort((a, b) => a.folder.localeCompare(b.folder));
  }, [navigableFiles]);

  // Extract folder list for sidebar
  const folders = useMemo(() => {
    const folderMap = new Map<string, number>();
    navigableFiles.forEach(file => {
      const folder = file.folder || "Uncategorized";
      folderMap.set(folder, (folderMap.get(folder) || 0) + 1);
    });
    return Array.from(folderMap.entries()).map(([name, count]) => ({
      name,
      count,
      path: name
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [navigableFiles]);

  // Filter displayed files based on selected folder
  const displayedGroups = useMemo(() => {
    if (selectedFolderInSidebar === "all") {
      return groupedFiles;
    }
    return groupedFiles.filter(group => group.folder === selectedFolderInSidebar);
  }, [groupedFiles, selectedFolderInSidebar]);

  // Lazy Thumbnail Component - using native lazy loading with IntersectionObserver fallback
  const LazyThumbnail = ({ 
    thumbEndpoint, 
    fileId, 
    datasetId, 
    alt, 
    onClick,
    fetchThumbnailAsObjectUrl,
    className = "w-12 h-8 object-cover rounded cursor-pointer"
  }: { 
    thumbEndpoint: string; 
    fileId: string; 
    datasetId: string; 
    alt: string; 
    onClick: () => void;
    fetchThumbnailAsObjectUrl: (datasetId: string, fileId: string) => Promise<string | null>;
    className?: string;
  }) => {
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [shouldLoad, setShouldLoad] = useState(false);
    const [hasErrored, setHasErrored] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
      // Use IntersectionObserver to detect when element is in viewport
      // Reduced rootMargin to be less aggressive and prevent too many simultaneous requests
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // Small delay before loading to batch rapid scrolls (100ms debounce)
              setTimeout(() => {
                setShouldLoad(true);
              }, 100);
              observer.disconnect();
            }
          });
        },
        { 
          rootMargin: '50px', // Reduced from 100px - only load when closer to viewport
          threshold: 0.01
        }
      );

      const currentRef = imgRef.current;
      if (currentRef) {
        observer.observe(currentRef);
      }

      // Fallback: if observer doesn't trigger within 5 seconds, load anyway (increased from 2s)
      const fallbackTimer = setTimeout(() => {
        setShouldLoad(true);
      }, 5000);

      return () => {
        observer.disconnect();
        clearTimeout(fallbackTimer);
      };
    }, []);

    useEffect(() => {
      // Only load when in view and not already loaded/errored
      if (!shouldLoad || imgSrc || hasErrored) return;
      // Use authenticated fetch for our API URLs (file browser raw dataset)
      const isOurApiUrl = API_BASE_URL && thumbEndpoint.startsWith(API_BASE_URL);
      if (isOurApiUrl) {
        let cancelled = false;
        fetchThumbnailAsObjectUrl(datasetId, fileId)
          .then((url) => {
            if (!cancelled && url) setImgSrc(url);
            else if (!cancelled) setImgSrc(thumbEndpoint);
          })
          .catch((err) => {
            // Swallow cancellation - expected when user switches dataset before load completes
            if (err?.message === 'Request cancelled due to dataset change') return;
            throw err;
          });
        return () => { cancelled = true; };
      }
      setImgSrc(thumbEndpoint);
    }, [shouldLoad, thumbEndpoint, imgSrc, hasErrored, datasetId, fileId, fetchThumbnailAsObjectUrl]);

    return (
      <img
        ref={imgRef}
        src={imgSrc || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='32'%3E%3Crect width='48' height='32' fill='%23f3f4f6'/%3E%3C/svg%3E"}
        className={className}
        alt={alt}
        onClick={onClick}
        loading="lazy"
        onError={async (e) => {
          // Only attempt fallback if we haven't errored before and imgSrc matches thumbEndpoint
          if (!hasErrored && imgSrc === thumbEndpoint) {
            setHasErrored(true); // Mark as errored to prevent retries
            try {
              const objUrl = await fetchThumbnailAsObjectUrl(datasetId, fileId);
              if (objUrl) {
                setImgSrc(objUrl); // Update React state
                setHasErrored(false); // Reset error flag if fallback succeeds
              } else {
                // Both attempts failed - set placeholder in both React state and DOM
                const placeholder = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='32'%3E%3Crect width='48' height='32' fill='%23f3f4f6'/%3E%3C/svg%3E";
                setImgSrc(placeholder); // Update React state to prevent re-render resets
                (e.target as HTMLImageElement).src = placeholder; // Update DOM immediately
                (e.target as HTMLImageElement).style.opacity = "0.5";
              }
            } catch (err) {
              // Swallow cancellation - expected when user switches dataset before load completes
              if ((err as Error)?.message !== 'Request cancelled due to dataset change') throw err;
            }
          }
        }}
      />
    );
  };

  // File Card Component (Grid View)
  const FileCard = ({ file, datasetId }: { file: FileEntry; datasetId: string }) => {
    const isImage = file.type === "image";
    const isLabel = file.type === "label";
    // Use thumbnailUrl from backend if available, otherwise construct URL as fallback
    const thumbEndpoint = isImage && file.thumbnailUrl
      ? file.thumbnailUrl
      : (datasetId && file.id && isImage
        ? apiUrl(`/dataset/${encodeURIComponent(datasetId)}/file/${encodeURIComponent(file.id)}/thumbnail`)
        : null);

    return (
      <div
        className="group relative bg-card border rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
        onClick={() => {
          if (isImage) {
            handleImageClick(file);
          } else if (isLabel) {
            handleLabelClick(file);
          }
        }}
      >
        <div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden relative">
          {isImage && thumbEndpoint ? (
            <LazyThumbnail
              thumbEndpoint={thumbEndpoint}
              fileId={file.id!}
              datasetId={datasetId}
              alt={file.originalName}
              onClick={() => handleImageClick(file)}
              fetchThumbnailAsObjectUrl={fetchThumbnailAsObjectUrl}
              className="w-full h-full object-cover cursor-pointer"
            />
          ) : isLabel ? (
            <FileText className="w-16 h-16 text-muted-foreground" />
          ) : (
            <div className="w-full h-full bg-muted" />
          )}
        </div>
        <div className="p-2">
          <p className="text-xs font-medium truncate" title={file.originalName}>
            {file.originalName}
          </p>
          <p className="text-xs text-muted-foreground truncate">{file.folder || "Uncategorized"}</p>
        </div>
      </div>
    );
  };

  // File List Item Component (List View)
  const FileListItem = ({ file, datasetId }: { file: FileEntry; datasetId: string }) => {
    const isImage = file.type === "image";
    const isLabel = file.type === "label";
    // Use thumbnailUrl from backend if available, otherwise construct URL as fallback
    const thumbEndpoint = isImage && file.thumbnailUrl
      ? file.thumbnailUrl
      : (datasetId && file.id && isImage
        ? apiUrl(`/dataset/${encodeURIComponent(datasetId)}/file/${encodeURIComponent(file.id)}/thumbnail`)
        : null);

    return (
      <div
        className="grid grid-cols-[48px_1fr_120px_80px] gap-4 p-3 border-b hover:bg-muted/50 cursor-pointer transition-colors"
        onClick={() => {
          if (isImage) {
            handleImageClick(file);
          } else if (isLabel) {
            handleLabelClick(file);
          }
        }}
      >
        <div className="w-12 h-8 bg-muted rounded flex items-center justify-center overflow-hidden">
          {isImage && thumbEndpoint ? (
            <LazyThumbnail
              thumbEndpoint={thumbEndpoint}
              fileId={file.id!}
              datasetId={datasetId}
              alt={file.originalName}
              onClick={() => handleImageClick(file)}
              fetchThumbnailAsObjectUrl={fetchThumbnailAsObjectUrl}
            />
          ) : isLabel ? (
            <FileText className="w-6 h-6 text-muted-foreground" />
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" title={file.originalName}>
            {file.originalName}
          </p>
          <p className="text-xs text-muted-foreground truncate">{file.folder || "Uncategorized"}</p>
        </div>
        <div className="text-xs text-muted-foreground flex items-center">
          {file.size ? `${(file.size / 1024).toFixed(1)} KB` : "-"}
        </div>
        <div className="text-xs text-muted-foreground flex items-center">
          {isImage ? "Image" : isLabel ? "Label" : "File"}
        </div>
      </div>
    );
  };

  // Folder Section Component
  const FolderSection = ({ folderName, files, datasetId }: { folderName: string; files: FileEntry[]; datasetId: string }) => {
    if (files.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="sticky top-0 bg-background z-10 py-3 border-b mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">{folderName}</h3>
              <p className="text-xs text-muted-foreground">{files.length} file{files.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
        {viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {files.map((file) => (
              <FileCard key={file.id} file={file} datasetId={datasetId} />
            ))}
          </div>
        ) : (
          <div className="space-y-0">
            {files.map((file) => (
              <FileListItem key={file.id} file={file} datasetId={datasetId} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // ------- Render -------
  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        ref={uploadSectionRef}
        className="mb-6"
        variants={fadeInUpVariants}
      >
        <div>
          <div className="space-y-0.5">
            <h2 className="text-2xl font-bold">{displayProjectName}</h2>
            <div className="flex items-center gap-1.5">
              {project?.description?.trim() ? (
                <p className="text-xs text-muted-foreground">{project.description}</p>
              ) : null}
              {hasPermission("manageProjects") && project && (
                <button
                  type="button"
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  onClick={() => setShowEditProjectModal(true)}
                  title="Edit project"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground font-medium pt-3">Upload datasets</p>
        </div>
      </motion.div>

      <ProtectedComponent requiredPermission="uploadDatasets">
        <motion.div
          className="grid md:grid-cols-2 gap-6 mb-8"
          variants={fadeInUpVariants}
        >
          <Card>
          <CardHeader className="cursor-pointer" onClick={() => { setLabelledOpen((p) => !p); setUnlabelledOpen(false); }}>
            <CardTitle className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                Labelled data
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span onClick={(e) => e.stopPropagation()} className="inline-flex cursor-help">
                        <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="start" className="max-w-sm">
                      <p className="text-xs">
                        Upload a folder containing images and their corresponding YOLO-format label files (.txt). Each image should have a matching label file with the same base name.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </span>
              <span className="text-xs text-muted-foreground">{labelledOpen ? "▾" : "▸"}</span>
            </CardTitle>
            <CardDescription>Upload folder with both images and labels</CardDescription>
          </CardHeader>
          {labelledOpen && (
            <CardContent className="space-y-4">
              <div>
                {selectedFolderType === "labelled" && selectedFolderName ? (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    <span className="text-sm font-medium flex-1">{selectedFolderName}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={handleDeselectFolder}
                      aria-label="Deselect folder"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <Button type="button" variant="outline" onClick={() => { const input = document.getElementById("labelled-folder-input") as HTMLInputElement | null; input?.click(); }}>
                        Select Folder
                      </Button>
                      <span className="text-xs text-muted-foreground">All files & subfolders preserved • Max {MAX_FILES} files</span>
                    </div>
                    {labelledFolderError && (
                      <p className="mt-1 text-xs text-destructive" role="alert">
                        {labelledFolderError}
                      </p>
                    )}
                  </>
                )}
                <input id="labelled-folder-input" type="file" multiple // @ts-ignore
                  webkitdirectory="true" className="hidden" onChange={(e) => handleFilesSelected(e.target.files, true)} />
              </div>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader className="cursor-pointer" onClick={() => { setUnlabelledOpen((p) => !p); setLabelledOpen(false); }}>
            <CardTitle className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                Unlabelled data
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span onClick={(e) => e.stopPropagation()} className="inline-flex cursor-help">
                        <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="start" className="max-w-sm">
                      <p className="text-xs">
                        Upload a folder containing images only. Use this for inference, or when you plan to add annotations later in the annotation workspace.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </span>
              <span className="text-xs text-muted-foreground">{unlabelledOpen ? "▾" : "▸"}</span>
            </CardTitle>
            <CardDescription>Upload folder with images only</CardDescription>
          </CardHeader>
          {unlabelledOpen && (
            <CardContent className="space-y-4">
              <div>
                {selectedFolderType === "unlabelled" && selectedFolderName ? (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    <span className="text-sm font-medium flex-1">{selectedFolderName}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={handleDeselectFolder}
                      aria-label="Deselect folder"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <Button type="button" variant="outline" onClick={() => { const input = document.getElementById("unlabelled-folder-input") as HTMLInputElement | null; input?.click(); }}>
                        Select Folder
                      </Button>
                      <span className="text-xs text-muted-foreground">All files & subfolders preserved • Max {MAX_FILES} files</span>
                    </div>
                    {unlabelledFolderError && (
                      <p className="mt-1 text-xs text-destructive" role="alert">
                        {unlabelledFolderError}
                      </p>
                    )}
                  </>
                )}
                <input id="unlabelled-folder-input" type="file" multiple // @ts-ignore
                  webkitdirectory="true" className="hidden" onChange={(e) => handleFilesSelected(e.target.files, false)} />
              </div>
            </CardContent>
          )}
        </Card>
        </motion.div>
      </ProtectedComponent>

      <ProtectedComponent requiredPermission="uploadDatasets">
        <motion.div
          className="flex items-center justify-between mb-6"
          variants={fadeInUpVariants}
        >
        <div className="flex items-center gap-4">
          <div className="flex items-end gap-2">
            <div className="w-48">
              <Label htmlFor="version" className="text-xs uppercase text-muted-foreground">
                Version <span className="text-destructive">*</span>
              </Label>
              <Input 
                id="version" 
                placeholder="e.g. v1" 
                value={version} 
                onChange={(e) => {
                  const next = e.target.value;
                  setVersion(next);
                  if (versionError && next.trim()) {
                    setVersionError(null);
                  }
                }}
                className={versionError ? "border-destructive" : ""}
                required
              />
              {versionError && (
                <p className="mt-1 text-xs text-destructive" role="alert">
                  {versionError}
                </p>
              )}
            </div>
            <Button 
              onClick={handleUpload} 
              disabled={uploadStatus === "uploading" || files.length === 0}
              className="h-10"
            >
              {uploadStatus === "uploading" ? "Uploading..." : "Upload"}
            </Button>
          </div>
          <div className="text-sm">
            <span className="font-medium">Status: </span>
            <span>{statusMessage}</span>
            {statusPercent !== null && (
              <span className="ml-3 font-mono text-xs"> {statusPercent}%</span>
            )}
          </div>
        </div>
        </motion.div>
      </ProtectedComponent>

      {/* Progress bar: reflects upload / processing progress from backend only (no fake percentages) */}
      <motion.div
        className="w-full max-w-xl mb-4"
        variants={fadeInUpVariants}
      >
        {uploadStatus !== "idle" && (
          <Progress
            value={statusPercent !== null ? Math.min(Math.max(statusPercent, 0), 100) : 100}
            className="h-2"
            indicatorClassName={cn(
              (uploadStatus === "uploading" || uploadStatus === "processing") &&
                "progress-striped progress-animated",
              uploadStatus === "ready" && "bg-[hsl(var(--success))]"
            )}
          />
        )}
      </motion.div>

      {statusProgress && (
        <div className="text-sm text-muted-foreground mb-8 space-x-4">
          {typeof statusProgress.totalImages === "number" && <span>Total files: {statusProgress.totalImages}</span>}
          {typeof statusProgress.trainCount === "number" && <span>Train: {statusProgress.trainCount}</span>}
          {typeof statusProgress.valCount === "number" && <span>Val: {statusProgress.valCount}</span>}
          {typeof statusProgress.testCount === "number" && <span>Test: {statusProgress.testCount}</span>}
        </div>
      )}

      {/* Versions and Dataset Summary - Side by Side Layout */}
      <motion.div
        className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6"
        variants={fadeInUpVariants}
      >
        {/* Versions list and Delete Button */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Versions
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex cursor-help">
                        <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="start" className="max-w-sm">
                      <p className="text-xs">
                        Each version is a snapshot of your dataset. Use View to browse files, Augment to create augmented copies for training, or Delete to remove a version. Active versions are used for training.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
              <CardDescription>Click a version to view its stored subfolders & files</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {augmentationStatus === "running" && (
                <div className="mb-3 p-3 rounded-md bg-muted/50 space-y-2 border border-primary/20">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">
                      {cancellingAugmentationId ? "Cancelling…" : "Augmenting dataset…"}
                    </span>
                    <ProtectedComponent requiredPermission="annotateDatasets">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={!!cancellingAugmentationId}
                        onClick={() => {
                          const id = datasetIdToPoll ?? augmentingVersion?.datasetId;
                          if (id) {
                            setCancelAugmentDatasetId(id);
                            setShowCancelAugmentDialog(true);
                          }
                        }}
                      >
                        {cancellingAugmentationId ? "Cancelling..." : "Cancel Augmentation"}
                      </Button>
                    </ProtectedComponent>
                  </div>
                  <Progress
                    value={augmentationProgress}
                    className="h-2"
                    indicatorClassName="progress-striped progress-animated"
                  />
                  <p className="text-xs text-muted-foreground">
                    {augmentingVersion?.version
                      ? `Augmenting ${augmentingVersion.version}… ${augmentationProgress}%`
                      : `${augmentationProgress}% complete`}
                  </p>
                </div>
              )}
                  {versions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="relative flex-shrink-0 mb-4">
                        <Folder className="h-20 w-20 text-blue-500 dark:text-blue-400" strokeWidth={1.5} />
                        <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-blue-500 dark:bg-blue-400 flex items-center justify-center shadow-lg">
                          <Upload className="h-4 w-4 text-white" strokeWidth={2.5} />
                        </div>
                      </div>
                      <p className="text-lg font-semibold text-foreground mb-1">No versions yet</p>
                      <p className="text-sm text-muted-foreground">Upload a dataset to create your first version</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {versions.map((v) => (
                        <div key={v.datasetId} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button className="text-left" onClick={() => onSelectVersion(v.datasetId)}>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{v.version || v.datasetId}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {v.createdAt ? new Date(v.createdAt).toLocaleString() : ""}
                                {(v.isActive || v.is_active) && " • Active"}
                              </div>
                            </button>
                            {selectedVersionDatasetId === v.datasetId && (
                              <span className="text-xs text-primary"> (selected)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectVersion(v.datasetId);
                              }}
                            >
                              View
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                  title="More actions"
                                  disabled={downloadingDatasetId === v.datasetId}
                                >
                                  {downloadingDatasetId === v.datasetId ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <MoreVertical className="h-4 w-4" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger disabled={downloadingDatasetId === v.datasetId}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Download
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent>
                                    <DropdownMenuItem
                                      onClick={() => handleDownloadDataset(v.datasetId, false)}
                                      disabled={downloadingDatasetId === v.datasetId}
                                    >
                                      Full structure (train/val/test)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDownloadDataset(v.datasetId, true)}
                                      disabled={downloadingDatasetId === v.datasetId}
                                    >
                                      Flat (single folder)
                                    </DropdownMenuItem>
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                <DropdownMenuSeparator />
                                <ProtectedComponent requiredPermission="annotateDatasets">
                                  {v.augmentation_status === "running" ? (
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      disabled={cancellingAugmentationId === v.datasetId}
                                      onClick={() => {
                                        setCancelAugmentDatasetId(v.datasetId);
                                        setShowCancelAugmentDialog(true);
                                      }}
                                    >
                                      {cancellingAugmentationId === v.datasetId ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      ) : null}
                                      Cancel Augmentation
                                    </DropdownMenuItem>
                                  ) : v.status !== "processing" ? (
                                    <DropdownMenuItem
                                      disabled={augmentingDatasetId === v.datasetId}
                                      onClick={() => openAugmentOptionsDialog(v.datasetId)}
                                    >
                                      {augmentingDatasetId === v.datasetId ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      ) : null}
                                      Augment
                                    </DropdownMenuItem>
                                  ) : null}
                                </ProtectedComponent>
                                <ProtectedComponent requiredPermission="deleteDatasets">
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      disabled={
                                        (deletingVersion || loadingDependencies) &&
                                        versionToDelete === v.datasetId
                                      }
                                      onClick={() => handleDeleteVersionClick(v.datasetId)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                </ProtectedComponent>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              <ProtectedComponent requiredPermission="deleteProjects">
                <div className="pt-4 mt-4 border-t">
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteProjectDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Project
                  </Button>
                </div>
              </ProtectedComponent>
            </CardContent>
          </Card>
        </div>

        {/* Dataset Summary */}
        {selectedVersionDatasetId && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Dataset summary
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex cursor-help">
                        <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="start" className="max-w-sm">
                      <p className="text-xs">
                        Overview of your dataset: total files, size, and folder breakdown. Labels folders contain YOLO-format annotations; images folders contain the corresponding image files.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
              <Button
  variant="ghost"
  size="icon"
  className="h-8 w-8 shrink-0"
  onClick={handleCloseDatasetView}
  title="Close dataset summary and file browser"
>
  <X className="h-4 w-4" />
</Button>
</div>

<CardDescription>
  {metadata ? `ID: ${metadata.id}` : "Loading..."}
</CardDescription>

            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {metadataLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading dataset...
                </div>
              ) : metadata ? (
                <>
                  {/* Badges: Status, Type, Augmented, Active */}
                  {(() => {
                    const sel = versions.find((v) => v.datasetId === selectedVersionDatasetId);
                    const status = metadata.status ?? sel?.status;
                    const isAugmented = metadata.is_augmented ?? metadata.isAugmented ?? sel?.is_augmented ?? sel?.isAugmented;
                    const isActive = sel?.isActive ?? sel?.is_active;
                    const ls = metadata.labelSource ?? metadata.label_source ?? sel?.labelSource ?? sel?.label_source ?? sel?.datasetType;
                    let labelLabel: string | null = null;
                    if (ls === "manually_labeled") labelLabel = "Manually Labelled";
                    else if (ls === "pre_labelled") labelLabel = "Pre-Labelled";
                    else if (ls === "unlabeled" || ls === "labeled") labelLabel = ls === "unlabeled" ? "Unlabeled" : "Labeled";
                    else if (status === "ready_to_train" || sel?.status === "ready_to_train") labelLabel = "Manually Labelled";
                    else if (isAugmented && sel) {
                      const src = versions.find((s) => s.datasetId === (sel.backup_dataset_id ?? sel.sourceDatasetId ?? sel.source_dataset_id));
                      labelLabel = src?.datasetType === "labeled" ? "Pre-Labelled" : "Manually Labelled";
                    }
                    const badges: { label: string; variant?: "default" | "secondary" | "outline" | "destructive"; className?: string }[] = [];
                    if (status === "ready" || status === "ready_to_train") badges.push({ label: "Ready", variant: "default" });
                    else if (status === "processing") badges.push({ label: "Processing", className: "border-amber-500/50 bg-amber-500/20 text-amber-400" });
                    if (labelLabel) {
                      const labelClass = labelLabel === "Manually Labelled" ? "border-teal-500/50 bg-teal-500/20 text-teal-400"
                        : labelLabel === "Pre-Labelled" ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
                        : labelLabel === "Unlabeled" ? "border-slate-500/50 bg-slate-500/20 text-slate-400"
                        : "border-blue-500/50 bg-blue-500/20 text-blue-400";
                      badges.push({ label: labelLabel, className: labelClass });
                    }
                    if (isAugmented) badges.push({ label: "Augmented", className: "border-violet-500/50 bg-violet-500/20 text-violet-400" });
                    if (isActive) badges.push({ label: "Active", className: "border-emerald-500/50 bg-emerald-500/20 text-emerald-400" });
                    if (badges.length === 0) return null;
                    return (
                      <div className="flex flex-wrap gap-1.5 pb-2">
                        {badges.map((b) => (
                          <Badge key={b.label} variant={b.variant ?? "outline"} className={cn("text-xs", b.className)}>
                            {b.label}
                          </Badge>
                        ))}
                      </div>
                    );
                  })()}
                  <div className="space-y-1">
                    {typeof metadata.totalImages === "number" && <p><span className="font-medium">Total images: </span>{metadata.totalImages}</p>}
                    {typeof metadata.sizeBytes === "number" && <p><span className="font-medium">Size: </span>{(metadata.sizeBytes / (1024 * 1024)).toFixed(2)} MB</p>}
                    {typeof metadata.thumbnailsGenerated === "boolean" && <p><span className="font-medium">Thumbnails: </span>{metadata.thumbnailsGenerated ? "Generated" : "Pending"}</p>}
                  </div>
                  
                  {metadata.folders && Object.keys(metadata.folders).length > 0 && (
                    <div className="pt-3 border-t">
                      <p className="font-medium mb-2 flex items-center gap-2">
                        Folder breakdown:
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex cursor-help">
                                <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="start" className="max-w-sm">
                              <p className="text-xs">
                                Shows how your dataset is split into train, val, and test folders. Train is used for model learning, val for tuning during training, and test for final evaluation. Each folder contains images and their corresponding YOLO-format label files.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </p>
                      <div className="space-y-1.5 pl-2">
                        {Object.entries(metadata.folders).map(([folderName, stats]) => (
                          <p key={folderName} className="text-xs">
                            <span className="font-medium">{folderName}: </span>
                            {stats.images} image{stats.images !== 1 ? 's' : ''}, {stats.labels} label{stats.labels !== 1 ? 's' : ''}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No dataset details available.</p>
              )}
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* File Browser - Modern File Manager View */}
      <AnimatePresence mode="wait">
      {selectedVersionDatasetId && metadata && (
        <ProtectedComponent requiredPermission="viewRawDatasetImages">
          <motion.div
            key="file-browser"
            variants={fadeInUpVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
          <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  File Browser
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex cursor-help">
                          <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="start" className="max-w-sm">
                        <p className="text-xs">
                          Browse images and label files in your dataset. Use the folder list to navigate, search to find files by name, and switch between grid or list view.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
                <CardDescription>Browse all dataset files</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  title="Grid View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  title="List View"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleCloseDatasetView}
                  title="Close dataset summary and file browser"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 relative">
            {/* Search & Filter UI */}
            <div className="p-6 pb-4 space-y-3 border-b">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search files by name or folder..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                {/* Type Filter */}
                <Select value={filterType} onValueChange={(value: "all" | "image" | "label") => setFilterType(value)}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="File Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="image">Images</SelectItem>
                    <SelectItem value="label">Labels</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Folder Filter */}
                <Select value={filterFolder} onValueChange={(value) => setFilterFolder(value)}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Folder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Folders</SelectItem>
                    {metadata.folders && Object.keys(metadata.folders).map((folder) => (
                      <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Results count */}
              {searchQuery || filterType !== "all" || filterFolder !== "all" ? (
                <div className="text-xs text-muted-foreground">
                  Showing {getFilteredFiles().length} of {fileManifest.length} files
                </div>
              ) : null}
            </div>

            {/* File Manager Layout */}
            <div className="flex h-[600px]">
              {/* Sidebar */}
              <div className={`${sidebarCollapsed ? 'w-0' : 'w-64'} border-r transition-all duration-200 overflow-hidden`}>
                <div className="h-full overflow-y-auto p-4">
                  <div className="space-y-1">
                    <button
                      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        selectedFolderInSidebar === "all"
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedFolderInSidebar("all")}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Folder className="h-4 w-4" />
                          All Files
                        </span>
                        <span className="text-xs opacity-70">{navigableFiles.length}</span>
                      </div>
                    </button>
                    {folders.map((folder) => (
                      <button
                        key={folder.name}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          selectedFolderInSidebar === folder.name
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => setSelectedFolderInSidebar(folder.name)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Folder className="h-4 w-4" />
                            <span className="truncate">{folder.name}</span>
                          </span>
                          <span className="text-xs opacity-70">{folder.count}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 overflow-y-auto p-6">
                {displayedGroups.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    No files available
                  </div>
                ) : (
                  displayedGroups.map((group) => (
                    <FolderSection
                      key={group.folder}
                      folderName={group.folder}
                      files={group.files}
                      datasetId={selectedVersionDatasetId || currentDatasetId || ""}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Sidebar Toggle Button */}
            <div className="absolute left-64 top-1/2 transform -translate-y-1/2 z-10 transition-all duration-200" style={{ left: sidebarCollapsed ? 0 : '16rem' }}>
              <Button
                variant="outline"
                size="sm"
                className="rounded-r-none rounded-l-none border-l-0 h-8 w-6 p-0"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {sidebarCollapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
        </motion.div>
        </ProtectedComponent>
      )}
      </AnimatePresence>


      {/* Image Viewer Modal */}
      <Dialog open={!!selectedImageFile || !!selectedLabelFile} onOpenChange={(open) => {
        if (!open) {
          setSelectedImageFile(null);
          setSelectedLabelFile(null);
          setLabelFileContent(null);
          setLabelFileLoadFailed(false);
          setLabelFileLoading(false);
          setZoomLevel(1);
          setPanX(0);
          setPanY(0);
          setIsFullscreen(false);
        }
      }}>
        <DialogContent className={`${isFullscreen ? 'max-w-[95vw] max-h-[95vh]' : 'max-w-6xl'} max-h-[90vh] overflow-hidden flex flex-col`}>
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <DialogTitle>{selectedImageFile?.originalName || selectedLabelFile?.originalName}</DialogTitle>
                <DialogDescription>
                  {(selectedImageFile?.folder || selectedLabelFile?.folder) && `Folder: ${selectedImageFile?.folder || selectedLabelFile?.folder}`}
                  {(selectedImageFile?.size || selectedLabelFile?.size) && ` • Size: ${((selectedImageFile?.size || selectedLabelFile?.size || 0) / 1024).toFixed(1)} KB`}
                  {(selectedImageFile ? navigableImageFiles.length : navigableFiles.length) > 0 && ` • ${currentFileIndex + 1} of ${selectedImageFile ? navigableImageFiles.length : navigableFiles.length}`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto space-y-4">
            {/* Label-only view: show file contents as main content when user clicked a label file (no image) */}
            {selectedLabelFile && !selectedImageFile && (
              <Card className="flex-1 min-h-[50vh] flex flex-col">
                <CardHeader className="flex-shrink-0">
                  <CardTitle className="text-base">Label file: {selectedLabelFile.originalName}</CardTitle>
                  <CardDescription>
                    {(selectedLabelFile.folder && `Folder: ${selectedLabelFile.folder}`)}
                    {(selectedLabelFile.size != null && ` • Size: ${(selectedLabelFile.size / 1024).toFixed(1)} KB`)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 flex flex-col">
                  {labelFileLoading ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Loading file contents…</span>
                    </div>
                  ) : labelFileLoadFailed ? (
                    <p className="text-sm text-destructive py-4">
                      Could not load file contents. The server may not support viewing this file, or the file may not be available.
                    </p>
                  ) : labelFileContent !== null ? (
                    <pre className="text-xs bg-muted p-4 rounded overflow-auto flex-1 min-h-0 font-mono whitespace-pre-wrap break-words">
                      {labelFileContent || "(empty file)"}
                    </pre>
                  ) : null}
                </CardContent>
              </Card>
            )}

            {/* Full-size Image with Zoom & Pan */}
            {selectedImageFile && (() => {
              return (
                <div className="flex justify-center relative">
                  {/* Zoom Controls */}
                  <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 bg-background/80 backdrop-blur-sm rounded-md p-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleZoomIn}
                      className="h-8 w-8 p-0"
                      title="Zoom In (Ctrl+Scroll)"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleZoomOut}
                      className="h-8 w-8 p-0"
                      title="Zoom Out (Ctrl+Scroll)"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetZoom}
                      className="h-8 w-8 p-0"
                      title="Reset Zoom"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      className="h-8 w-8 p-0"
                      title="Toggle Fullscreen"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Image Container with Zoom & Pan - image loaded with auth token via blob URL */}
                  <div
                    ref={zoomContainerRef}
                    className="overflow-hidden cursor-move"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{ 
                      width: '100%', 
                      height: '60vh',
                      position: 'relative'
                    }}
                  >
                    <div
                      style={{
                        transform: `translate(${panX}px, ${panY}px) scale(${zoomLevel})`,
                        transformOrigin: 'center center',
                        transition: isDragging ? 'none' : 'transform 0.1s',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {!modalImageObjectUrl ? (
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Loading image…
                        </div>
                      ) : (
                        <img
                          key={selectedImageFile.id}
                          src={modalImageObjectUrl}
                          alt={selectedImageFile.originalName}
                          className="max-w-full max-h-full object-contain"
                          draggable={false}
                        />
                      )}
                    </div>
                  </div>
                  
                  {/* Zoom Level Indicator */}
                  {zoomLevel !== 1 && (
                    <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm rounded px-2 py-1 text-xs">
                      {Math.round(zoomLevel * 100)}%
                    </div>
                  )}
                </div>
              );
            })()}
            
            {/* Associated label file content (only when viewing an image) */}
            {selectedLabelFile && selectedImageFile && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Associated Label File: {selectedLabelFile.originalName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {labelFileContent !== null ? (
                    <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-48 font-mono whitespace-pre-wrap break-words">
                      {labelFileContent || "(empty file)"}
                    </pre>
                  ) : (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading label file…
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Actions & Navigation */}
          <div className="flex items-center justify-between gap-2 flex-shrink-0 pt-4 border-t">
            <div className="flex items-center gap-2">
              {/* Keyboard Navigation */}
              <Button
                variant="outline"
                size="sm"
                onClick={navigateToPreviousFile}
                disabled={(() => {
                  const list = selectedImageFile ? navigableImageFiles : navigableFiles;
                  if (list.length === 0) return true;
                  const currentFile = selectedImageFile || selectedLabelFile;
                  if (!currentFile) return true;
                  const currentIndex = list.findIndex(f => f.id === currentFile.id);
                  return currentIndex <= 0;
                })()}
                title="Previous (←)"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={navigateToNextFile}
                disabled={(() => {
                  const list = selectedImageFile ? navigableImageFiles : navigableFiles;
                  if (list.length === 0) return true;
                  const currentFile = selectedImageFile || selectedLabelFile;
                  if (!currentFile) return true;
                  const currentIndex = list.findIndex(f => f.id === currentFile.id);
                  return currentIndex >= list.length - 1;
                })()}
                title="Next (→)"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2" />
          </div>
          
          {/* Keyboard Shortcuts Hint */}
          <div className="text-xs text-muted-foreground text-center pt-2 border-t flex-shrink-0">
            <span>← → Navigate</span>
            <span className="mx-2">•</span>
            <span>Ctrl+Scroll Zoom</span>
            <span className="mx-2">•</span>
            <span>ESC Close</span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Project Modal */}
      <EditProjectModal
        open={showEditProjectModal}
        onOpenChange={setShowEditProjectModal}
        project={project ? { id: project.id, name: project.name ?? "", description: project.description } : null}
        onSaved={() => {
          // Reload project to get updated name/description
          if (projectId) {
            supabase
              .from("projects")
              .select("id, name, description, company_id")
              .eq("id", projectId)
              .single()
              .then(({ data }) => {
                if (data) setProject(data);
              });
          }
        }}
      />

      {/* Delete Project Confirmation Modal (GET summary, then DELETE via dashboard API) */}
      <DeleteProjectModal
        open={showDeleteProjectDialog}
        onOpenChange={setShowDeleteProjectDialog}
        companyName={companyName}
        projectName={displayProjectName}
        onDeleted={async () => {
          // Project list is from Supabase; remove the row so it disappears from UI (sidebar, projects page)
          if (projectId) {
            await supabase.from("projects").delete().eq("id", projectId);
          }
          toast({
            title: "Project deleted",
            description: "Project and all its data have been deleted.",
          });
          navigate("/dashboard/projects");
        }}
      />

      {/* Cancel augmentation confirmation dialog */}
      <AlertDialog open={showCancelAugmentDialog} onOpenChange={(open) => {
        setShowCancelAugmentDialog(open);
        if (!open) setCancelAugmentDatasetId(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel augmentation?</AlertDialogTitle>
            <AlertDialogDescription>
              Cancel augmentation for this dataset? The process will stop and partial results may be discarded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!cancellingAugmentationId}>Keep running</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmCancelAugmentation();
              }}
              disabled={!!cancellingAugmentationId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancellingAugmentationId ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Cancelling…
                </>
              ) : (
                "Cancel augmentation"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Augment Options Dialog */}
      <AugmentVersionNameModal
        open={showAugmentOptionsDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowAugmentOptionsDialog(false);
            setAugmentOptionsDatasetId(null);
          }
        }}
        currentVersion={
          augmentOptionsDatasetId
            ? versions.find((v) => v.datasetId === augmentOptionsDatasetId)?.version
            : null
        }
        isLoading={!!augmentingDatasetId}
        title="Augment dataset"
        description="Enter a name for the new augmented version. The original dataset will be backed up and replaced when complete."
        cancelLabel="Cancel"
        confirmLabel="Start Augmentation"
        onConfirm={async (versionName, options) => {
          const datasetId = augmentOptionsDatasetId;
          if (!datasetId) return;
          setAugmentingDatasetId(datasetId);
          try {
            await datasetsApi.augmentDataset(datasetId, versionName, options);
            setShowAugmentOptionsDialog(false);
            setAugmentOptionsDatasetId(null);
            setAugmentingSourceDatasetId(datasetId);
            toast({
              title: "Augmentation started",
              description: "Dataset augmentation has been started in the background. You can continue working while it finishes.",
            });
            startAugmentationPolling(datasetId);
            await fetchVersions();
          } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Failed to start augmentation";
            const is409 = msg.includes("409") || msg.includes("Augmentation already running");
            if (is409) {
              toast({
                title: "Augmentation already running",
                description: "Augmentation already running for this dataset.",
                variant: "default",
              });
              setShowAugmentOptionsDialog(false);
              setAugmentOptionsDatasetId(null);
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
            setAugmentingDatasetId(null);
          }
        }}
      />

      {/* Delete Version Confirmation Dialog */}
      <AlertDialog open={showDeleteVersionDialog} onOpenChange={(open) => {
        setShowDeleteVersionDialog(open);
        if (!open) {
          setVersionToDelete(null);
          setVersionDependencies(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Version?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              {loadingDependencies ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Checking dependencies...</span>
                </div>
              ) : (
                <>
                  <p>
                    Are you sure you want to delete this version? This will permanently delete 
                    the version files and all associated data. This action cannot be undone.
                  </p>
                  {versionDependencies && versionDependencies.hasDependencies && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="font-medium text-sm mb-2">This dataset is used by:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {versionDependencies.counts.trainingJobs > 0 && (
                          <li>
                            {versionDependencies.counts.trainingJobs} training job{versionDependencies.counts.trainingJobs > 1 ? 's' : ''}
                            {versionDependencies.dependencies.trainingJobs.length > 0 && (
                              <span className="text-muted-foreground text-xs ml-1">
                                ({versionDependencies.dependencies.trainingJobs.map(j => j.jobId).join(', ')})
                              </span>
                            )}
                          </li>
                        )}
                        {versionDependencies.counts.models > 0 && (
                          <li>
                            {versionDependencies.counts.models} trained model{versionDependencies.counts.models > 1 ? 's' : ''}
                            {versionDependencies.dependencies.models.length > 0 && (
                              <span className="text-muted-foreground text-xs ml-1">
                                ({versionDependencies.dependencies.models.map(m => `${m.modelVersion || m.modelId} (${m.modelType || 'Unknown'})`).join(', ')})
                              </span>
                            )}
                          </li>
                        )}
                        {versionDependencies.counts.inferenceJobs > 0 && (
                          <li>
                            {versionDependencies.counts.inferenceJobs} inference job{versionDependencies.counts.inferenceJobs > 1 ? 's' : ''}
                          </li>
                        )}
                      </ul>
                      <p className="text-xs text-muted-foreground mt-2">
                        Files will be deleted but references will remain. Models and jobs will show "Dataset deleted" status.
                      </p>
                    </div>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingVersion || loadingDependencies}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVersion}
              disabled={deletingVersion || loadingDependencies}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingVersion ? (
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

      {/* Class Name Dialog */}
      {showClassNameDialog && detectedClassesData && currentDatasetId && (
        <ClassNameDialog
          datasetId={currentDatasetId}
          detectedClasses={detectedClassesData}
          open={showClassNameDialog}
          onClose={() => {
            setShowClassNameDialog(false);
            setDetectedClassesData(null);
          }}
          onSuccess={() => {
            // Optionally refresh dataset metadata or show success message
            // The dialog already shows a success toast, so we can just close
            setShowClassNameDialog(false);
            setDetectedClassesData(null);
          }}
        />
      )}
    </motion.div>
  );
};

export default DatasetManager;