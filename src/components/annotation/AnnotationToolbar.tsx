import React from "react";
import { Button } from "@/components/ui/button";
import { Undo2, Redo2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AnnotationToolbarProps {
  onDraw?: () => void;
  onDelete?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isDrawing?: boolean;
  /** Detection vs segmentation annotation shape (locked after server has saved annotations). */
  annotationShapeMode?: "BBOX" | "POLYGON";
  onAnnotationShapeModeChange?: (mode: "BBOX" | "POLYGON") => void;
  shapeModeLocked?: boolean;
}

export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  onDraw,
  onDelete,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isDrawing,
  annotationShapeMode = "BBOX",
  onAnnotationShapeModeChange,
  shapeModeLocked = false,
}) => {
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-2" role="toolbar" aria-label="Annotation tools">
        <div className="flex flex-wrap gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isDrawing ? "default" : "outline"}
                size="sm"
                type="button"
                onClick={onDraw}
                aria-label={isDrawing ? "Exit drawing mode" : "Enter drawing mode"}
              >
                {isDrawing ? "Drawing..." : "Draw"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isDrawing ? "Exit drawing mode (Esc)" : "Enter drawing mode (D)"}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={onUndo}
                  disabled={!canUndo}
                  aria-label={canUndo ? "Undo last action" : "Nothing to undo"}
                  className="gap-1"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  Undo
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {canUndo
                  ? "Undo last action (Ctrl+Z). In polygon mode, removes the last point while drawing."
                  : "Nothing to undo"}
              </p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={onDelete}
                aria-label="Delete selected annotation"
              >
                Delete
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Delete selected annotation (Delete key)</p>
            </TooltipContent>
          </Tooltip>
        </div>
        {onAnnotationShapeModeChange && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Annotation type</span>
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex flex-1">
                    <Button
                      type="button"
                      variant={annotationShapeMode === "BBOX" ? "default" : "outline"}
                      size="sm"
                      className="flex-1 text-xs px-2"
                      disabled={shapeModeLocked && annotationShapeMode !== "BBOX"}
                      onClick={() => onAnnotationShapeModeChange("BBOX")}
                    >
                      Box
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {shapeModeLocked
                      ? "Mode is locked for this dataset (existing saved annotations)."
                      : "Bounding boxes for object detection (YOLO)."}
                  </p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex flex-1">
                    <Button
                      type="button"
                      variant={annotationShapeMode === "POLYGON" ? "default" : "outline"}
                      size="sm"
                      className="flex-1 text-xs px-2"
                      disabled={shapeModeLocked && annotationShapeMode !== "POLYGON"}
                      onClick={() => onAnnotationShapeModeChange("POLYGON")}
                    >
                      Polygon
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {shapeModeLocked
                      ? "Mode is locked for this dataset (existing saved annotations)."
                      : "Polygon masks for segmentation (YOLO_SEG). Click points, then click near the first point to close."}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={onRedo}
                  disabled={!canRedo}
                  aria-label={canRedo ? "Redo last action" : "Nothing to redo"}
                  className="gap-1"
                >
                  <Redo2 className="h-3.5 w-3.5" />
                  Redo
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{canRedo ? "Redo last action (Ctrl+Shift+Z)" : "Nothing to redo"}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};


