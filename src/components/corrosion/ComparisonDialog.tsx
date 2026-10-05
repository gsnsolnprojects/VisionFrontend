import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { SurveyChangeBadge } from "./VesselConditionMap";
import { apiUrl } from "@/lib/api/config";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  getInspectionComparison,
  saveVisitReview,
  type CompareResult,
  type ObservationVisitOption,
  type VisitReview,
} from "@/lib/api/mobileInspect";

function formatPct(n: number | null | undefined): string {
  return typeof n === "number" && Number.isFinite(n) ? `${n.toFixed(2)}%` : "—";
}

function formatDate(d: string | null | undefined): string {
  return d ? new Date(d).toLocaleDateString() : "—";
}

function photoUrl(inferenceId: string, filename: string): string {
  return apiUrl(`/inference/${encodeURIComponent(inferenceId)}/image/${encodeURIComponent(filename)}`);
}

const visitLabel = (v: ObservationVisitOption): string =>
  `${formatDate(v.createdAt)} · ${v.surveyName} · ${formatPct(v.meanCorrosionPercent)}` +
  (v.baselineKind === "initial" ? " · Baseline" : v.baselineKind === "after_repair" ? " · Baseline after repair" : "");

const VERDICTS: { value: VisitReview["verdict"]; label: string; active: string }[] = [
  { value: "worse", label: "Worse", active: "bg-red-600 text-white hover:bg-red-600" },
  { value: "same", label: "No change", active: "bg-slate-600 text-white hover:bg-slate-600" },
  { value: "better", label: "Better", active: "bg-green-600 text-white hover:bg-green-600" },
];

/**
 * Side-by-side comparison of two visits of the same spot. By default a visit
 * is compared with its guided-resurvey baseline (or its previous visit), but
 * any two visits can be picked. Reviewers can record a verdict — Worse / No
 * change / Better — which is the "reviewer-confirmed deterioration" record.
 */
