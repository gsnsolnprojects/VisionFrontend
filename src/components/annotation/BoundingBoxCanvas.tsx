import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { Annotation, Category, PolygonPoint } from "@/types/annotation";
import { normalizeBbox, calculateBbox, validateBbox, denormalizeBbox, getResizeHandle } from "@/lib/utils/bboxUtils";
import {
  pixelToNormalizedPoint,
  normPointsPixelDistance,
  polygonToBoundingBox,
} from "@/lib/utils/polygonUtils";

const CLOSE_VERTEX_PIXELS = 14;

export interface BoundingBoxCanvasHandle {
  /** Remove the last point from an in-progress polygon. Returns true if a point was removed. */
  undoLastPolygonDraftPoint: () => boolean;
  hasPolygonDraftPoints: () => boolean;
}

interface BoundingBoxCanvasProps {
  imageWidth: number;
  imageHeight: number;
  naturalWidth?: number;
  naturalHeight?: number;
  offsetX?: number;
  offsetY?: number;
  annotations: Annotation[];
  categories?: Category[];
  selectedCategoryId: string | null;
  isDrawing: boolean;
  selectedAnnotationId: string | null;
  selectedAnnotationIds?: string[];
  /** "bbox" = drag rectangle (default). "polygon" = click vertices / edit vertices. */
  shapeMode?: "bbox" | "polygon";
  onBboxDraw?: (bbox: [number, number, number, number]) => void;
  /** Called when user closes a polygon (>=3 normalized points). */
  onPolygonDrawComplete?: (polygon: PolygonPoint[]) => void;
  onAnnotationClick?: (annotationId: string, multiSelect?: boolean) => void;
  onAnnotationUpdate?: (annotationId: string, bbox: [number, number, number, number]) => void;
  onPolygonUpdate?: (annotationId: string, polygon: PolygonPoint[]) => void;
  /** Fired when in-progress polygon vertex count changes (for undo button state). */
  onPolygonDraftChange?: (pointCount: number) => void;
}

