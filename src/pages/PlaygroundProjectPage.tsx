import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Check, ChevronDown, Circle, Compass, ImagePlus, Loader2, Lock, PenLine, Plus, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoadingState } from "@/components/pages/LoadingState";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { usePlanAccess } from "@/contexts/plan-access-context";
import { supabase } from "@/integrations/supabase/client";
import { apiRequest, apiUrl, getAuthHeaders } from "@/lib/api/config";
import { addDatasetFiles, deleteDatasetFile } from "@/lib/api/datasets";
import { getLearningProgress } from "@/lib/api/dashboard";
import { cn } from "@/lib/utils";
import { PlaygroundTrainStep } from "@/components/playground/PlaygroundTrainStep";
import { PlaygroundTestStep } from "@/components/playground/PlaygroundTestStep";
import { PlaygroundReportStep } from "@/components/playground/PlaygroundReportStep";
import { PlaygroundLabelPractice } from "@/components/playground/PlaygroundLabelPractice";
import { getSamples } from "@/lib/api/samples";
import { useBreadcrumbs } from "@/components/app-shell/breadcrumb-context";
import { DeleteProjectModal } from "@/components/dashboard/DeleteProjectModal";

/**
 * Playground project screen (/dataset/:id for Playground workspaces): the Upload & label →
 * Train → Test & evaluate → Report path (?step=train / test / report open steps 2 to 4; ?step=practice opens
 * Learn to label on a GSN sample). Shows the project's dataset as an
 * image grid with each image's labelled boxes drawn on it. A GSN sample dataset is view-only;
 * the company's own dataset can take more images and each image opens the labelling tool.
 * Other plans keep DatasetManager.
 */

interface DatasetVersion {
  datasetId: string;
  version: string;
  isActive?: boolean;
  isLinkedSample?: boolean;
  /** the GSN sample dataset it links to */
  linkedFrom?: string | null;
  totalImages?: number;
  trainCount?: number;
  valCount?: number;
  testCount?: number;
  status?: string;
}

interface ImageFile {
  id: string;
  storedName: string;
  originalName: string;
  folder: string | null;
}

interface Box {
  c: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

type Filter = "all" | "training" | "test" | "unlabelled";

const PAGE_SIZE = 24;
const IMAGE_NAME = /\.(jpe?g|png)$/i;
// Same colours as the labelling tool's default categories, by class index
const BOX_COLORS = ["#ef4444", "#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

const baseOf = (name: string) => name.replace(/\.[^./]+$/, "");

const splitOf = (folder: string | null): { label: string; kind: "training" | "test" | "other" } => {
  if (folder === "train" || folder === "val") return { label: folder === "train" ? "Training" : "Validation", kind: "training" };
  if (folder === "test") return { label: "Held-out test", kind: "test" };
  return { label: "Not split yet", kind: "other" };
};

/** A thumbnail with its labelled boxes drawn on top (SVG keeps the boxes aligned at any size) */
const LabelledThumbnail: React.FC<{ datasetId: string; file: ImageFile; boxes: Box[] | undefined; classNames: string[] }> = ({
  datasetId,
  file,
  boxes,
  classNames,
}) => {
  const [src, setSrc] = useState<string | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          apiUrl(`/dataset/${encodeURIComponent(datasetId)}/file/${encodeURIComponent(file.id)}/thumbnail`),
          { headers: await getAuthHeaders() }
        );
        if (!res.ok) throw new Error(String(res.status));
        objectUrl = URL.createObjectURL(await res.blob());
        if (cancelled) return;
        const img = new Image();
        img.onload = () => !cancelled && setSize({ w: img.naturalWidth, h: img.naturalHeight });
        img.src = objectUrl;
        setSrc(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [datasetId, file.id]);

  if (failed) {
    return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No preview</div>;
  }
  if (!src || !size) return <div className="h-full w-full animate-pulse bg-muted" />;

  const stroke = Math.max(size.w, size.h) / 160;
  return (
    <svg viewBox={`0 0 ${size.w} ${size.h}`} preserveAspectRatio="xMidYMid meet" className="h-full w-full" role="img" aria-label={file.originalName}>
      <image href={src} width={size.w} height={size.h} />
      {(boxes ?? []).map((b, i) => (
        <rect
          key={i}
          x={b.x * size.w}
          y={b.y * size.h}
          width={b.w * size.w}
          height={b.h * size.h}
          fill="none"
          stroke={BOX_COLORS[b.c % BOX_COLORS.length]}
          strokeWidth={stroke}
        >
          <title>{classNames[b.c] ?? `class ${b.c}`}</title>
        </rect>
      ))}
    </svg>
  );
};

export const PlaygroundProjectPage: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const stepParam = searchParams.get("step");
  const step =
    stepParam === "train" || stepParam === "test" || stepParam === "report" || stepParam === "practice" ? stepParam : "label";
  const goToStep = (next: "label" | "train" | "test" | "report" | "practice") => {
    setSearchParams(next === "label" ? {} : { step: next });
    window.scrollTo({ top: 0 });
  };
  const { toast } = useToast();
  const { company, profile, user } = useProfile();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const planAccess = usePlanAccess();
  const limits = planAccess.data?.access?.limits;

