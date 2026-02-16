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
  augmentationMultiplier?: number;
  targetTrainTotal?: number;
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
  /** If true, include augmentation size selector (2x, 5x, custom). Default true. */
  showAugmentationSize?: boolean;
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
}) => {
  const suggestedName = getSuggestedVersionName(currentVersion);
  const [versionName, setVersionName] = useState(suggestedName);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [augmentMultiplierPreset, setAugmentMultiplierPreset] = useState<
    2 | 5 | "custom"
  >(2);
  const [customTargetTrainTotal, setCustomTargetTrainTotal] = useState(1000);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      const nextSuggested = getSuggestedVersionName(currentVersion);
      setVersionName(nextSuggested);
      setError(null);
      setTouched(false);
      setAugmentMultiplierPreset(2);
      setCustomTargetTrainTotal(1000);
    }
  }, [open, currentVersion]);

  const runValidation = (value: string) => {
    const result = validateVersionName(value, currentVersion);
    if (result.valid) {
      setError(null);
      return true;
    }
    setError(result.message ?? "Invalid version name");
    return false;
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

    const options: AugmentOptions =
      augmentMultiplierPreset === "custom"
        ? { targetTrainTotal: customTargetTrainTotal }
        : { augmentationMultiplier: augmentMultiplierPreset };

    await onConfirm(trimmed, options);
  };

  const isValid = validateVersionName(versionName.trim(), currentVersion).valid;
  const canSubmit = isValid && !isLoading;

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
              <Label>Preset multiplier</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={augmentMultiplierPreset === 2 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAugmentMultiplierPreset(2)}
                >
                  2x
                </Button>
                <Button
                  type="button"
                  variant={augmentMultiplierPreset === 5 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAugmentMultiplierPreset(5)}
                >
                  5x
                </Button>
                <Button
                  type="button"
                  variant={
                    augmentMultiplierPreset === "custom" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setAugmentMultiplierPreset("custom")}
                >
                  Custom
                </Button>
              </div>
              {augmentMultiplierPreset === "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="augment-custom-target">
                    Target train image count
                  </Label>
                  <Input
                    id="augment-custom-target"
                    type="number"
                    min={1}
                    value={customTargetTrainTotal}
                    onChange={(e) =>
                      setCustomTargetTrainTotal(
                        Math.max(1, parseInt(e.target.value, 10) || 1)
                      )
                    }
                  />
                </div>
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
