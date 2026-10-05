import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/pages/LoadingState";
import { EmptyState } from "@/components/pages/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { listObservations, partLabel, type ObservationSummary, type ObservationVisit } from "@/lib/api/mobileInspect";

const SEVERITY_STYLES: Record<string, string> = {
  low: "border-green-500 text-green-600",
  medium: "border-yellow-500 text-yellow-600",
  high: "border-orange-500 text-orange-600",
  critical: "border-red-500 text-red-600",
};

const formatPct = (n: number | null | undefined) =>
  typeof n === "number" && Number.isFinite(n) ? `${n.toFixed(2)}%` : "—";
const formatDate = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString() : "—");

function SeverityChip({ band }: { band: ObservationSummary["severityBand"] }) {
  if (!band) return null;
  return (
    <Badge variant="outline" className={SEVERITY_STYLES[band]}>
      {band.toUpperCase()}
    </Badge>
  );
}

function ChangeText({ delta }: { delta: number | null }) {
  if (typeof delta !== "number") return <span className="text-muted-foreground">—</span>;
  const worse = delta > 0.05;
  const better = delta < -0.05;
  return (
    <span className={cn("font-medium", worse && "text-red-600", better && "text-green-600", !worse && !better && "text-muted-foreground")}>
      {delta > 0 ? "+" : ""}
      {delta.toFixed(2)}%
    </span>
  );
}

function ReviewBadge({ review }: { review: ObservationVisit["review"] }) {
  if (!review) return null;
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs",
        review.verdict === "worse" && "border-red-500 text-red-600",
        review.verdict === "better" && "border-green-500 text-green-600"
      )}
    >
      {review.verdict === "worse" ? "Confirmed deterioration" : review.verdict === "better" ? "Reviewed: improved" : "Reviewed: no change"}
    </Badge>
  );
}

/** Baseline vs latest: the most recent baseline-labelled visit older than the latest, else the very first visit. */
function defaultBaselineFor(obs: ObservationSummary): string | undefined {
  if (obs.visits.length < 2) return undefined;
  const older = obs.visits.slice(1);
  return (older.find((v) => v.baselineKind) ?? older[older.length - 1]).inferenceId;
}

/**
 * Every spot (observation) on the vessel with its inspection history across
 * surveys — the "same spot, over time" view the client asked for.
 */
export function ObservationsRegister({
  company,
  project,
  onCompare,
}: {
  company: string;
  project: string;
  /** `baselineInferenceId` omitted = let the server pick (guided baseline, else previous visit). */
  onCompare: (currentInferenceId: string, baselineInferenceId?: string) => void;
}) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [observations, setObservations] = useState<ObservationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!company || !project) return;
    setLoading(true);
    try {
      const res = await listObservations(company, project);
      setObservations(res.observations || []);
    } catch (err) {
      toast({
        title: "Could not load observations",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [company, project, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return observations;
    return observations.filter((o) =>
      [o.observationId, o.regionName, o.componentName, o.lastInspector].some((v) => (v || "").toLowerCase().includes(q))
    );
  }, [observations, search]);

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (loading && observations.length === 0) return <LoadingState message="Loading observations..." />;
  if (observations.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="No observations yet"
        description="Each spot you inspect with the mobile app gets an ID (OBS-0001…) and shows up here with its history."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {observations.length} observation{observations.length === 1 ? "" : "s"} on this vessel. Open one to see how that spot changed over time.
        </p>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ID, area, component…" className="pl-8" />
        </div>
      </div>

      {filtered.map((obs) => {
        const key = obs.observationId || `region:${obs.regionName}`;
        const isOpen = expanded.has(key);
        return (
          <Card key={key}>
            <CardContent className="p-0">
              <button
                type="button"
                onClick={() => toggle(key)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40"
              >
                {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                <Badge variant="secondary" className="shrink-0 font-mono">
                  {obs.observationId || "—"}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{partLabel(obs)}</p>
                  <p className="text-xs text-muted-foreground">
                    {obs.visitCount} inspection{obs.visitCount === 1 ? "" : "s"} · last {formatDate(obs.lastInspectedAt)}
                    {obs.lastInspector ? ` by ${obs.lastInspector}` : ""}
                  </p>
                </div>
                <div className="hidden sm:block text-right">
                  <p className="text-xs text-muted-foreground">Since first</p>
                  <ChangeText delta={obs.changeSinceFirst} />
                </div>
                <div className="text-right w-20">
                  <p className="font-semibold">{formatPct(obs.latestMeanCorrosionPercent)}</p>
                </div>
                <SeverityChip band={obs.severityBand} />
              </button>

              {isOpen ? (
                <div className="border-t px-4 py-3 space-y-2 bg-muted/20">
                  {obs.visits.length > 1 ? (
                    <div className="flex justify-end pb-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onCompare(obs.visits[0].inferenceId, defaultBaselineFor(obs))}
                      >
                        Compare baseline vs latest
                      </Button>
                    </div>
                  ) : null}
                  {obs.visits.map((visit, i) => (
                    <div key={visit.inferenceId} className="flex flex-wrap items-start gap-x-4 gap-y-1 text-sm">
                      <span className="w-24 shrink-0 text-muted-foreground">{formatDate(visit.createdAt)}</span>
                      <span className="w-14 shrink-0 font-medium">{formatPct(visit.meanCorrosionPercent)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate">
                          {visit.surveyName}
                          {i === 0 ? <span className="ml-2 text-xs text-primary">latest</span> : null}
                          {visit.baselineKind ? (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {visit.baselineKind === "after_repair" ? "Baseline after repair" : "Baseline"}
                            </Badge>
                          ) : null}
                        </p>
                        {visit.review ? (
                          <div className="mt-0.5">
                            <ReviewBadge review={visit.review} />
                          </div>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          {visit.imageCount} photo(s){visit.inspectorName ? ` · ${visit.inspectorName}` : ""}
                        </p>
                        {visit.assessment ? (
                          <p className="text-xs">
                            Inspector: {visit.assessment.severity ? visit.assessment.severity.toUpperCase() : "—"}
                            {visit.assessment.damageTags.length
                              ? ` · ${visit.assessment.damageTags.map((t) => t.replace("_", " ")).join(", ")}`
                              : ""}
                          </p>
                        ) : null}
                        {visit.notes ? <p className="text-xs mt-0.5">“{visit.notes}”</p> : null}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {i < obs.visits.length - 1 ? (
                          <Button size="sm" variant="outline" onClick={() => onCompare(visit.inferenceId)}>
                            Compare
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/project/prediction/history/${encodeURIComponent(visit.inferenceId)}`)}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