export function ComparisonDialog({
  currentInferenceId,
  baselineInferenceId,
  open,
  onOpenChange,
  onReviewSaved,
}: {
  currentInferenceId: string | null;
  /** Optional: start with this earlier visit as the baseline instead of the default. */
  baselineInferenceId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReviewSaved?: () => void;
}) {
  const { hasPermission } = useProfile();
  const { toast } = useToast();
  const canReview = hasPermission("approveActions");

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [baselineId, setBaselineId] = useState<string | undefined>(undefined);
  const [data, setData] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [verdict, setVerdict] = useState<VisitReview["verdict"] | null>(null);
  const [note, setNote] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrentId(currentInferenceId);
      setBaselineId(baselineInferenceId || undefined);
    } else {
      setData(null);
      setError(null);
    }
  }, [open, currentInferenceId, baselineInferenceId]);

  useEffect(() => {
    if (!open || !currentId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getInspectionComparison(currentId, baselineId)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setVerdict(res.review?.verdict ?? null);
        setNote(res.review?.note ?? "");
      })
      .catch((err) => {
        if (cancelled) return;
        setData(null);
        setError(err instanceof Error ? err.message : "Could not load comparison");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, currentId, baselineId]);

  const visits = data?.observationVisits ?? [];

  const saveReview = async (nextVerdict: VisitReview["verdict"] | null) => {
    if (!currentId || !data) return;
    setSavingReview(true);
    try {
      const res = await saveVisitReview(currentId, {
        verdict: nextVerdict,
        note: nextVerdict ? note : "",
        comparedToInferenceId: data.baseline.inferenceId,
      });
      setData({ ...data, review: res.review });
      setVerdict(res.review?.verdict ?? null);
      if (!res.review) setNote("");
      toast({ title: res.review ? "Review saved" : "Review cleared" });
      onReviewSaved?.();
    } catch (err) {
      toast({
        title: "Could not save review",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSavingReview(false);
    }
  };

  const reviewDirty = (data?.review?.verdict ?? null) !== verdict || (data?.review?.note ?? "") !== note;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compare visits</DialogTitle>
          <DialogDescription>
            The same spot on two dates, side by side. Pick any two visits to compare.
          </DialogDescription>
        </DialogHeader>

        {visits.length > 1 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Baseline (earlier)</Label>
              <Select value={data?.baseline.inferenceId} onValueChange={(v) => setBaselineId(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visits.map((v) => (
                    <SelectItem key={v.inferenceId} value={v.inferenceId}>
                      {visitLabel(v)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Compare with (later)</Label>
              <Select
                value={data?.current.inferenceId}
                onValueChange={(v) => {
                  setCurrentId(v);
                  setBaselineId(data?.baseline.inferenceId);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visits.map((v) => (
                    <SelectItem key={v.inferenceId} value={v.inferenceId}>
                      {visitLabel(v)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading comparison...
          </div>
        ) : error ? (
          <p className="text-sm text-destructive py-6">{error}</p>
        ) : data ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="text-sm">
                <p className="text-muted-foreground">
                  {data.baseline.surveyName} ({formatDate(data.baseline.createdAt)}) →{" "}
                  {data.current.surveyName} ({formatDate(data.current.createdAt)})
                </p>
                <p className="font-medium mt-0.5">
                  {formatPct(data.baseline.meanCorrosionPercent)} → {formatPct(data.current.meanCorrosionPercent)}
                </p>
              </div>
              {typeof data.overallDelta === "number" ? (
                <SurveyChangeBadge delta={data.overallDelta} previousSurveyName={data.baseline.surveyName} />
              ) : null}
            </div>

            {data.pairing === "by_order" ? (
              <p className="text-xs text-muted-foreground rounded-md bg-muted px-3 py-2">
                These visits weren't a guided resurvey, so photos are paired by the order they were taken and may not show exactly the same spot.
              </p>
            ) : null}

            {/* Reviewer verdict */}
            <div className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Reviewer verdict</p>
                {data.review ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      data.review.verdict === "worse" && "border-red-500 text-red-600",
                      data.review.verdict === "better" && "border-green-500 text-green-600"
                    )}
                  >
                    {data.review.verdict === "worse"
                      ? "Confirmed deterioration"
                      : data.review.verdict === "better"
                        ? "Reviewed: improved"
                        : "Reviewed: no change"}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">Not reviewed yet</span>
                )}
              </div>
              {data.review ? (
                <p className="text-xs text-muted-foreground">
                  {data.review.note ? `“${data.review.note}” — ` : ""}
                  {data.review.reviewedBy || "reviewer"}
                  {data.review.reviewedAt ? `, ${formatDate(data.review.reviewedAt)}` : ""}
                </p>
              ) : null}
              {canReview ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {VERDICTS.map((v) => (
                      <Button
                        key={v.value}
                        size="sm"
                        variant="outline"
                        className={cn(verdict === v.value && v.active)}
                        onClick={() => setVerdict(v.value)}
                      >
                        {v.label}
                      </Button>
                    ))}
                  </div>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="Optional note, e.g. blistering has spread along the weld"
                  />
                  <div className="flex justify-end gap-2">
                    {data.review ? (
                      <Button size="sm" variant="ghost" disabled={savingReview} onClick={() => saveReview(null)}>
                        Clear
                      </Button>
                    ) : null}
                    <Button size="sm" disabled={savingReview || !verdict || !reviewDirty} onClick={() => saveReview(verdict)}>
                      {savingReview ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                      Save verdict
                    </Button>
                  </div>
                </>
              ) : null}
            </div>

            {data.pairs.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">{data.pairing === "matched" ? "Matched photos" : "Photos side by side"}</p>
                <div className="grid gap-3">
                  {data.pairs.map((pair) => (
                    <div key={pair.baselineFilename + pair.currentFilename} className="grid grid-cols-2 gap-2 rounded-md border p-2">
                      <div className="space-y-1">
                        <AuthenticatedImage
                          src={photoUrl(data.baseline.inferenceId, pair.baselineFilename)}
                          alt="Before"
                          className="w-full h-36 object-cover rounded-md"
                        />
                        <p className="text-xs text-muted-foreground text-center">Before · {formatPct(pair.baselinePercent)}</p>
                      </div>
                      <div className="space-y-1">
                        <AuthenticatedImage
                          src={photoUrl(data.current.inferenceId, pair.currentFilename)}
                          alt="After"
                          className="w-full h-36 object-cover rounded-md"
                        />
                        <p className="text-xs text-muted-foreground text-center">
                          After · {formatPct(pair.currentPercent)}
                          {typeof pair.delta === "number" ? (
                            <span className={pair.delta > 0 ? "text-red-600" : pair.delta < 0 ? "text-green-600" : ""}>
                              {" "}({pair.delta > 0 ? "+" : ""}{pair.delta.toFixed(2)}%)
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {data.extraCurrent.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">{data.pairing === "matched" ? "New this cycle" : "Extra photos in the later visit"}</p>
                <div className="grid grid-cols-3 gap-2">
                  {data.extraCurrent.map((photo) => (
                    <div key={photo.filename} className="space-y-1 rounded-md border-2 border-orange-500/50 p-1">
                      <AuthenticatedImage
                        src={photoUrl(data.current.inferenceId, photo.filename)}
                        alt="New finding"
                        className="w-full h-28 object-cover rounded-md"
                      />
                      <p className="text-xs text-muted-foreground text-center">{formatPct(photo.percent)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {data.unmatchedBaseline.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {data.pairing === "matched" ? "Not re-photographed this cycle" : "Extra photos in the earlier visit"}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {data.unmatchedBaseline.map((photo) => (
                    <div key={photo.filename} className="space-y-1 rounded-md border p-1 opacity-60">
                      <AuthenticatedImage
                        src={photoUrl(data.baseline.inferenceId, photo.filename)}
                        alt="Not re-photographed"
                        className="w-full h-28 object-cover rounded-md"
                      />
                      <p className="text-xs text-muted-foreground text-center">{formatPct(photo.percent)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
