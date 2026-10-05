import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { PageHeader } from "@/components/pages/PageHeader";
import { LoadingState } from "@/components/pages/LoadingState";
import { EmptyState } from "@/components/pages/EmptyState";
import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import { VesselConditionMap, SurveyChangeBadge } from "@/components/corrosion/VesselConditionMap";
import { ComparisonDialog } from "@/components/corrosion/ComparisonDialog";
import { ObservationsRegister } from "@/components/corrosion/ObservationsRegister";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { fadeInUpVariants } from "@/utils/animations";
import { ShieldAlert, Loader2, FileDown, Plus, Clock, CheckCircle2, XCircle, History, Maximize2, Search } from "lucide-react";
import {
  listMobileInspectSurveys,
  getMobileInspectSurvey,
  downloadSurveyPdf,
  partLabel,
  type SurveySummary,
  type SurveyDetail,
  type SurveyPart,
} from "@/lib/api/mobileInspect";
import { apiRequest, apiUrl } from "@/lib/api/config";
import { cn } from "@/lib/utils";
import {
  listActionItems,
  createActionItem,
  updateActionItem,
  uploadAfterPhoto,
  actionPhotoUrl,
  ACTION_DECISIONS,
  DAMAGE_TAGS,
  type ActionItem,
  type ActionSeverity,
  type ActionDecision,
  type DamageTag,
} from "@/lib/api/actions";

const SEVERITY_STYLES: Record<string, string> = {
  low: "border-green-500 text-green-600",
  medium: "border-yellow-500 text-yellow-600",
  high: "border-orange-500 text-orange-600",
  critical: "border-red-500 text-red-600",
};

function SeverityBadge({ severity }: { severity: string | null | undefined }) {
  if (!severity) return <Badge variant="outline">Unknown</Badge>;
  return (
    <Badge variant="outline" className={SEVERITY_STYLES[severity] || ""}>
      {severity.toUpperCase()}
    </Badge>
  );
}

function StatusBadge({ status, isOverdue }: { status: string; isOverdue?: boolean }) {
  if (isOverdue) {
    return <Badge variant="destructive">Overdue</Badge>;
  }
  if (status === "completed") {
    return <Badge variant="secondary">Resolved</Badge>;
  }
  if (status === "rejected") {
    return <Badge variant="outline">Dismissed</Badge>;
  }
  // "approved"/"in_review" are legacy/internal states — both just read as "Open" now.
  return <Badge variant="outline">Open</Badge>;
}

const decisionLabel = (d: ActionDecision | null | undefined): string =>
  ACTION_DECISIONS.find((o) => o.value === d)?.label || "";

const damageTagLabel = (t: DamageTag): string => DAMAGE_TAGS.find((o) => o.value === t)?.label || t;

function DecisionBadge({ decision }: { decision: ActionDecision | null | undefined }) {
  if (!decision) return null;
  return (
    <Badge variant="outline" className="border-blue-500 text-blue-600">
      {decisionLabel(decision)}
    </Badge>
  );
}

function formatPct(n: number | null | undefined): string {
  return typeof n === "number" && Number.isFinite(n) ? `${n.toFixed(2)}%` : "—";
}

// Same palette/index as CLASS_MASK_COLORS_BGR in inference-scripts/run_inference.py (converted
// BGR -> RGB), so each class's chip swatch matches the mask color drawn on its photos.
const CLASS_MASK_COLORS = [
  "#FFFF00", // yellow
  "#FF00FF", // magenta
  "#00DC00", // lime
  "#005AFF", // blue
  "#FF8C00", // orange
  "#00FFFF", // cyan
  "#FF00B4", // violet
  "#A0FF00", // mint
];

function classMaskColor(classId: number | undefined): string {
  if (typeof classId !== "number" || !Number.isFinite(classId)) return "#9CA3AF";
  return CLASS_MASK_COLORS[((classId % CLASS_MASK_COLORS.length) + CLASS_MASK_COLORS.length) % CLASS_MASK_COLORS.length];
}

function deriveSeverityFromPercent(pct: number | null | undefined): keyof typeof SEVERITY_STYLES | null {
  if (typeof pct !== "number" || !Number.isFinite(pct) || pct < 0) return null;
  if (pct < 5) return "low";
  if (pct < 15) return "medium";
  if (pct < 30) return "high";
  return "critical";
}

const SEVERITY_PILL_STYLES: Record<string, string> = {
  low: "border-green-500 bg-green-500/10 text-green-600 hover:bg-green-500/20",
  medium: "border-yellow-500 bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20",
  high: "border-orange-500 bg-orange-500/10 text-orange-600 hover:bg-orange-500/20",
  critical: "border-red-500 bg-red-500/10 text-red-600 hover:bg-red-500/20",
};

const SEVERITY_PILL_ACTIVE_STYLES: Record<string, string> = {
  low: "border-green-500 bg-green-500 text-white hover:bg-green-600",
  medium: "border-yellow-500 bg-yellow-500 text-white hover:bg-yellow-600",
  high: "border-orange-500 bg-orange-500 text-white hover:bg-orange-600",
  critical: "border-red-500 bg-red-500 text-white hover:bg-red-600",
};

function SurveyPillRow({
  surveys,
  selectedSurveyName,
  onSelect,
  loading,
}: {
  surveys: SurveySummary[];
  selectedSurveyName: string;
  onSelect: (surveyName: string) => void;
  loading: boolean;
}) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading surveys...</p>;
  }
  if (surveys.length === 0) {
    return <p className="text-sm text-muted-foreground">No surveys yet</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {surveys.map((s) => {
        const band = deriveSeverityFromPercent(s.overallMeanCorrosionPercent);
        const isActive = s.surveyName === selectedSurveyName;
        const styles = band
          ? isActive
            ? SEVERITY_PILL_ACTIVE_STYLES[band]
            : SEVERITY_PILL_STYLES[band]
          : isActive
            ? "border-muted-foreground bg-muted-foreground text-white"
            : "border-muted-foreground/40 text-muted-foreground hover:bg-muted";
        return (
          <button
            key={s.surveyName}
            type="button"
            onClick={() => onSelect(s.surveyName)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
              styles
            )}
          >
            {s.surveyName} · {formatPct(s.overallMeanCorrosionPercent)}
          </button>
        );
      })}
    </div>
  );
}

