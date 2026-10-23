import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Check, CheckCircle2, Clock, Cpu, Lightbulb, Pill, Plug, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useProfile } from "@/hooks/useProfile";
import { useBreadcrumbs } from "@/components/app-shell/breadcrumb-context";
import { cn } from "@/lib/utils";
import {
  ALL_LESSONS,
  GLOSSARY,
  MODULES,
  WALKTHROUGH,
  type CheckQuestion,
  type Lesson,
  type WalkthroughTarget,
} from "@/components/learning/learningContent";

/**
 * Playground Learning centre (/learn): a five-step walkthrough linked to the app, twelve short
 * lessons in four modules with a two-question check each, progress saved per student in this
 * browser, a glossary, and links to practise on GSN's real datasets.
 */

const doneKey = (userId?: string) => `visionm_learning_done_${userId ?? "anon"}`;
// Same keys as the Playground sidebar and overview, to open the right project or industry
const lastProjectKey = (userId?: string) => `visionm_playground_last_project_${userId ?? "anon"}`;
const industryKey = (userId?: string) => `visionm_playground_industry_${userId ?? "anon"}`;

const readDone = (userId?: string): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(doneKey(userId)) || "[]") as string[]);
  } catch {
    return new Set();
  }
};

const PRACTICE = [
  { industry: "automotive", title: "Missing screw detective", text: "Terminal blocks with missing screws and bars.", Icon: Plug },
  { industry: "electronics", title: "PCB defect detective", text: "Circuit boards with six kinds of defect.", Icon: Cpu },
  { industry: "pharma", title: "Blister pack inspector", text: "Blister packs with empty or damaged pockets.", Icon: Pill },
];

