import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { AnnotationProgress } from "@/components/annotation/AnnotationProgress";
import { AnnotationToolbar } from "@/components/annotation/AnnotationToolbar";
import { CategorySelector } from "@/components/annotation/CategorySelector";
import { CategoryManager } from "@/components/annotation/CategoryManager";
import { AnnotationStats } from "@/components/annotation/AnnotationStats";
import { ImageThumbnailGrid } from "@/components/annotation/ImageThumbnailGrid";
import { ImageViewer } from "@/components/annotation/ImageViewer";
import {
  BoundingBoxCanvas,
  type BoundingBoxCanvasHandle,
} from "@/components/annotation/BoundingBoxCanvas";
import { AnnotationErrorBoundary } from "@/components/annotation/AnnotationErrorBoundary";
import { CategoryPickerMenu } from "@/components/annotation/CategoryPickerMenu";
import { ConvertToYOLOButton } from "@/components/annotation/ConvertToYOLOButton";
import { AnnotationMetadata } from "@/components/annotation/AnnotationMetadata";
import { AnnotationExportButton } from "@/components/annotation/AnnotationExportButton";
import { AnnotationImportButton } from "@/components/annotation/AnnotationImportButton";
import { AnnotationAnalytics } from "@/components/annotation/AnnotationAnalytics";
import * as datasetsApi from "@/lib/api/datasets";
import { useAnnotation } from "@/hooks/useAnnotation";
import { useAnnotationSelection } from "@/hooks/useAnnotationSelection";
import { useImageLoader } from "@/hooks/useImageLoader";
import { useAnnotationShortcuts } from "@/hooks/useAnnotationShortcuts";
import { useShortcutKeys, matchesShortcut } from "@/hooks/useShortcutKeys";
import { supabase } from "@/integrations/supabase/client";
import * as annotationsApi from "@/lib/api/annotations";
import * as categoriesApi from "@/lib/api/categories";
import * as modelsApi from "@/lib/api/models";
import type {
  Annotation,
  AnnotationState,
  AnnotationShapeMode,
  Category,
  Image,
  PolygonPoint,
} from "@/types/annotation";
import { mapApiRecordToAnnotation, annotationToWritePayload } from "@/lib/utils/mapApiAnnotation";
import { validatePolygonNormalized, polygonToBoundingBox } from "@/lib/utils/polygonUtils";
import { isMongoObjectId, annotationsMatchGeometry } from "@/lib/utils/annotationSync";
import { Loader2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAugmentationStatus, type AugmentationStatusState } from "@/hooks/useAugmentationStatus";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AugmentVersionNameModal } from "@/components/datasets/AugmentVersionNameModal";