interface DrawingState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export const BoundingBoxCanvas = forwardRef<BoundingBoxCanvasHandle, BoundingBoxCanvasProps>(
  function BoundingBoxCanvas(
    {
      imageWidth,
      imageHeight,
      offsetX = 0,
      offsetY = 0,
      annotations,
      categories = [],
      selectedCategoryId,
      isDrawing,
      selectedAnnotationId,
      selectedAnnotationIds = [],
      shapeMode = "bbox",
      onBboxDraw,
      onPolygonDrawComplete,
      onAnnotationClick,
      onAnnotationUpdate,
      onPolygonUpdate,
      onPolygonDraftChange,
    },
    ref
  ) {
  const [drawingState, setDrawingState] = useState<DrawingState | null>(null);
  const [polygonDraft, setPolygonDraft] = useState<PolygonPoint[]>([]);
  const polygonDraftRef = useRef<PolygonPoint[]>([]);
  const [vertexDrag, setVertexDrag] = useState<{
    annotationId: string;
    index: number;
    startPolygon: PolygonPoint[];
    currentPolygon: PolygonPoint[];
  } | null>(null);
  const [editingState, setEditingState] = useState<{
    annotationId: string;
    mode: "move" | "resize";
    handle?: "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";
    startX: number;
    startY: number;
    startBbox: [number, number, number, number];
  } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    polygonDraftRef.current = polygonDraft;
    onPolygonDraftChange?.(polygonDraft.length);
  }, [polygonDraft, onPolygonDraftChange]);

  useImperativeHandle(
    ref,
    () => ({
      undoLastPolygonDraftPoint: () => {
        if (polygonDraftRef.current.length === 0) return false;
        setPolygonDraft((prev) => prev.slice(0, -1));
        return true;
      },
      hasPolygonDraftPoints: () => polygonDraftRef.current.length > 0,
    }),
    []
  );

  const getCategoryColor = (categoryId: string): string => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category?.color ?? "#ef4444";
  };

  const rafRef = useRef<number>();
  const pendingUpdate = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!isDrawing) setPolygonDraft([]);
  }, [isDrawing]);

  const annotationsForRender = useMemo(() => {
    if (!vertexDrag) return annotations;
    return annotations.map((a) => {
      if (a.id !== vertexDrag.annotationId) return a;
      const poly = vertexDrag.currentPolygon;
      return { ...a, polygon: poly, bbox: polygonToBoundingBox(poly) };
    });
  }, [annotations, vertexDrag]);

  const getMousePosition = (e: React.MouseEvent<HTMLDivElement>): { x: number; y: number } => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    return { x: rawX - offsetX, y: rawY - offsetY };
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!canvasRef.current) return;

      const { x, y } = getMousePosition(e);
      if (x < 0 || y < 0 || x > imageWidth || y > imageHeight) return;

      // Polygon vertex drag is started from vertex handle divs (pointer-events).

      // Polygon drawing: add point or close
      if (shapeMode === "polygon" && isDrawing && selectedCategoryId && onPolygonDrawComplete) {
        const next = pixelToNormalizedPoint(x, y, imageWidth, imageHeight);
        if (polygonDraft.length >= 3) {
          const dist = normPointsPixelDistance(polygonDraft[0], next, imageWidth, imageHeight);
          if (dist < CLOSE_VERTEX_PIXELS) {
            onPolygonDrawComplete([...polygonDraft]);
            setPolygonDraft([]);
            e.preventDefault();
            return;
          }
        }
        setPolygonDraft((prev) => [...prev, next]);
        e.preventDefault();
        return;
      }

      if (isDrawing && selectedCategoryId && shapeMode === "bbox") {
        setDrawingState({ startX: x, startY: y, currentX: x, currentY: y });
        return;
      }

      const target = e.target as HTMLElement;
      const annotationElement = target.closest("[data-annotation-id]");

      if (annotationElement && shapeMode === "bbox") {
        const annotationId = annotationElement.getAttribute("data-annotation-id");
        if (!annotationId) return;

        const annotation = annotations.find((a) => a.id === annotationId);
        if (!annotation) return;

        const [nx, ny, nw, nh] = annotation.bbox;
        const pixelBbox = {
          left: nx * imageWidth,
          top: ny * imageHeight,
          width: nw * imageWidth,
          height: nh * imageHeight,
        };

        const handle = getResizeHandle({ x, y }, pixelBbox);

        if (handle && selectedAnnotationId === annotationId && onAnnotationUpdate) {
          setEditingState({
            annotationId,
            mode: "resize",
            handle,
            startX: x,
            startY: y,
            startBbox: annotation.bbox,
          });
          e.preventDefault();
          e.stopPropagation();
        } else if (selectedAnnotationId === annotationId && onAnnotationUpdate) {
          setEditingState({
            annotationId,
            mode: "move",
            startX: x,
            startY: y,
            startBbox: annotation.bbox,
          });
          e.preventDefault();
          e.stopPropagation();
        } else if (onAnnotationClick) {
          onAnnotationClick(annotationId, e.shiftKey);
        }
      } else if (annotationElement && shapeMode === "polygon" && onAnnotationClick) {
        const annotationId = annotationElement.getAttribute("data-annotation-id");
        if (annotationId) onAnnotationClick(annotationId, e.shiftKey);
      }
    },
    [
      shapeMode,
      isDrawing,
      selectedCategoryId,
      selectedAnnotationId,
      annotations,
      imageWidth,
      imageHeight,
      onAnnotationClick,
      onAnnotationUpdate,
      onPolygonDrawComplete,
    ]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!canvasRef.current) return;
      const { x, y } = getMousePosition(e);

      if (vertexDrag) {
        const np = pixelToNormalizedPoint(
          Math.max(0, Math.min(imageWidth, x)),
          Math.max(0, Math.min(imageHeight, y)),
          imageWidth,
          imageHeight
        );
        setVertexDrag((prev) => {
          if (!prev) return null;
          const nextPoly = prev.startPolygon.map((p, i) => (i === prev.index ? np : p));
          return { ...prev, currentPolygon: nextPoly };
        });
        pendingUpdate.current = null;
        return;
      }

      if (drawingState && isDrawing && shapeMode === "bbox") {
        pendingUpdate.current = { x, y };
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            const update = pendingUpdate.current;
            if (update) {
              setDrawingState((prev) => {
                if (!prev) return null;
                return { ...prev, currentX: update.x, currentY: update.y };
              });
              pendingUpdate.current = null;
            }
            rafRef.current = undefined;
          });
        }
        return;
      }

      if (editingState && onAnnotationUpdate) {
        pendingUpdate.current = { x, y };
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            const update = pendingUpdate.current;
            const editing = editingState;
            if (update && editing) {
              const { annotationId, mode, handle, startX, startY, startBbox } = editing;
              const dx = update.x - startX;
              const dy = update.y - startY;
              let newBbox: [number, number, number, number];
              if (mode === "move") {
                const [sx, sy, sw, sh] = startBbox;
                const ndx = dx / imageWidth;
                const ndy = dy / imageHeight;
                newBbox = [Math.max(0, Math.min(1, sx + ndx)), Math.max(0, Math.min(1, sy + ndy)), sw, sh];
              } else {
                const pixelBbox = denormalizeBbox(startBbox, imageWidth, imageHeight);
                let newPixelBbox = { ...pixelBbox };
                if (handle?.includes("w")) {
                  newPixelBbox.left = Math.max(0, pixelBbox.left + dx);
                  newPixelBbox.width = pixelBbox.width - dx;
                }
                if (handle?.includes("e")) newPixelBbox.width = Math.max(10, pixelBbox.width + dx);
                if (handle?.includes("n")) {
                  newPixelBbox.top = Math.max(0, pixelBbox.top + dy);
                  newPixelBbox.height = pixelBbox.height - dy;
                }
                if (handle?.includes("s")) newPixelBbox.height = Math.max(10, pixelBbox.height + dy);
                if (newPixelBbox.width < 10) {
                  newPixelBbox.width = 10;
                  if (handle?.includes("w")) newPixelBbox.left = pixelBbox.left + pixelBbox.width - 10;
                }
                if (newPixelBbox.height < 10) {
                  newPixelBbox.height = 10;
                  if (handle?.includes("n")) newPixelBbox.top = pixelBbox.top + pixelBbox.height - 10;
                }
                newPixelBbox.left = Math.max(0, Math.min(imageWidth - newPixelBbox.width, newPixelBbox.left));
                newPixelBbox.top = Math.max(0, Math.min(imageHeight - newPixelBbox.height, newPixelBbox.top));
                newPixelBbox.width = Math.min(imageWidth - newPixelBbox.left, newPixelBbox.width);
                newPixelBbox.height = Math.min(imageHeight - newPixelBbox.top, newPixelBbox.height);
                newBbox = normalizeBbox(newPixelBbox, imageWidth, imageHeight);
              }
              onAnnotationUpdate(annotationId, newBbox);
              pendingUpdate.current = null;
            }
            rafRef.current = undefined;
          });
        }
      }
    },
    [vertexDrag, drawingState, isDrawing, shapeMode, editingState, imageWidth, imageHeight, onAnnotationUpdate]
  );

  const handleMouseUp = useCallback(() => {
    if (vertexDrag && onPolygonUpdate) {
      onPolygonUpdate(vertexDrag.annotationId, vertexDrag.currentPolygon);
    }
    setVertexDrag(null);
    if (drawingState && isDrawing && selectedCategoryId && shapeMode === "bbox") {
      const { startX, startY, currentX, currentY } = drawingState;
      const bbox = calculateBbox(startX, startY, currentX, currentY);
      const MIN_SIZE = 10;
      if (!validateBbox(bbox, MIN_SIZE)) {
        setDrawingState(null);
        return;
      }
      const normalizedBbox = normalizeBbox(bbox, imageWidth, imageHeight);
      onBboxDraw?.(normalizedBbox);
      setDrawingState(null);
      return;
    }
    if (editingState) setEditingState(null);
  }, [
    vertexDrag,
    onPolygonUpdate,
    drawingState,
    isDrawing,
    selectedCategoryId,
    shapeMode,
    imageWidth,
    imageHeight,
    onBboxDraw,
    editingState,
  ]);

  const activeBox = useMemo(() => {
    if (!drawingState) return null;
    return calculateBbox(drawingState.startX, drawingState.startY, drawingState.currentX, drawingState.currentY);
  }, [drawingState]);

  const activeCategoryColor = useMemo(
    () => (selectedCategoryId ? getCategoryColor(selectedCategoryId) : "#ef4444"),
    [selectedCategoryId, categories]
  );

  const MemoizedBoundingBox = React.memo<{
    annotation: Annotation;
    imageWidth: number;
    imageHeight: number;
    categoryColor: string;
    isSelected: boolean;
    shapeMode: "bbox" | "polygon";
    onAnnotationClick?: (id: string, multiSelect?: boolean) => void;
  }>(
    ({ annotation, imageWidth, imageHeight, categoryColor, isSelected, shapeMode, onAnnotationClick }) => {
      const [bx, by, bw, bh] = annotation.bbox;
      const left = bx * imageWidth + offsetX;
      const top = by * imageHeight + offsetY;
      const boxWidth = bw * imageWidth;
      const boxHeight = bh * imageHeight;
      const handles = isSelected && shapeMode === "bbox"
        ? [
            { pos: "nw", style: { left: "-4px", top: "-4px", cursor: "nw-resize" } },
            { pos: "ne", style: { right: "-4px", top: "-4px", cursor: "ne-resize" } },
            { pos: "sw", style: { left: "-4px", bottom: "-4px", cursor: "sw-resize" } },
            { pos: "se", style: { right: "-4px", bottom: "-4px", cursor: "se-resize" } },
            { pos: "n", style: { left: "50%", top: "-4px", transform: "translateX(-50%)", cursor: "n-resize" } },
            { pos: "s", style: { left: "50%", bottom: "-4px", transform: "translateX(-50%)", cursor: "s-resize" } },
            { pos: "w", style: { left: "-4px", top: "50%", transform: "translateY(-50%)", cursor: "w-resize" } },
            { pos: "e", style: { right: "-4px", top: "50%", transform: "translateY(-50%)", cursor: "e-resize" } },
          ]
        : [];
      const thin = annotation.polygon && annotation.polygon.length >= 3;
      return (
        <div
          data-annotation-id={annotation.id}
          className={`absolute border-2 transition-all ${
            isSelected
              ? "ring-2 ring-blue-500 shadow-lg z-10 cursor-move"
              : "hover:ring-1 hover:ring-blue-300 hover:shadow-md z-0"
          } ${onAnnotationClick ? "cursor-pointer" : "pointer-events-none"}`}
          style={{
            left: `${left}px`,
            top: `${top}px`,
            width: `${boxWidth}px`,
            height: `${boxHeight}px`,
            borderColor: categoryColor,
            borderWidth: isSelected ? "3px" : thin ? "1px" : "2px",
            borderStyle: thin ? "dashed" : "solid",
            opacity: thin ? 0.85 : 1,
          }}
          onClick={(ev) => {
            if (onAnnotationClick) {
              ev.stopPropagation();
              onAnnotationClick(annotation.id, ev.shiftKey);
            }
          }}
        >
          {handles.map((h) => (
            <div
              key={h.pos}
              className="absolute w-2 h-2 bg-blue-500 border border-blue-700 rounded-sm z-20"
              style={h.style}
              data-resize-handle={h.pos}
            />
          ))}
          <div
            className="absolute -top-5 left-0 px-1 text-[10px] text-white rounded"
            style={{ backgroundColor: categoryColor }}
          >
            {annotation.categoryName}
          </div>
          {annotation.state && annotation.state !== "draft" && (
            <div
              className={`absolute -bottom-5 left-0 px-1 text-[9px] rounded ${
                annotation.state === "approved"
                  ? "bg-green-500 text-white"
                  : annotation.state === "reviewed"
                    ? "bg-blue-500 text-white"
                    : "bg-red-500 text-white"
              }`}
            >
              {annotation.state.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      );
    },
    (prev, next) =>
      prev.annotation.id === next.annotation.id &&
      prev.isSelected === next.isSelected &&
      prev.categoryColor === next.categoryColor &&
      prev.shapeMode === next.shapeMode &&
      prev.annotation.bbox.join(",") === next.annotation.bbox.join(",") &&
      JSON.stringify(prev.annotation.polygon) === JSON.stringify(next.annotation.polygon)
  );

  const renderedBoxes = useMemo(() => {
    return annotationsForRender.map((annotation) => {
      const categoryColor = getCategoryColor(annotation.categoryId);
      const isSelected =
        annotation.id === selectedAnnotationId || selectedAnnotationIds.includes(annotation.id);
      return (
        <MemoizedBoundingBox
          key={annotation.id}
          annotation={annotation}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          categoryColor={categoryColor}
          isSelected={isSelected}
          shapeMode={shapeMode}
          onAnnotationClick={onAnnotationClick}
        />
      );
    });
  }, [annotationsForRender, imageWidth, imageHeight, selectedAnnotationId, selectedAnnotationIds, categories, onAnnotationClick, shapeMode]);

  const polygonSvgPoints = (poly: PolygonPoint[]) =>
    poly.map((p) => `${p[0] * imageWidth + offsetX},${p[1] * imageHeight + offsetY}`).join(" ");

  const renderedPolygonFills = useMemo(() => {
    return annotationsForRender
      .filter((a) => a.polygon && a.polygon.length >= 3)
      .map((a) => {
        const color = getCategoryColor(a.categoryId);
        return (
          <polygon
            key={`poly-${a.id}`}
            fill={`${color}40`}
            stroke={color}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            points={polygonSvgPoints(a.polygon!)}
          />
        );
      });
  }, [annotationsForRender, imageWidth, imageHeight, offsetX, offsetY, categories]);

  const selectedVertices = useMemo(() => {
    if (shapeMode !== "polygon" || !selectedAnnotationId) return null;
    const ann = annotationsForRender.find((a) => a.id === selectedAnnotationId);
    if (!ann?.polygon || ann.polygon.length < 3) return null;
    return ann.polygon;
  }, [shapeMode, selectedAnnotationId, annotationsForRender]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const draftLinePoints = useMemo(() => {
    if (polygonDraft.length === 0) return "";
    return polygonSvgPoints(polygonDraft);
  }, [polygonDraft, imageWidth, imageHeight, offsetX, offsetY]);

  return (
    <div
      ref={canvasRef}
      className={`absolute inset-0 ${isDrawing ? "cursor-crosshair" : "cursor-default"}`}
      aria-label={`Annotation canvas with ${annotationsForRender.length} annotations`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        handleMouseUp();
        if (editingState) setEditingState(null);
      }}
    >
      <svg
        className="absolute inset-0 overflow-visible pointer-events-none"
        style={{ width: "100%", height: "100%" }}
        aria-hidden
      >
        {renderedPolygonFills}
        {polygonDraft.length > 0 && (
          <polyline
            fill="none"
            stroke={activeCategoryColor}
            strokeWidth={2}
            strokeDasharray="6 4"
            points={draftLinePoints}
          />
        )}
        {polygonDraft.length > 0 && (
          <circle
            cx={polygonDraft[0][0] * imageWidth + offsetX}
            cy={polygonDraft[0][1] * imageHeight + offsetY}
            r={CLOSE_VERTEX_PIXELS}
            fill="none"
            stroke={activeCategoryColor}
            strokeWidth={1}
            strokeDasharray="2 2"
          />
        )}
      </svg>

      {renderedBoxes}

      {selectedVertices &&
        selectedAnnotationId &&
        onPolygonUpdate &&
        selectedVertices.map((p, i) => (
          <div
            key={`v-${selectedAnnotationId}-${i}`}
            role="presentation"
            className="absolute w-3 h-3 rounded-full bg-white border-2 border-blue-600 z-30 cursor-grab active:cursor-grabbing"
            style={{
              left: `${p[0] * imageWidth + offsetX - 6}px`,
              top: `${p[1] * imageHeight + offsetY - 6}px`,
            }}
            onMouseDown={(ev) => {
              ev.stopPropagation();
              ev.preventDefault();
              const copy = selectedVertices.map((q) => [...q] as PolygonPoint);
              setVertexDrag({
                annotationId: selectedAnnotationId,
                index: i,
                startPolygon: copy,
                currentPolygon: copy.map((pt) => [...pt] as PolygonPoint),
              });
            }}
          />
        ))}

      {activeBox && shapeMode === "bbox" && (
        <div
          className="absolute border-2 border-dashed opacity-70 pointer-events-none"
          style={{
            left: `${activeBox.left + offsetX}px`,
            top: `${activeBox.top + offsetY}px`,
            width: `${activeBox.width}px`,
            height: `${activeBox.height}px`,
            borderColor: activeCategoryColor,
          }}
        />
      )}
    </div>
  );
});

BoundingBoxCanvas.displayName = "BoundingBoxCanvas";
