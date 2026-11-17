import React from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Offered right after a student saves their labels in Level 2: what augmentation is, why it helps,
 * how many photos they have against the most their plan allows, and a button to start it. Copies
 * are made only from labelled photos, and only once there are enough of them.
 */
export const MorePhotosDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Photos in the dataset now (the student's own, no copies) */
  photoCount: number;
  /** Of those, labelled (boxes, or saved as good) */
  labelledCount: number;
  /** Labelled photos needed before copies can be made */
  minLabelled: number;
  /** The most photos the dataset can have, and the recommended total */
  maxPhotos: number;
  starting: boolean;
  onStart: (target: number) => void;
}> = ({ open, onOpenChange, photoCount, labelledCount, minLabelled, maxPhotos, starting, onStart }) => {
  const ready = labelledCount >= minLabelled;
  const pct = Math.min(100, Math.round((photoCount / maxPhotos) * 100));
  const smaller = [100, 250].filter((n) => n > photoCount && n < maxPhotos);
  const why = [
    "The model sees more variety, so it learns the defect itself, not one exact photo.",
    "It helps most when you have only a few photos.",
    "Each copy stays in the same group as its photo, so your test stays honest.",
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !starting && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#9ab51f]" aria-hidden="true" /> Make more training photos?
          </DialogTitle>
          <DialogDescription>Your labels are saved. Now you can give your model more to learn from.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div>
            <p className="font-semibold text-foreground">What is augmentation?</p>
            <p className="mt-1 text-muted-foreground">
              Vision-M makes extra copies of your labelled photos (flipped, rotated, brighter or darker), with your boxes moved to
              match.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Why it helps</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
              {why.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2 rounded-xl border bg-secondary/30 p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">Your photos</span>
              <span className="text-lg font-bold tabular-nums text-foreground">{photoCount}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={maxPhotos} aria-valuenow={photoCount}>
              <div className="h-full rounded-full bg-[#9ab51f]" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">Recommended</span>
              <span className="text-lg font-bold tabular-nums text-foreground">
                {maxPhotos} <span className="text-xs font-normal text-muted-foreground">(the most your plan allows)</span>
              </span>
            </div>
          </div>

          {!ready && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-foreground">
              Label more photos first ({labelledCount} labelled so far). Copies are made only from labelled photos.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            It takes a few minutes. Make copies last: changing your labels afterwards removes them.
          </p>
        </div>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={starting}>
            Not now
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            {smaller.map((n) => (
              <Button key={n} variant="outline" size="sm" disabled={!ready || starting} onClick={() => onStart(n)}>
                Up to {n}
              </Button>
            ))}
            <Button disabled={!ready || starting} onClick={() => onStart(maxPhotos)} className="gap-1.5">
              {starting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Make up to {maxPhotos} photos
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
