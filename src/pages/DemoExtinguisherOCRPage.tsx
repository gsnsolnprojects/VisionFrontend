import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/pages/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  clearReads,
  type ExtractFieldConfig,
  getReads,
  getIpCameraSnapshot,
  startSession,
  stopSession,
  submitFrame,
  type CameraSubmitFramePayload,
  type DemoReadRecord,
  type SubmitFramePayload,
} from "@/lib/api/demoExtinguisher";

const POLL_INTERVAL_MS = 2000;
type InputMode = "manual" | "camera";
type CameraCaptureMode = "full" | "roi";
type CameraSourceMode = "browser" | "ip";
interface CameraSubmitOptions {
  fromAutoScan?: boolean;
}
type CaptureLedStatus = "idle" | "success" | "error";
interface ExtractionFeedback {
  requestedFieldConfigs: ExtractFieldConfig[];
  extractedFieldEntries: Array<{ key: string; value: string }>;
  missingFields: string[];
  optionalMissingFields: string[];
  allRequestedFound: boolean | null;
}
const ROI_X_RATIO = 0.2;
const ROI_Y_RATIO = 0.38;
const ROI_WIDTH_RATIO = 0.6;
const ROI_HEIGHT_RATIO = 0.18;
const DEFAULT_IP_CAMERA_BASE_URL = "http://192.168.1.8:8080";
const IP_CAMERA_MAX_FAILURES = 8;
const EXTRACTOR_HELP: Record<ExtractFieldConfig["extractor"], string> = {
  code: "Accepts code-like values (letters/numbers with separators, e.g. SPF-6KG).",
  decimal_number: "Accepts decimal numeric values (e.g. 6.5, 12.00).",
  alphanumeric: "Accepts mixed letters and numbers (e.g. BATCH123, A9X2).",
  text: "Accepts general free text values.",
};

const formatDateTime = (value?: string): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const DEMO_SESSION_GONE_MESSAGE =
  "Session expired or not found. Please start a new demo session.";

const normalizeApiError = (error: unknown): string => {
  const fallback =
    "Something went wrong while contacting the demo API. Please try again.";
  const raw = error instanceof Error ? error.message : "";
  if (!raw) return fallback;

  const lower = raw.toLowerCase();
  if (
    lower.includes("not found") ||
    lower.includes("expired") ||
    lower.includes("invalid session") ||
    lower.includes("no active session") ||
    lower.includes("session not found or expired") ||
    lower.includes("session not found") ||
    /\b404\b/.test(lower)
  ) {
    return DEMO_SESSION_GONE_MESSAGE;
  }

  return raw;
};

const isDemoSessionGoneFriendly = (friendly: string): boolean => {
  return (
    friendly === DEMO_SESSION_GONE_MESSAGE ||
    friendly.toLowerCase().includes("session expired or not found")
  );
};

const getSubmitDisabledReason = (
  isSessionActive: boolean,
  code: string,
  confidenceText: string
): string | null => {
  if (!isSessionActive) {
    return "Start a session before submitting frames.";
  }
  if (!code.trim()) {
    return "Code is required.";
  }
  const confidence = Number(confidenceText);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    return "Confidence must be between 0 and 1.";
  }
  return null;
};

const getReadExtractedFieldEntries = (
  read: DemoReadRecord
): Array<{ key: string; value: string }> => {
  const fieldMap =
    read.extractedFields ??
    read.meta?.extractedFields ??
    null;

  if (!fieldMap) return [];

  return Object.entries(fieldMap).map(([key, value]) => ({
    key,
    value: value === null ? "null" : String(value),
  }));
};

const computeRoiRect = (
  frameWidth: number,
  frameHeight: number,
  yOffsetPercent: number,
  widthScale: number,
  heightScale: number
) => {
  const offsetPx = (yOffsetPercent / 100) * frameHeight;
  const baseWidth = frameWidth * ROI_WIDTH_RATIO;
  const baseHeight = frameHeight * ROI_HEIGHT_RATIO;

  const roiWidth = Math.min(frameWidth, Math.max(1, baseWidth * widthScale));
  const roiHeight = Math.min(frameHeight, Math.max(1, baseHeight * heightScale));

  const baseX = frameWidth * ROI_X_RATIO;
  const baseY = frameHeight * ROI_Y_RATIO + offsetPx;
  const centerX = baseX + baseWidth / 2;
  const centerY = baseY + baseHeight / 2;

  const x = Math.round(
    Math.min(frameWidth - roiWidth, Math.max(0, centerX - roiWidth / 2))
  );
  const y = Math.round(
    Math.min(frameHeight - roiHeight, Math.max(0, centerY - roiHeight / 2))
  );

  return {
    x,
    y,
    width: Math.round(roiWidth),
    height: Math.round(roiHeight),
  };
};

const getExtractorLegendTooltip = (): string => {
  return [
    `code: ${EXTRACTOR_HELP.code}`,
    `decimal_number: ${EXTRACTOR_HELP.decimal_number}`,
    `alphanumeric: ${EXTRACTOR_HELP.alphanumeric}`,
    `text: ${EXTRACTOR_HELP.text}`,
  ].join("\n");
};

const normalizeIpCameraBaseUrl = (value: string): string => {
  return value.trim().replace(/\/+$/, "");
};

const buildIpCameraSnapshotUrl = (baseUrl: string): string => {
  return `${normalizeIpCameraBaseUrl(baseUrl)}/shot.jpg`;
};

const buildIpCameraStreamUrl = (baseUrl: string): string => {
  return `${normalizeIpCameraBaseUrl(baseUrl)}/video`;
};

const areReadsEffectivelyEqual = (
  prev: DemoReadRecord[],
  next: DemoReadRecord[]
): boolean => {
  if (prev.length !== next.length) return false;
  for (let index = 0; index < prev.length; index += 1) {
    const prevItem = prev[index];
    const nextItem = next[index];
    if (
      prevItem._id !== nextItem._id ||
      prevItem.updatedAt !== nextItem.updatedAt ||
      prevItem.capturedAt !== nextItem.capturedAt ||
      prevItem.code !== nextItem.code ||
      prevItem.confidence !== nextItem.confidence ||
      prevItem.duplicateSuppressed !== nextItem.duplicateSuppressed ||
      prevItem.sourceType !== nextItem.sourceType ||
      prevItem.meta?.frameId !== nextItem.meta?.frameId
    ) {
      return false;
    }
  }
  return true;
};

