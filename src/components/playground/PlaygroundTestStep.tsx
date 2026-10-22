import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Check, Clock, FileText, FlaskConical, ImagePlus, Loader2, Play, Sparkles, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, apiUrl, getAuthHeaders } from "@/lib/api/config";
import { getSamples, importSampleModel } from "@/lib/api/samples";
import { cn } from "@/lib/utils";

/**
 * Step 3 of a Playground project: test a model on photos it never learned from. Students pick a
 * model (their own, or GSN's ready-made one for the sample), then either the held-out test photos
 * (shown next to what the dataset labels say) or up to 30 photos of their own. A finished test
 * is closed (photos deleted) or turned into a PDF report; the server closes it after an hour.
 */

const MAX_UPLOADS = 30;
const IMAGE_NAME = /\.(jpe?g|png)$/i;

interface ModelEntry {
  modelId: string;
  modelVersion: string;
  modelType?: string;
  isLinkedSample?: boolean;
  createdAt: string;
  metrics?: { mAP50: number | null };
}

interface ResultImage {
  filename: string;
  url: string;
  tag?: string;
  /** per-class counts from the prediction ("class" is the class name) */
  byClass?: { class?: string; className?: string; classId?: number; count?: number }[];
  instanceCount?: number;
  /** the photo's own name when the run used a shortened one */
  originalName?: string;
}

interface TestFile {
  id: string;
  storedName: string;
  originalName: string;
}

type Source = "test" | "upload";

const baseOf = (name: string) => name.split(/[/\\]/).pop()!.replace(/\.[^.]+$/, "");
const nice = (name: string) => name.replace(/_/g, " ");
const runKey = (projectId: string) => `visionm_playground_test_${projectId}`;