  const [project, setProject] = useState<{ id: string; name: string; description: string | null } | null>(null);
  const [allProjects, setAllProjects] = useState<{ id: string; name: string; description: string | null }[]>([]);
  const [versions, setVersions] = useState<DatasetVersion[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [labelled, setLabelled] = useState<Set<string>>(new Set());
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [boxes, setBoxes] = useState<Record<string, Box[]>>({});
  const [classNames, setClassNames] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [hasModel, setHasModel] = useState(false);
  const [hasPrediction, setHasPrediction] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [sampleProject, setSampleProject] = useState<string | null>(null);

  const companyName = company?.name ?? "";
  const dataset = versions?.find((v) => v.datasetId === selectedId) ?? null;
  const isSample = !!dataset?.isLinkedSample;
  const ownDataset = versions?.find((v) => !v.isLinkedSample) ?? null;

  // Label practice now has its own page (/practice/:sampleId); old ?step=practice links go there
  useEffect(() => {
    if (step === "practice" && dataset?.linkedFrom) navigate(`/practice/${dataset.linkedFrom}`, { replace: true });
  }, [step, dataset?.linkedFrom, navigate]);

  // Which GSN sample this dataset links to (Test offers that sample's ready-made model)
  useEffect(() => {
    setSampleProject(null);
    if (!dataset?.linkedFrom) return;
    getSamples()
      .then(({ datasets }) => setSampleProject(datasets.find((d) => d.id === dataset.linkedFrom)?.project ?? null))
      .catch(() => undefined);
  }, [dataset?.linkedFrom]);

  // ---- Load project and its datasets ----
  const loadVersions = useCallback(async (projectName: string) => {
    if (!companyName) return;
    const q = new URLSearchParams({ company: companyName, project: projectName, includeInactive: "true" });
    const json = await apiRequest<{ datasets?: Record<string, unknown>[] } | Record<string, unknown>[]>(`/datasets?${q}`);
    const items = (Array.isArray(json) ? json : json.datasets ?? []) as Record<string, unknown>[];
    const list: DatasetVersion[] = items.map((it) => ({
      ...(it as object),
      datasetId: String(it.id ?? it.datasetId ?? it._id),
      version: String(it.version ?? ""),
    }));
    setVersions(list);
    setSelectedId((current) =>
      current && list.some((v) => v.datasetId === current)
        ? current
        : (list.find((v) => v.isActive) ?? list[0])?.datasetId ?? null
    );
  }, [companyName]);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const { data, error } = await supabase.from("projects").select("id, name, description").eq("id", projectId).maybeSingle();
      if (error || !data) {
        toast({ title: "Project not found", description: "It may have been deleted.", variant: "destructive" });
        navigate("/dashboard", { replace: true });
        return;
      }
      setProject(data);
    })();
  }, [projectId, navigate, toast]);

  useEffect(() => {
    if (project) void loadVersions(project.name).catch(() => setVersions([]));
  }, [project, loadVersions]);

  // Top trail: Dashboard > mission > step (instead of the project id from the address)
  const { setItems: setBreadcrumbs } = useBreadcrumbs();
  useEffect(() => {
    if (!project) return;
    const mission = (project.description ?? "").includes(" · ") ? (project.description ?? "").split(" · ")[1] : project.name;
    const stepLabel = { label: "Upload & label", train: "Train", test: "Test & evaluate", report: "Report", practice: "Learn to label" }[step];
    setBreadcrumbs([
      { label: "Dashboard", href: "/dashboard" },
      { label: mission, href: `/dataset/${project.id}` },
      { label: stepLabel },
    ]);
    return () => setBreadcrumbs(null);
  }, [project, step, setBreadcrumbs]);

  // The company's projects, for the switcher in the mission bar
  useEffect(() => {
    if (!profile?.company_id) return;
    supabase
      .from("projects")
      .select("id, name, description")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setAllProjects(data ?? []));
  }, [profile?.company_id]);

  useEffect(() => {
    getLearningProgress()
      .then((p) => {
        setHasModel(p.models > 0);
        setHasPrediction(p.predictions > 0);
      })
      .catch(() => undefined);
  }, []);

  // ---- Load the selected dataset's images (metadata only; thumbnails load per card) ----
  const loadFiles = useCallback(async (datasetId: string) => {
    setLoadingFiles(true);
    try {
      const json = await apiRequest<{ files: Record<string, unknown>[]; labeledBaseNames?: string[] }>(
        `/dataset/${encodeURIComponent(datasetId)}/files?type=image&limit=5000`
      );
      setFiles(
        (json.files ?? []).map((f) => ({
          id: String(f._id ?? f.id ?? f.storedName),
          storedName: String(f.storedName ?? ""),
          originalName: String(f.originalName ?? f.storedName ?? ""),
          folder: (f.folder as string) ?? null,
        }))
      );
      setLabelled(new Set(json.labeledBaseNames ?? []));
    } catch (err) {
      toast({ title: "Couldn't load images", description: (err as Error).message, variant: "destructive" });
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }, [toast]);

  useEffect(() => {
    setFilter("all");
    setPage(1);
    setBoxes({});
    if (selectedId) void loadFiles(selectedId);
  }, [selectedId, loadFiles]);

  const isLabelled = useCallback(
    (f: ImageFile) => labelled.has(baseOf(f.storedName)) || labelled.has(baseOf(f.originalName)),
    [labelled]
  );

  const counts = useMemo(() => {
    let training = 0, validation = 0, test = 0, unlabelled = 0;
    for (const f of files) {
      const kind = splitOf(f.folder).kind;
      if (kind === "training") training += 1;
      if (f.folder === "val") validation += 1;
      if (kind === "test") test += 1;
      if (!isLabelled(f)) unlabelled += 1;
    }
    return { all: files.length, training, validation, test, unlabelled, labelled: files.length - unlabelled };
  }, [files, isLabelled]);

  const visible = useMemo(() => {
    const filtered = files.filter((f) => {
      if (filter === "training") return splitOf(f.folder).kind === "training";
      if (filter === "test") return splitOf(f.folder).kind === "test";
      if (filter === "unlabelled") return !isLabelled(f);
      return true;
    });
    return { total: filtered.length, items: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) };
  }, [files, filter, page, isLabelled]);
  const totalPages = Math.max(1, Math.ceil(visible.total / PAGE_SIZE));
  const testFiles = useMemo(() => files.filter((f) => f.folder === "test"), [files]);

  // ---- Boxes for the images on this page ----
  useEffect(() => {
    if (!selectedId) return;
    const missing = visible.items.filter((f) => !(f.id in boxes)).map((f) => f.id);
    if (!missing.length) return;
    let cancelled = false;
    apiRequest<{ classes: { index: number; name: string }[]; labels: Record<string, Box[]> }>(
      `/dataset/${encodeURIComponent(selectedId)}/file-labels?ids=${missing.map(encodeURIComponent).join(",")}`
    )
      .then((json) => {
        if (cancelled) return;
        // By index: a class hidden in the Playground (e.g. "product") leaves a gap
        const names: string[] = [];
        for (const c of json.classes) names[c.index] = c.name;
        setClassNames(names);
        setBoxes((prev) => {
          const next = { ...prev };
          for (const id of missing) next[id] = json.labels[id] ?? [];
          return next;
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [selectedId, visible.items, boxes]);

  // ---- Upload (own dataset only) ----
  const maxImages = typeof limits?.imagesPerDataset === "number" ? limits.imagesPerDataset : null;
  const maxMB = typeof limits?.maxImageSizeMB === "number" ? limits.maxImageSizeMB : null;
  const imagesInOwn = ownDataset ? (ownDataset.datasetId === selectedId ? files.length : ownDataset.totalImages ?? 0) : 0;
  const spaceLeft = maxImages === null ? null : Math.max(0, maxImages - imagesInOwn);

  const uploadImages = async (picked: File[]) => {
    const images = picked.filter((f) => IMAGE_NAME.test(f.name));
    if (!images.length) {
      toast({ title: "No images", description: "Choose JPG or PNG images.", variant: "destructive" });
      return;
    }
    const tooBig = maxMB === null ? [] : images.filter((f) => f.size > maxMB * 1024 * 1024);
    if (tooBig.length) {
      toast({
        title: "Some images are too large",
        description: `Images can be up to ${maxMB} MB each. Too large: ${tooBig.slice(0, 3).map((f) => f.name).join(", ")}${tooBig.length > 3 ? ` and ${tooBig.length - 3} more` : ""}.`,
        variant: "destructive",
      });
      return;
    }
    if (spaceLeft !== null && images.length > spaceLeft) {
      toast({
        title: "Too many images",
        description: `Your dataset can hold ${maxImages} images; there is room for ${spaceLeft} more.`,
        variant: "destructive",
      });
      return;
    }
    if (!project) return;

    setUploading(true);
    try {
      if (ownDataset) {
        const folder = (ownDataset.trainCount ?? 0) > 0 ? "train" : "unlabeled";
        const result = await addDatasetFiles(ownDataset.datasetId, images, folder);
        toast({ title: "Images added", description: result.message || `Added ${result.addedImages ?? result.added} image(s).` });
        await loadVersions(project.name);
        setSelectedId(ownDataset.datasetId);
        await loadFiles(ownDataset.datasetId);
      } else {
        const form = new FormData();
        form.append("company", companyName);
        form.append("project", project.name);
        form.append("version", "my-images");
        form.append("fileMeta", JSON.stringify(images.map((f) => ({ originalName: f.name, folder: "unlabeled" }))));
        images.forEach((f) => form.append("files", f, f.name));
        const headers = { ...(await getAuthHeaders()) } as Record<string, string>;
        delete headers["Content-Type"];
        const res = await fetch(apiUrl("/dataset/upload"), { method: "POST", headers, body: form });
        const text = await res.text();
        let json: Record<string, unknown> = {};
        try {
          json = JSON.parse(text);
        } catch {
          // not JSON
        }
        if (!res.ok) throw new Error(String(json.message || json.error || `Upload failed (${res.status})`));
        toast({ title: "Images uploaded", description: `${images.length} image(s) added. Label them to teach your model.` });
        await loadVersions(project.name);
        const newId = String(json.datasetId ?? json.id ?? "");
        if (newId) setSelectedId(newId);
      }
    } catch (err) {
      toast({ title: "Upload failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const removeImage = async (file: ImageFile) => {
    if (!selectedId) return;
    try {
      await deleteDatasetFile(selectedId, file.id);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch (err) {
      toast({ title: "Couldn't remove image", description: (err as Error).message, variant: "destructive" });
    }
  };

  const openLabelling = (file: ImageFile) => {
    if (!selectedId) return;
    navigate(`/annotation/${encodeURIComponent(selectedId)}?image=${encodeURIComponent(file.storedName || file.originalName)}`);
  };

  if (!project || versions === null) return <LoadingState message="Loading your project..." />;

  const [industryName, missionName] = (project.description ?? "").includes(" · ")
    ? (project.description ?? "").split(" · ")
    : [null, project.name];
  const canUpload = !isSample && (planAccess.data?.access?.features?.trainOnOwnDatasets ?? false);
  const showDropZone = canUpload && (!!dataset || !ownDataset);

  const badges = [
    { label: "Industry explorer", done: true },
    { label: "Label investigator", done: counts.labelled > 0 },
    { label: "Model builder", done: hasModel },
    { label: "Result detective", done: hasPrediction },
  ];
  const steps = [
    { n: 1, label: "Upload & label", active: step === "label", onClick: () => goToStep("label") },
    { n: 2, label: "Train", active: step === "train", onClick: () => goToStep("train") },
    { n: 3, label: "Test & evaluate", active: step === "test", onClick: () => goToStep("test") },
    { n: 4, label: "Report", active: step === "report", onClick: () => goToStep("report"), locked: false },
  ];
  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All images", count: counts.all },
    { id: "training", label: "Training", count: counts.training },
    { id: "test", label: "Held-out test", count: counts.test },
    { id: "unlabelled", label: "Needs a label", count: counts.unlabelled },
  ];

  return (
    <motion.div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        {step === "label" ? (
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Give your model good examples.</h1>
            <p className="mt-1 text-sm text-muted-foreground">Add images, check their labels and keep test images separate.</p>
          </div>
        ) : step === "practice" ? (
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Learn to label.</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Practise on real inspection photos, with hints when you&apos;re stuck and feedback on every box.
            </p>
          </div>
        ) : (
          <div />
        )}
      </div>

      {/* Mission bar: which project this is, and a switcher to the company's other projects */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-secondary/40 px-4 py-3 md:px-5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="group flex min-w-0 items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-background/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Switch project"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#171f1b] text-[#e9ff65]">
                <Compass className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {industryName ?? "Project"}
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  <span className="truncate">{missionName}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Your projects
            </DropdownMenuLabel>
            {allProjects.map((p) => {
              const [pIndustry, pMission] = (p.description ?? "").includes(" · ") ? (p.description ?? "").split(" · ") : [null, p.name];
              return (
                <DropdownMenuItem
                  key={p.id}
                  onSelect={() => navigate(step === "label" ? `/dataset/${p.id}` : `/dataset/${p.id}?step=${step}`)}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{pMission}</span>
                    {pIndustry && <span className="block truncate text-xs text-muted-foreground">{pIndustry}</span>}
                  </span>
                  {p.id === project.id && <Check className="h-4 w-4 shrink-0 text-ring" />}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate("/dashboard")} className="gap-2">
              <Plus className="h-4 w-4" /> Start a new mission
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => setConfirmDelete(true)}
              className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" /> Delete this project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DeleteProjectModal
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          companyName={company?.name ?? ""}
          projectName={project.name ?? ""}
          note={
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>GSN's ready-made samples and models aren't affected: only your copy in this project goes.</li>
              <li>Deleting doesn't give back this month's training runs or predictions.</li>
            </ul>
          }
          onDeleted={() => {
            try {
              const key = `visionm_playground_last_project_${user?.id ?? "anon"}`;
              if (localStorage.getItem(key) === project.id) localStorage.removeItem(key);
            } catch {
              // a convenience only
            }
            toast({ title: "Project deleted", description: `"${missionName}" is gone, and its project slot is free again.` });
            void planAccess.refresh();
            navigate("/dashboard");
          }}
        />

        <div className="flex flex-wrap items-center gap-2">
          {versions.length > 1 && (
            <select
              value={selectedId ?? ""}
              onChange={(e) => setSelectedId(e.target.value)}
              className="h-9 rounded-md border bg-card px-3 text-sm"
              aria-label="Dataset"
            >
              {versions.map((v) => (
                <option key={v.datasetId} value={v.datasetId}>
                  {v.isLinkedSample ? `GSN sample · ${v.version}` : `My images · ${v.version}`}
                </option>
              ))}
            </select>
          )}
        <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
          Explore worlds
        </Button>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        {badges.map((b) => (
          <span
            key={b.label}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
              b.done ? "border-success/40 bg-success/10 text-foreground" : "text-muted-foreground"
            )}
          >
            {b.done ? <Check className="h-3 w-3 text-success" /> : <Circle className="h-3 w-3" />}
            {b.label}
          </span>
        ))}
      </div>

      {/* Steps */}
      <nav className="grid grid-cols-2 overflow-hidden rounded-xl border sm:grid-cols-4" aria-label="Project steps">
        {steps.map((s) => (
          <button
            key={s.n}
            type="button"
            disabled={!s.onClick}
            onClick={s.onClick}
            aria-current={s.active ? "step" : undefined}
            className={cn(
              "flex items-center justify-center gap-2 border-b border-r px-3 py-3 text-sm transition-colors last:border-r-0 sm:border-b-0",
              s.active ? "bg-secondary font-medium text-foreground" : "bg-card text-muted-foreground",
              s.onClick && "hover:bg-secondary/60 hover:text-foreground",
              !s.onClick && !s.active && "cursor-not-allowed opacity-60"
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                s.active ? "bg-foreground text-background" : "border"
              )}
            >
              {s.n}
            </span>
            {s.label}
            {s.locked && <Lock className="h-3 w-3" aria-label="Coming soon" />}
          </button>
        ))}
      </nav>

      {step === "train" && (
        dataset && selectedId ? (
          <PlaygroundTrainStep
            projectId={project.id}
            companyName={companyName}
            projectName={project.name}
            datasetId={selectedId}
            isSample={isSample}
            classNames={classNames}
            counts={
              // The dataset's own split numbers when it has them (PCB keeps its split only on disk)
              (dataset.trainCount ?? 0) > 0
                ? { training: dataset.trainCount ?? 0, validation: dataset.valCount ?? 0, test: dataset.testCount ?? 0, labelled: counts.labelled }
                : { training: counts.training - counts.validation, validation: counts.validation, test: counts.test, labelled: counts.labelled }
            }
            limits={limits}
            onTestModel={() => goToStep("test")}
          />
        ) : (
          <p className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
            Add a dataset in step 1 first: the model needs labelled photos to learn from.
          </p>
        )
      )}

      {step === "practice" && (
        dataset && selectedId && isSample ? (
          loadingFiles ? (
            <div className="flex justify-center rounded-2xl border bg-card py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <PlaygroundLabelPractice datasetId={selectedId} files={files} onContinue={() => goToStep("label")} />
          )
        ) : (
          <p className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
            Label practice works on GSN sample datasets. Start it from the overview with &ldquo;Learn to label&rdquo;.
          </p>
        )
      )}

      {step === "report" && <PlaygroundReportStep projectId={project.id} onGoToTest={() => goToStep("test")} />}

      {step === "test" && (
        dataset && selectedId ? (
          <PlaygroundTestStep
            projectId={project.id}
            companyName={companyName}
            projectName={project.name}
            datasetId={selectedId}
            sampleProject={sampleProject}
            missionName={missionName}
            industryName={industryName}
            onReportCreated={() => goToStep("report")}
            preferUpload={searchParams.get("try") === "1"}
            testFiles={testFiles}
            classNames={classNames}
          />
        ) : (
          <p className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
            Add a dataset in step 1 first: you need photos to test a model on.
          </p>
        )
      )}

      {/* Dataset */}
      {step === "label" && (
      <section className="rounded-2xl border bg-card p-5 md:p-6" aria-labelledby="dataset-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="dataset-heading" className="text-xl font-semibold text-foreground">
              {dataset ? (isSample ? `GSN sample · ${dataset.version}` : "My images") : missionName}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {dataset
                ? `${counts.all} images · ${counts.labelled} labelled · ${counts.test} held-out test`
                : "No images yet. Add your own to get started."}
            </p>
          </div>
          {canUpload && dataset && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileInput.current?.click()} disabled={uploading}>
              <ImagePlus className="h-4 w-4" />
              Add images
            </Button>
          )}
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          className="hidden"
          onChange={(e) => void uploadImages(Array.from(e.target.files ?? []))}
        />

        {showDropZone && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInput.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInput.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void uploadImages(Array.from(e.dataTransfer.files));
            }}
            className={cn(
              "mt-5 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
              dragging ? "border-ring bg-secondary/60" : "hover:border-ring/60"
            )}
          >
            {uploading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
            <p className="font-medium text-foreground">{uploading ? "Uploading..." : "Drop images here, or browse files"}</p>
            <p className="text-xs text-muted-foreground">
              JPG or PNG{maxMB !== null && ` · Up to ${maxMB} MB each`}
              {spaceLeft !== null && ` · ${spaceLeft} image space${spaceLeft === 1 ? "" : "s"} available`}
            </p>
          </div>
        )}

        {isSample && (
          <p className="mt-5 border-l-2 border-ring bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
            This is a ready-made GSN sample: real inspection photos, already labelled. The coloured boxes show what each
            label marks. Samples can&apos;t be changed{canUpload ? "; upload your own images to practise labelling" : ""}.
          </p>
        )}

        {dataset && (
          <>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter images">
                {filters.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    aria-selected={filter === f.id}
                    onClick={() => {
                      setFilter(f.id);
                      setPage(1);
                    }}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                      filter === f.id ? "border-ring bg-secondary font-medium text-foreground" : "text-muted-foreground hover:border-ring/60"
                    )}
                  >
                    {f.label} <span className="text-xs opacity-70">{f.count}</span>
                  </button>
                ))}
              </div>
              <Button className="gap-1.5" onClick={() => goToStep("train")} disabled={counts.labelled === 0}>
                Next: train a model
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {classNames.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>Labels:</span>
                {classNames.map((name, i) => (
                  <span key={name} className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: BOX_COLORS[i % BOX_COLORS.length] }} />
                    {name.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            )}

            {loadingFiles ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : visible.total === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">No images here.</p>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {visible.items.map((f) => {
                  const split = splitOf(f.folder);
                  const done = isLabelled(f);
                  return (
                    <article key={f.id} className="overflow-hidden rounded-xl border bg-background/40">
                      <div className="relative aspect-[4/3] bg-[#171f1b]">
                        <LabelledThumbnail datasetId={selectedId!} file={f} boxes={boxes[f.id]} classNames={classNames} />
                        <span
                          className={cn(
                            "absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            split.kind === "test" ? "bg-[#e9ff65] text-[#171f1b]" : "bg-black/60 text-white"
                          )}
                        >
                          {split.label}
                        </span>
                        {!isSample && (
                          <button
                            type="button"
                            onClick={() => void removeImage(f)}
                            className="absolute right-2 top-2 rounded bg-black/60 p-1 text-white hover:bg-black/80"
                            aria-label={`Remove ${f.originalName}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-2 p-3">
                        <p className="truncate text-xs text-foreground" title={f.originalName}>
                          {f.originalName}
                        </p>
                        {isSample ? (
                          <p className={cn("text-xs", done ? "text-success" : "text-muted-foreground")}>
                            {done ? `${boxes[f.id]?.length ?? "…"} label${boxes[f.id]?.length === 1 ? "" : "s"}` : "No label"}
                          </p>
                        ) : (
                          <Button
                            variant={done ? "outline" : "default"}
                            size="sm"
                            className="h-8 w-full gap-1.5 text-xs"
                            onClick={() => openLabelling(f)}
                          >
                            <PenLine className="h-3.5 w-3.5" />
                            {done ? "Edit labels" : "Label"}
                          </Button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-5 flex items-center justify-center gap-3 text-sm">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <span className="text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </section>
      )}
    </motion.div>
  );
};

export default PlaygroundProjectPage;
