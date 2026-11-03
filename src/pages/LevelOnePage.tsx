import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Check, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/pages/LoadingState";
import { guidedMissionForSample } from "@/components/dashboard/IndustryPicker";
import { useBreadcrumbs } from "@/components/app-shell/breadcrumb-context";
import { BOX_COLORS, LabelledThumbnail, type Box } from "@/components/playground/LabelledThumbnail";
import { PlaygroundLabelPractice } from "@/components/playground/PlaygroundLabelPractice";
import { PlaygroundReportStep } from "@/components/playground/PlaygroundReportStep";
import { PlaygroundTestStep } from "@/components/playground/PlaygroundTestStep";
import { StepGuide } from "@/components/playground/StepGuide";
import { TRAINING_JOURNEY } from "@/components/playground/trainingJourney";
import { apiRequest } from "@/lib/api/config";
import { saveLevelProgress, saveLevelSteps, startLevel } from "@/lib/api/levels";
import { getSamples, type SampleDataset, type SampleModel } from "@/lib/api/samples";
import { cn } from "@/lib/utils";

/**
 * Level 1 (/level-1/:sampleId): learning on a GSN sample, one step at a time: see the data, practise
 * labelling, see how training works, test GSN's ready-made model, make a report. It needs no project,
 * so it never counts towards the plan. A step opens once the ones before it are done.
 */

const STEPS = [
  { id: "dataset", label: "See the data" },
  { id: "practice", label: "Labelling" },
  { id: "training", label: "How training works" },
  { id: "test", label: "Test" },
  { id: "report", label: "Report" },
] as const;
type StepId = (typeof STEPS)[number]["id"];

const PAGE_SIZE = 12;

interface SampleFile {
  id: string;
  storedName: string;
  originalName: string;
  folder: string | null;
}

/** The settings of a training run, so Level 2 makes sense when the student gets there */
const TRAINING_SETTINGS = [
  {
    name: "Model size",
    text: "How big the model is. Nano trains fastest; Small takes longer and usually spots defects a little better.",
  },
  {
    name: "Epochs",
    text: "How many times the model goes through all the training photos. Too few and it hasn't learned enough; too many and it starts memorising the photos instead of learning.",
  },
  {
    name: "Batch size",
    text: "How many photos it looks at before correcting itself. A bigger batch needs more computer memory.",
  },
  {
    name: "Image size",
    text: "How large each photo is made before the model sees it. Larger keeps small defects visible, but training takes longer.",
  },
  {
    name: "Learning rate",
    text: "How big a step the model takes each time it corrects itself. Too big and it overshoots; too small and it learns very slowly.",
  },
  {
    name: "More training photos",
    text: "Flipped, rotated, brighter or darker copies of your labelled photos. They help when you have only a few real ones. This is called augmentation.",
  },
];

const splitLabel = (folder: string | null) =>
  folder === "test" ? "Held-out test" : folder === "val" ? "Validation" : folder === "train" ? "Training" : "Photo";

