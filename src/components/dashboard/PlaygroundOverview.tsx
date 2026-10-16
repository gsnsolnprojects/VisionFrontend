import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Check, Clock, FolderKanban, GraduationCap, Layers } from "lucide-react";
import { fadeInUpVariants, staggerContainerVariants } from "@/utils/animations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useProfile } from "@/hooks/useProfile";
import { usePlanAccess } from "@/contexts/plan-access-context";
import { getLearningProgress, type LearningProgress } from "@/lib/api/dashboard";
import { getModelQuota, type ModelQuota } from "@/lib/api/models";
import { hasLearningStep, markLearningStep } from "@/lib/learningProgress";
import { LESSONS, type Lesson } from "./learning/lessons";
import { cn } from "@/lib/utils";

interface PlaygroundOverviewProps {
  projects: any[];
  onCreateProject?: () => void;
}

interface Step {
  id: string;
  title: string;
  description: string;
  done: boolean;
  action: string;
  onStart: () => void;
  /** a step that can't start yet, with the reason */
  blockedReason?: string;
}

/**
 * Overview for Playground workspaces: a guided learning path whose steps tick themselves
 * from what the user has done, short lessons, and the workspace's limits. Other plans
 * keep the regular DashboardOverview.
 */
export const PlaygroundOverview: React.FC<PlaygroundOverviewProps> = ({ projects, onCreateProject }) => {
  const navigate = useNavigate();
  const { user } = useProfile();
  const planAccess = usePlanAccess();
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [quota, setQuota] = useState<ModelQuota | null>(null);
  const [openLesson, setOpenLesson] = useState<Lesson | null>(null);
  const [readResults, setReadResults] = useState(false);

  const load = useCallback(async () => {
    const [p, q] = await Promise.allSettled([getLearningProgress(), getModelQuota()]);
    setProgress(p.status === "fulfilled" ? p.value : null);
    setQuota(q.status === "fulfilled" ? q.value : null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setReadResults(hasLearningStep(user?.id, "read-results"));
  }, [user?.id]);

  const firstProject = projects[0];
  const openProject = () => firstProject && navigate(`/dataset/${firstProject.id}`);
  const needProject = firstProject ? undefined : "Create a project first";

  const showLesson = (lesson: Lesson) => {
    setOpenLesson(lesson);
    if (lesson.id === "reading-results") {
      markLearningStep(user?.id, "read-results");
      setReadResults(true);
    }
  };

  const steps: Step[] = useMemo(
    () => [
      {
        id: "project",
        title: "Create your first project",
        description: "A project holds the datasets and models for one inspection idea.",
        done: projects.length > 0,
        action: "Create project",
        onStart: () => (onCreateProject ? onCreateProject() : navigate("/dashboard?action=create-project")),
      },
      {
        id: "sample",
        title: "Add a sample dataset",
        description: "Pick a ready-made, labelled dataset from GSN's library: blister packs, terminals and more.",
        done: (progress?.datasets ?? 0) > 0,
        action: "Add sample",
        onStart: openProject,
        blockedReason: needProject,
      },
      {
        id: "explore",
        title: "Explore the images and labels",
        description: "Open your dataset and look at the photos and the boxes drawn on them.",
        done: hasLearningStep(user?.id, "explored-dataset"),
        action: "Open dataset",
        onStart: openProject,
        blockedReason: needProject,
      },
      {
        id: "train",
        title: "Train your first model",
        description: "Start with a nano model: it's the fastest to train.",
        done: (progress?.models ?? 0) > 0,
        action: "Start training",
        onStart: () => navigate("/dashboard?view=simulation"),
        blockedReason: needProject,
      },
      {
        id: "results",
        title: "Understand the results",
        description: "Learn what precision, recall and mAP tell you about your model.",
        done: readResults,
        action: "Read lesson",
        onStart: () => {
          const lesson = LESSONS.find((l) => l.id === "reading-results");
          if (lesson) showLesson(lesson);
        },
      },
      {
        id: "predict",
        title: "Test it on your own photo",
        description: "Run your model on a new image and see what it finds.",
        done: (progress?.predictions ?? 0) > 0,
        action: "Run prediction",
        onStart: () => navigate("/project/prediction"),
        blockedReason: needProject,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projects, progress, readResults, user?.id, onCreateProject]
  );

  const doneCount = steps.filter((s) => s.done).length;
  const nextStep = steps.find((s) => !s.done);
  const projectLimit = planAccess.data?.access?.limits?.projects;
  const projectsUsed = planAccess.data?.usage?.projects ?? projects.length;

  return (
    <motion.div className="space-y-8" variants={staggerContainerVariants} initial="hidden" animate="visible">
      {/* Header + overall progress */}
      <motion.section variants={fadeInUpVariants} aria-label="Learning progress">
        <Card>
          <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <GraduationCap className="h-4 w-4" aria-hidden="true" />
                Playground
              </div>
              <h2 className="text-2xl font-semibold text-foreground">Learn computer vision, step by step</h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                Follow the path below to build and test your first inspection model on real factory images.
              </p>
            </div>
            <div className="w-full space-y-2 md:w-72">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">Your progress</span>
                <span className="font-medium">
                  {doneCount} of {steps.length} steps
                </span>
              </div>
              <Progress value={(doneCount / steps.length) * 100} aria-label="Learning path progress" />
              {nextStep ? (
                <Button className="mt-2 w-full gap-2" onClick={nextStep.onStart} disabled={!!nextStep.blockedReason}>
                  Next: {nextStep.title}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              ) : (
                <p className="pt-2 text-sm font-medium text-foreground">
                  Path complete. Try a small model or another sample dataset next.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.section>

      <motion.div className="grid grid-cols-1 gap-6 lg:grid-cols-3" variants={fadeInUpVariants}>
        {/* Learning path */}
        <section className="lg:col-span-2" aria-label="Your learning path">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Your learning path</h3>
          <ol className="space-y-3">
            {steps.map((step, index) => {
              const isNext = step === nextStep;
              return (
                <li
                  key={step.id}
                  className={cn(
                    "flex items-start gap-4 rounded-lg border bg-card p-4",
                    isNext && "border-primary/60 ring-1 ring-primary/20"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium",
                      step.done ? "border-transparent bg-primary text-primary-foreground" : "text-muted-foreground"
                    )}
                    aria-hidden="true"
                  >
                    {step.done ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-medium", step.done && "text-muted-foreground")}>{step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                    {step.blockedReason && !step.done && (
                      <p className="mt-1 text-xs text-muted-foreground">{step.blockedReason}</p>
                    )}
                  </div>
                  <Button
                    variant={isNext ? "default" : "outline"}
                    size="sm"
                    className="shrink-0"
                    onClick={step.onStart}
                    disabled={!!step.blockedReason && !step.done}
                  >
                    {step.done ? "Open" : step.action}
                  </Button>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Workspace limits */}
        <aside aria-label="Your workspace">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Your workspace</h3>
          <Card>
            <CardContent className="space-y-4 p-5 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <FolderKanban className="h-4 w-4" aria-hidden="true" />
                  Projects
                </span>
                <span className="font-medium">
                  {projectsUsed}
                  {typeof projectLimit === "number" ? ` of ${projectLimit}` : ""}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Layers className="h-4 w-4" aria-hidden="true" />
                  Trained models
                </span>
                <span className="font-medium">
                  {quota?.limited ? `${quota.used ?? 0} of ${quota.limit}` : (progress?.models ?? "—")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Predictions run
                </span>
                <span className="font-medium">{progress?.predictions ?? "—"}</span>
              </div>
              {quota?.limited && (
                <p className="border-t pt-3 text-xs text-muted-foreground">
                  Playground trains nano and small models. Delete a model to free a slot.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </motion.div>

      {/* Lessons */}
      <motion.section variants={fadeInUpVariants} aria-label="Learn the basics">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Learn the basics</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LESSONS.map((lesson) => (
            <button
              key={lesson.id}
              type="button"
              onClick={() => showLesson(lesson)}
              className="group rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {lesson.minutes} min read
              </div>
              <p className="font-medium text-foreground">{lesson.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{lesson.summary}</p>
            </button>
          ))}
        </div>
      </motion.section>

      <Sheet open={!!openLesson} onOpenChange={(open) => !open && setOpenLesson(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {openLesson && (
            <>
              <SheetHeader>
                <SheetTitle>{openLesson.title}</SheetTitle>
                <SheetDescription>
                  {openLesson.summary} · {openLesson.minutes} min read
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                {openLesson.sections.map((section) => (
                  <div key={section.heading}>
                    <h4 className="mb-1 font-medium text-foreground">{section.heading}</h4>
                    <p className="text-sm leading-relaxed text-muted-foreground">{section.body}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </motion.div>
  );
};
