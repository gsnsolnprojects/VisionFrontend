import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ImageOff } from "lucide-react";
import type {
  DetectedClassesResponse,
  CreateCategoriesFromClassesResponse,
} from "@/lib/api/categories";
import { createCategoriesFromClasses } from "@/lib/api/categories";
import { getAuthHeaders, apiUrl } from "@/lib/api/config";

interface ClassNameDialogProps {
  datasetId: string;
  detectedClasses: DetectedClassesResponse;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Skip the yes/no prompt and go straight to the name form (Manage Datasets remap). */
  skipPrompt?: boolean;
}

export const ClassNameDialog: React.FC<ClassNameDialogProps> = ({
  datasetId,
  detectedClasses,
  open,
  onClose,
  onSuccess,
  skipPrompt = false,
}) => {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [classMappings, setClassMappings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Store thumbnail URLs (blob URLs) keyed by classId
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<number, string | null>>({});
  // Store thumbnail loading state keyed by classId
  const [thumbnailLoading, setThumbnailLoading] = useState<Record<number, boolean>>({});
  // Track which thumbnails we've already started loading to prevent duplicate requests
  const thumbnailRequestedRef = useRef<Set<number>>(new Set());
  // Track which image is currently enlarged
  const [enlargedImageClassId, setEnlargedImageClassId] = useState<number | null>(null);
  // Store full-size image URLs (blob URLs) keyed by classId for enlarged view
  const [fullSizeImageUrls, setFullSizeImageUrls] = useState<Record<number, string | null>>({});
  // Store full-size image loading state keyed by classId
  const [fullSizeImageLoading, setFullSizeImageLoading] = useState<Record<number, boolean>>({});
  // Track which full-size images we've already requested
  const fullSizeImageRequestedRef = useRef<Set<number>>(new Set());

  // Initialize form when dialog opens. Remap prefills existing names and skips the yes/no prompt.
  useEffect(() => {
    if (open && detectedClasses) {
      const initial: Record<string, string> = {};
      detectedClasses.classIds.forEach((id, index) => {
        const existing = detectedClasses.classNames[index] || "";
        initial[id.toString()] = skipPrompt ? existing : "";
      });
      setClassMappings(initial);
      setShowForm(skipPrompt);
      setErrors({});
      setThumbnailUrls({});
      setThumbnailLoading({});
      thumbnailRequestedRef.current.clear();
      setFullSizeImageUrls({});
      setFullSizeImageLoading({});
      fullSizeImageRequestedRef.current.clear();
    }
  }, [open, detectedClasses, skipPrompt]);

  // Load thumbnails when form is shown - fetch with authentication and create blob URLs
  useEffect(() => {
    if (showForm && detectedClasses?.samples) {
      detectedClasses.samples.forEach((sample) => {
        // Only process if we haven't already requested it and thumbnailUrl exists
        if (
          sample.thumbnailUrl &&
          !thumbnailRequestedRef.current.has(sample.classId)
        ) {
          thumbnailRequestedRef.current.add(sample.classId);
          setThumbnailLoading((prev) => ({ ...prev, [sample.classId]: true }));

          // Fetch thumbnail with authentication headers and convert to blob URL
          (async () => {
            try {
              const headers = await getAuthHeaders();
              // Remove Content-Type for image/blob requests - browser/backend should handle it
              const imageHeaders = { ...headers };
              delete (imageHeaders as any)["Content-Type"];
              
              // Convert relative URL to absolute if needed
              let absoluteUrl: string;
              if (sample.thumbnailUrl!.startsWith('http://') || sample.thumbnailUrl!.startsWith('https://')) {
                // Already absolute URL, use as-is
                absoluteUrl = sample.thumbnailUrl!;
              } else {
                // Relative URL - strip /api/ prefix if present (apiUrl already includes it in base)
                const path = sample.thumbnailUrl!.startsWith('/api/')
                  ? sample.thumbnailUrl!.slice(5) // Remove '/api/' prefix
                  : sample.thumbnailUrl!.startsWith('/')
                  ? sample.thumbnailUrl!.slice(1) // Remove leading '/'
                  : sample.thumbnailUrl!;
                absoluteUrl = apiUrl(path);
              }
              
              const res = await fetch(absoluteUrl, {
                method: "GET",
                headers: imageHeaders,
              });

              if (res.status === 404 || !res.ok) {
                setThumbnailUrls((prev) => ({ ...prev, [sample.classId]: null }));
                setThumbnailLoading((prev) => ({ ...prev, [sample.classId]: false }));
                return;
              }

              const blob = await res.blob();
              const blobUrl = URL.createObjectURL(blob);
              setThumbnailUrls((prev) => ({
                ...prev,
                [sample.classId]: blobUrl,
              }));
              setThumbnailLoading((prev) => ({ ...prev, [sample.classId]: false }));
            } catch (error) {
              console.warn(`Failed to fetch thumbnail for class ${sample.classId}:`, error);
              setThumbnailUrls((prev) => ({ ...prev, [sample.classId]: null }));
              setThumbnailLoading((prev) => ({ ...prev, [sample.classId]: false }));
            }
          })();
        }
      });
    }
  }, [showForm, detectedClasses]);

  // Cleanup: revoke blob URLs when component unmounts or dialog closes
  useEffect(() => {
    if (!open) {
      // Cleanup all blob URLs when dialog closes
      Object.values(thumbnailUrls).forEach((url) => {
        if (url && url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    }
    
    return () => {
      // Cleanup on unmount
      Object.values(thumbnailUrls).forEach((url) => {
        if (url && url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [open, thumbnailUrls]);

  // Fetch full-size image when user clicks to enlarge
  useEffect(() => {
    if (enlargedImageClassId !== null && detectedClasses?.samples) {
      const sample = detectedClasses.samples.find(
        (s) => s.classId === enlargedImageClassId
      );

      if (
        sample?.imageId &&
        !fullSizeImageRequestedRef.current.has(enlargedImageClassId)
      ) {
        fullSizeImageRequestedRef.current.add(enlargedImageClassId);
        setFullSizeImageLoading((prev) => ({ ...prev, [enlargedImageClassId]: true }));

        // Fetch full-size image with authentication headers and convert to blob URL
        (async () => {
          try {
            const headers = await getAuthHeaders();
            // Remove Content-Type for image/blob requests
            const imageHeaders = { ...headers };
            delete (imageHeaders as any)["Content-Type"];

            // Construct full-size image URL
            const fullSizeImagePath = `/dataset/${encodeURIComponent(datasetId)}/file/${encodeURIComponent(sample.imageId)}`;
            const absoluteUrl = apiUrl(fullSizeImagePath);

            const res = await fetch(absoluteUrl, {
              method: "GET",
              headers: imageHeaders,
            });

            if (res.status === 404 || !res.ok) {
              setFullSizeImageUrls((prev) => ({ ...prev, [enlargedImageClassId]: null }));
              setFullSizeImageLoading((prev) => ({ ...prev, [enlargedImageClassId]: false }));
              return;
            }

            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            setFullSizeImageUrls((prev) => ({
              ...prev,
              [enlargedImageClassId]: blobUrl,
            }));
            setFullSizeImageLoading((prev) => ({ ...prev, [enlargedImageClassId]: false }));
          } catch (error) {
            console.warn(`Failed to fetch full-size image for class ${enlargedImageClassId}:`, error);
            setFullSizeImageUrls((prev) => ({ ...prev, [enlargedImageClassId]: null }));
            setFullSizeImageLoading((prev) => ({ ...prev, [enlargedImageClassId]: false }));
          }
        })();
      }
    }
  }, [enlargedImageClassId, detectedClasses, datasetId]);

  // Cleanup: revoke full-size image blob URLs when component unmounts or dialog closes
  useEffect(() => {
    if (!open) {
      // Cleanup all full-size image blob URLs when dialog closes
      Object.values(fullSizeImageUrls).forEach((url) => {
        if (url && url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    }

    return () => {
      // Cleanup on unmount
      Object.values(fullSizeImageUrls).forEach((url) => {
        if (url && url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [open, fullSizeImageUrls]);

  const handleNameChange = (classId: number, value: string) => {
    const trimmedValue = value.trim();

    // Validation: max 50 characters
    if (trimmedValue.length > 50) {
      setErrors((prev) => ({
        ...prev,
        [classId.toString()]: "Maximum 50 characters allowed",
      }));
      return;
    }

    // Clear error for this field
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[classId.toString()];
      return newErrors;
    });

    setClassMappings((prev) => ({
      ...prev,
      [classId.toString()]: trimmedValue,
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrors({});

    try {
      // Build final mappings with sensible defaults:
      // - Trim user input
      // - If empty, fall back to detectedClasses.classNames[index] or `class_${id}`
      const trimmedMappings: Record<string, string> = {};
      detectedClasses.classIds.forEach((classId, index) => {
        const key = classId.toString();
        const raw = classMappings[key] ?? "";
        const trimmed = raw.trim();
        const detectedName = detectedClasses.classNames[index];
        const fallback =
          (typeof detectedName === "string" && detectedName.trim().length > 0
            ? detectedName.trim()
            : `class_${classId}`);
        trimmedMappings[key] = trimmed.length > 0 ? trimmed : fallback;
      });

      const response: CreateCategoriesFromClassesResponse =
        await createCategoriesFromClasses(datasetId, trimmedMappings);

      toast({
        title: "Success",
        description: skipPrompt
          ? "Class names updated. Training and annotations will use these names."
          : "Class names saved! Dataset ready for training.",
        variant: "default",
      });

      // Auto-close after 2 seconds
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error("Error submitting class names:", error);
      
      let errorMessage = "Failed to save class names";
      
      // Handle specific error cases
      if (error.message) {
        if (error.message.includes("Categories already exist")) {
          errorMessage = error.message;
        } else if (error.message.includes("Invalid class ID")) {
          errorMessage = error.message;
          // Extract invalid class IDs from error message if possible
          const invalidMatch = error.message.match(/Invalid class ID: (\d+)/);
          if (invalidMatch) {
            const invalidId = invalidMatch[1];
            setErrors((prev) => ({
              ...prev,
              [invalidId]: "Invalid class ID",
            }));
          }
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleYes = () => {
    setShowForm(true);
  };

  const handleNo = () => {
    onClose();
  };

  if (!open || !detectedClasses) {
    return null;
  }

  return (
    <>
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !loading && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        {!showForm ? (
          // Initial popup: Ask if user wants to add names
          <>
            <DialogHeader>
              <DialogTitle>Add Class Names</DialogTitle>
              <DialogDescription>
                Detected <strong>{detectedClasses.totalClasses}</strong> class{" "}
                {detectedClasses.totalClasses === 1 ? "ID" : "IDs"} in your dataset.
                Do you want to give them meaningful names?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleNo}
                disabled={loading}
              >
                No, keep as-is
              </Button>
              <Button onClick={handleYes} disabled={loading}>
                Yes, add names
              </Button>
            </DialogFooter>
          </>
        ) : (
          // Form: Input fields for each class ID, with optional thumbnails
          <>
            <DialogHeader>
              <DialogTitle>{skipPrompt ? "Map class names" : "Add Class Names"}</DialogTitle>
              <DialogDescription>
                {skipPrompt
                  ? "Rename each class ID. These names are used in training, annotations, and inference."
                  : "Enter meaningful names for each class. All fields are optional. Empty fields will use default names (class_0, class_1, etc.)."}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 max-h-[400px] overflow-y-auto space-y-3">
              {/* Header row */}
              <div className="grid grid-cols-[80px,80px,1fr] gap-3 px-1 text-xs font-medium text-muted-foreground">
                <span>Image</span>
                <span>Class ID</span>
                <span>Class Name</span>
              </div>

              {detectedClasses.classIds.map((classId, index) => {
                const classIdStr = classId.toString();
                const defaultValue =
                  detectedClasses.classNames[index] || `class_${classId}`;
                const error = errors[classIdStr];
                const value = classMappings[classIdStr] || "";

                const sample = detectedClasses.samples?.find(
                  (s) => s.classId === classId,
                );

                return (
                  <div
                    key={classId}
                    className="grid grid-cols-[80px,80px,1fr] gap-3 items-center px-1"
                  >
                    {/* Thumbnail cell */}
                    <div className="flex items-center justify-center relative">
                      {thumbnailLoading[classId] && sample?.thumbnailUrl ? (
                        <div className="flex h-16 w-16 items-center justify-center rounded-md border border-border bg-muted">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : thumbnailUrls[classId] ? (
                        <img
                          src={thumbnailUrls[classId]!}
                          alt={`Sample for class ${classId}`}
                          className="h-16 w-16 rounded-md object-cover border border-border bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setEnlargedImageClassId(classId)}
                          onError={(e) => {
                            // If image fails to load, show placeholder
                            setThumbnailUrls((prev) => ({ ...prev, [classId]: null }));
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-border bg-muted/40 text-muted-foreground">
                          <ImageOff className="h-5 w-5" aria-hidden="true" />
                        </div>
                      )}
                    </div>

                    {/* Class ID cell */}
                    <div className="text-sm font-medium text-foreground">
                      <Label htmlFor={`class-${classId}`} className="cursor-text">
                        Class {classId}
                      </Label>
                    </div>

                    {/* Name input cell */}
                    <div className="space-y-1">
                      <Input
                        id={`class-${classId}`}
                        value={value}
                        onChange={(e) => handleNameChange(classId, e.target.value)}
                        placeholder={`e.g., ${defaultValue}`}
                        maxLength={50}
                        disabled={loading}
                        className={error ? "border-destructive" : ""}
                      />
                      {error && (
                        <p className="text-xs text-destructive">{error}</p>
                      )}
                      {!error && value.length > 0 && (
                        <p className="text-[11px] text-muted-foreground">
                          {value.length}/50 characters
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Names"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
    
    {/* Image Enlargement Dialog */}
    <Dialog open={enlargedImageClassId !== null} onOpenChange={(open) => !open && setEnlargedImageClassId(null)}>
      <DialogContent className="max-w-7xl max-h-[95vh]">
        <DialogHeader>
          <DialogTitle>Class {enlargedImageClassId} Sample</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center bg-muted rounded-md p-2 min-h-[70vh]">
          {enlargedImageClassId !== null && (
            fullSizeImageLoading[enlargedImageClassId] ? (
              <div className="flex items-center justify-center h-[70vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : fullSizeImageUrls[enlargedImageClassId] ? (
              <img
                src={fullSizeImageUrls[enlargedImageClassId]!}
                alt={`Sample for class ${enlargedImageClassId}`}
                className="max-h-[90vh] max-w-full object-contain"
              />
            ) : thumbnailUrls[enlargedImageClassId] ? (
              // Fallback to thumbnail if full-size image failed to load
              <img
                src={thumbnailUrls[enlargedImageClassId]!}
                alt={`Sample for class ${enlargedImageClassId}`}
                className="max-h-[90vh] max-w-full object-contain"
              />
            ) : (
              <div className="flex items-center justify-center h-[70vh] text-muted-foreground">
                <ImageOff className="h-12 w-12" />
              </div>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};
