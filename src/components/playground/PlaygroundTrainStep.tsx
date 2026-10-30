import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, Clock, Gauge, GraduationCap, Layers, Loader2, Play, Rabbit, Sparkles, Target, Trash2, Turtle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, apiUrl, getAuthHeaders } from "@/lib/api/config";
import { getLearningProgress } from "@/lib/api/dashboard";
import { getModelQuota, type ModelQuota } from "@/lib/api/models";
import type { PlanLimits } from "@/lib/api/subscription";
import { cn } from "@/lib/utils";

/**
 * Step 2 of a Playground project: train a model on the project's dataset. Written for students
 * who have never trained a model: what will happen, the one choice that matters (model size),
 * live progress explained in plain words, and the models trained so far.
 */

type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

interface JobState {
  jobId: string;
  status: JobStatus;
  currentEpoch: number;
  totalEpochs: number;
  percent: number;
  mAP50: number | null;
  error: string | null;
}

interface TrainedModel {
  modelId: string;
  modelVersion: string;
  isLinkedSample?: boolean;
  createdAt: string;
  metrics: { mAP50: number | null; precision: number | null; recall: number | null };
}

const SIZES = [
  {
    key: "base-v8n",
    letter: "n",
    name: "Nano",
    Icon: Rabbit,
    blurb: "Fastest to train. A great first try.",
  },
  {
    key: "base-v8s",
    letter: "s",
    name: "Small",
    Icon: Turtle,
    blurb: "Takes longer, usually spots defects a little better.",
  },
];

/**
 * Set to false to show "Training opens soon" instead of queuing jobs (e.g. while the training
 * servers are down), so runs and model slots aren't used up for nothing.
 */
const TRAINING_AVAILABLE = true;

/** Labelled photos needed before training (the server checks the same number) */
const MIN_LABELLED = 20;

const jobKey = (projectId: string) => `visionm_playground_training_${projectId}`;

const percent = (v: number | null | undefined) => (typeof v === "number" ? `${Math.round(v * 100)}%` : "—");

/** Plain-words reading of mAP50 for students */
const scoreWords = (mAP50: number | null | undefined) => {
  if (typeof mAP50 !== "number") return "No score yet";
  if (mAP50 >= 0.8) return "Very good at finding the defects";
  if (mAP50 >= 0.6) return "Good, with some misses";
  if (mAP50 >= 0.4) return "Learning, still misses quite a few";
  return "Needs more or better examples";
};