const DemoExtinguisherOCRPage = () => {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ipCameraImgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const autoScanIntervalRef = useRef<number | null>(null);
  const autoScanInFlightRef = useRef(false);
  const ledResetTimeoutRef = useRef<number | null>(null);
  const ipCameraFailureCountRef = useRef(0);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [reads, setReads] = useState<DemoReadRecord[]>([]);
  const [loadingSession, setLoadingSession] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingReads, setLoadingReads] = useState(false);
  const [loadingClear, setLoadingClear] = useState(false);
  const [loadingCamera, setLoadingCamera] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCameraRunning, setIsCameraRunning] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("manual");
  const [cameraSourceMode, setCameraSourceMode] =
    useState<CameraSourceMode>("browser");
  const [cameraCaptureMode, setCameraCaptureMode] =
    useState<CameraCaptureMode>("full");
  const [roiYOffsetPercent, setRoiYOffsetPercent] = useState(0);
  const [roiWidthScale, setRoiWidthScale] = useState(1);
  const [roiHeightScale, setRoiHeightScale] = useState(1);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.35);
  const [lastMinConfidenceUsed, setLastMinConfidenceUsed] = useState<
    number | null
  >(null);
  const [isAutoScanRunning, setIsAutoScanRunning] = useState(false);
  const [autoScanIntervalMs, setAutoScanIntervalMs] = useState(1000);
  const [framesAttempted, setFramesAttempted] = useState(0);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [lastAutoScanResult, setLastAutoScanResult] = useState("-");
  const [autoScanErrorNote, setAutoScanErrorNote] = useState<string | null>(null);
  const [captureLedStatus, setCaptureLedStatus] = useState<CaptureLedStatus>("idle");
  const [ipCameraBaseUrl, setIpCameraBaseUrl] = useState(
    DEFAULT_IP_CAMERA_BASE_URL
  );
  const [isIpCameraConnected, setIsIpCameraConnected] = useState(false);
  const [ipCameraStatus, setIpCameraStatus] = useState("Disconnected");
  const [ipCameraPreviewUrl, setIpCameraPreviewUrl] = useState("");
  const [ipCameraPreviewMode, setIpCameraPreviewMode] = useState<
    "stream" | "snapshot"
  >("stream");
  const [extractFields, setExtractFields] = useState<ExtractFieldConfig[]>([
    { name: "MODEL NO", extractor: "code", required: true },
  ]);
  const [extractionFeedback, setExtractionFeedback] =
    useState<ExtractionFeedback | null>(null);

  const [codeInput, setCodeInput] = useState("");
  const [confidenceInput, setConfidenceInput] = useState("0.93");
  const [frameIdInput, setFrameIdInput] = useState("");
  const [lastSubmitted, setLastSubmitted] = useState<SubmitFramePayload | null>(
    null
  );

  const overlayRoiRect = computeRoiRect(
    100,
    100,
    roiYOffsetPercent,
    roiWidthScale,
    roiHeightScale
  );

  const submitDisabledReason = getSubmitDisabledReason(
    isSessionActive,
    codeInput,
    confidenceInput
  );
  const ipCameraSnapshotUrl = useMemo(
    () => buildIpCameraSnapshotUrl(ipCameraBaseUrl),
    [ipCameraBaseUrl]
  );
  const ipCameraStreamUrl = useMemo(
    () => buildIpCameraStreamUrl(ipCameraBaseUrl),
    [ipCameraBaseUrl]
  );

  const handleConfidenceThresholdChange = (value: number) => {
    const normalized = Number.isFinite(value)
      ? Math.min(0.95, Math.max(0.1, value))
      : 0.35;
    setConfidenceThreshold(Number(normalized.toFixed(2)));
  };

  const normalizeExtractRows = (
    rows: ExtractFieldConfig[]
  ): ExtractFieldConfig[] => {
    return rows
      .map((row) => ({
        ...row,
        name: row.name.trim(),
      }))
      .filter((row) => row.name.length > 0);
  };

  const handleAddExtractField = () => {
    setExtractFields((prev) => [
      ...prev,
      { name: "", extractor: "text", required: false },
    ]);
  };

  const handleRemoveExtractField = (index: number) => {
    setExtractFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateExtractField = (
    index: number,
    patch: Partial<ExtractFieldConfig>
  ) => {
    setExtractFields((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const mapExtractedFieldEntries = (
    extractedFields?: Record<string, string | number | boolean | null> | string[]
  ): Array<{ key: string; value: string }> => {
    if (!extractedFields) return [];
    if (Array.isArray(extractedFields)) {
      return extractedFields.map((value, index) => ({
        key: `field_${index + 1}`,
        value: String(value),
      }));
    }

    return Object.entries(extractedFields).map(([key, value]) => ({
      key,
      value: value === null ? "null" : String(value),
    }));
  };

  const updateExtractionFeedback = (
    requestedFieldConfigs?: ExtractFieldConfig[],
    extractedFields?: Record<string, string | number | boolean | null> | string[],
    missingFields?: string[],
    optionalMissingFields?: string[],
    allRequestedFound?: boolean
  ) => {
    const requested = requestedFieldConfigs ?? [];
    const extractedEntries = mapExtractedFieldEntries(extractedFields);
    const missing = missingFields ?? [];
    const optionalMissing = optionalMissingFields ?? [];
    const allFound =
      typeof allRequestedFound === "boolean" ? allRequestedFound : null;

    if (
      requested.length === 0 &&
      extractedEntries.length === 0 &&
      missing.length === 0 &&
      optionalMissing.length === 0
    ) {
      setExtractionFeedback(null);
      return;
    }

    setExtractionFeedback({
      requestedFieldConfigs: requested,
      extractedFieldEntries: extractedEntries,
      missingFields: missing,
      optionalMissingFields: optionalMissing,
      allRequestedFound: allFound,
    });
  };

  const stopAutoScan = () => {
    if (autoScanIntervalRef.current !== null) {
      window.clearInterval(autoScanIntervalRef.current);
      autoScanIntervalRef.current = null;
    }
    autoScanInFlightRef.current = false;
    setIsAutoScanRunning(false);
  };

  const stopCameraStream = () => {
    stopAutoScan();
    if (ledResetTimeoutRef.current !== null) {
      window.clearTimeout(ledResetTimeoutRef.current);
      ledResetTimeoutRef.current = null;
    }
    setCaptureLedStatus("idle");
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsIpCameraConnected(false);
    setIpCameraStatus("Disconnected");
    setIpCameraPreviewUrl("");
    setIpCameraPreviewMode("stream");
    ipCameraFailureCountRef.current = 0;
    setIsCameraRunning(false);
  };

  const handleCameraSourceChange = (nextSource: CameraSourceMode) => {
    stopCameraStream();
    setCameraSourceMode(nextSource);
    setErrorMessage(null);
  };

  const summary = useMemo(() => {
    const totalReads = reads.length;
    const uniqueCodes = new Set(reads.map((item) => item.code)).size;
    const lastDetectedCode = reads.length > 0 ? reads[0].code : "-";
    return { totalReads, uniqueCodes, lastDetectedCode };
  }, [reads]);

  const fetchSessionReads = async (targetSessionId: string) => {
    setLoadingReads(true);
    try {
      // ✅ This handles fetching accepted reads for presenter-friendly demo output.
      const response = await getReads(targetSessionId, false);
      const sortedReads = [...response.reads].sort((a, b) => {
        return (
          new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
        );
      });
      setReads((prev) =>
        areReadsEffectivelyEqual(prev, sortedReads) ? prev : sortedReads
      );
      setErrorMessage(null);
    } catch (error) {
      const friendly = normalizeApiError(error);
      setErrorMessage(friendly);
      if (isDemoSessionGoneFriendly(friendly)) {
        setIsSessionActive(false);
        setSessionId(null);
        setReads([]);
        stopCameraStream();
      }
    } finally {
      setLoadingReads(false);
    }
  };

  useEffect(() => {
    if (!isSessionActive || !sessionId) return;

    fetchSessionReads(sessionId);
    const timer = window.setInterval(() => {
      fetchSessionReads(sessionId);
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [isSessionActive, sessionId]);

  useEffect(() => {
    return () => {
      if (ledResetTimeoutRef.current !== null) {
        window.clearTimeout(ledResetTimeoutRef.current);
      }
      stopAutoScan();
      stopCameraStream();
    };
  }, []);

  const flashCaptureLed = (status: Exclude<CaptureLedStatus, "idle">) => {
    setCaptureLedStatus(status);
    if (ledResetTimeoutRef.current !== null) {
      window.clearTimeout(ledResetTimeoutRef.current);
    }
    ledResetTimeoutRef.current = window.setTimeout(() => {
      setCaptureLedStatus("idle");
      ledResetTimeoutRef.current = null;
    }, 1500);
  };

  const handleStartSession = async () => {
    setLoadingSession(true);
    setErrorMessage(null);

    try {
      const response = await startSession();
      setSessionId(response.session.sessionId);
      setIsSessionActive(true);
      setReads([]);
      toast({
        title: "Demo session started",
        description: `Session ID: ${response.session.sessionId}`,
      });
      await fetchSessionReads(response.session.sessionId);
    } catch (error) {
      const friendly = normalizeApiError(error);
      setErrorMessage(friendly);
      toast({
        title: "Failed to start session",
        description: friendly,
        variant: "destructive",
      });
    } finally {
      setLoadingSession(false);
    }
  };

  const handleStopSession = async () => {
    if (!sessionId) return;
    setLoadingSession(true);

    try {
      const response = await stopSession(sessionId);
      setIsSessionActive(false);
      setSessionId(null);
      stopCameraStream();
      toast({
        title: "Demo session stopped",
        description: `${response.message} (Accepted: ${response.stats.totalAccepted}, Suppressed: ${response.stats.totalSuppressed})`,
      });
    } catch (error) {
      const friendly = normalizeApiError(error);
      setErrorMessage(friendly);
      toast({
        title: "Failed to stop session",
        description: friendly,
        variant: "destructive",
      });
    } finally {
      setLoadingSession(false);
    }
  };

  const handleClearLogs = async () => {
    if (!sessionId) return;
    setLoadingClear(true);
    try {
      const response = await clearReads(sessionId);
      setReads([]);
      toast({
        title: "Logs cleared",
        description: `${response.message} (${response.deletedCount} deleted)`,
      });
    } catch (error) {
      const friendly = normalizeApiError(error);
      setErrorMessage(friendly);
      toast({
        title: "Failed to clear logs",
        description: friendly,
        variant: "destructive",
      });
    } finally {
      setLoadingClear(false);
    }
  };

  const handleApplySampleValues = () => {
    // ✅ This handles one-click sample values for presenter-friendly demos.
    setCodeInput("SPF-6KG");
    setConfidenceInput("0.93");
  };

  const handleStartCamera = async () => {
    if (cameraSourceMode !== "browser") return;
    setLoadingCamera(true);
    setErrorMessage(null);
    try {
      // ✅ This handles webcam streaming for automatic frame capture demo mode.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraRunning(true);
    } catch (error) {
      const friendly =
        "Unable to access camera. Please allow camera permission and retry.";
      setErrorMessage(friendly);
      toast({
        title: "Camera start failed",
        description: friendly,
        variant: "destructive",
      });
    } finally {
      setLoadingCamera(false);
    }
  };

  const handleStopCamera = () => {
    stopCameraStream();
  };

  const verifyImageUrlLoads = (src: string) =>
    new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new Error("Unable to load IP camera stream preview."));
      image.src = src;
    });

  const handleConnectIpCamera = async () => {
    const normalizedBaseUrl = normalizeIpCameraBaseUrl(ipCameraBaseUrl);
    if (!normalizedBaseUrl) {
      setErrorMessage("Enter a valid IP camera base URL before connecting.");
      return;
    }

    setLoadingCamera(true);
    setErrorMessage(null);
    try {
      const streamUrl = `${buildIpCameraStreamUrl(normalizedBaseUrl)}?t=${Date.now()}`;
      await verifyImageUrlLoads(streamUrl);

      setIpCameraBaseUrl(normalizedBaseUrl);
      setIpCameraPreviewUrl(streamUrl);
      setIpCameraPreviewMode("stream");
      setIsIpCameraConnected(true);
      setIsCameraRunning(true);
      setIpCameraStatus("Connected - Live Stream");
      ipCameraFailureCountRef.current = 0;
      toast({
        title: "IP camera connected",
        description: `Using live stream from ${normalizedBaseUrl}`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message.toLowerCase() : "";
      const friendly = message.includes("failed to fetch")
        ? "Unable to reach the IP camera live stream. Verify the phone URL and that the Android IP Webcam app is running."
        : "Unable to connect to the IP camera live stream. Check the URL and verify the Android IP Webcam app is running.";
      setIsIpCameraConnected(false);
      setIsCameraRunning(false);
      setIpCameraStatus("Connection failed");
      setIpCameraPreviewUrl("");
      setErrorMessage(friendly);
      toast({
        title: "IP camera connection failed",
        description: friendly,
        variant: "destructive",
      });
    } finally {
      setLoadingCamera(false);
    }
  };

  const handleDisconnectIpCamera = () => {
    stopCameraStream();
  };

  const handleAutoScanIntervalChange = (value: number) => {
    const normalized = Number.isFinite(value)
      ? Math.min(3000, Math.max(500, value))
      : 1000;
    setAutoScanIntervalMs(Math.round(normalized));
  };

  const handleSubmitFrame = async () => {
    if (!sessionId || submitDisabledReason) return;
    setLoadingSubmit(true);
    setErrorMessage(null);

    const payload: SubmitFramePayload = {
      ocrText: codeInput.trim(),
      confidence: Number(confidenceInput),
      confidenceThreshold,
      ...(normalizeExtractRows(extractFields).length > 0
        ? { extractFields: normalizeExtractRows(extractFields) }
        : {}),
      ...(frameIdInput.trim() ? { frameId: frameIdInput.trim() } : {}),
    };
    setLastSubmitted(payload);

    try {
      const response = await submitFrame(sessionId, payload);
      if (response.accepted) {
        toast({
          title: "Frame accepted",
          description: `${response.code} at confidence ${response.confidence.toFixed(
            2
          )}`,
        });
      } else {
        const reasonText =
          "reason" in response
            ? response.reason || "Frame not accepted by backend."
            : "Frame not accepted by backend.";
        toast({
          title: "Frame not accepted",
          description: reasonText,
          variant: "destructive",
        });
      }
      if (typeof response.minConfidenceUsed === "number") {
        setLastMinConfidenceUsed(response.minConfidenceUsed);
      }
      updateExtractionFeedback(
        response.requestedFieldConfigs,
        response.extractedFields,
        response.missingFields,
        response.optionalMissingFields,
        response.allRequestedFound
      );
      if (!response.accepted && (response.missingFields?.length ?? 0) > 0) {
        toast({
          title: "Frame not accepted",
          description: "Not all requested parameters were found",
          variant: "destructive",
        });
      }
      await fetchSessionReads(sessionId);
    } catch (error) {
      const friendly = normalizeApiError(error);
      setErrorMessage(friendly);
      if (isDemoSessionGoneFriendly(friendly)) {
        setIsSessionActive(false);
        setSessionId(null);
        setReads([]);
        stopCameraStream();
      }
      toast({
        title: "Failed to submit frame",
        description: friendly,
        variant: "destructive",
      });
    } finally {
      setLoadingSubmit(false);
    }
  };

  const loadImageElement = (src: string, crossOrigin?: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      if (crossOrigin) {
        image.crossOrigin = crossOrigin;
      }
      image.onload = () => resolve(image);
      image.onerror = () => {
        reject(
          new Error(
            "Unable to load IP camera frame. Check camera availability and CORS settings."
          )
        );
      };
      image.src = src;
    });

  const drawFrameToCanvas = (
    frameSource: CanvasImageSource,
    width: number,
    height: number
  ) => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) {
      throw new Error("Camera is not ready yet. Please try again.");
    }

    canvasEl.width = width;
    canvasEl.height = height;

    const context = canvasEl.getContext("2d");
    if (!context) {
      throw new Error("Unable to capture frame from camera.");
    }

    context.drawImage(frameSource, 0, 0, width, height);
    return canvasEl;
  };

  const getCanvasImageBase64 = (
    canvasEl: HTMLCanvasElement,
    width: number,
    height: number
  ) => {
    let imageBase64 = canvasEl.toDataURL("image/jpeg", 0.9);

    if (cameraCaptureMode === "roi") {
      // ✅ This keeps ROI extraction unchanged for both browser and IP camera frames.
      const roiRect = computeRoiRect(
        width,
        height,
        roiYOffsetPercent,
        roiWidthScale,
        roiHeightScale
      );

      const roiCanvas = document.createElement("canvas");
      roiCanvas.width = roiRect.width;
      roiCanvas.height = roiRect.height;
      const roiContext = roiCanvas.getContext("2d");
      if (!roiContext) {
        throw new Error("Unable to crop ROI for camera frame.");
      }

      roiContext.drawImage(
        canvasEl,
        roiRect.x,
        roiRect.y,
        roiRect.width,
        roiRect.height,
        0,
        0,
        roiRect.width,
        roiRect.height
      );

      imageBase64 = roiCanvas.toDataURL("image/jpeg", 0.9);
    }

    return imageBase64;
  };

  const captureBrowserCameraFrame = async () => {
    if (!videoRef.current) {
      throw new Error("Camera is not ready yet. Please try again.");
    }
    const videoEl = videoRef.current;
    const width = videoEl.videoWidth || 1280;
    const height = videoEl.videoHeight || 720;
    const canvasEl = drawFrameToCanvas(videoEl, width, height);
    return getCanvasImageBase64(canvasEl, width, height);
  };

  const captureIpCameraFrame = async () => {
    const snapshot = await getIpCameraSnapshot(ipCameraBaseUrl);
    const image = await loadImageElement(snapshot.imageBase64);
    const width = image.naturalWidth || 1280;
    const height = image.naturalHeight || 720;
    const canvasEl = drawFrameToCanvas(image, width, height);
    return getCanvasImageBase64(canvasEl, width, height);
  };

  const handleCaptureAndSubmit = async (options: CameraSubmitOptions = {}) => {
    const { fromAutoScan = false } = options;
    if (!sessionId || !isSessionActive || !isCameraRunning) return;
    if (
      cameraSourceMode === "browser" &&
      (!videoRef.current || !canvasRef.current)
    ) {
      setErrorMessage("Camera is not ready yet. Please try again.");
      return;
    }
    if (cameraSourceMode === "ip" && !canvasRef.current) {
      setErrorMessage("IP camera canvas is not ready yet. Please try again.");
      return;
    }

    setLoadingSubmit(true);
    setErrorMessage(null);
    try {
      const imageBase64 =
        cameraSourceMode === "browser"
          ? await captureBrowserCameraFrame()
          : await captureIpCameraFrame();

      const payload: CameraSubmitFramePayload = {
        imageBase64,
        confidenceThreshold,
        ...(normalizeExtractRows(extractFields).length > 0
          ? { extractFields: normalizeExtractRows(extractFields) }
          : {}),
        frameId: `cam-${Date.now()}`,
      };
      setLastSubmitted(payload);

      // ❗ Make sure backend endpoint exists and supports imageBase64 payload.
      const response = await submitFrame(sessionId, payload);
      if (response.accepted) {
        flashCaptureLed("success");
        if (!fromAutoScan) {
          toast({
            title: "Frame accepted",
            description: `${response.code} at confidence ${response.confidence.toFixed(
              2
            )}`,
          });
        }
        if (fromAutoScan) {
          setAcceptedCount((prev) => prev + 1);
          setLastAutoScanResult(
            `Accepted ${response.code} (${response.confidence.toFixed(2)})`
          );
        }
      } else {
        flashCaptureLed("error");
        const reasonText =
          "reason" in response
            ? response.reason || "Frame not accepted."
            : "Frame not accepted.";
        if (!fromAutoScan) {
          toast({
            title: "Frame not accepted",
            description: reasonText,
            variant: "destructive",
          });
        }
        if (fromAutoScan) {
          setLastAutoScanResult(reasonText);
        }
      }
      if (typeof response.minConfidenceUsed === "number") {
        setLastMinConfidenceUsed(response.minConfidenceUsed);
      }
      updateExtractionFeedback(
        response.requestedFieldConfigs,
        response.extractedFields,
        response.missingFields,
        response.optionalMissingFields,
        response.allRequestedFound
      );
      if (!response.accepted && (response.missingFields?.length ?? 0) > 0) {
        if (!fromAutoScan) {
          toast({
            title: "Frame not accepted",
            description: "Not all requested parameters were found",
            variant: "destructive",
          });
        } else {
          setLastAutoScanResult("Not all requested parameters were found");
        }
      }
      if (fromAutoScan) {
        setAutoScanErrorNote(null);
      }
      if (cameraSourceMode === "ip") {
        ipCameraFailureCountRef.current = 0;
        setIpCameraStatus("Connected - Live Stream");
      }
      await fetchSessionReads(sessionId);
    } catch (error) {
      flashCaptureLed("error");
      const friendly = normalizeApiError(error);
      setErrorMessage(friendly);
      if (isDemoSessionGoneFriendly(friendly)) {
        setIsSessionActive(false);
        setSessionId(null);
        setReads([]);
        stopAutoScan();
        stopCameraStream();
      }
      if (!fromAutoScan) {
        toast({
          title: "Failed to submit camera frame",
          description: friendly,
          variant: "destructive",
        });
      } else {
        setAutoScanErrorNote(friendly);
        setLastAutoScanResult("Submit failed");
      }
      if (cameraSourceMode === "ip") {
        ipCameraFailureCountRef.current += 1;
        setIpCameraStatus("Capture failed");
        if (fromAutoScan && ipCameraFailureCountRef.current >= IP_CAMERA_MAX_FAILURES) {
          stopAutoScan();
          setAutoScanErrorNote(
            "IP camera failed repeatedly through the backend proxy. Auto scan stopped after multiple snapshot errors."
          );
          setLastAutoScanResult("Auto scan stopped after IP camera errors");
        }
      }
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleStartAutoScan = () => {
    if (!sessionId || !isSessionActive || !isCameraRunning || isAutoScanRunning) {
      return;
    }
    setFramesAttempted(0);
    setAcceptedCount(0);
    setLastAutoScanResult("Auto scan running...");
    setAutoScanErrorNote(null);
    setIsAutoScanRunning(true);

    autoScanIntervalRef.current = window.setInterval(async () => {
      if (autoScanInFlightRef.current) return;
      autoScanInFlightRef.current = true;
      setFramesAttempted((prev) => prev + 1);
      try {
        await handleCaptureAndSubmit({ fromAutoScan: true });
      } finally {
        autoScanInFlightRef.current = false;
      }
    }, autoScanIntervalMs);
  };

  const handleStopAutoScan = () => {
    stopAutoScan();
    setLastAutoScanResult("Auto scan stopped");
  };

  const handleManualCaptureClick = () => {
    void handleCaptureAndSubmit();
  };

  const cameraSubmitDisabled =
    !isSessionActive ||
    !sessionId ||
    !isCameraRunning ||
    loadingSubmit ||
    isAutoScanRunning;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Demo - Extinguisher OCR"
        description="Temporary isolated demo UI for extinguisher label code logging."
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Top Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleStartSession} disabled={loadingSession}>
              {loadingSession ? "Starting..." : "Start Session"}
            </Button>
            <Button
              variant="outline"
              onClick={handleStopSession}
              disabled={!sessionId || loadingSession || !isSessionActive}
            >
              {loadingSession ? "Stopping..." : "Stop Session"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearLogs}
              disabled={!sessionId || loadingClear}
            >
              {loadingClear ? "Clearing..." : "Clear Logs"}
            </Button>
            <Badge variant={isSessionActive ? "default" : "secondary"}>
              {isSessionActive ? "Session Active" : "Session Inactive"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              ID: {sessionId || "-"}
            </span>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Total Reads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary.totalReads}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Unique Codes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary.uniqueCodes}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Last Detected Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base font-bold break-all">{summary.lastDetectedCode}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="grid gap-2 rounded-md border p-3">
              <Label htmlFor="confidence-threshold-range">
                Confidence Threshold (0-1)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="confidence-threshold-range"
                  type="range"
                  min={0.1}
                  max={0.95}
                  step={0.01}
                  value={confidenceThreshold}
                  onChange={(event) =>
                    handleConfidenceThresholdChange(Number(event.target.value))
                  }
                />
                <Input
                  type="number"
                  min={0.1}
                  max={0.95}
                  step={0.01}
                  value={confidenceThreshold}
                  onChange={(event) =>
                    handleConfidenceThresholdChange(Number(event.target.value))
                  }
                  className="w-24"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Current threshold: {confidenceThreshold.toFixed(2)}
                {typeof lastMinConfidenceUsed === "number"
                  ? ` | Backend minConfidenceUsed: ${lastMinConfidenceUsed.toFixed(2)}`
                  : ""}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={inputMode === "manual" ? "default" : "outline"}
                onClick={() => setInputMode("manual")}
              >
                Manual Mode
              </Button>
              <Button
                variant={inputMode === "camera" ? "default" : "outline"}
                onClick={() => setInputMode("camera")}
              >
                Camera Mode
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {errorMessage && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {/* ✅ This handles user-friendly API error feedback for demo sessions. */}
          {/* ❗ Make sure backend endpoint exists and session lifecycle is enabled. */}
          {errorMessage}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1.4fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{inputMode === "manual" ? "Manual Capture" : "Camera Capture"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inputMode === "manual" ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="demo-code-input">Code</Label>
                    <Input
                      id="demo-code-input"
                      placeholder="SPF-6KG"
                      value={codeInput}
                      onChange={(event) => setCodeInput(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="demo-confidence-input">Confidence (0-1)</Label>
                    <Input
                      id="demo-confidence-input"
                      type="number"
                      min={0}
                      max={1}
                      step={0.01}
                      value={confidenceInput}
                      onChange={(event) => setConfidenceInput(event.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="demo-frame-id-input">Frame ID (Optional)</Label>
                  <Input
                    id="demo-frame-id-input"
                    placeholder="f1"
                    value={frameIdInput}
                    onChange={(event) => setFrameIdInput(event.target.value)}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handleApplySampleValues}>
                    Use Sample Values
                  </Button>
                  <Button
                    onClick={handleSubmitFrame}
                    disabled={Boolean(submitDisabledReason) || loadingSubmit}
                  >
                    {loadingSubmit ? "Submitting..." : "Submit Frame"}
                  </Button>
                </div>

                {submitDisabledReason && (
                  <p className="text-xs text-muted-foreground">{submitDisabledReason}</p>
                )}
              </>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={cameraSourceMode === "browser" ? "default" : "outline"}
                    onClick={() => handleCameraSourceChange("browser")}
                  >
                    Browser Camera
                  </Button>
                  <Button
                    variant={cameraSourceMode === "ip" ? "default" : "outline"}
                    onClick={() => handleCameraSourceChange("ip")}
                  >
                    IP Camera
                  </Button>
                  <Button
                    onClick={handleManualCaptureClick}
                    disabled={cameraSubmitDisabled}
                  >
                    {loadingSubmit ? "Submitting..." : "Capture & Submit"}
                  </Button>
                </div>

                {cameraSourceMode === "browser" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={handleStartCamera}
                      disabled={isCameraRunning || loadingCamera}
                    >
                      {loadingCamera ? "Starting..." : "Start Camera"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleStopCamera}
                      disabled={!isCameraRunning}
                    >
                      Stop Camera
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-3 rounded-md border p-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="ip-camera-url-input">IP Camera Base URL</Label>
                      <Input
                        id="ip-camera-url-input"
                        value={ipCameraBaseUrl}
                        onChange={(event) => setIpCameraBaseUrl(event.target.value)}
                        placeholder={DEFAULT_IP_CAMERA_BASE_URL}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        onClick={handleConnectIpCamera}
                        disabled={loadingCamera || isIpCameraConnected}
                      >
                        {loadingCamera ? "Connecting..." : "Connect IP Camera"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleDisconnectIpCamera}
                        disabled={!isIpCameraConnected}
                      >
                        Disconnect
                      </Button>
                      <Badge
                        variant={
                          ipCameraStatus === "Connected" ? "default" : "secondary"
                        }
                      >
                        {ipCameraStatus}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>
                        Snapshot URL: backend proxy via{" "}
                        <code className="text-xs">/demo/extinguisher/ip-camera/snapshot</code>{" "}
                        (joined with <code className="text-xs">VITE_API_BASE_URL</code>)
                      </p>
                      <p>Stream candidate: {ipCameraStreamUrl}</p>
                      <p>Preview mode: Live stream</p>
                    </div>
                  </div>
                )}

                <div className="grid gap-2 rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={handleStartAutoScan}
                      disabled={
                        isAutoScanRunning ||
                        !isSessionActive ||
                        !isCameraRunning ||
                        !sessionId
                      }
                    >
                      Start Auto Scan
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleStopAutoScan}
                      disabled={!isAutoScanRunning}
                    >
                      Stop Auto Scan
                    </Button>
                    <Badge variant={isAutoScanRunning ? "default" : "secondary"}>
                      {isAutoScanRunning ? "Running" : "Stopped"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="auto-scan-interval-input" className="text-xs">
                      Interval (ms)
                    </Label>
                    <Input
                      id="auto-scan-interval-input"
                      type="number"
                      min={500}
                      max={3000}
                      step={100}
                      value={autoScanIntervalMs}
                      onChange={(event) =>
                        handleAutoScanIntervalChange(Number(event.target.value))
                      }
                      disabled={isAutoScanRunning}
                      className="w-28"
                    />
                  </div>
                  <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                    <p>Frames attempted: {framesAttempted}</p>
                    <p>Accepted count: {acceptedCount}</p>
                    <p>Last result: {lastAutoScanResult}</p>
                  </div>
                  {autoScanErrorNote && (
                    <p className="text-xs text-destructive">
                      Auto-scan note: {autoScanErrorNote}
                    </p>
                  )}
                </div>

                {!isSessionActive && (
                  <p className="text-xs text-muted-foreground">
                    Start a session before submitting camera frames.
                  </p>
                )}

                {cameraSourceMode === "ip" && (
                  <p className="text-xs text-muted-foreground">
                    Live stream preview stays direct. Capture and auto-scan now use the backend proxy to avoid browser tainted-canvas issues.
                  </p>
                )}

                <div className="rounded-md border p-3 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={cameraCaptureMode === "full" ? "default" : "outline"}
                      onClick={() => setCameraCaptureMode("full")}
                    >
                      Full Label
                    </Button>
                    <Button
                      variant={cameraCaptureMode === "roi" ? "default" : "outline"}
                      onClick={() => setCameraCaptureMode("roi")}
                    >
                      ROI Crop
                    </Button>
                  </div>

                  {cameraCaptureMode === "full" && (
                    <p className="text-xs text-muted-foreground">
                      Full Label mode uses backend MODEL NO extraction.
                    </p>
                  )}

                  {cameraCaptureMode === "roi" && (
                    <div className="grid gap-2">
                      <Label htmlFor="roi-offset-slider">
                        ROI Vertical Offset: {roiYOffsetPercent}%
                      </Label>
                      <Input
                        id="roi-offset-slider"
                        type="range"
                        min={-15}
                        max={15}
                        step={1}
                        value={roiYOffsetPercent}
                        onChange={(event) =>
                          setRoiYOffsetPercent(Number(event.target.value))
                        }
                      />
                      <Label htmlFor="roi-width-scale-slider">
                        ROI Width Scale: {roiWidthScale.toFixed(2)}x
                      </Label>
                      <Input
                        id="roi-width-scale-slider"
                        type="range"
                        min={0.6}
                        max={2.5}
                        step={0.05}
                        value={roiWidthScale}
                        onChange={(event) =>
                          setRoiWidthScale(Number(event.target.value))
                        }
                      />
                      <Label htmlFor="roi-height-scale-slider">
                        ROI Height Scale: {roiHeightScale.toFixed(2)}x
                      </Label>
                      <Input
                        id="roi-height-scale-slider"
                        type="range"
                        min={0.6}
                        max={5.5}
                        step={0.05}
                        value={roiHeightScale}
                        onChange={(event) =>
                          setRoiHeightScale(Number(event.target.value))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Adjust width and height independently to capture more of the label.
                      </p>
                    </div>
                  )}

                  <div className="relative">
                    {cameraSourceMode === "browser" ? (
                      <video
                        ref={videoRef}
                        className="w-full rounded-md bg-muted"
                        autoPlay
                        muted
                        playsInline
                      />
                    ) : ipCameraPreviewUrl ? (
                      <img
                        ref={ipCameraImgRef}
                        src={ipCameraPreviewUrl}
                        alt="IP camera preview"
                        className="w-full rounded-md bg-muted object-contain"
                        onError={() => {
                          setIpCameraStatus("Live stream preview failed");
                        }}
                      />
                    ) : (
                      <div className="flex min-h-[280px] items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
                        Connect the IP camera to preview snapshots here.
                      </div>
                    )}
                    <div className="pointer-events-none absolute right-2 top-2 flex items-center gap-1 rounded-md bg-background/85 px-2 py-1 text-[11px] font-medium">
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${
                          captureLedStatus === "success"
                            ? "bg-emerald-500"
                            : captureLedStatus === "error"
                              ? "bg-red-500"
                              : "bg-slate-400"
                        }`}
                      />
                      <span className="text-foreground">
                        {captureLedStatus === "success"
                          ? "Captured"
                          : captureLedStatus === "error"
                            ? "Not Logged"
                            : "Idle"}
                      </span>
                    </div>
                    {cameraSourceMode === "ip" && isIpCameraConnected && (
                      <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-background/85 px-2 py-1 text-[11px] font-medium text-foreground">
                        IP Camera Preview
                      </div>
                    )}
                    {cameraCaptureMode === "roi" && (
                      <>
                        <div
                          className="pointer-events-none absolute border-2 border-primary"
                          style={{
                            left: `${overlayRoiRect.x}%`,
                            top: `${overlayRoiRect.y}%`,
                            width: `${overlayRoiRect.width}%`,
                            height: `${overlayRoiRect.height}%`,
                          }}
                        />
                        <div
                          className="pointer-events-none absolute rounded bg-background/80 px-2 py-1 text-xs font-medium text-foreground"
                          style={{
                            left: `${overlayRoiRect.x}%`,
                            top: `calc(${overlayRoiRect.y}% - 1.75rem)`,
                          }}
                        >
                          Align MODEL NO here
                        </div>
                      </>
                    )}
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              </>
            )}

            {!!lastSubmitted && (
              <div className="rounded-md border p-3 text-xs text-muted-foreground">
                <p className="mb-1 font-semibold">Last Submitted Payload</p>
                {"ocrText" in lastSubmitted ? (
                  <>
                    <p>
                      Code: <span className="font-mono">{lastSubmitted.ocrText}</span>
                    </p>
                    <p>Confidence: {lastSubmitted.confidence}</p>
                    <p>Frame ID: {lastSubmitted.frameId || "-"}</p>
                  </>
                ) : (
                  <>
                    <p>Image payload: image/jpeg (base64)</p>
                    <p>Frame ID: {lastSubmitted.frameId}</p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Live Reads (Auto-refresh every 2s when session is active)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[620px] overflow-auto rounded-md border">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Captured At</th>
                    <th className="text-left py-2 px-3">Code</th>
                    <th className="text-left py-2 px-3">Extracted Parameters</th>
                    <th className="text-left py-2 px-3">Confidence</th>
                    <th className="text-left py-2 px-3">Source</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3">Frame ID</th>
                  </tr>
                </thead>
                <tbody>
                  {reads.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-6 text-center text-muted-foreground"
                      >
                        No reads yet. Start a session and submit frames.
                      </td>
                    </tr>
                  ) : (
                    reads.map((item) => {
                      const statusLabel = item.duplicateSuppressed
                        ? "suppressed"
                        : "accepted";
                      const extractedEntries = getReadExtractedFieldEntries(item);
                      return (
                        <tr key={item._id} className="border-b last:border-b-0">
                          <td className="py-2 px-3">{formatDateTime(item.capturedAt)}</td>
                          <td className="py-2 px-3 font-mono">{item.code}</td>
                          <td className="py-2 px-3">
                            {extractedEntries.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {extractedEntries.map((entry) => (
                                  <span key={entry.key} className="text-xs">
                                    <span className="font-semibold">{entry.key}:</span>{" "}
                                    {entry.value}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3">{item.confidence.toFixed(2)}</td>
                          <td className="py-2 px-3">
                            {item.sourceType ? (
                              <Badge variant="outline">{item.sourceType}</Badge>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  item.duplicateSuppressed ? "secondary" : "default"
                                }
                              >
                                {statusLabel}
                              </Badge>
                              {item.duplicateSuppressed && (
                                <Badge variant="outline">Duplicate Suppressed</Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3">{item.meta?.frameId || "-"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <details className="rounded-md border p-3">
        <summary className="cursor-pointer text-sm font-semibold">
          Advanced Parameter and Extraction Feedback
        </summary>
        <div className="mt-3 space-y-3">
          <div className="grid gap-2 rounded-md border p-3">
            <Label>Parameters to Extract</Label>
            <div className="space-y-2">
              {extractFields.map((row, index) => (
                <div
                  key={`extract-row-${index}`}
                  className="grid grid-cols-1 gap-2 rounded-md border p-2 md:grid-cols-12"
                >
                  <Input
                    className="md:col-span-5"
                    placeholder="Field Name (e.g. MODEL NO)"
                    value={row.name}
                    onChange={(event) =>
                      handleUpdateExtractField(index, { name: event.target.value })
                    }
                  />
                  <select
                    className="md:col-span-3 h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={row.extractor}
                    title={EXTRACTOR_HELP[row.extractor]}
                    onChange={(event) =>
                      handleUpdateExtractField(index, {
                        extractor: event.target.value as ExtractFieldConfig["extractor"],
                      })
                    }
                  >
                    <option value="code" title={EXTRACTOR_HELP.code}>
                      code
                    </option>
                    <option value="decimal_number" title={EXTRACTOR_HELP.decimal_number}>
                      decimal_number
                    </option>
                    <option value="alphanumeric" title={EXTRACTOR_HELP.alphanumeric}>
                      alphanumeric
                    </option>
                    <option value="text" title={EXTRACTOR_HELP.text}>
                      text
                    </option>
                  </select>
                  <div className="md:col-span-1 flex items-center justify-center">
                    <span
                      className="inline-flex h-6 w-6 cursor-help items-center justify-center rounded-full border text-xs font-semibold text-muted-foreground"
                      title={`Selected "${row.extractor}": ${EXTRACTOR_HELP[row.extractor]}\n\nAll extractor types:\n${getExtractorLegendTooltip()}`}
                    >
                      ?
                    </span>
                  </div>
                  <label className="md:col-span-2 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={row.required}
                      onChange={(event) =>
                        handleUpdateExtractField(index, {
                          required: event.target.checked,
                        })
                      }
                    />
                    Required
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    className="md:col-span-2"
                    onClick={() => handleRemoveExtractField(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleAddExtractField}>
                Add Field Row
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty for backward-compatible extraction behavior.
            </p>
          </div>

          {extractionFeedback && (
            <div className="rounded-md border p-3 text-xs text-muted-foreground space-y-2">
              <p className="font-semibold">Extraction Feedback</p>
              <p>
                Requested field configs:{" "}
                {extractionFeedback.requestedFieldConfigs.length > 0
                  ? extractionFeedback.requestedFieldConfigs
                      .map(
                        (item) =>
                          `${item.name} [${item.extractor}] ${
                            item.required ? "(required)" : "(optional)"
                          }`
                      )
                      .join(", ")
                  : "-"}
              </p>
              <p>
                Extracted fields:{" "}
                {extractionFeedback.extractedFieldEntries.length > 0
                  ? extractionFeedback.extractedFieldEntries
                      .map((item) => `${item.key}: ${item.value}`)
                      .join(", ")
                  : "-"}
              </p>
              <p>
                Missing required fields:{" "}
                {extractionFeedback.missingFields.length > 0
                  ? extractionFeedback.missingFields.join(", ")
                  : "-"}
              </p>
              <p>
                Optional missing fields:{" "}
                {extractionFeedback.optionalMissingFields.length > 0
                  ? extractionFeedback.optionalMissingFields.join(", ")
                  : "-"}
              </p>
              <div className="flex items-center gap-2">
                <span>All requested found:</span>
                {extractionFeedback.allRequestedFound === null ? (
                  <Badge variant="outline">Unknown</Badge>
                ) : extractionFeedback.allRequestedFound ? (
                  <Badge>Yes</Badge>
                ) : (
                  <Badge variant="destructive">No</Badge>
                )}
              </div>
              {extractionFeedback.missingFields.length > 0 && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-destructive">
                  Not all requested parameters were found:{" "}
                  {extractionFeedback.missingFields.join(", ")}
                </div>
              )}
              {extractionFeedback.allRequestedFound === true &&
                extractionFeedback.extractedFieldEntries.length > 0 && (
                  <div className="rounded-md border border-green-500/40 bg-green-500/10 p-2 text-green-700 dark:text-green-300">
                    Extraction success:{" "}
                    {extractionFeedback.extractedFieldEntries
                      .map((item) => `${item.key}=${item.value}`)
                      .join(", ")}
                  </div>
                )}
            </div>
          )}
        </div>
      </details>
    </div>
  );
};

export default DemoExtinguisherOCRPage;