const DatasetStep: React.FC<{ sampleId: string; files: SampleFile[]; onNext: () => void }> = ({ sampleId, files, onNext }) => {
  const [page, setPage] = useState(1);
  const [boxes, setBoxes] = useState<Record<string, Box[]>>({});
  const [classNames, setClassNames] = useState<string[]>([]);
  const totalPages = Math.max(1, Math.ceil(files.length / PAGE_SIZE));
  const visible = useMemo(() => files.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [files, page]);

  useEffect(() => {
    const missing = visible.filter((f) => !(f.id in boxes)).map((f) => f.id);
    if (!missing.length) return;
    let cancelled = false;
    apiRequest<{ classes: { index: number; name: string }[]; labels: Record<string, Box[]> }>(
      `/dataset/${encodeURIComponent(sampleId)}/file-labels?ids=${missing.map(encodeURIComponent).join(",")}`
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
  }, [sampleId, visible, boxes]);

  const count = (folder: string) => files.filter((f) => f.folder === folder).length;

  return (
    <section className="space-y-5 rounded-2xl border bg-card p-5 md:p-6" aria-labelledby="dataset-heading">
      <div>
        <h2 id="dataset-heading" className="text-xl font-semibold text-foreground">
          See the data
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{files.length} real inspection photos, already labelled by GSN.</p>
      </div>
      <StepGuide
        what="Every AI inspection starts with photos. Look at what a defect looks like, and how each one is marked with a coloured box."
        why="These boxes are called labels. A model learns only from what the labels show it, so good labels matter most."
      />
      <div>
        <h3 className="text-sm font-semibold text-foreground">Why the photos are split into three groups</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          A model can memorise photos it has seen, just as a student can memorise answers. So some photos are kept away from its
          learning, to find out if it really learned to spot defects.
        </p>
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        {[
          ["Training", count("train"), "The model learns from these, like a student's textbook."],
          ["Validation", count("val"), "It checks itself on these while learning, like practice tests."],
          ["Held-out test", count("test"), "Never used while learning. This is the final exam, so the score is honest."],
        ].map(([name, value, text]) => (
          <div key={name as string} className="rounded-xl border bg-background/40 p-3">
            <dt className="text-sm font-medium text-foreground">
              {name} · <span className="tabular-nums">{value}</span>
            </dt>
            <dd className="mt-0.5 text-xs text-muted-foreground">{text}</dd>
          </div>
        ))}
      </dl>
      {classNames.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>Labels:</span>
          {classNames.map((name, i) =>
            name ? (
              <span key={name} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: BOX_COLORS[i % BOX_COLORS.length] }} />
                {name.replace(/_/g, " ")}
              </span>
            ) : null
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((f) => (
          <article key={f.id} className="overflow-hidden rounded-xl border bg-background/40">
            <div className="relative aspect-[4/3] bg-[#171f1b]">
              <LabelledThumbnail datasetId={sampleId} file={f} boxes={boxes[f.id]} classNames={classNames} />
              <span
                className={cn(
                  "absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  f.folder === "test" ? "bg-[#e9ff65] text-[#171f1b]" : "bg-black/60 text-white"
                )}
              >
                {splitLabel(f.folder)}
              </span>
            </div>
            <p className="truncate p-2 text-xs text-foreground" title={f.originalName}>
              {f.originalName}
            </p>
          </article>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm">
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
        <Button className="gap-1.5" onClick={onNext}>
          Next: try labelling <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
};

const TrainingStep: React.FC<{ model: SampleModel | null; onNext: () => void; onFinishWithoutTest: () => void }> = ({
  model,
  onNext,
  onFinishWithoutTest,
}) => (
  <section className="space-y-5 rounded-2xl border bg-card p-5 md:p-6" aria-labelledby="training-heading">
    <div>
      <h2 id="training-heading" className="text-xl font-semibold text-foreground">
        How training works
      </h2>
      <p className="mt-0.5 text-sm text-muted-foreground">Training means showing the computer labelled photos many times, until it can spot the defects by itself.</p>
    </div>
    <StepGuide
      what="This is practice, so GSN has already trained a model for you to test. No model is trained in this level."
      why="You'll train a real one in Level 2, on your own photos. Learn what happens during training and what its settings mean, so you're ready for it."
    />
    <ol className="grid gap-3 sm:grid-cols-2">
      {TRAINING_JOURNEY.map(({ Icon, title, text }, i) => (
        <li key={title} className="flex gap-3 rounded-xl border bg-background/40 p-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-foreground">
              {i + 1}. {title}
            </span>
            <span className="block text-sm text-muted-foreground">{text}</span>
          </span>
        </li>
      ))}
    </ol>
    <div>
      <h3 className="text-sm font-semibold text-foreground">The settings of a training run</h3>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        {TRAINING_SETTINGS.map(({ name, text }) => (
          <div key={name} className="rounded-xl border bg-background/40 p-3">
            <dt className="text-sm font-medium text-foreground">{name}</dt>
            <dd className="mt-0.5 text-sm text-muted-foreground">{text}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm text-muted-foreground">In Level 2 you choose the model size and can make more training photos. Vision-M starts you with good settings, and you can change them.</p>
    </div>
    {model ? (
      <div className="rounded-xl border bg-secondary/30 p-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Sparkles className="h-4 w-4" aria-hidden="true" /> The model GSN trained for this sample
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Model {model.modelVersion}, trained by GSN on labelled photos of this kind.
        </p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            ["Overall score (mAP50)", model.mAP50, "How well it finds and places defects."],
            ["Precision", model.precision, "When it says defect, how often it's right."],
            ["Recall", model.recall, "Of all real defects, how many it finds."],
          ].map(([name, value, text]) => (
            <div key={name as string} className="rounded-lg border bg-background/40 p-3">
              <dt className="text-xs text-muted-foreground">{name}</dt>
              <dd className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">
                {typeof value === "number" ? `${Math.round(value * 100)}%` : "–"}
              </dd>
              <dd className="mt-0.5 text-xs text-muted-foreground">{text}</dd>
            </div>
          ))}
        </dl>
      </div>
    ) : (
      <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        GSN&apos;s ready-made model for this sample isn&apos;t ready yet, so this sample has no test or report. You can
        finish here, or try another sample to see the full level.
      </p>
    )}
    <div className="flex justify-end">
      {model ? (
        <Button className="gap-1.5" onClick={onNext}>
          Next: test this model <ArrowRight className="h-4 w-4" />
        </Button>
      ) : (
        <Button className="gap-1.5" onClick={onFinishWithoutTest}>
          Finish this sample <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  </section>
);

const LevelOnePage: React.FC = () => {
  const { sampleId = "" } = useParams<{ sampleId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sample, setSample] = useState<SampleDataset | null>(null);
  const [model, setModel] = useState<SampleModel | null>(null);
  const [files, setFiles] = useState<SampleFile[] | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const guided = sample ? guidedMissionForSample(sample.project) : null;
  const mission = guided?.mission.title ?? sample?.name ?? "";

  useEffect(() => {
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const [{ datasets, models }, json] = await Promise.all([
          getSamples(),
          apiRequest<{ files: Record<string, unknown>[] }>(`/dataset/${encodeURIComponent(sampleId)}/files?type=image&limit=5000`),
        ]);
        const found = datasets.find((d) => d.id === sampleId);
        if (!found) throw new Error("This GSN sample isn't available right now.");
        const mapped = guidedMissionForSample(found.project);
        const { level } = await startLevel({
          level: 1,
          mission: mapped?.mission.title ?? found.name,
          industry: mapped?.industryName ?? found.industry,
          sample: found.project,
        });
        if (cancelled) return;
        // GSN's model for this sample: one trained on this very version first, as the server picks it
        const wanted = found.project.trim().toLowerCase();
        const best = models
          .filter((m) => m.project.trim().toLowerCase() === wanted && m.modelType !== "RF_DETR")
          .sort(
            (a, b) =>
              Number(b.datasetVersion === found.version) - Number(a.datasetVersion === found.version) ||
              (b.mAP50 ?? 0) - (a.mAP50 ?? 0)
          )[0];
        setSample(found);
        setModel(best ?? null);
        setCompleted(level.completedSteps);
        setFiles(
          (json.files ?? []).map((f) => ({
            id: String(f._id ?? f.id ?? f.storedName),
            storedName: String(f.storedName ?? ""),
            originalName: String(f.originalName ?? f.storedName ?? ""),
            folder: (f.folder as string) ?? null,
          }))
        );
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sampleId]);

  const firstOpen = STEPS.findIndex((s) => !completed.includes(s.id));
  /** The furthest step the student may open: the first one not done yet */
  const furthest = firstOpen === -1 ? STEPS.length - 1 : firstOpen;
  const asked = STEPS.findIndex((s) => s.id === searchParams.get("step"));
  const stepIndex = asked !== -1 && asked <= furthest ? asked : furthest;
  const step: StepId = STEPS[stepIndex].id;

  // Stay on the step once it's open: passing practice mustn't jump past the student's score
  const loaded = !!sample && !!files;
  useEffect(() => {
    if (loaded && (asked === -1 || asked > furthest)) setSearchParams({ step }, { replace: true });
  }, [loaded, asked, furthest, step, setSearchParams]);

  const goTo = useCallback(
    (next: StepId) => {
      setSearchParams({ step: next });
      window.scrollTo({ top: 0 });
    },
    [setSearchParams]
  );

  /** A step finished, as the page sees it (a step the server was already told about stays as it is) */
  const markDone = (id: StepId) => setCompleted((prev) => (prev.includes(id) ? prev : [...prev, id]));
  /** No ready-made model: nothing to test, so the level ends after training */
  const finishWithoutTest = () => {
    const rest: StepId[] = ["training", "test", "report"];
    setCompleted((prev) => [...new Set([...prev, ...rest])]);
    void saveLevelSteps(mission, rest);
    goTo("report");
  };
  const finishAndGo = (id: StepId, next: StepId) => {
    markDone(id);
    saveLevelProgress({ mission, step: id });
    goTo(next);
  };

  const { setItems: setBreadcrumbs } = useBreadcrumbs();
  useEffect(() => {
    setBreadcrumbs([{ label: "Dashboard", href: "/dashboard" }, { label: "Level 1" }, ...(mission ? [{ label: mission }] : [])]);
    return () => setBreadcrumbs(null);
  }, [mission, setBreadcrumbs]);

  const testFiles = useMemo(() => (files ?? []).filter((f) => f.folder === "test"), [files]);

  if (error) {
    return (
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <p className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">Couldn&apos;t open Level 1: {error}</p>
      </div>
    );
  }
  if (!sample || !files) return <LoadingState message="Opening Level 1..." />;

  const levelDone = completed.includes("report");

  return (
    <motion.div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Level 1 · {guided?.industryName ?? sample.industry}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">{mission}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here you only practise, to understand the basics of AI inspection on real photos. No real model is made in this level: you&apos;ll build your own in Level 2.
        </p>
      </div>

      <nav className="grid grid-cols-2 overflow-hidden rounded-xl border sm:grid-cols-5" aria-label="Level 1 steps">
        {STEPS.map((s, i) => {
          const done = completed.includes(s.id);
          const locked = i > furthest;
          return (
            <button
              key={s.id}
              type="button"
              disabled={locked}
              onClick={() => goTo(s.id)}
              aria-current={s.id === step ? "step" : undefined}
              className={cn(
                "flex items-center justify-center gap-2 border-b border-r px-2 py-3 text-sm transition-colors sm:border-b-0 sm:last:border-r-0",
                s.id === step ? "bg-secondary font-medium text-foreground" : "bg-card text-muted-foreground",
                !locked && "hover:bg-secondary/60 hover:text-foreground",
                locked && "cursor-not-allowed opacity-60"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px]",
                  done ? "bg-success text-white" : s.id === step ? "bg-foreground text-background" : "border"
                )}
              >
                {done ? <Check className="h-3 w-3" aria-label="Done" /> : i + 1}
              </span>
              {s.label}
              {locked && <Lock className="h-3 w-3 shrink-0" aria-label="Locked" />}
            </button>
          );
        })}
      </nav>

      {step === "dataset" && <DatasetStep sampleId={sampleId} files={files} onNext={() => finishAndGo("dataset", "practice")} />}

      {step === "practice" && (
        <div className="space-y-4">
          <StepGuide
            what="Now try it yourself: draw a box around each defect, and your boxes are checked against GSN's labels."
            why="This is how you learn what a model needs to see. Do as many photos as you like, even one or two, then move on. Your labels here are for practice and aren't saved."
          />
          <PlaygroundLabelPractice
            datasetId={sampleId}
            files={files}
            continueLabel="Next: how training works"
            onContinue={() => goTo("training")}
            onFinished={(score) => {
              markDone("practice");
              saveLevelProgress({ mission, step: "practice", practiceScore: score ?? undefined });
            }}
          />
        </div>
      )}

      {step === "training" && (
        <TrainingStep model={model} onNext={() => finishAndGo("training", "test")} onFinishWithoutTest={finishWithoutTest} />
      )}

      {step === "test" && (
        <div className="space-y-4">
          <StepGuide
            what="Test GSN's model on photos it never learned from, and compare what it found with GSN's labels."
            why="A model's real score comes from photos it has never seen. This test doesn't use your monthly predictions."
          />
          {model ? (
            <PlaygroundTestStep
              projectId={`sample:${sampleId}`}
              companyName=""
              projectName=""
              datasetId={sampleId}
              sampleProject={null}
              missionName={mission}
              industryName={guided?.industryName ?? sample.industry}
              learning={{ modelName: model.modelVersion, mAP50: model.mAP50 }}
              onTestFinished={() => markDone("test")}
              onReportCreated={() => {
                markDone("report");
                goTo("report");
              }}
              testFiles={testFiles}
              classNames={[]}
            />
          ) : (
            <p className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
              GSN doesn&apos;t have a ready-made model for this sample yet.
            </p>
          )}
        </div>
      )}

      {step === "report" && (
        <div className="space-y-4">
          {model && (
            <StepGuide
              what="Turn your test into a report. In a factory, this is how results get shared with the team."
              why="Each report is kept for 24 hours, so download the ones you want to keep. You can always run the test again and make a new one."
            />
          )}
          {levelDone && (
            <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Check className="h-5 w-5 text-success" aria-hidden="true" /> Level 1 complete
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">Next, in Level 2, you upload your own photos and train your own model.</p>
              </div>
              <Button className="gap-1.5" onClick={() => navigate("/dashboard")}>
                Go to Level 2 <ArrowRight className="h-4 w-4" />
              </Button>
            </section>
          )}
          {model && <PlaygroundReportStep projectId={`sample:${sampleId}`} onGoToTest={() => goTo("test")} />}
        </div>
      )}
    </motion.div>
  );
};

export default LevelOnePage;