/** The two-question check at the end of a lesson */
const LessonCheck: React.FC<{ questions: CheckQuestion[]; onAllAnswered: () => void }> = ({ questions, onAllAnswered }) => {
  const [picked, setPicked] = useState<(number | null)[]>(questions.map(() => null));

  useEffect(() => {
    if (picked.every((p) => p !== null)) onAllAnswered();
  }, [picked, onAllAnswered]);

  return (
    <div className="space-y-5">
      {questions.map((q, qi) => {
        const choice = picked[qi];
        return (
          <div key={q.question}>
            <p className="text-sm font-medium text-foreground">
              {qi + 1}. {q.question}
            </p>
            <div className="mt-2 space-y-1.5">
              {q.options.map((opt, oi) => {
                const answered = choice !== null;
                const isRight = oi === q.answer;
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={answered}
                    onClick={() => setPicked((prev) => prev.map((p, i) => (i === qi ? oi : p)))}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-left text-sm transition-colors",
                      !answered && "hover:border-ring/60",
                      answered && isRight && "border-success bg-success/10",
                      answered && choice === oi && !isRight && "border-destructive bg-destructive/10",
                      answered && !isRight && choice !== oi && "opacity-60"
                    )}
                  >
                    {opt}
                    {answered && isRight && <Check className="h-4 w-4 shrink-0 text-success" />}
                    {answered && choice === oi && !isRight && <X className="h-4 w-4 shrink-0 text-destructive" />}
                  </button>
                );
              })}
            </div>
            {choice !== null && (
              <p className="mt-2 text-xs text-muted-foreground">
                <span className={cn("font-semibold", choice === q.answer ? "text-success" : "text-destructive")}>
                  {choice === q.answer ? "Right. " : "Not quite. "}
                </span>
                {q.why}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

const LearningCentrePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useProfile();
  const { setItems: setBreadcrumbs } = useBreadcrumbs();
  const [done, setDone] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Lesson | null>(null);
  const [checked, setChecked] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setDone(readDone(user?.id));
  }, [user?.id]);

  useEffect(() => {
    setBreadcrumbs([{ label: "Dashboard", href: "/dashboard" }, { label: "Learning centre" }]);
    return () => setBreadcrumbs(null);
  }, [setBreadcrumbs]);

  const markDone = (id: string) => {
    setDone((prev) => {
      const next = new Set(prev).add(id);
      try {
        localStorage.setItem(doneKey(user?.id), JSON.stringify([...next]));
      } catch {
        // progress is a convenience only
      }
      return next;
    });
  };

  const openLesson = (lesson: Lesson) => {
    setChecked(false);
    setOpen(lesson);
  };

  const goTo = (target: WalkthroughTarget) => {
    let projectId: string | null = null;
    try {
      projectId = localStorage.getItem(lastProjectKey(user?.id));
    } catch {
      projectId = null;
    }
    if (target === "overview" || !projectId) {
      navigate("/dashboard");
      return;
    }
    navigate(target === "label" ? `/dataset/${projectId}` : `/dataset/${projectId}?step=${target}`);
  };

  const practise = (industry: string) => {
    try {
      localStorage.setItem(industryKey(user?.id), industry);
    } catch {
      // the overview just won't preselect it
    }
    navigate("/dashboard");
  };

  const glossary = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? GLOSSARY.filter((g) => `${g.term} ${g.meaning}`.toLowerCase().includes(q)) : GLOSSARY;
  }, [query]);

  const total = ALL_LESSONS.length;
  const doneCount = ALL_LESSONS.filter((l) => done.has(l.id)).length;
  const nextLesson = ALL_LESSONS.find((l) => !done.has(l.id));

  return (
    <motion.div className="mx-auto max-w-6xl space-y-10 p-4 md:p-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {/* Header + progress */}
      <section className="overflow-hidden rounded-2xl bg-[#171f1b] text-[#f5f5ee]">
        <div className="grid gap-6 p-6 md:grid-cols-[1.4fr_1fr] md:items-end md:p-10">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#bec9b0]">Learning centre</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              Build understanding,
              <br />
              <span className="text-[#e9ff65]">one step at a time.</span>
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-[#bec9b0]">
              Short lessons on how AI learns to spot defects, written for first-timers. Read one, answer two quick
              questions, then try it on real factory photos.
            </p>
          </div>
          <div className="rounded-xl border border-[#485840] p-5">
            <p className="text-sm text-[#bec9b0]">Your progress</p>
            <p className="mt-1 text-2xl font-bold">
              {doneCount} <span className="text-base font-normal text-[#bec9b0]">of {total} lessons done</span>
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#2b352f]">
              <div className="h-full rounded-full bg-[#e9ff65] transition-all" style={{ width: `${(doneCount / total) * 100}%` }} />
            </div>
            {nextLesson ? (
              <Button
                size="sm"
                className="mt-4 w-full gap-1.5 bg-[#e9ff65] text-[#171f1b] hover:bg-[#e9ff65]/90"
                onClick={() => openLesson(nextLesson)}
              >
                {doneCount === 0 ? "Start with" : "Next:"} {nextLesson.title} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <p className="mt-4 text-sm font-medium text-[#e9ff65]">All lessons done. Nice work!</p>
            )}
          </div>
        </div>
      </section>

      {/* Walkthrough */}
      <section aria-labelledby="walkthrough-heading">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Start here</p>
        <h2 id="walkthrough-heading" className="mt-1 text-xl font-semibold text-foreground">
          Your first project in 5 steps
        </h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-5">
          {WALKTHROUGH.map((w, i) => (
            <li key={w.title} className="flex flex-col rounded-xl border bg-card p-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#171f1b] text-xs font-semibold text-[#e9ff65]">
                {i + 1}
              </span>
              <p className="mt-3 text-sm font-semibold text-foreground">{w.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{w.text}</p>
              <button
                type="button"
                onClick={() => goTo(w.target)}
                className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-medium text-foreground underline-offset-4 hover:underline"
              >
                {w.action} <ArrowRight className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ol>
      </section>

      {/* Lessons */}
      <section aria-labelledby="lessons-heading" className="space-y-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Lessons</p>
          <h2 id="lessons-heading" className="mt-1 text-xl font-semibold text-foreground">
            Learn the ideas behind every step
          </h2>
        </div>
        {MODULES.map((m, mi) => {
          const moduleDone = m.lessons.filter((l) => done.has(l.id)).length;
          return (
            <div key={m.id}>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold text-foreground">
                  <span className="mr-2 font-mono text-xs text-muted-foreground">0{mi + 1}</span>
                  {m.title}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">{m.blurb}</span>
                </h3>
                <span className="text-xs text-muted-foreground">
                  {moduleDone} of {m.lessons.length} done
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {m.lessons.map((l) => {
                  const isDone = done.has(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => openLesson(l)}
                      className={cn(
                        "group flex flex-col rounded-xl border bg-card p-4 text-left transition-colors hover:border-ring/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isDone && "border-success/40"
                      )}
                    >
                      <span className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {l.minutes} min read
                        </span>
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 font-medium text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Done
                          </span>
                        ) : (
                          <BookOpen className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <span className="mt-2 font-medium text-foreground">{l.title}</span>
                      <span className="mt-1 text-sm text-muted-foreground">{l.summary}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      {/* Practice */}
      <section aria-labelledby="practice-heading">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Practise</p>
        <h2 id="practice-heading" className="mt-1 text-xl font-semibold text-foreground">
          Try it on real factory photos
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {PRACTICE.map(({ industry, title, text, Icon }) => (
            <div key={industry} className="flex items-start gap-3 rounded-xl border bg-card p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <Icon className="h-5 w-5 text-foreground" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{title}</p>
                <p className="text-sm text-muted-foreground">{text}</p>
                <button
                  type="button"
                  onClick={() => practise(industry)}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Open this mission <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Glossary */}
      <section aria-labelledby="glossary-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Glossary</p>
            <h2 id="glossary-heading" className="mt-1 text-xl font-semibold text-foreground">
              Words you&apos;ll meet, in plain English
            </h2>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a word"
              className="pl-9"
              aria-label="Search the glossary"
            />
          </div>
        </div>
        <dl className="mt-4 grid gap-x-8 gap-y-3 rounded-2xl border bg-card p-5 md:grid-cols-2">
          {glossary.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matching words.</p>
          ) : (
            glossary.map((g) => (
              <div key={g.term} className="border-b pb-3 last:border-b-0 md:[&:nth-last-child(2)]:border-b-0">
                <dt className="text-sm font-semibold text-foreground">{g.term}</dt>
                <dd className="mt-0.5 text-sm text-muted-foreground">{g.meaning}</dd>
              </div>
            ))
          )}
        </dl>
      </section>

      {/* Lesson reader */}
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle className="text-2xl">{open.title}</SheetTitle>
                <SheetDescription>
                  {open.summary} · {open.minutes} min read
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                {open.sections.map((s) => (
                  <div key={s.heading}>
                    <h4 className="mb-1 font-semibold text-foreground">{s.heading}</h4>
                    <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                  </div>
                ))}
                {open.image && (
                  <figure className="overflow-hidden rounded-xl border">
                    <img src={open.image.src} alt={open.image.caption} className="w-full" loading="lazy" />
                    <figcaption className="bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">{open.image.caption}</figcaption>
                  </figure>
                )}
                <div className="flex gap-3 rounded-xl bg-[#171f1b] p-4 text-[#f5f5ee]">
                  <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-[#e9ff65]" />
                  <p className="text-sm">
                    <span className="font-semibold text-[#e9ff65]">Key idea: </span>
                    {open.keyIdea}
                  </p>
                </div>
                <div className="rounded-xl border p-4">
                  <p className="mb-3 text-sm font-semibold text-foreground">Quick check</p>
                  <LessonCheck key={open.id} questions={open.check} onAllAnswered={() => setChecked(true)} />
                </div>
                {done.has(open.id) ? (
                  <p className="flex items-center gap-2 text-sm font-medium text-success">
                    <CheckCircle2 className="h-4 w-4" /> You&apos;ve finished this lesson.
                  </p>
                ) : (
                  <Button className="w-full gap-1.5" disabled={!checked} onClick={() => markDone(open.id)}>
                    <Check className="h-4 w-4" /> {checked ? "Mark as done" : "Answer both questions to finish"}
                  </Button>
                )}
                {(() => {
                  const i = ALL_LESSONS.findIndex((l) => l.id === open.id);
                  const next = ALL_LESSONS[i + 1];
                  return next ? (
                    <button
                      type="button"
                      onClick={() => openLesson(next)}
                      className="inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      Next lesson: {next.title} <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  ) : null;
                })()}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </motion.div>
  );
};

export default LearningCentrePage;