function formatDate(d: string | null | undefined): string {
  return d ? new Date(d).toLocaleDateString() : "—";
}

type AuditEntry = {
  logId: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  userId: string | null;
  details?: Record<string, unknown>;
  timestamp: string;
};

export default function CorrosionDashboardPage() {
  const { sessionReady, user, profile, company, hasPermission, loading: profileLoading } = useProfile();
  const { toast } = useToast();
  const navigate = useNavigate();

  const companyName = company?.name || (profile as { companies?: { name?: string } })?.companies?.name || "";
  const canManage = hasPermission("manageActions");
  const canApprove = hasPermission("approveActions");

  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProjectName, setSelectedProjectName] = useState("");

  const [surveys, setSurveys] = useState<SurveySummary[]>([]);
  const [loadingSurveys, setLoadingSurveys] = useState(false);
  const [selectedSurveyName, setSelectedSurveyName] = useState("");
  const [surveyModalOpen, setSurveyModalOpen] = useState(false);
  const [surveySearch, setSurveySearch] = useState("");
  const [surveySeverityFilter, setSurveySeverityFilter] = useState<"all" | "low" | "medium" | "high" | "critical">("all");

  const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  const [loadingSurvey, setLoadingSurvey] = useState(false);

  // Full detail of the previous survey for this vessel, fetched only for its per-part
  // percentages (so each area card can show its own change vs. last time it was surveyed).
  const [previousSurveyDetail, setPreviousSurveyDetail] = useState<SurveyDetail | null>(null);

  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loadingActions, setLoadingActions] = useState(false);

  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportPhotos, setExportPhotos] = useState(true);
  const [exportComparison, setExportComparison] = useState(true);
  const [exportAudit, setExportAudit] = useState(false);
  // Which two visits the comparison dialog is showing. `baseline` is optional: without it the
  // server picks the guided-resurvey baseline, or else the spot's previous visit.
  const [compareTarget, setCompareTarget] = useState<{ current: string; baseline?: string } | null>(null);

  // filename(s) of the latest completed visit's photos, per area — the
  // survey endpoint only returns aggregate stats, so one extra fetch per
  // area's job pulls the actual image list to render a thumbnail.
  const [partImages, setPartImages] = useState<Record<string, string[]>>({});

  const [activeTab, setActiveTab] = useState("condition");

  const [raiseDialogPart, setRaiseDialogPart] = useState<SurveyPart | null>(null);
  const [raiseTitle, setRaiseTitle] = useState("");
  const [raiseDescription, setRaiseDescription] = useState("");
  const [raiseSeverity, setRaiseSeverity] = useState<ActionSeverity>("medium");
  const [raiseDecision, setRaiseDecision] = useState<ActionDecision | "">("");
  const [raiseDamageTags, setRaiseDamageTags] = useState<DamageTag[]>([]);
  const [raiseEngineeringRecommendation, setRaiseEngineeringRecommendation] = useState("");
  const [raiseDueDate, setRaiseDueDate] = useState("");
  const [raising, setRaising] = useState(false);

  // --- Edit dialog (a form — title/description/severity/due/assigned/decision/damage tags) ---
  const [editDialogAction, setEditDialogAction] = useState<ActionItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSeverity, setEditSeverity] = useState<ActionSeverity>("medium");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState("");
  const [editDecision, setEditDecision] = useState<ActionDecision | "">("");
  const [editDamageTags, setEditDamageTags] = useState<DamageTag[]>([]);
  const [editEngineeringRecommendation, setEditEngineeringRecommendation] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // --- Review dialog (read-only summary + reviewer notes + before/after evidence — no field editing) ---
  const [reviewViewAction, setReviewViewAction] = useState<ActionItem | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [savingReviewNotes, setSavingReviewNotes] = useState(false);
  const [uploadingAfterPhoto, setUploadingAfterPhoto] = useState(false);
  const [reviewRepairActionTaken, setReviewRepairActionTaken] = useState("");
  const [closingRepair, setClosingRepair] = useState(false);

  // The previous survey taken for this vessel (by createdAt, not display/updated order),
  // so we can show whether overall corrosion moved up or down since then.
  const previousSurvey = useMemo(() => {
    if (!selectedSurveyName || surveys.length === 0) return null;
    const sortedByCreated = [...surveys].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    const idx = sortedByCreated.findIndex((s) => s.surveyName === selectedSurveyName);
    return idx >= 0 && idx + 1 < sortedByCreated.length ? sortedByCreated[idx + 1] : null;
  }, [surveys, selectedSurveyName]);

  const changeFromPreviousSurvey = useMemo(() => {
    if (
      !survey ||
      !previousSurvey ||
      typeof survey.overallMeanCorrosionPercent !== "number" ||
      typeof previousSurvey.overallMeanCorrosionPercent !== "number"
    ) {
      return null;
    }
    return survey.overallMeanCorrosionPercent - previousSurvey.overallMeanCorrosionPercent;
  }, [survey, previousSurvey]);

  const filteredModalSurveys = useMemo(() => {
    return surveys.filter((s) => {
      if (surveySearch && !s.surveyName.toLowerCase().includes(surveySearch.toLowerCase())) return false;
      if (surveySeverityFilter !== "all") {
        const band = deriveSeverityFromPercent(s.overallMeanCorrosionPercent);
        if (band !== surveySeverityFilter) return false;
      }
      return true;
    });
  }, [surveys, surveySearch, surveySeverityFilter]);

  // --- Load projects ---
  const loadProjects = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoadingProjects(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("company_id", profile.company_id)
        .eq("project_type", "corrosion")
        .order("name", { ascending: true });
      if (error) throw error;
      const list = (data || []).map((p) => ({ id: String(p.id), name: String(p.name) }));
      setProjects(list);
      // Most companies only have one vessel — default to it instead of
      // making the user open a dropdown to pick the only option.
      if (list.length > 0) {
        setSelectedProjectName((prev) => (prev && list.some((p) => p.name === prev) ? prev : list[0].name));
      }
    } catch (err) {
      toast({
        title: "Could not load projects (vessels)",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingProjects(false);
    }
  }, [profile?.company_id, toast]);

  useEffect(() => {
    if (!sessionReady || profileLoading) return;
    if (user && profile?.company_id) loadProjects();
  }, [sessionReady, user, profile?.company_id, profileLoading, loadProjects]);

  // --- Load surveys for the selected project ---
  const loadSurveys = useCallback(async () => {
    if (!companyName || !selectedProjectName) {
      setSurveys([]);
      setSelectedSurveyName("");
      return;
    }
    setLoadingSurveys(true);
    try {
      const res = await listMobileInspectSurveys(companyName, selectedProjectName);
      setSurveys(res.surveys || []);
      if (res.surveys?.length && !res.surveys.some((s) => s.surveyName === selectedSurveyName)) {
        setSelectedSurveyName(res.surveys[0].surveyName);
      }
    } catch (err) {
      toast({
        title: "Could not load surveys",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingSurveys(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyName, selectedProjectName]);

  useEffect(() => {
    loadSurveys();
  }, [loadSurveys]);

  // --- Load survey detail (condition by area) ---
  const loadSurvey = useCallback(async () => {
    if (!companyName || !selectedProjectName || !selectedSurveyName) {
      setSurvey(null);
      return;
    }
    setLoadingSurvey(true);
    try {
      const res = await getMobileInspectSurvey(companyName, selectedProjectName, selectedSurveyName);
      setSurvey(res.survey);
    } catch (err) {
      toast({
        title: "Could not load survey",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingSurvey(false);
    }
  }, [companyName, selectedProjectName, selectedSurveyName, toast]);

  useEffect(() => {
    loadSurvey();
  }, [loadSurvey]);

  // Fetch the previous survey's own detail (for per-part comparison badges). Separate from
  // `survey` so switching surveys doesn't need to refetch the whole list.
  useEffect(() => {
    if (!companyName || !selectedProjectName || !previousSurvey) {
      setPreviousSurveyDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await getMobileInspectSurvey(companyName, selectedProjectName, previousSurvey.surveyName);
        if (!cancelled) setPreviousSurveyDetail(res.survey);
      } catch {
        if (!cancelled) setPreviousSurveyDetail(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyName, selectedProjectName, previousSurvey]);

  const previousPartPercentByRegion = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of previousSurveyDetail?.parts || []) {
      if (typeof p.meanCorrosionPercent === "number") map.set(p.observationId || p.regionName, p.meanCorrosionPercent);
    }
    return map;
  }, [previousSurveyDetail]);

  // Fetch one photo's filename per area, for the condition-by-area thumbnails.
  useEffect(() => {
    if (!survey) {
      setPartImages({});
      return;
    }
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        survey.parts
          .filter((p) => p.latestCompleted)
          .map(async (p) => {
            try {
              const res = await apiRequest<{ results?: { images?: { filename: string }[] } }>(
                `/inference/${p.latestCompleted!.inferenceId}/results`
              );
              const filenames = (res.results?.images || []).map((i) => i.filename).slice(0, 1);
              return [p.partKey, filenames] as const;
            } catch {
              return [p.partKey, []] as const;
            }
          })
      );
      if (!cancelled) setPartImages(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [survey]);

  // --- Load action items for the project ---
  const loadActions = useCallback(async () => {
    if (!companyName || !selectedProjectName) {
      setActions([]);
      return;
    }
    setLoadingActions(true);
    try {
      const res = await listActionItems({ company: companyName, project: selectedProjectName, limit: 200 });
      setActions(res.actions || []);
    } catch (err) {
      toast({
        title: "Could not load actions",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingActions(false);
    }
  }, [companyName, selectedProjectName, toast]);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  // --- Load audit history for the project ---
  const loadAudit = useCallback(async () => {
    if (!companyName || !selectedProjectName) {
      setAuditEntries([]);
      return;
    }
    setLoadingAudit(true);
    try {
      const qs = new URLSearchParams({
        company: companyName,
        project: selectedProjectName,
        resourceType: "action_item",
        limit: "50",
      });
      const res = await apiRequest<{ logs?: AuditEntry[] }>(`/audit/log?${qs.toString()}`);
      setAuditEntries(res.logs || []);
    } catch (err) {
      toast({
        title: "Could not load audit history",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingAudit(false);
    }
  }, [companyName, selectedProjectName, toast]);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  // Two states only: open (raised, not yet fixed) or resolved (fixed and
  // closed). Dismissed ones drop out of the active lists entirely.
  const openActions = useMemo(() => actions.filter((a) => a.status !== "rejected" && a.status !== "completed"), [actions]);
  const overdueActions = useMemo(() => openActions.filter((a) => a.isOverdue), [openActions]);
  const awaitingResurveyActions = useMemo(
    () => actions.filter((a) => a.status === "completed" && a.needsResurvey),
    [actions]
  );
  // The one action to show on a part's card — whichever is most relevant:
  // an open issue takes priority (needs attention), otherwise the most
  // recently resolved one (so a confirmed resolution still shows). `actions`
  // is already newest-first from the API, so the first match per region wins.
  const latestActionByRegion = useMemo(() => {
    const map = new Map<string, ActionItem>();
    for (const a of actions) {
      const spotKey = a.observationId || a.regionName;
      if (!spotKey || a.status === "rejected") continue;
      const existing = map.get(spotKey);
      if (!existing) {
        map.set(spotKey, a);
      } else if (existing.status === "completed" && a.status !== "completed") {
        // An open issue found later in the (newest-first) list still wins
        // over an already-resolved one seen earlier.
        map.set(spotKey, a);
      }
    }
    return map;
  }, [actions]);

  const openRaiseDialog = (part: SurveyPart) => {
    setRaiseDialogPart(part);
    setRaiseTitle(`Follow-up: ${partLabel(part)}`);
    setRaiseDescription("");
    // Start from what the inspector confirmed on site, falling back to the AI's band.
    setRaiseSeverity(part.assessment?.severity || part.severityBand || "medium");
    setRaiseDecision("");
    setRaiseDamageTags(part.assessment?.damageTags ?? []);
    setRaiseEngineeringRecommendation("");
    setRaiseDueDate("");
  };

  const toggleTag = (tags: DamageTag[], tag: DamageTag): DamageTag[] =>
    tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];

  const submitRaiseAction = async () => {
    if (!raiseDialogPart || !companyName || !selectedProjectName) return;
    if (!raiseTitle.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    setRaising(true);
    try {
      await createActionItem({
        company: companyName,
        project: selectedProjectName,
        surveyName: selectedSurveyName,
        regionName: raiseDialogPart.regionName,
        observationId: raiseDialogPart.observationId,
        componentName: raiseDialogPart.componentName,
        inferenceId: raiseDialogPart.latestCompleted?.inferenceId || null,
        title: raiseTitle.trim(),
        description: raiseDescription.trim(),
        severity: raiseSeverity,
        decision: raiseDecision || null,
        damageTags: raiseDamageTags,
        engineeringRecommendation: raiseEngineeringRecommendation.trim(),
        dueDate: raiseDueDate || null,
        findingSnapshot: {
          meanCorrosionPercent: raiseDialogPart.meanCorrosionPercent,
          byClass: raiseDialogPart.byClass,
        },
      });
      toast({ title: "Action raised", description: `"${raiseTitle.trim()}" added for ${partLabel(raiseDialogPart)}.` });
      setRaiseDialogPart(null);
      loadActions();
      loadAudit();
    } catch (err) {
      toast({
        title: "Could not raise action",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setRaising(false);
    }
  };

  const dismissAction = async (action: ActionItem) => {
    try {
      await updateActionItem(action.actionId, { status: "rejected" });
      toast({ title: "Issue dismissed" });
      loadActions();
      loadAudit();
    } catch (err) {
      toast({
        title: "Could not dismiss issue",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (action: ActionItem) => {
    setEditDialogAction(action);
    setEditTitle(action.title);
    setEditDescription(action.description || "");
    setEditSeverity(action.severity);
    setEditDueDate(action.dueDate ? action.dueDate.slice(0, 10) : "");
    setEditAssignedTo(action.assignedTo || "");
    setEditDecision(action.decision || "");
    setEditDamageTags(action.damageTags || []);
    setEditEngineeringRecommendation(action.engineeringRecommendation || "");
  };

  const saveEdit = async () => {
    if (!editDialogAction) return;
    if (!editTitle.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    setSavingEdit(true);
    try {
      await updateActionItem(editDialogAction.actionId, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        severity: editSeverity,
        dueDate: editDueDate || null,
        assignedTo: editAssignedTo.trim() || null,
        decision: editDecision || null,
        damageTags: editDamageTags,
        engineeringRecommendation: editEngineeringRecommendation.trim(),
      });
      toast({ title: "Action updated" });
      setEditDialogAction(null);
      loadActions();
      loadAudit();
    } catch (err) {
      toast({
        title: "Could not save changes",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const openReviewDialog = (action: ActionItem) => {
    setReviewViewAction(action);
    setReviewNotes(action.reviewerNotes || "");
    setReviewRepairActionTaken(action.repairActionTaken || "");
  };

  const saveReviewNotes = async () => {
    if (!reviewViewAction) return;
    setSavingReviewNotes(true);
    try {
      const updated = await updateActionItem(reviewViewAction.actionId, { reviewerNotes: reviewNotes });
      setReviewViewAction(updated.action);
      toast({ title: "Notes saved" });
      loadActions();
      loadAudit();
    } catch (err) {
      toast({
        title: "Could not save notes",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSavingReviewNotes(false);
    }
  };

  // Records what was done to fix the issue and closes it out in one step.
  // The dashboard can't force a resurvey to happen; it just flags
  // `needsResurvey` (server-computed) until a completed survey visit for
  // this area happens after this moment, whether via the mobile app's
  // resurvey flow or a fresh visit.
  const closeWithRepair = async () => {
    if (!reviewViewAction) return;
    if (!reviewRepairActionTaken.trim()) {
      toast({ title: "Describe what was done first", variant: "destructive" });
      return;
    }
    setClosingRepair(true);
    try {
      const updated = await updateActionItem(reviewViewAction.actionId, {
        repairActionTaken: reviewRepairActionTaken.trim(),
        reviewerNotes: reviewNotes,
        status: "completed",
      });
      setReviewViewAction(updated.action);
      toast({ title: "Issue resolved", description: "Resurvey this area to confirm the fix." });
      loadActions();
      loadAudit();
    } catch (err) {
      toast({
        title: "Could not resolve this issue",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setClosingRepair(false);
    }
  };

  const handleAfterPhotoSelected = async (file: File | undefined) => {
    if (!file || !reviewViewAction) return;
    setUploadingAfterPhoto(true);
    try {
      const updated = await uploadAfterPhoto(reviewViewAction.actionId, file);
      setReviewViewAction(updated.action);
      loadActions();
    } catch (err) {
      toast({
        title: "Could not upload photo",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingAfterPhoto(false);
    }
  };

  const [highlightedArea, setHighlightedArea] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    };
  }, []);

  const handleSelectArea = (regionName: string) => {
    setActiveTab("condition");
    requestAnimationFrame(() => {
      document
        .getElementById(`area-${regionName}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    // Re-triggering the CSS animation needs the class to actually toggle off
    // and back on, so clear any still-running highlight first.
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    setHighlightedArea(null);
    requestAnimationFrame(() => {
      setHighlightedArea(regionName);
      highlightTimeoutRef.current = setTimeout(() => setHighlightedArea(null), 4200);
    });
  };

  const exportPdf = async () => {
    if (!companyName || !selectedProjectName || !selectedSurveyName) return;
    setExportingPdf(true);
    try {
      await downloadSurveyPdf(companyName, selectedProjectName, selectedSurveyName, {
        photos: exportPhotos,
        comparison: exportComparison,
        audit: exportAudit,
      });
      setExportDialogOpen(false);
      toast({ title: "Report downloaded", description: `${selectedSurveyName} — condition report saved as PDF.` });
    } catch (err) {
      toast({
        title: "Could not export PDF",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setExportingPdf(false);
    }
  };

  if (!sessionReady || profileLoading) {
    return <LoadingState message="Loading corrosion dashboard..." />;
  }
  if (sessionReady && !user) return null;

  if (!profile?.company_id) {
    return (
      <div>
        <PageHeader title="Corrosion Dashboard" />
        <EmptyState
          icon={ShieldAlert}
          title="No workspace"
          description="You need to be part of a workspace to view the corrosion dashboard."
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Corrosion Dashboard</h1>
        </div>
        {selectedSurveyName ? (
          <Button onClick={() => setExportDialogOpen(true)}>
            <FileDown className="mr-2 h-4 w-4" />
            Export report
          </Button>
        ) : null}
      </div>

      <motion.div className="space-y-6" variants={fadeInUpVariants} initial="hidden" animate="visible">
        <Card>
          <CardHeader>
            <CardTitle>Vessel & survey</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Vessel (project)</Label>
              <Select
                value={selectedProjectName}
                onValueChange={setSelectedProjectName}
                disabled={loadingProjects || projects.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingProjects ? "Loading..." : "Select a vessel"} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Survey</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setSurveyModalOpen(true)}
                  title="View all surveys"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="max-h-24 overflow-y-auto pr-1">
                <SurveyPillRow
                  surveys={surveys}
                  selectedSurveyName={selectedSurveyName}
                  onSelect={setSelectedSurveyName}
                  loading={loadingSurveys}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={surveyModalOpen} onOpenChange={setSurveyModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>All surveys</DialogTitle>
              <DialogDescription>Search or filter by condition, then pick a survey.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search surveys by name..."
                  value={surveySearch}
                  onChange={(e) => setSurveySearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(["all", "low", "medium", "high", "critical"] as const).map((band) => (
                  <button
                    key={band}
                    type="button"
                    onClick={() => setSurveySeverityFilter(band)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
                      surveySeverityFilter === band
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {band}
                  </button>
                ))}
              </div>
              <div className="max-h-[400px] overflow-y-auto rounded-md border p-3">
                {filteredModalSurveys.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No surveys match your filters.</p>
                ) : (
                  <SurveyPillRow
                    surveys={filteredModalSurveys}
                    selectedSurveyName={selectedSurveyName}
                    onSelect={(name) => {
                      setSelectedSurveyName(name);
                      setSurveyModalOpen(false);
                    }}
                    loading={false}
                  />
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {!selectedProjectName ? (
          <EmptyState icon={ShieldAlert} title="Select a vessel" description="Choose a vessel above to see its condition." />
        ) : (
          <>
          {survey && survey.parts.length > 0 ? (
            <VesselConditionMap
              parts={survey.parts}
              onSelectArea={handleSelectArea}
              vesselName={selectedProjectName}
              surveyName={survey.surveyName}
              createdAt={survey.createdAt}
              updatedAt={survey.updatedAt}
              partCount={survey.partCount}
              changeFromPreviousSurvey={changeFromPreviousSurvey}
              previousSurveyName={previousSurvey?.surveyName}
            />
          ) : null}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="condition">Condition by area</TabsTrigger>
              <TabsTrigger value="actions">
                Open actions & overdue reviews
                {overdueActions.length > 0 ? (
                  <Badge variant="destructive" className="ml-2">{overdueActions.length}</Badge>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="observations">Observations</TabsTrigger>
              <TabsTrigger value="audit">Audit history</TabsTrigger>
            </TabsList>

            {/* --- Condition by area --- */}
            <TabsContent value="condition" className="space-y-4 pt-4">
              {loadingSurvey ? (
                <LoadingState message="Loading condition..." />
              ) : !survey || survey.parts.length === 0 ? (
                <EmptyState icon={ShieldAlert} title="No inspected areas yet" description="Survey a part with the mobile app first." />
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Overall mean corrosion: <span className="font-medium text-foreground">{formatPct(survey.overallMeanCorrosionPercent)}</span>
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    {survey.parts.map((part) => (
                      <Card
                        key={part.partKey}
                        id={`area-${part.partKey}`}
                        className={cn(
                          highlightedArea === part.partKey && "animate-highlight-pulse",
                          part.latestCompleted && "cursor-pointer transition-colors hover:border-primary/50"
                        )}
                        role={part.latestCompleted ? "button" : undefined}
                        tabIndex={part.latestCompleted ? 0 : undefined}
                        onClick={() => {
                          if (part.latestCompleted) {
                            navigate(`/project/prediction/history/${encodeURIComponent(part.latestCompleted.inferenceId)}`);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (part.latestCompleted && (e.key === "Enter" || e.key === " ")) {
                            e.preventDefault();
                            navigate(`/project/prediction/history/${encodeURIComponent(part.latestCompleted.inferenceId)}`);
                          }
                        }}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="min-w-0">
                              <CardTitle className="text-base">{partLabel(part)}</CardTitle>
                              {part.observationId ? (
                                <span className="font-mono text-xs text-muted-foreground">{part.observationId}</span>
                              ) : null}
                            </div>
                            <SeverityBadge severity={part.severityBand} />
                          </div>
                          <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span>{formatPct(part.meanCorrosionPercent)}</span>
                            {(() => {
                              const previousPct = previousPartPercentByRegion.get(part.observationId || part.regionName);
                              if (typeof previousPct !== "number" || typeof part.meanCorrosionPercent !== "number") {
                                return null;
                              }
                              return (
                                <SurveyChangeBadge
                                  delta={part.meanCorrosionPercent - previousPct}
                                  previousSurveyName={previousSurvey?.surveyName}
                                />
                              );
                            })()}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {part.latestCompleted && partImages[part.partKey]?.[0] ? (
                            <AuthenticatedImage
                              src={apiUrl(
                                `/inference/${part.latestCompleted.inferenceId}/image/${encodeURIComponent(
                                  partImages[part.partKey][0]
                                )}`
                              )}
                              alt={partLabel(part)}
                              className="w-full h-40 object-cover rounded-md"
                            />
                          ) : null}
                          <p className="text-xs text-muted-foreground">
                            {part.imageCount} photo(s)
                            {part.inspectorName ? ` · inspected by ${part.inspectorName}` : ""}
                          </p>
                          {part.assessment ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">Inspector assessment:</span>
                              {part.assessment.severity ? <SeverityBadge severity={part.assessment.severity} /> : null}
                              {part.assessment.damageTags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {damageTagLabel(tag)}
                                </Badge>
                              ))}
                              {part.assessment.severity && part.severityBand && part.assessment.severity !== part.severityBand ? (
                                <span className="text-xs text-amber-600 dark:text-amber-400">
                                  differs from AI ({part.severityBand})
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">Not yet confirmed by an inspector.</p>
                          )}
                          {part.latestCompleted?.review ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">Reviewer:</span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  part.latestCompleted.review.verdict === "worse" && "border-red-500 text-red-600",
                                  part.latestCompleted.review.verdict === "better" && "border-green-500 text-green-600"
                                )}
                              >
                                {part.latestCompleted.review.verdict === "worse"
                                  ? "Confirmed deterioration"
                                  : part.latestCompleted.review.verdict === "better"
                                    ? "Improved"
                                    : "No change"}
                              </Badge>
                            </div>
                          ) : null}
                          {part.notes ? (
                            <p className="text-xs rounded-md bg-muted px-2 py-1.5">Inspector note: {part.notes}</p>
                          ) : null}

                          {part.byClass && part.byClass.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {part.byClass.map((c) => (
                                <span
                                  key={c.class}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                                >
                                  <span
                                    className="h-2 w-2 shrink-0 rounded-full"
                                    style={{ backgroundColor: classMaskColor(c.classId) }}
                                  />
                                  {c.class} · {formatPct(c.meanPercent ?? c.percent)} ({c.count})
                                </span>
                              ))}
                            </div>
                          )}

                          {(() => {
                            const action = latestActionByRegion.get(part.observationId || part.regionName);
                            if (!action) {
                              return <div className="text-xs text-muted-foreground">No issues raised for this area.</div>;
                            }
                            const resolved = action.status === "completed";
                            const style = resolved
                              ? action.needsResurvey
                                ? "border-amber-500/40 bg-amber-500/10"
                                : "border-green-500/40 bg-green-500/10"
                              : "border-orange-500/40 bg-orange-500/10";
                            const Icon = resolved ? CheckCircle2 : ShieldAlert;
                            const iconColor = resolved
                              ? action.needsResurvey
                                ? "text-amber-600"
                                : "text-green-600"
                              : "text-orange-600";
                            const label = resolved
                              ? action.needsResurvey
                                ? "Resolved — confirm with a resurvey"
                                : "Resolved & confirmed"
                              : "Open issue";
                            const labelColor = resolved
                              ? action.needsResurvey
                                ? "text-amber-700 dark:text-amber-400"
                                : "text-green-700 dark:text-green-400"
                              : "text-orange-700 dark:text-orange-400";
                            return (
                              <div className={cn("flex items-start gap-2 rounded-md border px-3 py-2", style)}>
                                <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", iconColor)} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={cn("text-sm font-medium", labelColor)}>{label}</span>
                                    <DecisionBadge decision={action.decision} />
                                  </div>
                                  <p className="text-sm text-muted-foreground">{action.title}</p>
                                </div>
                                {(canManage || canApprove) && !resolved ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="shrink-0 h-7"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openReviewDialog(action);
                                    }}
                                  >
                                    {canApprove ? "Resolve" : "Details"}
                                  </Button>
                                ) : null}
                              </div>
                            );
                          })()}

                          <div className="flex gap-2">
                            {part.latestCompleted?.baselineInferenceId || part.latestCompleted?.previousInferenceId ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCompareTarget({ current: part.latestCompleted!.inferenceId });
                                }}
                              >
                                Compare
                              </Button>
                            ) : null}
                            {canManage && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openRaiseDialog(part);
                                }}
                              >
                                <Plus className="mr-2 h-3.5 w-3.5" />
                                Raise action
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            {/* --- Open actions & overdue reviews --- */}
            <TabsContent value="actions" className="space-y-4 pt-4">
              {awaitingResurveyActions.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    Resolved — waiting on a confirming resurvey ({awaitingResurveyActions.length})
                  </p>
                  {awaitingResurveyActions.map((action) => (
                    <Card key={action.actionId} className="border-amber-500/40 bg-amber-500/5">
                      <CardContent className="flex items-center justify-between gap-4 py-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{action.title}</span>
                            <DecisionBadge decision={action.decision} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {action.regionName ? partLabel({ regionName: action.regionName, componentName: action.componentName }) : "(no area)"} · resolved {formatDate(action.completedAt)}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => openReviewDialog(action)}>
                          Review
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : null}
              {loadingActions ? (
                <LoadingState message="Loading actions..." />
              ) : openActions.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="No open actions" description="Nothing outstanding for this vessel." />
              ) : (
                <div className="space-y-2">
                  {openActions.map((action) => (
                    <Card key={action.actionId}>
                      <CardContent className="flex items-center justify-between gap-4 py-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{action.title}</span>
                            <SeverityBadge severity={action.severity} />
                            <DecisionBadge decision={action.decision} />
                            <StatusBadge status={action.status} isOverdue={action.isOverdue} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {action.regionName ? partLabel({ regionName: action.regionName, componentName: action.componentName }) : "(no area)"} · due {formatDate(action.dueDate)} · assigned: {action.assignedTo || "—"}
                          </p>
                          {action.description ? (
                            <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                          ) : null}
                          {action.damageTags?.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {action.damageTags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {damageTagLabel(tag)}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {canManage ? (
                            <Button size="sm" variant="outline" onClick={() => openEditDialog(action)}>
                              Edit
                            </Button>
                          ) : null}
                          {canManage || canApprove ? (
                            <Button size="sm" variant="outline" onClick={() => openReviewDialog(action)}>
                              {canApprove ? "Resolve" : "Details"}
                            </Button>
                          ) : null}
                          {canApprove ? (
                            <Button size="sm" variant="ghost" onClick={() => dismissAction(action)}>
                              <XCircle className="mr-1.5 h-3.5 w-3.5" />
                              Dismiss
                            </Button>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* --- Observations register: every spot and its history over time --- */}
            <TabsContent value="observations" className="pt-4">
              <ObservationsRegister
                company={companyName}
                project={selectedProjectName}
                onCompare={(current, baseline) => setCompareTarget({ current, baseline })}
              />
            </TabsContent>

            {/* --- Audit history --- */}
            <TabsContent value="audit" className="space-y-2 pt-4">
              {loadingAudit ? (
                <LoadingState message="Loading audit history..." />
              ) : auditEntries.length === 0 ? (
                <EmptyState icon={History} title="No audit history yet" description="Actions raised/approved for this vessel will show up here." />
              ) : (
                <div className="space-y-2">
                  {auditEntries.map((entry) => (
                    <div key={entry.logId} className="flex items-center gap-3 text-sm border-b py-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</span>
                      <span className="font-medium capitalize">{entry.action}</span>
                      <span className="text-muted-foreground">action item {entry.resourceId}</span>
                      <span className="text-muted-foreground">by {entry.userId || "unknown"}</span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
          </>
        )}
      </motion.div>

      <Dialog open={exportDialogOpen} onOpenChange={(open) => !exportingPdf && setExportDialogOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export condition report</DialogTitle>
            <DialogDescription>
              A PDF for {selectedProjectName} — {selectedSurveyName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
              <p className="font-medium">Always included</p>
              <ul className="list-disc pl-5 text-muted-foreground text-xs space-y-0.5">
                <li>Summary: overall corrosion, severity spread, key findings</li>
                <li>
                  {survey?.parts.length ?? 0} area page(s) with change since the last survey and class breakdown
                </li>
                <li>
                  Issues &amp; repair follow-up ({openActions.length} open, {awaitingResurveyActions.length} awaiting resurvey)
                </li>
                <li>Issue register and sign-off block</li>
              </ul>
            </div>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox checked={exportPhotos} onCheckedChange={(v) => setExportPhotos(v === true)} className="mt-0.5" />
                <span className="text-sm">
                  Include photos
                  <span className="block text-xs text-muted-foreground">Latest annotated photos per area, and after-repair photos.</span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox checked={exportComparison} onCheckedChange={(v) => setExportComparison(v === true)} className="mt-0.5" />
                <span className="text-sm">
                  Include before / after comparison
                  <span className="block text-xs text-muted-foreground">Side-by-side photos for areas that were resurveyed.</span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox checked={exportAudit} onCheckedChange={(v) => setExportAudit(v === true)} className="mt-0.5" />
                <span className="text-sm">
                  Append audit trail
                  <span className="block text-xs text-muted-foreground">Who raised, changed or resolved issues, and when.</span>
                </span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExportDialogOpen(false)} disabled={exportingPdf}>
              Cancel
            </Button>
            <Button onClick={exportPdf} disabled={exportingPdf}>
              {exportingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
              {exportingPdf ? "Generating..." : "Download PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!raiseDialogPart} onOpenChange={(open) => !open && setRaiseDialogPart(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise an action — {raiseDialogPart ? partLabel(raiseDialogPart) : ""}</DialogTitle>
            <DialogDescription>Creates a follow-up issue to track and resolve.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={raiseTitle} onChange={(e) => setRaiseTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={raiseDescription} onChange={(e) => setRaiseDescription(e.target.value)} rows={3} />
            </div>
            <div className="flex gap-4">
              <div className="space-y-1.5 flex-1">
                <Label>Severity</Label>
                <Select value={raiseSeverity} onValueChange={(v) => setRaiseSeverity(v as ActionSeverity)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 flex-1">
                <Label>Due date</Label>
                <Input type="date" value={raiseDueDate} onChange={(e) => setRaiseDueDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Decision</Label>
              <Select value={raiseDecision} onValueChange={(v) => setRaiseDecision(v as ActionDecision)}>
                <SelectTrigger>
                  <SelectValue placeholder="Monitor / Inspect Further / Repair / Recoat / Replace" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_DECISIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Damage type(s) confirmed on photo</Label>
              <div className="flex flex-wrap gap-4">
                {DAMAGE_TAGS.map((tag) => (
                  <label key={tag.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={raiseDamageTags.includes(tag.value)}
                      onCheckedChange={() => setRaiseDamageTags((prev) => toggleTag(prev, tag.value))}
                    />
                    {tag.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Engineering recommendation</Label>
              <Textarea
                value={raiseEngineeringRecommendation}
                onChange={(e) => setRaiseEngineeringRecommendation(e.target.value)}
                rows={2}
                placeholder="Coating type, procedure, or other technical guidance for the repair"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRaiseDialogPart(null)}>
              Cancel
            </Button>
            <Button onClick={submitRaiseAction} disabled={raising}>
              {raising ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Raise action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit — a plain form. Everything here is a ticket property, not a review verdict. */}
      <Dialog open={!!editDialogAction} onOpenChange={(open) => !open && setEditDialogAction(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit action</DialogTitle>
            <DialogDescription>Change this issue's own details. Use Resolve to record the fix and close it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={2} />
            </div>
            <div className="flex gap-4">
              <div className="space-y-1.5 flex-1">
                <Label>Severity</Label>
                <Select value={editSeverity} onValueChange={(v) => setEditSeverity(v as ActionSeverity)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 flex-1">
                <Label>Due date</Label>
                <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Assigned to</Label>
              <Input
                value={editAssignedTo}
                onChange={(e) => setEditAssignedTo(e.target.value)}
                placeholder="User ID / name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Decision</Label>
              <Select value={editDecision} onValueChange={(v) => setEditDecision(v as ActionDecision)}>
                <SelectTrigger>
                  <SelectValue placeholder="Monitor / Inspect Further / Repair / Recoat / Replace" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_DECISIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Damage type(s) confirmed on photo</Label>
              <div className="flex flex-wrap gap-4">
                {DAMAGE_TAGS.map((tag) => (
                  <label key={tag.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={editDamageTags.includes(tag.value)}
                      onCheckedChange={() => setEditDamageTags((prev) => toggleTag(prev, tag.value))}
                    />
                    {tag.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Engineering recommendation</Label>
              <Textarea
                value={editEngineeringRecommendation}
                onChange={(e) => setEditEngineeringRecommendation(e.target.value)}
                rows={2}
                placeholder="Coating type, procedure, or other technical guidance for the repair"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditDialogAction(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={savingEdit}>
              {savingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details/Resolve — summary of the issue plus notes, before/after evidence, and the resolve step. Field editing lives in Edit instead. */}
      <Dialog open={!!reviewViewAction} onOpenChange={(open) => !open && setReviewViewAction(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{reviewViewAction?.title}</DialogTitle>
            <DialogDescription>Use Edit to change the issue's own fields — this is for notes, evidence, and resolving it.</DialogDescription>
          </DialogHeader>
          {reviewViewAction ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <SeverityBadge severity={reviewViewAction.severity} />
                <DecisionBadge decision={reviewViewAction.decision} />
                <StatusBadge status={reviewViewAction.status} isOverdue={reviewViewAction.isOverdue} />
                {reviewViewAction.damageTags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {damageTagLabel(tag)}
                  </Badge>
                ))}
              </div>

              {reviewViewAction.description ? (
                <p className="text-sm text-muted-foreground">{reviewViewAction.description}</p>
              ) : null}

              {reviewViewAction.engineeringRecommendation ? (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Engineering recommendation</p>
                  <p className="text-sm">{reviewViewAction.engineeringRecommendation}</p>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3 text-sm rounded-md border p-3">
                <div>
                  <p className="text-xs text-muted-foreground">Area</p>
                  <p>{reviewViewAction.regionName ? partLabel({ regionName: reviewViewAction.regionName, componentName: reviewViewAction.componentName }) : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Due date</p>
                  <p>{formatDate(reviewViewAction.dueDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Assigned to</p>
                  <p>{reviewViewAction.assignedTo || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Resolved by</p>
                  <p>{reviewViewAction.approvedBy || "—"}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  placeholder="Any extra notes about this issue"
                />
                <div className="flex justify-end">
                  <Button size="sm" onClick={saveReviewNotes} disabled={savingReviewNotes}>
                    {savingReviewNotes ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                    Save notes
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5 rounded-md border p-3">
                <Label>{reviewViewAction.status === "completed" ? "How it was resolved" : "Resolve this issue"}</Label>
                {reviewViewAction.status === "completed" ? (
                  <>
                    <p className="text-sm whitespace-pre-wrap">
                      {reviewViewAction.repairActionTaken || "No details recorded."}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Resolved {formatDate(reviewViewAction.completedAt)}
                      {reviewViewAction.approvedBy ? ` by ${reviewViewAction.approvedBy}` : ""}
                    </p>
                    {reviewViewAction.needsResurvey ? (
                      <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                        Not confirmed yet — resurvey this area from the mobile app to confirm.
                      </p>
                    ) : (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Confirmed — a later survey visit shows this is fixed.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <Textarea
                      value={reviewRepairActionTaken}
                      onChange={(e) => setReviewRepairActionTaken(e.target.value)}
                      rows={3}
                      placeholder="What was done to fix this?"
                    />
                    {canApprove ? (
                      <div className="flex justify-end">
                        <Button size="sm" onClick={closeWithRepair} disabled={closingRepair}>
                          {closingRepair ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
                          Mark Resolved
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">You don't have permission to resolve this.</p>
                    )}
                  </>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Before / after photos</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">Before (original finding)</p>
                    {reviewViewAction.inferenceId && reviewViewAction.filename ? (
                      <AuthenticatedImage
                        src={apiUrl(
                          `/inference/${reviewViewAction.inferenceId}/image/${encodeURIComponent(reviewViewAction.filename)}`
                        )}
                        alt="Before"
                        className="w-full h-28 object-cover rounded-md border"
                      />
                    ) : (
                      <div className="w-full h-28 rounded-md border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        No photo on file
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">After (repair evidence)</p>
                    {reviewViewAction.afterPhotos.length > 0 ? (
                      <div className="grid grid-cols-2 gap-1.5">
                        {reviewViewAction.afterPhotos.map((filename) => (
                          <AuthenticatedImage
                            key={filename}
                            src={actionPhotoUrl(reviewViewAction.actionId, filename)}
                            alt="After"
                            className="w-full h-[52px] object-cover rounded-md border"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="w-full h-28 rounded-md border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        None yet
                      </div>
                    )}
                    {canManage || canApprove ? (
                      <label className="block">
                        <span className="sr-only">Add after photo</span>
                        <Input
                          type="file"
                          accept="image/jpeg,image/png"
                          disabled={uploadingAfterPhoto}
                          onChange={(e) => handleAfterPhotoSelected(e.target.files?.[0])}
                          className="text-xs"
                        />
                      </label>
                    ) : null}
                    {uploadingAfterPhoto ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" /> Uploading...
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReviewViewAction(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ComparisonDialog
        currentInferenceId={compareTarget?.current ?? null}
        baselineInferenceId={compareTarget?.baseline ?? null}
        open={!!compareTarget}
        onOpenChange={(open) => !open && setCompareTarget(null)}
        onReviewSaved={() => loadSurvey()}
      />
    </div>
  );
}
