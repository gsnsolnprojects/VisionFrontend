import { useState, useCallback, useRef } from "react";
import type { Image, Annotation, Category } from "@/types/annotation";

interface AnnotationSessionState {
  images: Image[];
  currentImageIndex: number;
  annotations: Annotation[];
  selectedCategoryId: string | null;
  isDrawing: boolean;
  unsavedChanges: boolean;
  history: Annotation[][];
  historyIndex: number;
}

export const useAnnotation = () => {
  const [images, setImages] = useState<Image[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(-1);
  const [allAnnotations, setAllAnnotations] = useState<Annotation[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [unsavedChanges, setUnsavedChanges] = useState<boolean>(false);
  const [history, setHistory] = useState<Annotation[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Get current image
  const currentImage = currentImageIndex >= 0 && currentImageIndex < images.length
    ? images[currentImageIndex]
    : null;

  // Get annotations for current image
  const annotations = currentImage
    ? allAnnotations.filter((a) => a.imageId === currentImage.id)
    : [];

  // Undo/redo state
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Load images
  const loadImages = useCallback((newImages: Image[]) => {
    setImages(newImages);
    setAllAnnotations([]);
    setCurrentImageIndex(-1);
    setUnsavedChanges(false);
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  // Select image by index
  const selectImage = useCallback((index: number) => {
    if (index >= 0 && index < images.length) {
      setCurrentImageIndex(index);
      setUnsavedChanges(false);
    }
  }, [images.length]);

  // Save current state to history
  const saveToHistory = useCallback(() => {
    const currentAnnotations = currentImage
      ? allAnnotations.filter((a) => a.imageId === currentImage.id)
      : [];

    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push([...currentAnnotations]);
      if (newHistory.length > 50) {
        newHistory.shift();
        setHistoryIndex(49);
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex((prev) => {
      const newIndex = prev + 1;
      return newIndex >= 50 ? 49 : newIndex;
    });
  }, [currentImage, allAnnotations, historyIndex]);

  // Add annotation
  const addAnnotation = useCallback((annotation: Omit<Annotation, "id">): Annotation | undefined => {
    if (!currentImage) return undefined;

    const newAnnotation: Annotation = {
      ...annotation,
      id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    setAllAnnotations((prev) => [...prev, newAnnotation]);
    setUnsavedChanges(true);
    // Mark current image as having annotations in local metadata
    // (does not re-fetch — AnnotationWorkspace no longer depends on hasAnnotations for load)
    setImages((prev) =>
      prev.map((img) =>
        currentImage && img.id === currentImage.id
          ? { ...img, hasAnnotations: true }
          : img
      )
    );

    // ✅ History snapshot includes the new box (avoids stale empty snapshot from old saveToHistory)
    setHistory((prev) => {
      const base = prev.slice(0, historyIndex + 1);
      const last = base.length > 0 ? base[base.length - 1] : [];
      const nextSnap = [...last, newAnnotation];
      const newHistory = [...base, nextSnap];
      if (newHistory.length > 50) {
        newHistory.shift();
        setHistoryIndex(49);
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex((prev) => {
      const newIndex = prev + 1;
      return newIndex >= 50 ? 49 : newIndex;
    });
    return newAnnotation;
  }, [currentImage, historyIndex]);

  // Update annotation
  const updateAnnotation = useCallback((id: string, updates: Partial<Pick<Annotation, "bbox" | "polygon" | "categoryId" | "categoryName">>) => {
    setAllAnnotations((prev) =>
      prev.map((ann) =>
        ann.id === id ? { ...ann, ...updates } : ann
      )
    );
    setUnsavedChanges(true);
    saveToHistory();
  }, [saveToHistory]);

  // Delete annotation
  const deleteAnnotation = useCallback((id: string) => {
    setAllAnnotations((prev) => prev.filter((ann) => ann.id !== id));
    setUnsavedChanges(true);
    saveToHistory();
  }, [saveToHistory]);

  // Set selected category
  const setCategory = useCallback((categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
  }, []);

  // Set drawing mode
  const setDrawing = useCallback((drawing: boolean) => {
    setIsDrawing(drawing);
    if (!drawing) {
      setSelectedAnnotationId(null); // Clear selection when exiting draw mode
    }
  }, []);

  // Set selected annotation
  const setSelectedAnnotation = useCallback((annotationId: string | null) => {
    setSelectedAnnotationId(annotationId);
  }, []);

  // Undo. Returns the snapshot the canvas should now match (for persisting delete/restore).
  const undo = useCallback((): Annotation[] | null => {
    if (!canUndo || !currentImage) return null;

    const previousState = history[historyIndex - 1];
    if (!previousState) return null;

    setAllAnnotations((prev) => [
      ...prev.filter((a) => a.imageId !== currentImage.id),
      ...previousState,
    ]);
    setHistoryIndex((prev) => prev - 1);
    setUnsavedChanges(true);
    return previousState;
  }, [canUndo, currentImage, history, historyIndex]);

  // Redo. Returns the snapshot the canvas should now match.
  const redo = useCallback((): Annotation[] | null => {
    if (!canRedo || !currentImage) return null;

    const nextState = history[historyIndex + 1];
    if (!nextState) return null;

    setAllAnnotations((prev) => [
      ...prev.filter((a) => a.imageId !== currentImage.id),
      ...nextState,
    ]);
    setHistoryIndex((prev) => prev + 1);
    setUnsavedChanges(true);
    return nextState;
  }, [canRedo, currentImage, history, historyIndex]);

  /** After Mongo save, swap temporary `ann_*` ids for real ObjectIds in canvas + undo history. */
  const replaceAnnotationId = useCallback((oldId: string, newId: string) => {
    if (!oldId || !newId || oldId === newId) return;
    setAllAnnotations((prev) => prev.map((a) => (a.id === oldId ? { ...a, id: newId } : a)));
    setHistory((prev) =>
      prev.map((snap) => snap.map((a) => (a.id === oldId ? { ...a, id: newId } : a)))
    );
    setSelectedAnnotationId((prev) => (prev === oldId ? newId : prev));
  }, []);

  // Mark as saved
  const markSaved = useCallback(() => {
    setUnsavedChanges(false);
  }, []);

  // Load annotations for current image (used when fetching from API)
  const loadAnnotations = useCallback((newAnnotations: Annotation[]) => {
    if (!currentImage) return;

    console.log("[useAnnotation] loadAnnotations called", {
      hookCurrentImageId: currentImage?.id,
      newCount: newAnnotations.length,
      newImageIds: newAnnotations.map((a) => a.imageId),
    });

    // Remove existing annotations for this image
    setAllAnnotations((prev) =>
      prev.filter((a) => a.imageId !== currentImage.id)
    );
    // Add new annotations
    setAllAnnotations((prev) => [...prev, ...newAnnotations]);
    // Update image metadata: if backend returned annotations for this image,
    // mark it as having annotations locally so progress can reflect it.
    if (newAnnotations.length > 0) {
      setImages((prev) =>
        prev.map((img) =>
          currentImage && img.id === currentImage.id
            ? { ...img, hasAnnotations: true }
            : img
        )
      );
    }
    setUnsavedChanges(false);
    // Baseline snapshot so the first edit can be undone (e.g. after delete or new box)
    setHistory([[...newAnnotations]]);
    setHistoryIndex(0);
  }, [currentImage]);

  // Reset state
  const reset = useCallback(() => {
    setImages([]);
    setCurrentImageIndex(-1);
    setAllAnnotations([]);
    setSelectedCategoryId(null);
    setIsDrawing(false);
    setUnsavedChanges(false);
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  return {
    // State
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

    // Actions
    loadImages,
    selectImage,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    setCategory,
    setDrawing,
    setSelectedAnnotation,
    undo,
    redo,
    markSaved,
    loadAnnotations,
    saveToHistory,
    replaceAnnotationId,
    reset,
  };
};