interface AnnotationWorkspaceProps {
  datasetId: string;
  onClose: () => void;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

/** Normalize dataset image payloads from API (snake_case / _id) for editor + thumbnails */
function normalizeDatasetImage(raw: Record<string, unknown>): Image {
  const id = String(raw.id ?? raw._id ?? "");
  return {
    id,
    filename: String(raw.filename ?? raw.name ?? ""),
    url: String(raw.url ?? ""),
    thumbnailUrl:
      raw.thumbnailUrl != null
        ? String(raw.thumbnailUrl)
        : raw.thumbnail_url != null
          ? String(raw.thumbnail_url)
          : undefined,
    folder: raw.folder != null ? String(raw.folder) : undefined,
    size: typeof raw.size === "number" ? raw.size : undefined,
    hasAnnotations:
      raw.hasAnnotations === true ||
      raw.has_annotations === true ||
      raw.has_annotation === true,
    hasLabels: raw.hasLabels === true || raw.has_labels === true,
    annotationStatus: raw.annotationStatus as Image["annotationStatus"] | undefined,
  };
}

export const AnnotationWorkspace: React.FC<AnnotationWorkspaceProps> = ({
  datasetId,
  onClose,
}) => {
  const [annotationShapeMode, setAnnotationShapeMode] = useState<AnnotationShapeMode>("BBOX");
  const [shapeModeLocked, setShapeModeLocked] = useState(false);
  const shapePrefStorageKey = useMemo(() => `annotationShapePref:${datasetId}`, [datasetId]);

  const annotationState = useAnnotation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const {
    images,
    currentImage,
    currentImageIndex,
    annotations,
    selectedCategoryId,
    selectedAnnotationId,
    isDrawing,
    unsavedChanges,
    canUndo,
    canRedo,
    loadImages,
    selectImage,
    loadAnnotations,
    setCategory,
    setDrawing,
    setSelectedAnnotation,
    addAnnotation,
    updateAnnotation,
    undo,
    redo,
    markSaved,
    deleteAnnotation,
    replaceAnnotationId,
  } = annotationState;

  const { toast } = useToast();
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  // Phase 4: Track unsaved bounding boxes
  const [unsavedBoxes, setUnsavedBoxes] = useState<Array<{ imageId: string; bbox: [number, number, number, number]; categoryId: string; categoryName: string }>>([]);
  const canvasRef = useRef<BoundingBoxCanvasHandle>(null);
  const [polygonDraftPointCount, setPolygonDraftPointCount] = useState(0);
  // Phase 7: Track completion state
  const [isSaveComplete, setIsSaveComplete] = useState(false);
  const [showUnannotatedDialog, setShowUnannotatedDialog] = useState(false);
  // Phase 5: Track if we should show only unannotated images
  const [showOnlyUnannotatedImages, setShowOnlyUnannotatedImages] = useState(false);
  // Track initialization error for retry
  const [initializationError, setInitializationError] = useState<string | null>(null);
  
  // Phase 3: Check if categories exist (defined early to avoid initialization errors)
  const hasCategories = categories.length > 0;
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [imageMetrics, setImageMetrics] = useState<{
    naturalWidth: number;
    naturalHeight: number;
    displayWidth: number;
    displayHeight: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);

  // --- Copy / paste clipboard (survives image navigation) ---
  type CopiedAnnotation = {
    bbox: [number, number, number, number];
    polygon?: PolygonPoint[];
    categoryId: string;
    categoryName: string;
  };
  const [copiedAnnotations, setCopiedAnnotations] = useState<CopiedAnnotation[]>([]);

  // --- Category picker (left-click / W shortcut) ---
  const [categoryPicker, setCategoryPicker] = useState<{ open: boolean; x: number; y: number }>({
    open: false,
    x: 0,
    y: 0,
  });
  // Last cursor position over the image (relative to image container) — used by W shortcut
  const cursorOnImageRef = useRef<{ x: number; y: number } | null>(null);
  const [isClickToMask, setIsClickToMask] = useState(false);
  const [clickToMaskPending, setClickToMaskPending] = useState(false);
  const [clickToMaskPendingPoint, setClickToMaskPendingPoint] = useState<PolygonPoint | null>(null);
  const enterMaskAfterPickerRef = useRef(false);

  // --- Custom shortcut keys (reads from localStorage) ---
  const { keys: shortcutKeys } = useShortcutKeys();
  
  // Phase 6: Multi-select and review workflow
  const selection = useAnnotationSelection();
  const [stateFilter, setStateFilter] = useState<AnnotationState | "all">("all");
  const [hasConflicts, setHasConflicts] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const conflictCheckIntervalRef = useRef<number | null>(null);
  // Ref to track current annotations for conflict detection (avoids dependency issues)
  const annotationsRef = useRef(annotations);
  // Cache ref for API requests (persists across effect re-runs)
  const lastFetchTimeRef = useRef<number>(0);
  // Track ongoing requests to prevent duplicate calls
  const ongoingRequestRef = useRef<string | null>(null);
  // Track whether we've restored workspace session from storage
  const hasRestoredSessionRef = useRef(false);
  // Augmentation confirmation state (shown after successful save + convert)
  const [showAugmentDialog, setShowAugmentDialog] = useState(false);
  /** Confirm destructive re-import from YOLO .txt (replace DB rows for current image) */
  const [replaceLabelsConfirmOpen, setReplaceLabelsConfirmOpen] = useState(false);
  const [augmenting, setAugmenting] = useState(false);
  const [augmentDatasetVersion, setAugmentDatasetVersion] = useState<string | number | null>(null);
  const [augmentingDatasetId, setAugmentingDatasetId] = useState<string | null>(null);
  const augmentationHandledRef = useRef<string | null>(null);
  const prevAugmentationStatusRef = useRef<AugmentationStatusState | null>(null);

  const {
    status: augmentationStatus,
    progress: augmentationProgress,
    startPolling: startAugmentationPolling,
    stopPolling: stopAugmentationPolling,
    resetToIdle: resetAugmentationToIdle,
  } = useAugmentationStatus(augmentingDatasetId);

  // Track image loading state
  const { loaded: imageLoaderLoaded, error: imageError } = useImageLoader(
    currentImage?.url ?? null
  );

  // Update image loaded state
  useEffect(() => {
    setImageLoaded(imageLoaderLoaded && !imageError);
    // Disable drawing if image not loaded
    if (!imageLoaderLoaded || imageError) {
      setDrawing(false);
    }
  }, [imageLoaderLoaded, imageError, setDrawing]);

  // Persist key for this dataset's annotation session
  const storageKey = useMemo(
    () => `annotationWorkspace:${datasetId}`,
    [datasetId]
  );

  // Restore workspace session (current image, filters, etc.) after initial load
  useEffect(() => {
    if (hasRestoredSessionRef.current) return;
    if (!images.length) return;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        hasRestoredSessionRef.current = true;
        return;
      }

      const parsed = JSON.parse(raw) as {
        currentImageId?: string | null;
        selectedCategoryId?: string | null;
        stateFilter?: AnnotationState | "all";
        showOnlyUnannotatedImages?: boolean;
      };

      if (parsed.currentImageId) {
        const idx = images.findIndex((img) => img.id === parsed.currentImageId);
        if (idx >= 0) {
          selectImage(idx);
        }
      }

      if (parsed.selectedCategoryId) {
        setCategory(parsed.selectedCategoryId);
      }

      if (parsed.stateFilter) {
        setStateFilter(parsed.stateFilter);
      }

      if (typeof parsed.showOnlyUnannotatedImages === "boolean") {
        setShowOnlyUnannotatedImages(parsed.showOnlyUnannotatedImages);
      }
    } catch (error) {
      console.error("[AnnotationWorkspace] Failed to restore session state:", error);
    } finally {
      hasRestoredSessionRef.current = true;
    }
  }, [images, selectImage, setCategory, setStateFilter, setShowOnlyUnannotatedImages, storageKey]);

  // Persist workspace session whenever key state changes
  useEffect(() => {
    try {
      const payload = {
        currentImageId: currentImage?.id ?? null,
        selectedCategoryId,
        stateFilter,
        showOnlyUnannotatedImages,
      };
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (error) {
      console.error("[AnnotationWorkspace] Failed to persist session state:", error);
    }
  }, [
    currentImage?.id,
    selectedCategoryId,
    stateFilter,
    showOnlyUnannotatedImages,
    storageKey,
  ]);

  // Server-truth: lock BBOX vs POLYGON when dataset already has saved annotations; else use local pref until first save.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await annotationsApi.getAnnotations(datasetId);
        if (cancelled) return;
        const list = (data.annotations ?? []).map((raw) =>
          mapApiRecordToAnnotation(raw as unknown as Record<string, unknown>)
        );
        if (list.length > 0) {
          const anyPoly = list.some((a) => a.polygon && a.polygon.length >= 3);
          setAnnotationShapeMode(anyPoly ? "POLYGON" : "BBOX");
          setShapeModeLocked(true);
        } else {
          try {
            const pref = window.localStorage.getItem(shapePrefStorageKey) as AnnotationShapeMode | null;
            if (pref === "POLYGON" || pref === "BBOX") setAnnotationShapeMode(pref);
          } catch {
            /* ignore */
          }
        }
      } catch (e) {
        console.warn("[AnnotationWorkspace] dataset annotation mode probe failed:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [datasetId, shapePrefStorageKey]);

  // Fetch images and categories on mount
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      setInitializationError(null);
      try {
        console.log("[AnnotationWorkspace] Initializing for dataset:", datasetId);
        
        // Fetch all images for this dataset (request a high limit so all are loaded)
        console.log("[AnnotationWorkspace] Fetching dataset images...");
        const imagesData = await annotationsApi.getDatasetImages(datasetId, { limit: 10000, status: "all" });
        console.log("[AnnotationWorkspace] Dataset images response:", imagesData);
        
        if (!imagesData || !imagesData.images) {
          throw new Error("Invalid response from images endpoint");
        }

        loadImages(
          imagesData.images.map((img) =>
            normalizeDatasetImage(img as unknown as Record<string, unknown>)
          )
        );
        console.log("[AnnotationWorkspace] Loaded", imagesData.images.length, "images");

        // Auto-select first image if nothing will restore from session
        if (imagesData.images.length > 0 && !hasRestoredSessionRef.current) {
          selectImage(0);
        } else if (imagesData.images.length === 0) {
          toast({
            title: "No images",
            description: "This dataset has no images to annotate.",
            variant: "destructive",
          });
        }

        // Fetch categories
        console.log("[AnnotationWorkspace] Fetching categories...");
        const categoriesData = await categoriesApi.getCategories(datasetId);
        console.log("[AnnotationWorkspace] Categories response:", categoriesData);
        
        if (!categoriesData || !categoriesData.categories) {
          throw new Error("Invalid response from categories endpoint");
        }
        
        setCategories(categoriesData.categories || []);

        // Phase 3: Do not auto-select first category - user must explicitly create categories
        // Show initial notification if no categories exist
        if (!categoriesData.categories || categoriesData.categories.length === 0) {
          toast({
            title: "Add categories first",
            description: "First, add categories (defect names) before annotating images. Do not annotate good images.",
            variant: "info",
          });
        }
      } catch (error) {
        console.error("[AnnotationWorkspace] Failed to initialize:", error);
        
        // Detect connection errors
        const isConnectionError = 
          error instanceof TypeError && 
          (error.message.includes("Failed to fetch") || 
           error.message.includes("ERR_CONNECTION_REFUSED") ||
           error.message.includes("NetworkError"));
        
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (isConnectionError) {
          const connectionErrorMsg = "Cannot connect to the backend server. Please ensure the API server is running and accessible.";
          setInitializationError(connectionErrorMsg);
          toast({
            title: "Connection error",
            description: connectionErrorMsg,
            variant: "destructive",
          });
        } else {
          setInitializationError(errorMessage);
          toast({
            title: "Failed to load annotation workspace",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } finally {
        setLoading(false);
      }
    };

    void initialize();
  }, [datasetId, loadImages, selectImage, setCategory, toast]);

  // Start polling when augmentation is running
  useEffect(() => {
    if (augmentingDatasetId) {
      startAugmentationPolling(augmentingDatasetId);
    }
    return () => {
      if (augmentingDatasetId) stopAugmentationPolling();
    };
  }, [augmentingDatasetId, startAugmentationPolling, stopAugmentationPolling]);

  // Handle augmentation completion (toast + clear state)
  useEffect(() => {
    const key = `${augmentingDatasetId}-${augmentationStatus}`;
    const prevStatus = prevAugmentationStatusRef.current;
    const isSucceeded = prevStatus === "running" && augmentationStatus === "succeeded";
    const isFailed = prevStatus === "running" && augmentationStatus === "failed";

    if (isSucceeded) {
      if (augmentationHandledRef.current === key) return;
      augmentationHandledRef.current = key;
      setAugmentingDatasetId(null);
      toast({
        title: "Augmentation completed",
        description: "The dataset has been successfully augmented and replaced.",
        variant: "default",
      });
    } else if (isFailed) {
      if (augmentationHandledRef.current === key) return;
      augmentationHandledRef.current = key;
      setAugmentingDatasetId(null);
      toast({
        title: "Augmentation failed",
        description: "Dataset augmentation failed. The original dataset is unchanged.",
        variant: "destructive",
      });
    }
    prevAugmentationStatusRef.current = augmentationStatus;
  }, [augmentationStatus, augmentingDatasetId, toast]);

  // Cleanup when dataset changes
  useEffect(() => {
    setAugmentingDatasetId(null);
    augmentationHandledRef.current = null;
    prevAugmentationStatusRef.current = null;
  }, [datasetId]);

  // Keep annotations ref in sync with state (for conflict detection without dependency issues)
  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  // Fetch annotations when image changes (with debouncing).
  // If image has YOLO .txt on disk but no DB rows yet, import first so the canvas can show boxes.
  useEffect(() => {
    if (!currentImage) return;

    const imageId = currentImage.id;
    const hasLabels = currentImage.hasLabels === true;
    const hasDbAnnotations = currentImage.hasAnnotations === true;

    let cancelled = false;

    const timeoutId = setTimeout(async () => {
      try {
        if (hasLabels && !hasDbAnnotations) {
          // ✅ pre-labeled images only have .txt until import — hydrate Mongo rows for canvas
          const importResult = await annotationsApi.importLabelsToAnnotations(datasetId, {
            imageIds: [imageId],
            replace: false,
          });
          if (cancelled) return;

          const details = importResult.details ?? [];
          const allWarnings = details.flatMap((d) => d.warnings ?? []);
          if (allWarnings.length > 0) {
            const preview = allWarnings.slice(0, 8).join(" · ");
            toast({
              title: "Label import warnings",
              description:
                preview + (allWarnings.length > 8 ? ` (+${allWarnings.length - 8} more)` : ""),
              variant: "default",
            });
          }

          const myDetail = details.find((d) => d.imageId === imageId) ?? details[0];
          if (myDetail?.status === "skipped" && myDetail.reason) {
            toast({
              title: "Labels import skipped",
              description: myDetail.reason,
              variant: "default",
            });
          }
        }

        const data = await annotationsApi.getAnnotations(datasetId, imageId);
        if (cancelled) return;

        console.log("[AnnotationWorkspace] FETCHED ANNS", {
          datasetId,
          imageId,
          count: data.annotations.length,
          anns: data.annotations,
        });
        loadAnnotations(
          (data.annotations ?? []).map((raw) =>
            mapApiRecordToAnnotation(raw as unknown as Record<string, unknown>)
          )
        );
        setSelectedAnnotation(null);
        selection.clearSelection();
        setLastUpdateTime(new Date());
      } catch (error: unknown) {
        if (cancelled) return;
        console.error("Failed to fetch/import annotations:", error);
        const msg = error instanceof Error ? error.message : String(error ?? "");
        const lower = msg.toLowerCase();
        if (
          lower.includes("401") ||
          lower.includes("403") ||
          lower.includes("unauthorized") ||
          lower.includes("forbidden")
        ) {
          toast({
            title: "Access denied",
            description: msg || "You may not have permission to load or import labels.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Failed to load annotations",
            description: msg || "Unknown error",
            variant: "destructive",
          });
        }
      }
    }, 100);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
    // ❗ Do NOT depend on hasAnnotations — flipping it when the first local box is
    // drawn re-fetches and can wipe that box before the save finishes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentImage?.id,
    datasetId,
    currentImage?.hasLabels,
  ]);

  // Phase 6: Conflict detection - poll for updates (CRITICAL FIX: Only depend on imageId)
  useEffect(() => {
    if (!currentImage || !imageLoaded) return;
    
    // Capture datasetId and imageLoaded from closure (not in dependencies to prevent re-runs)
    const currentDatasetId = datasetId;
    const currentImageId = currentImage.id;
    const requestKey = `${currentDatasetId}-${currentImageId}`;

    // Clear any existing interval first to prevent accumulation
    if (conflictCheckIntervalRef.current) {
      clearInterval(conflictCheckIntervalRef.current);
      conflictCheckIntervalRef.current = null;
    }

    const CACHE_DURATION = 2000; // 2 seconds cache to prevent redundant requests
    const POLL_INTERVAL = 5000; // 5 seconds polling interval

    const checkForConflicts = async () => {
      // Only poll if tab is visible
      if (document.hidden) return;

      const now = Date.now();
      // Don't fetch if last fetch was < 2 seconds ago (caching) or if request is ongoing
      if (now - lastFetchTimeRef.current < CACHE_DURATION || ongoingRequestRef.current === requestKey) {
        return;
      }

      ongoingRequestRef.current = requestKey;
      lastFetchTimeRef.current = now;

      try {
        const data = await annotationsApi.getAnnotations(currentDatasetId, currentImageId);
        
        const latestAnnotations = data.annotations;

        // Check if any annotation was updated elsewhere
        // Use ref to access current annotations without adding to dependencies
        const currentAnnotations = annotationsRef.current;
        const conflicts = currentAnnotations.filter((localAnn) => {
          const latestAnn = latestAnnotations.find((a) => a.id === localAnn.id);
          if (!latestAnn) return false;
          return latestAnn.updatedAt && localAnn.updatedAt && latestAnn.updatedAt !== localAnn.updatedAt;
        });

        if (conflicts.length > 0 && !hasConflicts) {
          setHasConflicts(true);
          toast({
            title: "Annotations updated elsewhere",
            description: `${conflicts.length} annotation(s) were modified. Click reload to refresh.`,
            variant: "destructive",
          });
        }
      } catch (error) {
        // Silently fail - don't spam errors
        console.error("Conflict check failed:", error);
      } finally {
        // Clear ongoing request after cache duration
        setTimeout(() => {
          if (ongoingRequestRef.current === requestKey) {
            ongoingRequestRef.current = null;
          }
        }, CACHE_DURATION);
      }
    };

    // Initial check
    checkForConflicts();

    // Setup polling with visibility check
    const startPolling = () => {
      if (conflictCheckIntervalRef.current) {
        clearInterval(conflictCheckIntervalRef.current);
      }
      conflictCheckIntervalRef.current = window.setInterval(checkForConflicts, POLL_INTERVAL);
    };

    const stopPolling = () => {
      if (conflictCheckIntervalRef.current) {
        clearInterval(conflictCheckIntervalRef.current);
        conflictCheckIntervalRef.current = null;
      }
    };

    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
        checkForConflicts(); // Check immediately when tab becomes visible
      }
    };

    // Start polling if tab is visible
    if (!document.hidden) {
      startPolling();
    }

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // ✅ CRITICAL FIX: Only depend on imageId to prevent interval accumulation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentImage?.id]); // Only imageId - datasetId and imageLoaded captured from closure

  // Phase 6: Filter annotations by state
  const filteredAnnotations = useMemo(() => {
    if (stateFilter === "all") return annotations;
    return annotations.filter((ann) => ann.state === stateFilter);
  }, [annotations, stateFilter]);

  // Phase 6: Calculate annotation counts by state
  const annotationCounts = useMemo(() => {
    return {
      draft: annotations.filter((a) => !a.state || a.state === "draft").length,
      reviewed: annotations.filter((a) => a.state === "reviewed").length,
      approved: annotations.filter((a) => a.state === "approved").length,
      rejected: annotations.filter((a) => a.state === "rejected").length,
    };
  }, [annotations]);

  // Update annotation when category changes (if annotation is selected)
  useEffect(() => {
    if (selectedAnnotationId && selectedCategoryId && currentImage) {
      const annotation = annotations.find((a) => a.id === selectedAnnotationId);
      if (annotation && annotation.categoryId !== selectedCategoryId) {
        const category = categories.find((c) => c.id === selectedCategoryId);
        if (category) {
          updateAnnotation(selectedAnnotationId, {
            categoryId: selectedCategoryId,
            categoryName: category.name,
          });
        }
      }
    }
  }, [selectedCategoryId, selectedAnnotationId, annotations, categories, updateAnnotation, currentImage]);

  const canUndoToolbar =
    canUndo || (isDrawing && annotationShapeMode === "POLYGON" && polygonDraftPointCount > 0);

  const persistLockRef = useRef(Promise.resolve());

  const adoptServerIds = useCallback(
    async (imageId: string, localCreated: Annotation[]) => {
      const temps = localCreated.filter((a) => a && !isMongoObjectId(a.id));
      if (temps.length === 0) return;
      try {
        const data = await annotationsApi.getAnnotations(datasetId, imageId);
        const server = (data.annotations ?? []).map((raw) =>
          mapApiRecordToAnnotation(raw as unknown as Record<string, unknown>)
        );
        const used = new Set<string>();
        for (const local of temps) {
          const match = server.find((s) => !used.has(s.id) && annotationsMatchGeometry(local, s));
          if (match) {
            used.add(match.id);
            replaceAnnotationId(local.id, match.id);
          }
        }
      } catch (error) {
        console.error("Failed to adopt server annotation ids:", error);
      }
    },
    [datasetId, replaceAnnotationId]
  );

  const handleAnnotationShapeModeChange = useCallback(
    (mode: AnnotationShapeMode) => {
      if (shapeModeLocked) return;
      setAnnotationShapeMode(mode);
      try {
        window.localStorage.setItem(shapePrefStorageKey, mode);
      } catch {
        /* ignore */
      }
    },
    [shapeModeLocked, shapePrefStorageKey]
  );

  // Manual save handler - batch save current annotations on demand
  const handleSaveAnnotations = useCallback(async () => {
    if (annotations.length === 0) {
      markSaved();
      return;
    }

    setSaveStatus("saving");

    try {
      // Prepare annotations for batch save
      const annotationsToSave = annotations.map((ann) => annotationToWritePayload(ann, annotationShapeMode));

      const result = await annotationsApi.batchSaveAnnotations(datasetId, annotationsToSave);

      if (result.failed > 0) {
        // Handle partial failure
        toast({
          title: "Some annotations failed to save",
          description: `${result.saved} saved, ${result.failed} failed`,
          variant: "destructive",
        });
      } else if (result.saved > 0) {
        setShapeModeLocked(true);
      }
      markSaved();
      setSaveStatus("saved");
      // Clear "Saved" message after 2 seconds
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Failed to save annotations:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [annotations, datasetId, markSaved, toast, annotationShapeMode]);

  // Phase 5 & 6: Save annotations and convert to YOLO
  const handleSaveAndConvert = useCallback(async (unannotatedImageIds: string[] = []) => {
    if (!hasCategories) {
      toast({
        title: "Categories required",
        description: "Please add at least one category before saving.",
        variant: "destructive",
      });
      return;
    }

    setSaveStatus("saving");

    try {
      // Prepare annotations for batch save
      const annotationsToSave = annotations.map((ann) => annotationToWritePayload(ann, annotationShapeMode));

      // Save annotations
      const batchResult = await annotationsApi.batchSaveAnnotations(datasetId, annotationsToSave);
      if (batchResult.saved > 0) {
        setShapeModeLocked(true);
      }

      // Phase 6: Prepare categories for YOLO conversion (include names)
      const categoriesForYOLO = categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
      }));

      const convertModelType = annotationShapeMode === "POLYGON" ? "YOLO_SEG" : "YOLO";

      // Convert to YOLO with category names and unannotated image IDs
      const convertResult = await modelsApi.convertAnnotationsToLabels(datasetId, {
        modelType: convertModelType,
        imageIds: undefined, // Convert all images
        categories: categoriesForYOLO,
        unannotatedImageIds: unannotatedImageIds, // For empty label files
      });

      setSaveStatus("saved");
      setIsSaveComplete(true);

      // Phase 7: Show success notification
      toast({
        title: "Success",
        description: "Your dataset is ready to train.",
        variant: "success",
      });

      markSaved();
      // Fetch dataset status for version name default, then offer optional augmentation
      try {
        const status = await datasetsApi.fetchDatasetStatus(datasetId);
        setAugmentDatasetVersion(status.version ?? null);
      } catch {
        setAugmentDatasetVersion(null);
      }
      setShowAugmentDialog(true);
    } catch (error) {
      console.error("Failed to save and convert:", error);
      setSaveStatus("error");
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save annotations and convert to YOLO.",
        variant: "destructive",
      });
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [annotations, datasetId, categories, hasCategories, markSaved, toast, annotationShapeMode]);

  // Handle image selection with unsaved changes confirmation
  const handleImageSelect = useCallback(
    async (targetImageId: string) => {
      const targetIndex = images.findIndex((img) => img.id === targetImageId);
      if (targetIndex === -1) return;

      if (unsavedChanges) {
        const confirmed = window.confirm(
          "You have unsaved changes. Navigate away anyway?"
        );
        if (!confirmed) return;
      }

      await persistLockRef.current;
      selectImage(targetIndex);
      markSaved();
    },
    [images, unsavedChanges, selectImage, markSaved]
  );

  // Handle previous image
  const handlePreviousImage = useCallback(async () => {
    if (currentImageIndex > 0) {
      if (unsavedChanges) {
        const confirmed = window.confirm(
          "You have unsaved changes. Navigate away anyway?"
        );
        if (!confirmed) return;
      }
      await persistLockRef.current;
      selectImage(currentImageIndex - 1);
      markSaved();
    }
  }, [currentImageIndex, unsavedChanges, selectImage, markSaved]);

  // Handle next image
  const handleNextImage = useCallback(async () => {
    if (currentImageIndex < images.length - 1) {
      if (unsavedChanges) {
        const confirmed = window.confirm(
          "You have unsaved changes. Navigate away anyway?"
        );
        if (!confirmed) return;
      }
      await persistLockRef.current;
      selectImage(currentImageIndex + 1);
      markSaved();
    }
  }, [currentImageIndex, images.length, unsavedChanges, selectImage, markSaved]);

  // --- Category picker helpers ---
  const closeCategoryPicker = useCallback(() => {
    setCategoryPicker((prev) => ({ ...prev, open: false }));
  }, []);

  const openCategoryPickerAt = useCallback(
    (x: number, y: number) => {
      if (!hasCategories) {
        toast({
          title: "Categories required",
          description: "Please add at least one category before annotating.",
          variant: "destructive",
        });
        return;
      }
      setCategoryPicker({ open: true, x, y });
    },
    [hasCategories, toast]
  );

  /** Called when user left-clicks empty canvas area */
  const handleEmptyCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const container = imageContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      openCategoryPickerAt(e.clientX - rect.left, e.clientY - rect.top);
    },
    [openCategoryPickerAt]
  );

  /** Called when user presses W — opens picker at the current cursor on the image */
  const handleOpenDrawPicker = useCallback(() => {
    const forMask = enterMaskAfterPickerRef.current;
    if (!forMask) {
      enterMaskAfterPickerRef.current = false;
      setIsClickToMask(false);
    }
    if (!hasCategories) {
      toast({
        title: "Categories required",
        description: "Please add at least one category before drawing.",
        variant: "destructive",
      });
      return;
    }
    const container = imageContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    // ✅ Prefer last known cursor position on the image; fall back to center only if unknown
    const cursor = cursorOnImageRef.current;
    if (cursor) {
      const x = Math.max(8, Math.min(cursor.x, rect.width - 8));
      const y = Math.max(8, Math.min(cursor.y, rect.height - 8));
      openCategoryPickerAt(x, y);
      return;
    }

    openCategoryPickerAt(
      Math.max(16, rect.width / 2 - 90),
      Math.max(16, rect.height / 2 - 40)
    );
  }, [hasCategories, openCategoryPickerAt, toast]);

  /** User picks a class from the picker: select it and enter draw or click-to-mask mode */
  const handlePickerCategorySelect = useCallback(
    (categoryId: string) => {
      setCategory(categoryId);
      closeCategoryPicker();
      if (enterMaskAfterPickerRef.current) {
        enterMaskAfterPickerRef.current = false;
        setDrawing(false);
        if (!shapeModeLocked) {
          setAnnotationShapeMode("POLYGON");
          try {
            window.localStorage.setItem(shapePrefStorageKey, "POLYGON");
          } catch {
            /* ignore */
          }
        }
        setIsClickToMask(true);
        return;
      }
      setIsClickToMask(false);
      setDrawing(true);
    },
    [setCategory, setDrawing, closeCategoryPicker, shapeModeLocked, shapePrefStorageKey]
  );

  // --- Copy / paste handlers ---
  const handleCopyAnnotations = useCallback(() => {
    if (!currentImage) return;
    if (annotations.length === 0) {
      toast({ title: "Nothing to copy", description: "This image has no bounding boxes yet." });
      return;
    }
    setCopiedAnnotations(
      annotations.map((ann) => ({
        bbox: ann.bbox,
        polygon: ann.polygon,
        categoryId: ann.categoryId,
        categoryName: ann.categoryName,
      }))
    );
    toast({
      title: "Copied",
      description: `${annotations.length} box${annotations.length === 1 ? "" : "es"} copied. Go to another image and press Ctrl+V.`,
    });
  }, [currentImage, annotations, toast]);

  const handlePasteAnnotations = useCallback(async () => {
    if (!currentImage) return;
    if (copiedAnnotations.length === 0) {
      toast({
        title: "Clipboard empty",
        description: "Click Copy on an image first, then paste with Ctrl+V.",
      });
      return;
    }
    if (!imageLoaded) {
      toast({ title: "Image loading", description: "Please wait for the image to load.", variant: "destructive" });
      return;
    }

    const createdLocals: Annotation[] = [];
    copiedAnnotations.forEach((item) => {
      const created = addAnnotation({
        imageId: currentImage.id,
        bbox: item.bbox,
        polygon: item.polygon,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
      });
      if (created) createdLocals.push(created);
    });

    try {
      await annotationsApi.batchSaveAnnotations(
        datasetId,
        copiedAnnotations.map((item) =>
          annotationToWritePayload(
            {
              id: "pending",
              imageId: currentImage.id,
              bbox: item.bbox,
              polygon: item.polygon,
              categoryId: item.categoryId,
              categoryName: item.categoryName,
            } as Annotation,
            annotationShapeMode
          )
        )
      );
      await adoptServerIds(currentImage.id, createdLocals);
      markSaved();
      setShapeModeLocked(true);
      toast({
        title: "Pasted",
        description: `${copiedAnnotations.length} box${copiedAnnotations.length === 1 ? "" : "es"} pasted and saved.`,
      });
    } catch (error) {
      console.error("Paste save failed:", error);
      toast({
        title: "Paste saved locally only",
        description: "Boxes added on screen but the server save failed.",
        variant: "destructive",
      });
    }
  }, [currentImage, copiedAnnotations, imageLoaded, addAnnotation, datasetId, annotationShapeMode, markSaved, toast, adoptServerIds]);

  const reconcileImageAnnotations = useCallback(
    async (imageId: string, desired: Annotation[]) => {
      const data = await annotationsApi.getAnnotations(datasetId, imageId);
      const server = (data.annotations ?? []).map((raw) =>
        mapApiRecordToAnnotation(raw as unknown as Record<string, unknown>)
      );
      const desiredPersistedIds = new Set(
        desired.filter((a) => isMongoObjectId(a.id)).map((a) => a.id)
      );

      for (const s of server) {
        const keepById = desiredPersistedIds.has(s.id);
        const keepByGeometry = desired.some((d) => annotationsMatchGeometry(d, s));
        if (!keepById && !keepByGeometry) {
          await annotationsApi.deleteAnnotation(datasetId, s.id);
        }
      }

      const remainingServer = server.filter((s) => {
        const keepById = desiredPersistedIds.has(s.id);
        const keepByGeometry = desired.some((d) => annotationsMatchGeometry(d, s));
        return keepById || keepByGeometry;
      });
      const toCreate = desired.filter(
        (a) => !remainingServer.some((s) => annotationsMatchGeometry(a, s) || s.id === a.id)
      );
      if (toCreate.length > 0) {
        const payloads = toCreate.map((ann) =>
          annotationToWritePayload(ann, annotationShapeMode)
        );
        await annotationsApi.batchSaveAnnotations(datasetId, payloads);
        await adoptServerIds(imageId, toCreate);
      }
      markSaved();
    },
    [datasetId, annotationShapeMode, adoptServerIds, markSaved]
  );

  const enqueuePersist = useCallback((fn: () => Promise<void>) => {
    persistLockRef.current = persistLockRef.current.then(fn).catch((error) => {
      console.error("Failed to persist annotation change:", error);
    });
    return persistLockRef.current;
  }, []);

  const handleUndo = useCallback(() => {
    if (
      isDrawing &&
      annotationShapeMode === "POLYGON" &&
      canvasRef.current?.undoLastPolygonDraftPoint()
    ) {
      return;
    }
    const desired = undo();
    if (desired && currentImage?.id) {
      void enqueuePersist(() => reconcileImageAnnotations(currentImage.id, desired));
    }
  }, [isDrawing, annotationShapeMode, undo, currentImage, enqueuePersist, reconcileImageAnnotations]);

  const handleRedo = useCallback(() => {
    const desired = redo();
    if (desired && currentImage?.id) {
      void enqueuePersist(() => reconcileImageAnnotations(currentImage.id, desired));
    }
  }, [redo, currentImage, enqueuePersist, reconcileImageAnnotations]);

  // Handle delete annotation
  const handleDeleteAnnotation = useCallback(
    async (annotationId: string) => {
      const annotationToDelete = annotations.find((ann) => ann.id === annotationId);
      if (!annotationToDelete) return;

      // Remove immediately for responsive UI
      deleteAnnotation(annotationId);

      const persistDelete = async () => {
        try {
          let persistedId: string | null = isMongoObjectId(annotationId) ? annotationId : null;

          if (!persistedId && currentImage?.id) {
            const data = await annotationsApi.getAnnotations(datasetId, currentImage.id);
            const server = (data.annotations ?? []).map((raw) =>
              mapApiRecordToAnnotation(raw as unknown as Record<string, unknown>)
            );
            const match = server.find((s) => annotationsMatchGeometry(annotationToDelete, s));
            persistedId = match?.id ?? null;
          }

          if (!persistedId) {
            markSaved();
            return;
          }

          await annotationsApi.deleteAnnotation(datasetId, persistedId);
          markSaved();
        } catch (error) {
          console.error("Failed to delete annotation:", error);
          toast({
            title: "Failed to delete annotation",
            description: error instanceof Error ? error.message : "The annotation could not be deleted.",
            variant: "destructive",
          });

          if (currentImage?.id) {
            try {
              const data = await annotationsApi.getAnnotations(datasetId, currentImage.id);
              loadAnnotations(
                (data.annotations ?? []).map((raw) =>
                  mapApiRecordToAnnotation(raw as unknown as Record<string, unknown>)
                )
              );
            } catch (reloadError) {
              console.error("Failed to reload annotations after delete error:", reloadError);
            }
          }
        }
      };

      await enqueuePersist(persistDelete);
    },
    [
      annotations,
      deleteAnnotation,
      datasetId,
      markSaved,
      toast,
      currentImage,
      loadAnnotations,
      enqueuePersist,
    ]
  );

  // Calculate annotated images count across dataset
  const countAnnotatedImages = useCallback(() => {
    // Prefer backend-provided flags when available
    const byMetadata = images.filter(
      (img) => img.hasAnnotations || img.annotationStatus === "annotated"
    ).length;
    return byMetadata;
  }, [images]);

  // Phase 4: Handle bounding box drawing - save immediately when box is complete
  const handleBboxDraw = useCallback(
    async (bbox: [number, number, number, number]) => {
      if (annotationShapeMode !== "BBOX") return;
      if (!currentImage || !selectedCategoryId) {
        toast({
          title: "Category required",
          description: "Please select a category before drawing a bounding box.",
          variant: "destructive",
        });
        return;
      }

      if (!imageLoaded) {
        toast({
          title: "Image loading",
          description: "Please wait for the image to load before drawing.",
          variant: "destructive",
        });
        return;
      }

      const category = categories.find((c) => c.id === selectedCategoryId);
      if (!category) return;

      // Phase 4: Add to local state immediately (optimistic update) so user sees the box
      const newAnnotation = {
        imageId: currentImage.id,
        bbox,
        categoryId: selectedCategoryId,
        categoryName: category.name,
      };
      
      // Add to local state immediately
      const createdLocal = addAnnotation(newAnnotation);

      // Phase 4: Save immediately when box is complete (one box → one API call)
      try {
        await annotationsApi.batchSaveAnnotations(datasetId, [
          annotationToWritePayload(
            {
              id: "pending",
              imageId: currentImage.id,
              bbox,
              categoryId: selectedCategoryId,
              categoryName: category.name,
            } as Annotation,
            annotationShapeMode
          ),
        ]);

        if (createdLocal) {
          await adoptServerIds(currentImage.id, [createdLocal]);
        }
        markSaved();
        setShapeModeLocked(true);
        
        // Remove from unsaved boxes on successful save
        setUnsavedBoxes((prev) => prev.filter((box) => 
          !(box.imageId === currentImage.id && 
            box.bbox[0] === bbox[0] && box.bbox[1] === bbox[1] &&
            box.bbox[2] === bbox[2] && box.bbox[3] === bbox[3])
        ));
      } catch (error) {
        console.error("Failed to save bounding box:", error);
        // Add to unsaved boxes if save fails (annotation already in local state)
        setUnsavedBoxes((prev) => {
          // Check if already in unsaved boxes to avoid duplicates
          const exists = prev.some((box) => 
            box.imageId === currentImage.id && 
            box.bbox[0] === bbox[0] && box.bbox[1] === bbox[1] &&
            box.bbox[2] === bbox[2] && box.bbox[3] === bbox[3]
          );
          if (exists) return prev;
          return [...prev, {
            imageId: currentImage.id,
            bbox,
            categoryId: selectedCategoryId,
            categoryName: category.name,
          }];
        });
        toast({
          title: "Save failed",
          description: "Failed to save bounding box. It will be saved when connection is restored.",
          variant: "destructive",
        });
      }
    },
    [currentImage, selectedCategoryId, categories, addAnnotation, toast, imageLoaded, datasetId, markSaved, setUnsavedBoxes, annotationShapeMode, adoptServerIds]
  );

  const handlePolygonDrawComplete = useCallback(
    async (polygon: PolygonPoint[]) => {
      if (annotationShapeMode !== "POLYGON") return;
      const v = validatePolygonNormalized(polygon);
      if (!v.ok) {
        toast({
          title: "Invalid polygon",
          description: v.errors[0] ?? "Need at least 3 numeric points in [0..1].",
          variant: "destructive",
        });
        return;
      }
      if (!currentImage || !selectedCategoryId) {
        toast({
          title: "Category required",
          description: "Please select a category before drawing.",
          variant: "destructive",
        });
        return;
      }
      if (!imageLoaded) {
        toast({
          title: "Image loading",
          description: "Please wait for the image to load before drawing.",
          variant: "destructive",
        });
        return;
      }
      const category = categories.find((c) => c.id === selectedCategoryId);
      if (!category) return;

      const bbox = polygonToBoundingBox(polygon);
      const newAnnotation = {
        imageId: currentImage.id,
        bbox,
        polygon,
        categoryId: selectedCategoryId,
        categoryName: category.name,
      };
      const createdLocal = addAnnotation(newAnnotation);

      try {
        await annotationsApi.batchSaveAnnotations(datasetId, [
          {
            imageId: currentImage.id,
            categoryId: selectedCategoryId,
            polygon,
          },
        ]);
        if (createdLocal) {
          await adoptServerIds(currentImage.id, [createdLocal]);
        }
        markSaved();
        setShapeModeLocked(true);
      } catch (error) {
        console.error("Failed to save polygon:", error);
        toast({
          title: "Save failed",
          description: error instanceof Error ? error.message : "Failed to save polygon annotation.",
          variant: "destructive",
        });
      }
    },
    [
      annotationShapeMode,
      currentImage,
      selectedCategoryId,
      categories,
      addAnnotation,
      toast,
      imageLoaded,
      datasetId,
      markSaved,
      adoptServerIds,
    ]
  );

  const activateClickToMask = useCallback(() => {
    setDrawing(false);
    closeCategoryPicker();
    if (!shapeModeLocked) {
      setAnnotationShapeMode("POLYGON");
      try {
        window.localStorage.setItem(shapePrefStorageKey, "POLYGON");
      } catch {
        /* ignore */
      }
    }
    setIsClickToMask(true);
    if (shapeModeLocked && annotationShapeMode === "BBOX") {
      toast({
        title: "Click to mask",
        description: "This dataset is locked to boxes, so the mask will be saved as a bounding box.",
      });
    }
  }, [
    setDrawing,
    closeCategoryPicker,
    shapeModeLocked,
    shapePrefStorageKey,
    annotationShapeMode,
    toast,
  ]);

  const handleToggleClickToMask = useCallback(() => {
    if (isClickToMask) {
      setIsClickToMask(false);
      setClickToMaskPending(false);
      setClickToMaskPendingPoint(null);
      return;
    }
    if (!hasCategories) {
      toast({
        title: "Categories required",
        description: "Please add at least one category before using click-to-mask.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedCategoryId) {
      enterMaskAfterPickerRef.current = true;
      handleOpenDrawPicker();
      return;
    }
    activateClickToMask();
  }, [
    isClickToMask,
    hasCategories,
    selectedCategoryId,
    toast,
    handleOpenDrawPicker,
    activateClickToMask,
  ]);

  const handleClickToMaskPoint = useCallback(
    async (point: PolygonPoint) => {
      if (!currentImage || !selectedCategoryId) {
        toast({
          title: "Category required",
          description: "Select a class first, then click the defect.",
          variant: "destructive",
        });
        return;
      }
      if (clickToMaskPending) return;

      const category = categories.find((c) => c.id === selectedCategoryId);
      if (!category) return;

      setClickToMaskPending(true);
      setClickToMaskPendingPoint(point);
      try {
        const result = await annotationsApi.clickToMask(datasetId, {
          imageId: currentImage.id,
          x: point[0],
          y: point[1],
        });
        const polygon = result.polygon;
        const v = validatePolygonNormalized(polygon);
        if (!v.ok) {
          toast({
            title: "Mask was invalid",
            description: v.errors[0] ?? "Try clicking closer to the center of the defect.",
            variant: "destructive",
          });
          return;
        }

        const bbox = polygonToBoundingBox(polygon);
        const saveAsPolygon = annotationShapeMode === "POLYGON";
        const createdLocal = addAnnotation({
          imageId: currentImage.id,
          bbox,
          polygon: saveAsPolygon ? polygon : undefined,
          categoryId: selectedCategoryId,
          categoryName: category.name,
        });

        await annotationsApi.batchSaveAnnotations(datasetId, [
          saveAsPolygon
            ? { imageId: currentImage.id, categoryId: selectedCategoryId, polygon }
            : { imageId: currentImage.id, categoryId: selectedCategoryId, bbox },
        ]);
        if (createdLocal) {
          await adoptServerIds(currentImage.id, [createdLocal]);
        }
        markSaved();
        setShapeModeLocked(true);
      } catch (error) {
        console.error("Click-to-mask failed:", error);
        toast({
          title: "Click-to-mask failed",
          description:
            error instanceof Error
              ? error.message
              : "Could not generate a mask. Try again, or draw the polygon by hand.",
          variant: "destructive",
        });
      } finally {
        setClickToMaskPending(false);
        setClickToMaskPendingPoint(null);
      }
    },
    [
      currentImage,
      selectedCategoryId,
      clickToMaskPending,
      categories,
      datasetId,
      annotationShapeMode,
      addAnnotation,
      markSaved,
      toast,
      adoptServerIds,
    ]
  );

  const handlePolygonUpdate = useCallback(
    async (annotationId: string, polygon: PolygonPoint[]) => {
      const v = validatePolygonNormalized(polygon);
      if (!v.ok) {
        toast({
          title: "Invalid polygon",
          description: v.errors[0] ?? "Check vertices.",
          variant: "destructive",
        });
        return;
      }
      const bbox = polygonToBoundingBox(polygon);
      updateAnnotation(annotationId, { polygon, bbox });
      if (!isMongoObjectId(annotationId)) return;
      try {
        await annotationsApi.updateAnnotation(datasetId, annotationId, { polygon, bbox });
      } catch (error) {
        toast({
          title: "Failed to update polygon",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      }
    },
    [datasetId, updateAnnotation, toast]
  );

  // Handle annotation click (Phase 6: Support multi-select)
  const handleAnnotationClick = useCallback(
    (annotationId: string, multiSelect = false) => {
      if (multiSelect) {
        selection.toggleSelection(annotationId, true);
      } else {
        setSelectedAnnotation(annotationId);
        selection.selectAnnotation(annotationId, false);
      }
    },
    [setSelectedAnnotation, selection]
  );

  // Phase 6: Handle annotation update (move/resize)
  const handleAnnotationUpdate = useCallback(
    async (annotationId: string, bbox: [number, number, number, number]) => {
      updateAnnotation(annotationId, { bbox });
      if (!isMongoObjectId(annotationId)) return;
      try {
        await annotationsApi.updateAnnotation(datasetId, annotationId, { bbox });
      } catch (error) {
        toast({
          title: "Failed to update annotation",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      }
    },
    [datasetId, updateAnnotation, toast]
  );

  // Phase 6: Handle bulk state change
  const handleBulkStateChange = useCallback(
    async (state: AnnotationState) => {
      if (selection.selectedAnnotationIds.length === 0) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        await annotationsApi.bulkUpdateAnnotationState(
          datasetId,
          selection.selectedAnnotationIds,
          state,
          user.id
        );

        // Update local state
        selection.selectedAnnotationIds.forEach((id) => {
          updateAnnotation(id, { state } as any);
        });

        toast({
          title: "State updated",
          description: `${selection.selectedAnnotationIds.length} annotation(s) marked as ${state}`,
        });

        selection.clearSelection();
      } catch (error) {
        toast({
          title: "Failed to update state",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      }
    },
    [datasetId, selection, updateAnnotation, toast]
  );

  // Phase 6: Handle reload on conflict
  const handleReloadAnnotations = useCallback(async () => {
    if (!currentImage) return;

    try {
      const data = await annotationsApi.getAnnotations(datasetId, currentImage.id);
      loadAnnotations(
          (data.annotations ?? []).map((raw) =>
            mapApiRecordToAnnotation(raw as unknown as Record<string, unknown>)
          )
        );
      setHasConflicts(false);
      setLastUpdateTime(new Date());
      toast({
        title: "Annotations reloaded",
        description: "Latest annotations loaded successfully",
      });
    } catch (error) {
      toast({
        title: "Failed to reload",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [currentImage, datasetId, loadAnnotations, toast]);

  /** Replace Mongo annotations for current image from on-disk YOLO .txt (user-confirmed) */
  const handleReloadFromLabelFile = useCallback(async () => {
    if (!currentImage) return;
    setReplaceLabelsConfirmOpen(false);
    try {
      const importResult = await annotationsApi.importLabelsToAnnotations(datasetId, {
        imageIds: [currentImage.id],
        replace: true,
      });
      const allWarnings = (importResult.details ?? []).flatMap((d) => d.warnings ?? []);
      if (allWarnings.length > 0) {
        const preview = allWarnings.slice(0, 8).join(" · ");
        toast({
          title: "Label import warnings",
          description:
            preview + (allWarnings.length > 8 ? ` (+${allWarnings.length - 8} more)` : ""),
          variant: "default",
        });
      }
      const data = await annotationsApi.getAnnotations(datasetId, currentImage.id);
      loadAnnotations(
          (data.annotations ?? []).map((raw) =>
            mapApiRecordToAnnotation(raw as unknown as Record<string, unknown>)
          )
        );
      setLastUpdateTime(new Date());
      toast({
        title: "Reloaded from label file",
        description: "Database annotations for this image were replaced from disk labels.",
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error ?? "");
      const lower = msg.toLowerCase();
      if (
        lower.includes("401") ||
        lower.includes("403") ||
        lower.includes("unauthorized") ||
        lower.includes("forbidden")
      ) {
        toast({
          title: "Access denied",
          description: msg,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to reload from label file",
          description: msg || "Unknown error",
          variant: "destructive",
        });
      }
    }
  }, [currentImage, datasetId, loadAnnotations, toast]);

  // Category CRUD handlers
  const handleCategoryCreate = useCallback(
    async (category: Omit<Category, "id">) => {
      try {
        const result = await categoriesApi.createCategory(datasetId, category);
        setCategories((prev) => [...prev, result.category]);
        toast({
          title: "Category created",
          description: `Category "${category.name}" has been created.`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to create category.",
          variant: "destructive",
        });
      }
    },
    [datasetId, toast]
  );

  const handleCategoryUpdate = useCallback(
    async (id: string, updates: Partial<Category>) => {
      try {
        const result = await categoriesApi.updateCategory(datasetId, id, updates);
        setCategories((prev) =>
          prev.map((cat) => (cat.id === id ? result.category : cat))
        );
        toast({
          title: "Category updated",
          description: "Category has been updated.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to update category.",
          variant: "destructive",
        });
      }
    },
    [datasetId, toast]
  );

  const handleCategoryDelete = useCallback(
    async (id: string, reassignTo?: string) => {
      try {
        await categoriesApi.deleteCategory(datasetId, id, reassignTo);
        setCategories((prev) => prev.filter((cat) => cat.id !== id));
        toast({
          title: "Category deleted",
          description: "Category has been deleted.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to delete category.",
          variant: "destructive",
        });
      }
    },
    [datasetId, toast]
  );

  const handleCategoryReorder = useCallback(
    async (categoryIds: string[]) => {
      try {
        await categoriesApi.reorderCategories(datasetId, categoryIds);
        // Update local state
        const reordered = categoryIds
          .map((id) => categories.find((cat) => cat.id === id))
          .filter((cat): cat is Category => cat !== undefined);
        const remaining = categories.filter((cat) => !categoryIds.includes(cat.id));
        setCategories([...reordered, ...remaining]);
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to reorder categories.",
          variant: "destructive",
        });
      }
    },
    [datasetId, categories, toast]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const activeElement = document.activeElement as HTMLElement | null;
      const isTypingInInput =
        !!target?.closest('input, textarea, select, [contenteditable="true"], [role="combobox"]') ||
        !!activeElement?.closest('input, textarea, select, [contenteditable="true"], [role="combobox"]');

      if (isTypingInInput) return;

      // Ctrl+C → copy current image boxes (customisable)
      if (matchesShortcut(e, shortcutKeys.copyBoxes)) {
        e.preventDefault();
        handleCopyAnnotations();
        return;
      }

      // Ctrl+V → paste boxes onto this image (customisable)
      if (matchesShortcut(e, shortcutKeys.pasteBoxes)) {
        e.preventDefault();
        void handlePasteAnnotations();
        return;
      }

      // W → open class picker then draw (customisable)
      if (matchesShortcut(e, shortcutKeys.drawMode)) {
        e.preventDefault();
        enterMaskAfterPickerRef.current = false;
        handleOpenDrawPicker();
        return;
      }

      // M → click-to-mask (customisable)
      if (matchesShortcut(e, shortcutKeys.clickToMask)) {
        e.preventDefault();
        handleToggleClickToMask();
        return;
      }

      // A → previous image (customisable)
      if (matchesShortcut(e, shortcutKeys.previousImage)) {
        e.preventDefault();
        handlePreviousImage();
        return;
      }

      // D → next image (customisable)
      if (matchesShortcut(e, shortcutKeys.nextImage)) {
        e.preventDefault();
        handleNextImage();
        return;
      }

      // Esc → cancel draw + click-to-mask + close picker
      if (e.key === "Escape") {
        setDrawing(false);
        setIsClickToMask(false);
        setClickToMaskPending(false);
        setClickToMaskPendingPoint(null);
        setSelectedAnnotation(null);
        closeCategoryPicker();
        return;
      }

      // Delete → delete selected annotation
      if (e.key === "Delete" && selectedAnnotationId) {
        e.preventDefault();
        handleDeleteAnnotation(selectedAnnotationId);
        setSelectedAnnotation(null);
        return;
      }

      // Ctrl+Z / Cmd+Z → undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Ctrl+Shift+Z / Cmd+Shift+Z → redo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Ctrl/Cmd+S → manual save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (unsavedChanges && annotations.length > 0 && saveStatus !== "saving") {
          void handleSaveAnnotations();
        }
        return;
      }

      // 1-9 → select category
      const categoryIndex = parseInt(e.key) - 1;
      if (
        categoryIndex >= 0 &&
        categoryIndex < categories.length &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        e.preventDefault();
        setCategory(categories[categoryIndex].id);
        return;
      }

      // Arrow keys → image navigation (always works)
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePreviousImage();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNextImage();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    shortcutKeys,
    selectedAnnotationId,
    categories,
    setDrawing,
    setSelectedAnnotation,
    setCategory,
    handleUndo,
    handleRedo,
    handleDeleteAnnotation,
    handlePreviousImage,
    handleNextImage,
    handleCopyAnnotations,
    handlePasteAnnotations,
    handleOpenDrawPicker,
    handleToggleClickToMask,
    closeCategoryPicker,
    annotations.length,
    unsavedChanges,
    saveStatus,
    handleSaveAnnotations,
  ]);

  // Warn user before leaving the page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (unsavedChanges) {
        event.preventDefault();
        event.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [unsavedChanges]);

  if (loading && !initializationError) {
    return (
      <div className="mt-6 border rounded-lg p-8 flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading annotation workspace...
        </div>
      </div>
    );
  }

  if (initializationError) {
    return (
      <div className="mt-6 border rounded-lg p-8 flex flex-col items-center justify-center gap-4">
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-destructive">Failed to load annotation workspace</p>
          <p className="text-xs text-muted-foreground">{initializationError}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setInitializationError(null);
              setLoading(true);
              // Retry initialization by re-running the effect
              const initialize = async () => {
                try {
                  const imagesData = await annotationsApi.getDatasetImages(datasetId, { limit: 10000, status: "all" });
                  if (!imagesData || !imagesData.images) {
                    throw new Error("Invalid response from images endpoint");
                  }
                  loadImages(
                    imagesData.images.map((img) =>
                      normalizeDatasetImage(img as unknown as Record<string, unknown>)
                    )
                  );
                  if (imagesData.images.length > 0) {
                    selectImage(0);
                  }
                  const categoriesData = await categoriesApi.getCategories(datasetId);
                  if (!categoriesData || !categoriesData.categories) {
                    throw new Error("Invalid response from categories endpoint");
                  }
                  setCategories(categoriesData.categories || []);
                  if (!categoriesData.categories || categoriesData.categories.length === 0) {
                    toast({
                      title: "Add categories first",
                      description: "First, add categories (defect names) before annotating images. Do not annotate good images.",
                      variant: "info",
                    });
                  }
                  setInitializationError(null);
                } catch (error) {
                  const isConnectionError = 
                    error instanceof TypeError && 
                    (error.message.includes("Failed to fetch") || 
                     error.message.includes("ERR_CONNECTION_REFUSED") ||
                     error.message.includes("NetworkError"));
                  const errorMessage = error instanceof Error ? error.message : "Unknown error";
                  if (isConnectionError) {
                    setInitializationError("Cannot connect to the backend server. Please ensure the API server is running and accessible.");
                  } else {
                    setInitializationError(errorMessage);
                  }
                } finally {
                  setLoading(false);
                }
              };
              void initialize();
            }}
          >
            Retry
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="mt-6 border rounded-lg p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No images found for this dataset.
        </p>
        <Button variant="outline" size="sm" onClick={onClose} className="mt-4">
          Close
        </Button>
      </div>
    );
  }

  const total = images.length;
  const annotated = countAnnotatedImages();
  const currentIndex = currentImageIndex + 1;

  return (
    <AnnotationErrorBoundary>
      <div
        ref={workspaceRef}
        tabIndex={0}
        className="mt-6 border rounded-lg p-4 space-y-4 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        role="region"
        aria-label="Annotation workspace"
      >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Annotation Workspace</h3>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-3xl">
            Edit any image in this dataset. Pre-labeled images may load boxes from label files when you
            open them; check toasts if something could not be imported.
          </p>
          <p className="text-xs text-muted-foreground">
            Dataset: <span className="font-mono">{datasetId}</span>
            {unsavedChanges && (
              <span className="ml-2 text-amber-500">• Unsaved changes</span>
            )}
            {saveStatus === "saving" && (
              <span className="ml-2 text-blue-500">• Saving...</span>
            )}
            {saveStatus === "saved" && (
              <span className="ml-2 text-green-500">• Saved</span>
            )}
            {saveStatus === "error" && (
              <span className="ml-2 text-red-500">• Save error</span>
            )}
          </p>
          {/* Phase 4: Show warning for unsaved boxes */}
          {unsavedBoxes.length > 0 && (
            <div className="mt-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded border border-amber-200 dark:border-amber-800">
              Some bounding boxes are not saved. Please save them before proceeding.
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Phase 7: Back to Training button (shown after completion) */}
          {isSaveComplete && (
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                // Phase 6: Navigate to Simulation page
                onClose(); // This will navigate back to simulation via AnnotationPage
              }}
            >
              Back to Training
            </Button>
          )}
          {/* Phase 5: Save Annotations button (triggers YOLO conversion) */}
          <Button
            variant="default"
            size="sm"
            onClick={async () => {
              // Phase 5: Check for unannotated images
              const annotatedImageIds = new Set(annotations.map((ann) => ann.imageId));
              const imagesWithoutAnnotations = images.filter((img) => !annotatedImageIds.has(img.id));
              
              if (imagesWithoutAnnotations.length > 0) {
                setShowUnannotatedDialog(true);
              } else {
                await handleSaveAndConvert();
              }
            }}
            disabled={!hasCategories || annotations.length === 0 || saveStatus === "saving" || isSaveComplete}
          >
            {saveStatus === "saving" ? "Saving..." : "Save Annotations"}
          </Button>
          <AnnotationExportButton
            datasetId={datasetId}
            imageIds={currentImage ? [currentImage.id] : undefined}
          />
          <AnnotationImportButton
            datasetId={datasetId}
            onImportComplete={(result) => {
              // Reload annotations after import
              if (currentImage) {
                annotationsApi.getAnnotations(datasetId, currentImage.id).then((data) => {
                  loadAnnotations(
          (data.annotations ?? []).map((raw) =>
            mapApiRecordToAnnotation(raw as unknown as Record<string, unknown>)
          )
        );
                });
              }
            }}
          />
          {/* ConvertToYOLOButton removed - Save Annotations button now handles conversion */}
          {hasConflicts && (
            <Button variant="destructive" size="sm" onClick={handleReloadAnnotations}>
              Reload (Updated elsewhere)
            </Button>
          )}
          <AnnotationProgress
            current={currentIndex}
            total={total}
            annotated={annotated}
          />
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Augmentation status bar - visible when augmenting from annotation flow */}
      {augmentationStatus === "running" && (
        <div className="mt-3 p-3 rounded-md bg-muted/50 space-y-2 border border-primary/20">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Augmenting dataset…</span>
          </div>
          <Progress
            value={augmentationProgress}
            className="h-2"
            indicatorClassName="progress-striped progress-animated"
          />
          <p className="text-xs text-muted-foreground">{augmentationProgress}% complete</p>
        </div>
      )}

      {/* Navigation controls */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousImage}
            disabled={currentImageIndex === 0}
          >
            Previous
          </Button>
          <span className="text-muted-foreground">
            {currentIndex} of {total}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextImage}
            disabled={currentImageIndex === images.length - 1}
          >
            Next
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,220px)_minmax(0,1fr)_minmax(0,220px)] gap-4">
        {/* Left sidebar: categories */}
        <div className="border rounded-md p-3 space-y-3" role="complementary" aria-label="Category selection">
          <h4 className="text-sm font-medium">Categories</h4>
          <CategorySelector
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onCategorySelect={setCategory}
            onAddCategory={() => setShowCategoryManager(true)}
          />
          {!selectedCategoryId && hasCategories && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded border border-amber-200 dark:border-amber-800">
                    <Info className="h-3 w-3" />
                    <span>Select a category to start annotating</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Choose a category from the dropdown above</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {!hasCategories && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded border border-muted bg-muted/30">
              <Info className="h-3 w-3" />
              <span>Add at least one category before annotating</span>
            </div>
          )}
          {isDrawing && imageLoaded && hasCategories && (
            <div className="text-xs text-blue-500 font-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              Drawing mode active (Press Esc to cancel)
            </div>
          )}
          {isClickToMask && imageLoaded && hasCategories && (
            <div className="text-xs text-cyan-500 font-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
              {clickToMaskPending
                ? "Generating mask… first click can take a minute while the model loads"
                : "Click-to-mask: click the defect (Esc to cancel)"}
            </div>
          )}
          {!imageLoaded && currentImage && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Image loading...
            </div>
          )}
          {selectedCategoryId && imageLoaded && hasCategories && (
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">W</kbd> to draw</div>
              <div>
                Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                  {shortcutKeys.clickToMask.toUpperCase()}
                </kbd>{" "}
                to click-to-mask
              </div>
              <div>
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">A</kbd> prev ·{" "}
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">D</kbd> next
              </div>
              <div>Or left-click empty image to pick class</div>
            </div>
          )}
        </div>

        {/* Center: image + canvas */}
        <div className="border rounded-md p-3 flex flex-col gap-3" role="main" aria-label="Image annotation area">
          <div
            ref={imageContainerRef}
            className="relative w-full aspect-video border rounded-md overflow-hidden bg-muted flex items-center justify-center"
            onMouseMove={(e) => {
              // Track cursor so W opens the class menu under the pointer
              const rect = e.currentTarget.getBoundingClientRect();
              cursorOnImageRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
              };
            }}
            onMouseLeave={() => {
              cursorOnImageRef.current = null;
            }}
          >
            <ImageViewer
              imageUrl={currentImage?.url ?? null}
              imageId={currentImage?.id ?? null}
              onImageLoad={() => setImageLoaded(true)}
              onImageError={() => setImageLoaded(false)}
              onImageMetricsChange={({ naturalWidth, naturalHeight }) => {
                const container = imageContainerRef.current;
                if (!container || !naturalWidth || !naturalHeight) {
                  return;
                }
                const rect = container.getBoundingClientRect();
                const containerWidth = rect.width;
                const containerHeight = rect.height;

                if (containerWidth <= 0 || containerHeight <= 0) {
                  return;
                }

                // object-contain style: uniform scaling to fit within container
                const scale = Math.min(
                  containerWidth / naturalWidth,
                  containerHeight / naturalHeight
                );

                const displayWidth = naturalWidth * scale;
                const displayHeight = naturalHeight * scale;
                const offsetX = (containerWidth - displayWidth) / 2;
                const offsetY = (containerHeight - displayHeight) / 2;

                setImageMetrics({
                  naturalWidth,
                  naturalHeight,
                  displayWidth,
                  displayHeight,
                  offsetX,
                  offsetY,
                });
              }}
            />
            {imageLoaded && imageMetrics && (
              <>
                <BoundingBoxCanvas
                  ref={canvasRef}
                  imageWidth={imageMetrics.displayWidth}
                  imageHeight={imageMetrics.displayHeight}
                  naturalWidth={imageMetrics.naturalWidth}
                  naturalHeight={imageMetrics.naturalHeight}
                  offsetX={imageMetrics.offsetX}
                  offsetY={imageMetrics.offsetY}
                  annotations={filteredAnnotations}
                  categories={categories}
                  selectedCategoryId={selectedCategoryId}
                  isDrawing={isDrawing && imageLoaded && hasCategories}
                  selectedAnnotationId={selectedAnnotationId}
                  selectedAnnotationIds={selection.selectedAnnotationIds}
                  shapeMode={annotationShapeMode === "POLYGON" ? "polygon" : "bbox"}
                  onBboxDraw={handleBboxDraw}
                  onPolygonDrawComplete={handlePolygonDrawComplete}
                  onPolygonUpdate={handlePolygonUpdate}
                  onAnnotationClick={handleAnnotationClick}
                  onAnnotationUpdate={handleAnnotationUpdate}
                  onPolygonDraftChange={setPolygonDraftPointCount}
                  onEmptyCanvasClick={handleEmptyCanvasClick}
                  clickToMaskActive={isClickToMask}
                  clickToMaskPending={clickToMaskPending}
                  clickToMaskPendingPoint={clickToMaskPendingPoint}
                  onClickToMaskPoint={handleClickToMaskPoint}
                />
                {/* Category picker popup — shows on left-click empty canvas or W key */}
                <CategoryPickerMenu
                  open={categoryPicker.open}
                  x={categoryPicker.x}
                  y={categoryPicker.y}
                  categories={categories}
                  onSelect={handlePickerCategorySelect}
                  onClose={closeCategoryPicker}
                />
              </>
            )}
            {/* Phase 3: Show message when no categories */}
            {!hasCategories && imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center space-y-2 p-4 bg-background/80 backdrop-blur-sm rounded-lg border">
                  <p className="text-sm text-muted-foreground">
                    To start annotating, add at least one category first.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setShowCategoryManager(true)}
                    className="pointer-events-auto"
                  >
                    Add Category
                  </Button>
                </div>
              </div>
            )}
            {/* Removed overlay message - user should add categories first before drawing */}
          </div>
        </div>

        {/* Right sidebar: tools + stats */}
        <div className="border rounded-md p-3 space-y-3">
          <h4 className="text-sm font-medium">Tools</h4>
          <AnnotationToolbar
            annotationShapeMode={annotationShapeMode}
            onAnnotationShapeModeChange={handleAnnotationShapeModeChange}
            shapeModeLocked={shapeModeLocked}
            isDrawing={isDrawing}
            isClickToMask={isClickToMask}
            onClickToMask={handleToggleClickToMask}
            clickToMaskShortcut={shortcutKeys.clickToMask}
            onDraw={() => {
              if (isDrawing) {
                setDrawing(false);
                return;
              }
              enterMaskAfterPickerRef.current = false;
              handleOpenDrawPicker();
            }}
            onCopy={handleCopyAnnotations}
            canCopy={annotations.length > 0}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={canUndoToolbar}
            canRedo={canRedo}
            onDelete={() => {
              if (selectedAnnotationId) {
                handleDeleteAnnotation(selectedAnnotationId);
                setSelectedAnnotation(null);
              } else if (selection.selectedAnnotationIds.length > 0) {
                // Phase 6: Delete multiple selected
                selection.selectedAnnotationIds.forEach((id) => {
                  handleDeleteAnnotation(id);
                });
                selection.clearSelection();
              } else if (annotations.length > 0) {
                handleDeleteAnnotation(annotations[0].id);
              }
            }}
          />
          {currentImage?.hasLabels && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setReplaceLabelsConfirmOpen(true)}
            >
              Reload from label file
            </Button>
          )}

          {/* Phase 6: Annotation Metadata */}
          {selectedAnnotationId && (
            <div className="pt-3 border-t">
              <AnnotationMetadata
                annotation={annotations.find((a) => a.id === selectedAnnotationId) || null}
              />
            </div>
          )}

          {/* Original Stats */}
          <div className="pt-3 border-t">
            <AnnotationStats
              images={images}
              annotations={annotations}
              categories={categories}
            />
          </div>
        </div>
      </div>

      <AlertDialog open={replaceLabelsConfirmOpen} onOpenChange={setReplaceLabelsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace annotations from disk?</AlertDialogTitle>
            <AlertDialogDescription>
              This discards current database annotations for this image and re-imports boxes from the
              YOLO label file on disk. Use this if the canvas and files are out of sync.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void handleReloadFromLabelFile();
              }}
            >
              Replace from disk
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category Manager Dialog */}
      <Dialog open={showCategoryManager} onOpenChange={setShowCategoryManager}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
            <DialogDescription>
              Create, edit, delete, and reorder annotation categories
            </DialogDescription>
          </DialogHeader>
          <CategoryManager
            categories={categories}
            onCategoryCreate={handleCategoryCreate}
            onCategoryUpdate={handleCategoryUpdate}
            onCategoryDelete={handleCategoryDelete}
            onCategoryReorder={handleCategoryReorder}
          />
        </DialogContent>
      </Dialog>

      {/* Phase 5: Confirmation dialog for unannotated images */}
      <Dialog open={showUnannotatedDialog} onOpenChange={setShowUnannotatedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Save</DialogTitle>
            <DialogDescription>
              The images which don't have annotations are good images?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowUnannotatedDialog(false);
                // Phase 5: Display the list/grid of images without annotations
                setShowOnlyUnannotatedImages(true);
                const imagesWithoutAnnotations = images.filter(
                  (img) => !img.hasAnnotations && img.annotationStatus !== "annotated"
                );
                toast({
                  title: "Unannotated images",
                  description: `${imagesWithoutAnnotations.length} image(s) without annotations. Please annotate them or mark as good.`,
                  variant: "info",
                });
              }}
            >
              No
            </Button>
            <Button
              variant="default"
              onClick={async () => {
                setShowUnannotatedDialog(false);
                const imagesWithoutAnnotations = images.filter(
                  (img) => !img.hasAnnotations && img.annotationStatus !== "annotated"
                );
                const unannotatedImageIds = imagesWithoutAnnotations.map((img) => img.id);
                await handleSaveAndConvert(unannotatedImageIds);
              }}
            >
              Yes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Augmentation confirmation dialog shown after annotations are saved */}
      <AugmentVersionNameModal
        open={showAugmentDialog}
        onOpenChange={setShowAugmentDialog}
        currentVersion={augmentDatasetVersion}
        isLoading={augmenting}
        title="Augment this dataset?"
        description="Your annotations have been saved and converted. Enter a name for the new augmented version and how many images you want after augmentation."
        cancelLabel="No, skip for now"
        confirmLabel="Yes, augment dataset"
        defaultTargetImageCount={Math.max(images.length * 2, images.length || 1)}
        onConfirm={async (versionName, options) => {
          setAugmenting(true);
          try {
            await datasetsApi.augmentDataset(datasetId, versionName, options);
            setAugmentingDatasetId(datasetId);
            toast({
              title: "Augmentation started",
              description:
                "Dataset augmentation has been started in the background. You can continue working while it finishes.",
            });
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
              setShowAugmentDialog(false);
            } else {
              // For 400 errors (validation errors), show backend error message as-is
              // Keep modal open so user can fix the version name
              console.error("Failed to start augmentation:", error);
              toast({
                title: "Failed to start augmentation",
                description: msg || "An error occurred while starting augmentation.",
                variant: "destructive",
              });
              // Modal stays open for user to correct the version name
            }
          } finally {
            setAugmenting(false);
          }
        }}
      />

      {/* Bottom: thumbnails */}
      <div className="border rounded-md p-3" role="navigation" aria-label="Image navigation">
        {showOnlyUnannotatedImages && (
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing unannotated images only
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOnlyUnannotatedImages(false)}
            >
              Show All
            </Button>
          </div>
        )}
        <ImageThumbnailGrid
          images={
            showOnlyUnannotatedImages
              ? images.filter(
                  (img) => !img.hasAnnotations && img.annotationStatus !== "annotated"
                )
              : images
          }
          currentImageId={currentImage?.id ?? null}
          onImageSelect={handleImageSelect}
        />
      </div>
      </div>
    </AnnotationErrorBoundary>
  );
};