export const PlaygroundTrainStep: React.FC<{
  projectId: string;
  companyName: string;
  projectName: string;
  datasetId: string;
  isSample: boolean;
  classNames: string[];
  counts: { training: number; validation: number; test: number; labelled: number };
  limits: PlanLimits | null | undefined;
  onTestModel: () => void;
}> = ({ projectId, companyName, projectName, datasetId, isSample, classNames, counts, limits, onTestModel }) => {
  const { toast } = useToast();
  const [size, setSize] = useState(SIZES[0].key);
  const [job, setJob] = useState<JobState | null>(null);
  const [starting, setStarting] = useState(false);
  const [runsUsed, setRunsUsed] = useState<number | null>(null);
  const [quota, setQuota] = useState<ModelQuota | null>(null);
  const [models, setModels] = useState<TrainedModel[] | null>(null);
  const [modelToDelete, setModelToDelete] = useState<TrainedModel | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pollTimer = useRef<number | null>(null);

  const runLimit = typeof limits?.trainingRunsPerMonth === "number" ? limits.trainingRunsPerMonth : null;
  const runsLeft = runLimit === null || runsUsed === null ? null : Math.max(0, runLimit - runsUsed);
  const modelsFull = !!quota?.limited && typeof quota.limit === "number" && (quota.used ?? 0) >= quota.limit;
  const busy = job?.status === "queued" || job?.status === "running";

  const loadModels = useCallback(async () => {
    try {
      const q = new URLSearchParams({ company: companyName, project: projectName });
      const json = await apiRequest<{ models: TrainedModel[] }>(`/models?${q}`);
      setModels(json.models.filter((m) => !m.isLinkedSample));
    } catch {
      setModels([]);
    }
  }, [companyName, projectName]);

  const loadAllowance = useCallback(() => {
    getLearningProgress()
      .then((p) => setRunsUsed(p.trainingRunsThisMonth ?? null))
      .catch(() => undefined);
    getModelQuota()
      .then(setQuota)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void loadModels();
    loadAllowance();
  }, [loadModels, loadAllowance]);

  // Deleting a model frees a slot (customers keep a limited number)
  const deleteModel = async (m: TrainedModel) => {
    setModelToDelete(null);
    setDeletingId(m.modelId);
    try {
      await apiRequest(`/models/${encodeURIComponent(m.modelId)}`, { method: "DELETE", maxRetries: 1 });
      toast({ title: `${m.modelVersion} deleted`, description: "You can train a new model now." });
      void loadModels();
      loadAllowance();
    } catch (err) {
      toast({ title: "Couldn't delete the model", description: (err as Error).message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  // ---- Follow a training job ----
  const poll = useCallback(
    async (jobId: string) => {
      try {
        const s = await apiRequest<{
          status: JobStatus;
          progress?: { currentEpoch?: number; totalEpochs?: number; progressPercent?: number };
          metrics?: { mAP50?: number };
          finalMetrics?: { mAP50?: number };
          error?: string | { message?: string } | null;
        }>(`/train/${encodeURIComponent(jobId)}/status`, { maxRetries: 1 });
        const next: JobState = {
          jobId,
          status: s.status,
          currentEpoch: s.progress?.currentEpoch ?? 0,
          totalEpochs: s.progress?.totalEpochs ?? 0,
          percent: s.progress?.progressPercent ?? 0,
          mAP50: s.finalMetrics?.mAP50 ?? s.metrics?.mAP50 ?? null,
          error: typeof s.error === "string" ? s.error : s.error?.message ?? null,
        };
        setJob(next);
        if (next.status === "completed" || next.status === "failed" || next.status === "cancelled") {
          try {
            localStorage.removeItem(jobKey(projectId));
          } catch {
            // ignore
          }
          void loadModels();
          loadAllowance();
          return;
        }
        pollTimer.current = window.setTimeout(() => void poll(jobId), 5000);
      } catch {
        pollTimer.current = window.setTimeout(() => void poll(jobId), 10000);
      }
    },
    [projectId, loadModels, loadAllowance]
  );

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(jobKey(projectId));
    } catch {
      // ignore
    }
    if (saved) void poll(saved);
    return () => {
      if (pollTimer.current) window.clearTimeout(pollTimer.current);
    };
  }, [projectId, poll]);

  const start = async () => {
    setStarting(true);
    try {
      const res = await fetch(apiUrl("/train"), {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ datasetId, projectId, modelType: "YOLO", modelKey: size, augmentationPreset: "none" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || json.error || `Couldn't start training (${res.status})`);
      const jobId = String(json.jobId ?? json.job_id ?? "");
      if (!jobId) throw new Error("The server didn't return a training job.");
      try {
        localStorage.setItem(jobKey(projectId), jobId);
      } catch {
        // ignore
      }
      setJob({ jobId, status: "queued", currentEpoch: 0, totalEpochs: 0, percent: 0, mAP50: null, error: null });
      loadAllowance();
      void poll(jobId);
    } catch (err) {
      toast({ title: "Training didn't start", description: (err as Error).message, variant: "destructive" });
    } finally {
      setStarting(false);
    }
  };

  const blockedReason = !TRAINING_AVAILABLE
    ? null
    : isSample
      ? "GSN's labelled samples are for viewing and testing. To train, choose \"Label this sample myself\" in step 1, or upload your own photos."
      : counts.labelled < MIN_LABELLED
      ? `Label at least ${MIN_LABELLED} photos first (${counts.labelled} so far): the model learns only from labelled photos.`
      : runsLeft === 0
        ? "You've used this month's training runs. They reset on the 1st."
        : modelsFull
          ? `You can keep ${quota?.limit} trained models. Delete one in Model Training to train a new one.`
          : null;

  // Which journey step is current: 0 before start, then 1-4
  const stage = !job
    ? 0
    : job.status === "queued"
      ? 1
      : job.status === "running"
        ? job.currentEpoch > 0
          ? 3
          : 2
        : job.status === "completed"
          ? 5
          : 0;

  const journey = [
    { Icon: Check, title: "Check photos and labels", text: "Every photo and its labels are read and checked, so nothing broken goes in." },
    {
      Icon: GraduationCap,
      title: "Learn from examples",
      text: "The model looks at your training photos again and again. One full pass over all of them is called an epoch.",
    },
    {
      Icon: Target,
      title: "Check itself",
      text: "After each epoch it tries the validation photos it isn't learning from, and keeps its best version so far.",
    },
    { Icon: Sparkles, title: "Save your model", text: "The best version is saved, ready for you to test on the held-out photos." },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Train. Watch. Learn.</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Training means showing the computer your labelled photos many times until it can spot the defects by itself.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* Setup */}
        <section className="rounded-2xl border bg-card p-5 md:p-6" aria-labelledby="setup-heading">
          <div className="flex items-start justify-between gap-3">
            <h3 id="setup-heading" className="text-lg font-semibold text-foreground">
              Get ready to train
            </h3>
            <span className="rounded-md bg-secondary px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-secondary-foreground">
              {isSample ? "GSN sample" : "Your images"}
            </span>
          </div>

          <dl className="mt-4 divide-y text-sm">
            {[
              ["Photos it learns from", counts.training],
              ["Photos it checks itself on", counts.validation],
              ["Photos kept aside for your test", counts.test],
            ].map(([label, value]) => (
              <div key={label as string} className="flex items-center justify-between py-2.5">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-semibold tabular-nums text-foreground">{value}</dd>
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <dt className="text-muted-foreground">What it learns to find</dt>
              <dd className="flex flex-wrap justify-end gap-1.5">
                {classNames.length ? (
                  classNames.map((c) => (
                    <span key={c} className="rounded-full border px-2 py-0.5 text-xs text-foreground">
                      {c.replace(/_/g, " ")}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground">Your labels</span>
                )}
              </dd>
            </div>
          </dl>

          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-medium text-foreground">Pick a model size</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {SIZES.filter((s) => !quota?.sizes || quota.sizes.includes(s.letter)).map(({ key, name, Icon, blurb }) => (
                <button
                  key={key}
                  type="button"
                  disabled={busy}
                  onClick={() => setSize(key)}
                  aria-pressed={size === key}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                    size === key ? "border-ring bg-secondary/60 ring-1 ring-ring" : "hover:border-ring/60"
                  )}
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-foreground" aria-hidden="true" />
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{name}</span>
                    <span className="block text-xs text-muted-foreground">{blurb}</span>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-secondary/40 p-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Gauge className="h-3.5 w-3.5" /> Training runs left
              </p>
              <p className="mt-1 font-semibold text-foreground">
                {runsLeft === null ? "—" : `${runsLeft} of ${runLimit}`} <span className="font-normal text-muted-foreground">this month</span>
              </p>
            </div>
            <div className="rounded-xl bg-secondary/40 p-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Layers className="h-3.5 w-3.5" /> Models you keep
              </p>
              <p className="mt-1 font-semibold text-foreground">
                {quota?.limited ? `${quota.used ?? 0} of ${quota.limit}` : "No limit"}
              </p>
            </div>
          </div>

          {blockedReason && !busy && <p className="mt-4 text-sm text-destructive">{blockedReason}</p>}

          <Button
            className="mt-5 w-full gap-2"
            size="lg"
            onClick={() => void start()}
            disabled={!TRAINING_AVAILABLE || starting || busy || !!blockedReason}
          >
            {starting || busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {!TRAINING_AVAILABLE ? "Training opens soon" : busy ? "Training..." : "Start training"}
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {TRAINING_AVAILABLE
              ? "A run that fails because of a problem on our side doesn't use up your allowance."
              : "We're setting up the training computers. Meanwhile, read how training works and test a ready-made model in step 3."}
          </p>
        </section>

        {/* Journey */}
        <section className="rounded-2xl border bg-card p-5 md:p-6" aria-labelledby="journey-heading">
          <h3 id="journey-heading" className="text-lg font-semibold text-foreground">
            What happens while it trains
          </h3>

          {job && (
            <div className="mt-4 rounded-xl border bg-secondary/40 p-4" role="status">
              {job.status === "queued" && (
                <p className="flex items-start gap-2 text-sm text-foreground">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                  Waiting for a training computer to become free. This can take a while; you can leave this page and come
                  back.
                </p>
              )}
              {job.status === "running" && (
                <>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium text-foreground">
                      {job.totalEpochs ? `Epoch ${job.currentEpoch} of ${job.totalEpochs}` : "Getting started"}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{Math.round(job.percent)}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
                    <motion.div className="h-full bg-ring" animate={{ width: `${job.percent}%` }} />
                  </div>
                  {job.mAP50 !== null && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Current score {percent(job.mAP50)}: {scoreWords(job.mAP50).toLowerCase()}.
                    </p>
                  )}
                </>
              )}
              {job.status === "completed" && (
                <div className="space-y-3">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold text-success">Your model is ready!</span> Score {percent(job.mAP50)}:{" "}
                    {scoreWords(job.mAP50).toLowerCase()}.
                  </p>
                  <Button size="sm" className="gap-1.5" onClick={onTestModel}>
                    Test your model <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              {(job.status === "failed" || job.status === "cancelled") && (
                <p className="text-sm text-destructive">
                  Training {job.status === "failed" ? "stopped with a problem" : "was cancelled"}
                  {job.error ? `: ${job.error}` : "."} You can start it again.
                </p>
              )}
            </div>
          )}

          <ol className="mt-4 space-y-3">
            {journey.map(({ Icon, title, text }, i) => {
              const n = i + 1;
              const done = stage > n;
              const current = stage === n;
              return (
                <li
                  key={title}
                  className={cn("flex gap-3 rounded-xl p-3", current && "bg-secondary/60 ring-1 ring-ring")}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                      done && "border-transparent bg-success text-white",
                      current && "border-transparent bg-foreground text-background"
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : current ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{title}</span>
                    <span className="block text-sm text-muted-foreground">{text}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      {/* Models */}
      <section className="rounded-2xl border bg-card p-5 md:p-6" aria-labelledby="models-heading">
        <h3 id="models-heading" className="text-lg font-semibold text-foreground">
          Your trained models
        </h3>
        {models === null ? (
          <Loader2 className="mt-4 h-5 w-5 animate-spin text-muted-foreground" />
        ) : models.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">None yet. Your first model will appear here when training finishes.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {models.map((m) => (
              <li key={m.modelId} className="flex items-center justify-between gap-3 rounded-xl border p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{m.modelVersion}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · Score{" "}
                    {percent(m.metrics?.mAP50)} · {scoreWords(m.metrics?.mAP50)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={onTestModel}>
                    Test
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setModelToDelete(m)}
                    disabled={deletingId === m.modelId}
                    aria-label={`Delete ${m.modelVersion}`}
                  >
                    {deletingId === m.modelId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AlertDialog open={!!modelToDelete} onOpenChange={(open) => !open && setModelToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {modelToDelete?.modelVersion}?</AlertDialogTitle>
            <AlertDialogDescription>
              The model and its test results are removed for good. This frees one of your trained-model slots.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => modelToDelete && void deleteModel(modelToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tips */}
      <section className="grid gap-4 md:grid-cols-3" aria-label="Good to know">
        {[
          ["What is an epoch?", "One full pass over all your training photos. More epochs give the model more practice, but take longer."],
          [
            "Why keep test photos aside?",
            "If the model saw them while learning, testing on them would be like knowing the exam questions in advance.",
          ],
          ["What does the score mean?", "It's how well the model finds and outlines the labelled defects on photos it checks itself on, from 0 to 100%."],
        ].map(([q, a]) => (
          <div key={q} className="rounded-xl border bg-secondary/30 p-4">
            <p className="text-sm font-semibold text-foreground">{q}</p>
            <p className="mt-1 text-sm text-muted-foreground">{a}</p>
          </div>
        ))}
      </section>
    </div>
  );
};