/** An annotated result photo (the server draws the model's boxes on it) */
const ResultPhoto: React.FC<{ url: string; alt: string }> = ({ url, alt }) => {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl(url.replace(/^\/api\//, "")), { headers: await getAuthHeaders() });
        if (!res.ok) return;
        objectUrl = URL.createObjectURL(await res.blob());
        if (!cancelled) setSrc(objectUrl);
      } catch {
        // leave the placeholder
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);
  return src ? (
    <img src={src} alt={alt} className="h-full w-full object-contain" />
  ) : (
    <div className="h-full w-full animate-pulse bg-muted" />
  );
};

export const PlaygroundTestStep: React.FC<{
  projectId: string;
  companyName: string;
  projectName: string;
  datasetId: string;
  /** the GSN sample project this dataset came from (to offer its ready-made model), if any */
  sampleProject: string | null;
  /** for the report's title and industry line */
  missionName: string;
  industryName: string | null;
  /** after a report is made (the Report step lists it) */
  onReportCreated: () => void;
  testFiles: TestFile[];
  /** class index -> name, for the held-out photos' known answers */
  classNames: string[];
}> = ({
  projectId,
  companyName,
  projectName,
  datasetId,
  sampleProject,
  missionName,
  industryName,
  onReportCreated,
  testFiles,
  classNames,
}) => {
  const { toast } = useToast();
  const [models, setModels] = useState<ModelEntry[] | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);
  const [addingSample, setAddingSample] = useState(false);
  const [source, setSource] = useState<Source>(testFiles.length ? "test" : "upload");
  const [uploads, setUploads] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [starting, setStarting] = useState(false);
  const [run, setRun] = useState<{ id: string; source: Source; status: string; percent: number; autoCloseAt: string | null } | null>(
    null
  );
  const [finishing, setFinishing] = useState<"close" | "report" | null>(null);
  const [results, setResults] = useState<ResultImage[] | null>(null);
  const [truth, setTruth] = useState<Record<string, Set<string>>>({});
  const fileInput = useRef<HTMLInputElement>(null);
  const pollTimer = useRef<number | null>(null);

  // ---- Models ----
  const loadModels = useCallback(async () => {
    try {
      const q = new URLSearchParams({ company: companyName, project: projectName });
      const json = await apiRequest<{ models: ModelEntry[] }>(`/models?${q}`);
      setModels(json.models);
      setModelId((current) => current ?? json.models[0]?.modelId ?? null);
    } catch {
      setModels([]);
    }
  }, [companyName, projectName]);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  const addReadyMadeModel = async () => {
    if (!sampleProject) return;
    setAddingSample(true);
    try {
      const { models: sampleModels } = await getSamples();
      const wanted = sampleProject.trim().toLowerCase();
      const best = sampleModels
        .filter((m) => m.project.trim().toLowerCase() === wanted && m.modelType !== "RF_DETR")
        .sort((a, b) => (b.mAP50 ?? 0) - (a.mAP50 ?? 0))[0];
      if (!best) throw new Error("GSN doesn't have a ready-made model for this sample yet.");
      await importSampleModel(best.id, projectName);
      toast({ title: "Ready-made model added", description: "GSN's model for this sample is now in your project." });
      await loadModels();
    } catch (err) {
      toast({ title: "Couldn't add the model", description: (err as Error).message, variant: "destructive" });
    } finally {
      setAddingSample(false);
    }
  };

  // ---- Known answers for the held-out photos ----
  useEffect(() => {
    if (!testFiles.length) return;
    let cancelled = false;
    const ids = testFiles.slice(0, 200).map((f) => f.id);
    apiRequest<{ classes: { index: number; name: string }[]; labels: Record<string, { c: number }[]> }>(
      `/dataset/${encodeURIComponent(datasetId)}/file-labels?ids=${ids.map(encodeURIComponent).join(",")}`
    )
      .then((json) => {
        if (cancelled) return;
        const names = json.classes.length ? json.classes.map((c) => c.name) : classNames;
        const map: Record<string, Set<string>> = {};
        for (const f of testFiles) {
          const boxes = json.labels[f.id];
          if (!boxes) continue;
          const set = new Set(boxes.map((b) => names[b.c] ?? `class ${b.c}`));
          map[baseOf(f.storedName)] = set;
          map[baseOf(f.originalName)] = set;
        }
        setTruth(map);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [datasetId, testFiles, classNames]);

  // ---- Running a test ----
  const loadResults = useCallback(async (id: string) => {
    const json = await apiRequest<{ results: { annotatedImages: { all: ResultImage[] }; images?: ResultImage[] } }>(
      `/inference/${encodeURIComponent(id)}/results`
    );
    setResults(json.results.annotatedImages?.all?.length ? json.results.annotatedImages.all : json.results.images ?? []);
  }, []);

  const poll = useCallback(
    async (id: string, runSource: Source) => {
      try {
        const s = await apiRequest<{
          status: string;
          progress?: { progressPercent?: number };
          autoCloseAt?: string | null;
          closedAt?: string | null;
        }>(`/inference/${encodeURIComponent(id)}/status`, { maxRetries: 1 });
        if (s.closedAt) {
          // closed (by the student, a report, or after an hour): nothing left to show
          forgetRun();
          return;
        }
        setRun({
          id,
          source: runSource,
          status: s.status,
          percent: s.progress?.progressPercent ?? 0,
          autoCloseAt: s.autoCloseAt ?? null,
        });
        if (s.status === "completed") {
          await loadResults(id);
          return;
        }
        if (s.status === "failed" || s.status === "cancelled") return;
        pollTimer.current = window.setTimeout(() => void poll(id, runSource), 4000);
      } catch {
        pollTimer.current = window.setTimeout(() => void poll(id, runSource), 8000);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadResults]
  );

  /** Clear the finished test from this page */
  function forgetRun() {
    try {
      localStorage.removeItem(runKey(projectId));
    } catch {
      // ignore
    }
    setRun(null);
    setResults(null);
  }

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(runKey(projectId)) || "null") as { id: string; source: Source } | null;
      if (saved?.id) void poll(saved.id, saved.source);
    } catch {
      // ignore
    }
    return () => {
      if (pollTimer.current) window.clearTimeout(pollTimer.current);
    };
  }, [projectId, poll]);

  const pickUploads = (picked: File[]) => {
    const images = picked.filter((f) => IMAGE_NAME.test(f.name));
    const room = MAX_UPLOADS - uploads.length;
    if (images.length > room) {
      toast({ title: `Up to ${MAX_UPLOADS} photos`, description: `You can add ${room} more.`, variant: "destructive" });
    }
    setUploads((prev) => [...prev, ...images.slice(0, Math.max(0, room))]);
    if (fileInput.current) fileInput.current.value = "";
  };

  const startTest = async () => {
    if (!modelId) return;
    setStarting(true);
    setResults(null);
    try {
      const form = new FormData();
      form.append("modelId", modelId);
      if (source === "test") form.append("datasetId", datasetId);
      else uploads.forEach((f) => form.append("files", f, f.name));
      const headers = { ...(await getAuthHeaders()) } as Record<string, string>;
      delete headers["Content-Type"];
      const res = await fetch(apiUrl("/inference/start"), { method: "POST", headers, body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || json.error || `Couldn't start the test (${res.status})`);
      const id = String(json.inferenceId ?? json.id ?? "");
      if (!id) throw new Error("The server didn't return a test run.");
      try {
        localStorage.setItem(runKey(projectId), JSON.stringify({ id, source }));
      } catch {
        // ignore
      }
      setRun({ id, source, status: "queued", percent: 0, autoCloseAt: null });
      void poll(id, source);
    } catch (err) {
      toast({ title: "Test didn't start", description: (err as Error).message, variant: "destructive" });
    } finally {
      setStarting(false);
    }
  };

  // ---- What the model found, next to the dataset's labels for held-out photos ----
  const shown = useMemo(() => {
    if (!results) return [];
    return results.map((r) => {
      const found = new Set(
        (r.byClass ?? []).filter((c) => (c.count ?? 1) > 0).map((c) => c.class ?? c.className ?? `class ${c.classId}`)
      );
      const labelled = run?.source === "test" ? truth[baseOf(r.originalName ?? r.filename)] : undefined;
      return { ...r, found, labelled };
    });
  }, [results, truth, run?.source]);

  const closeTest = async () => {
    if (!run) return;
    setFinishing("close");
    try {
      await apiRequest(`/playground/runs/${encodeURIComponent(run.id)}/close`, { method: "POST", maxRetries: 1 });
      forgetRun();
      toast({ title: "Test closed", description: "Its photos were deleted." });
    } catch (err) {
      toast({ title: "Couldn't close the test", description: (err as Error).message, variant: "destructive" });
    } finally {
      setFinishing(null);
    }
  };

  const makeReport = async () => {
    if (!run) return;
    setFinishing("report");
    try {
      const labelled: Record<string, string[]> = {};
      for (const r of shown) if (r.labelled) labelled[r.originalName ?? r.filename] = [...r.labelled];
      await apiRequest(`/playground/runs/${encodeURIComponent(run.id)}/report`, {
        method: "POST",
        body: JSON.stringify({ projectId, title: missionName, industry: industryName, labelled }),
        maxRetries: 1,
      });
      forgetRun();
      toast({ title: "Report ready", description: "Download it from the Report step within 24 hours." });
      onReportCreated();
    } catch (err) {
      toast({ title: "Couldn't make the report", description: (err as Error).message, variant: "destructive" });
    } finally {
      setFinishing(null);
    }
  };

  const closesAt = run?.autoCloseAt
    ? new Date(run.autoCloseAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
    : null;

  const busy = run?.status === "queued" || run?.status === "running";
  const selectedModel = models?.find((m) => m.modelId === modelId);
  const canStart = !!modelId && !busy && !starting && (source === "test" ? testFiles.length > 0 : uploads.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Put your model to the test.</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A model is only as good as its results on photos it has never seen. Let&apos;s find out what it gets right and
          where it slips.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="space-y-5 rounded-2xl border bg-card p-5 md:p-6" aria-labelledby="test-setup">
          <h3 id="test-setup" className="text-lg font-semibold text-foreground">
            Set up your test
          </h3>

          {/* 1. Model */}
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">1. Choose a model</p>
            {models === null ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : models.length === 0 ? (
              <div className="rounded-xl border border-dashed p-4 text-sm">
                <p className="text-muted-foreground">You don&apos;t have a model in this project yet.</p>
                {sampleProject && (
                  <Button size="sm" className="mt-3 gap-1.5" onClick={() => void addReadyMadeModel()} disabled={addingSample}>
                    {addingSample ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Use GSN&apos;s ready-made model
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {models.map((m) => (
                  <button
                    key={m.modelId}
                    type="button"
                    disabled={busy}
                    onClick={() => setModelId(m.modelId)}
                    aria-pressed={modelId === m.modelId}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left text-sm transition-colors",
                      modelId === m.modelId ? "border-ring bg-secondary/60 ring-1 ring-ring" : "hover:border-ring/60"
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground">{m.modelVersion}</span>
                      <span className="block text-xs text-muted-foreground">
                        {m.isLinkedSample ? "GSN ready-made model" : "Trained by you"}
                        {typeof m.metrics?.mAP50 === "number" && ` · score ${Math.round(m.metrics.mAP50 * 100)}%`}
                      </span>
                    </span>
                    {modelId === m.modelId && <Check className="h-4 w-4 shrink-0 text-success" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Photos */}
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">2. Choose the photos</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  id: "test" as Source,
                  title: `Held-out test photos (${testFiles.length})`,
                  text: "Kept aside while training, and we know the right answers, so you get a score.",
                  disabled: testFiles.length === 0,
                },
                {
                  id: "upload" as Source,
                  title: `Your own photos (up to ${MAX_UPLOADS})`,
                  text: "Try the model on new photos. You judge whether it got them right.",
                  disabled: false,
                },
              ].map((o) => (
                <button
                  key={o.id}
                  type="button"
                  disabled={o.disabled || busy}
                  onClick={() => setSource(o.id)}
                  aria-pressed={source === o.id}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors disabled:opacity-50",
                    source === o.id ? "border-ring bg-secondary/60 ring-1 ring-ring" : "hover:border-ring/60"
                  )}
                >
                  <span className="block text-sm font-semibold text-foreground">{o.title}</span>
                  <span className="block text-xs text-muted-foreground">{o.text}</span>
                </button>
              ))}
            </div>

            {source === "upload" && (
              <div className="mt-3">
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png"
                  multiple
                  className="hidden"
                  onChange={(e) => pickUploads(Array.from(e.target.files ?? []))}
                />
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
                    pickUploads(Array.from(e.dataTransfer.files));
                  }}
                  className={cn(
                    "flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
                    dragging ? "border-ring bg-secondary/60" : "hover:border-ring/60"
                  )}
                >
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Drop photos here, or browse</p>
                  <p className="text-xs text-muted-foreground">
                    JPG or PNG · {uploads.length} of {MAX_UPLOADS} added · used only for this test
                  </p>
                </div>
                {uploads.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {uploads.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
                        <span className="max-w-32 truncate">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setUploads((prev) => prev.filter((_, j) => j !== i))}
                          aria-label={`Remove ${f.name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <Button className="w-full gap-2" size="lg" onClick={() => void startTest()} disabled={!canStart}>
            {starting || busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {busy ? "Testing..." : "Run the test"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">Each photo counts towards your 1,000 predictions a month.</p>
        </section>

        <section className="rounded-2xl border bg-card p-5 md:p-6" aria-labelledby="how-heading">
          <h3 id="how-heading" className="text-lg font-semibold text-foreground">
            How to read the results
          </h3>
          <ul className="mt-4 space-y-3">
            {[
              {
                Icon: Check,
                color: "bg-foreground text-background",
                title: "Boxes and confidence",
                text: "Each box is something the model found. The number is how sure it is, from 0 to 1.",
              },
              {
                Icon: AlertTriangle,
                color: "bg-destructive text-white",
                title: "Look for misses",
                text: "A real defect without a box is the costly mistake: in a factory, a bad part slips through.",
              },
              {
                Icon: FlaskConical,
                color: "bg-warning text-white",
                title: "Look for extra boxes",
                text: "A box where there's no defect means good parts would be thrown away.",
              },
            ].map(({ Icon, color, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", color)}>
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">{title}</span>
                  <span className="block text-sm text-muted-foreground">{text}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-xl bg-secondary/40 p-3 text-sm text-muted-foreground">
            For held-out photos, compare &ldquo;Model found&rdquo; with &ldquo;Labelled in the dataset&rdquo;. The
            differences tell you which examples to add or relabel before training again.
          </p>
        </section>
      </div>

      {/* Progress + results */}
      {run && (
        <section className="rounded-2xl border bg-card p-5 md:p-6" aria-labelledby="results-heading" role="status">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 id="results-heading" className="text-lg font-semibold text-foreground">
              {results ? "Your results" : "Testing your model"}
            </h3>
            {selectedModel && <span className="text-xs text-muted-foreground">Model: {selectedModel.modelVersion}</span>}
          </div>

          {run.status === "queued" && (
            <p className="mt-3 flex items-start gap-2 text-sm text-foreground">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" />
              Waiting for a computer to run your model. You can leave this page and come back.
            </p>
          )}
          {run.status === "running" && (
            <div className="mt-3">
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <motion.div className="h-full bg-ring" animate={{ width: `${run.percent}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Looking at your photos... {Math.round(run.percent)}%</p>
            </div>
          )}
          {(run.status === "failed" || run.status === "cancelled") && (
            <p className="mt-3 text-sm text-destructive">The test didn&apos;t finish. Try running it again.</p>
          )}

          {results && (
            <>
              <div className="mt-4 flex flex-col gap-3 rounded-xl border bg-secondary/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-foreground">
                  <span className="font-semibold">Done with this test?</span>{" "}
                  <span className="text-muted-foreground">
                    Make a PDF report to keep the results, or close it.
                    {closesAt && ` It closes by itself at ${closesAt}.`} Either way its photos are deleted.
                  </span>
                </p>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => void closeTest()} disabled={!!finishing}>
                    {finishing === "close" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Close test
                  </Button>
                  <Button size="sm" onClick={() => void makeReport()} disabled={!!finishing}>
                    {finishing === "report" ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileText className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Generate report
                  </Button>
                </div>
              </div>

              {results.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No result photos came back.</p>
              ) : (
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {shown.map((r) => (
                    <article key={r.filename} className="overflow-hidden rounded-xl border bg-background/40">
                      <div className="relative aspect-[4/3] bg-[#171f1b]">
                        <ResultPhoto url={r.url} alt={`Model result for ${r.filename}`} />
                      </div>
                      <div className="space-y-1 p-3 text-xs">
                        <p className="text-foreground">
                          <span className="text-muted-foreground">Model found: </span>
                          {r.found.size ? [...r.found].map(nice).join(", ") : "nothing"}
                        </p>
                        {r.labelled && (
                          <p className="text-foreground">
                            <span className="text-muted-foreground">Labelled in the dataset: </span>
                            {r.labelled.size ? [...r.labelled].map(nice).join(", ") : "nothing"}
                          </p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {!run && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <ImagePlus className="h-4 w-4" /> Your results will appear here, photo by photo.
        </p>
      )}
    </div>
  );
};
