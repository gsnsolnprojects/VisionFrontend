import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  validateVersionName,
  getSuggestedVersionName,
} from "@/lib/augmentVersionValidation";

export interface AugmentOptions {
  /** Desired total image count after augmentation (train+val+test combined). */
  targetTrainTotal?: number;
  /** @deprecated Prefer targetTrainTotal — kept for API compatibility */
  augmentationMultiplier?: number;
}

interface AugmentVersionNameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentVersion: string | number | null | undefined;
  onConfirm: (
    versionName: string,
    options: AugmentOptions
  ) => void | Promise<void>;
  isLoading?: boolean;
  title?: string;
  description?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  /** If true, show the target image count field. Default true. */
  showAugmentationSize?: boolean;
  /** Optional hint for a sensible default (e.g. current image count * 2). */
  defaultTargetImageCount?: number;
  /** Suffix appended to the source version for the suggested name (e.g. "v1_aug", "v1_dup"). Default "aug". */
  suggestedNameSuffix?: string;
}

export const AugmentVersionNameModal: React.FC<AugmentVersionNameModalProps> = ({
  open,
  onOpenChange,
  currentVersion,
  onConfirm,
  isLoading = false,
  title = "Augment dataset",
  description = "Enter a name for the new augmented dataset version. The original dataset will be backed up and replaced when augmentation completes.",
  cancelLabel = "Cancel",
  confirmLabel = "Start Augmentation",
  showAugmentationSize = true,
  defaultTargetImageCount = 100,
  suggestedNameSuffix = "aug",
}) => {
  const suggestedName = getSuggestedVersionName(currentVersion, suggestedNameSuffix);
  const [versionName, setVersionName] = useState(suggestedName);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [targetImageCount, setTargetImageCount] = useState(
    Math.max(1, defaultTargetImageCount)
  );
  const [countError, setCountError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      const nextSuggested = getSuggestedVersionName(currentVersion, suggestedNameSuffix);
      setVersionName(nextSuggested);
      setError(null);
      setTouched(false);
      setTargetImageCount(Math.max(1, defaultTargetImageCount));
      setCountError(null);
    }
  }, [open, currentVersion, defaultTargetImageCount, suggestedNameSuffix]);

  const runValidation = (value: string) => {
    const result = validateVersionName(value, currentVersion);
    if (result.valid) {
      setError(null);
      return true;
    }
    setError(result.message ?? "Invalid version name");
    return false;
  };

  const validateCount = (n: number) => {
    if (!Number.isFinite(n) || n < 1) {
      setCountError("Enter at least 1 image.");
      return false;
    }
    if (n > 100000) {
      setCountError("Maximum is 100,000 images.");
      return false;
    }
    setCountError(null);
    return true;
  };

  const handleBlur = () => {
    setTouched(true);
    runValidation(versionName.trim());
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setVersionName(v);
    if (touched || error) {
      runValidation(v.trim());
    }
  };

  const handleConfirm = async () => {
    const trimmed = versionName.trim();
    if (!runValidation(trimmed)) return;
    if (showAugmentationSize && !validateCount(targetImageCount)) return;

    const options: AugmentOptions = showAugmentationSize
      ? { targetTrainTotal: targetImageCount }
      : {};

    await onConfirm(trimmed, options);
  };

  const isValid = validateVersionName(versionName.trim(), currentVersion).valid;
  const countOk = !showAugmentationSize || (targetImageCount >= 1 && !countError);
  const canSubmit = isValid && countOk && !isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="augment-version-name">
              New dataset version name
            </Label>
            <Input
              id="augment-version-name"
              type="text"
              value={versionName}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder={suggestedName}
              maxLength={51}
              className={error ? "border-destructive" : ""}
            />
            <p className="text-xs text-muted-foreground">
              Letters, numbers, underscores, hyphens only. Max 50 characters.
            </p>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
          {showAugmentationSize && (
            <div className="space-y-2">
              <Label htmlFor="augment-target-count">
                Number of images after augmentation
              </Label>
              <Input
                id="augment-target-count"
                type="number"
                min={1}
                max={100000}
                value={targetImageCount}
                onChange={(e) => {
                  const n = Math.max(1, parseInt(e.target.value, 10) || 1);
                  setTargetImageCount(n);
                  validateCount(n);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Total images you want in the new version (originals + augmented).
                Must be at least as large as your current labeled set.
              </p>
              {countError && (
                <p className="text-sm text-destructive" role="alert">
                  {countError}
                </p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="default"
            onClick={() => void handleConfirm()}
            disabled={!canSubmit}
          >
            {isLoading ? "Starting..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
