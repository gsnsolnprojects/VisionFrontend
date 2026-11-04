import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Check,
  FileText,
  FlaskConical,
  GraduationCap,
  PenLine,
  Trophy,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { apiRequest } from "@/lib/api/config";
import { getBadges, onProgressSaved, type EarnedBadge } from "@/lib/api/badges";
import type { LevelProgress } from "@/lib/api/levels";
import { IndustryArt } from "@/components/landing/IndustryArt";
import { BADGES, BadgeMedal, badgeInfo } from "@/components/playground/badges";
import { fadeInUpVariants, staggerContainerVariants } from "@/utils/animations";
import { cn } from "@/lib/utils";

/**
 * The student's story on the Playground overview: a welcome for someone new (where they are, what
 * they'll learn and become), the journey through the levels, badges for what they've done, and a
 * card to mark finishing a level. All of it comes from the saved level progress and usage.
 */

const goToLevels = () =>
  document.getElementById("pick-industry")?.scrollIntoView({ behavior: "smooth", block: "start" });

const LEARN: { Icon: LucideIcon; title: string; text: string }[] = [
  { Icon: PenLine, title: "Label", text: "Mark defects on real photos, so the AI knows what to look for." },
  { Icon: GraduationCap, title: "Train", text: "Teach your own model on a GPU, the way real projects do." },
  { Icon: FlaskConical, title: "Test", text: "Find out how good it really is, on photos it has never seen." },
  { Icon: FileText, title: "Report", text: "Share the results the way a factory team does." },
];

/** For someone who hasn't started anything yet. Before a plan, the button leads to choosing one. */
export const PlaygroundWelcome: React.FC<{ onChoosePlan?: () => void }> = ({ onChoosePlan }) => (
  <motion.section
    variants={fadeInUpVariants}
    aria-labelledby="welcome-heading"
    className="overflow-hidden rounded-2xl bg-[#171f1b] text-[#f5f5ee]"
  >
    <div className="grid items-center gap-8 p-6 md:p-10 lg:grid-cols-[1.1fr_1fr]">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#bec9b0]">You&apos;re in Vision-M Playground</p>
        <h2 id="welcome-heading" className="mt-4 text-3xl font-bold leading-[1.05] tracking-tight sm:text-4xl md:text-5xl">
          Learn how factories use AI to catch defects,{" "}
          <span className="text-[#e9ff65]">by building it yourself.</span>
        </h2>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-[#bec9b0] md:text-base">
          No coding needed. By the end, you&apos;ll have built and tested your own AI inspection model.
        </p>
        <Button className="mt-7 gap-1.5 bg-[#e9ff65] text-[#171f1b] hover:bg-[#e9ff65]/90" onClick={onChoosePlan ?? goToLevels}>
          {onChoosePlan ? "Choose Playground" : "Start Level 1"}
          {onChoosePlan ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : <ArrowDown className="h-4 w-4" aria-hidden="true" />}
        </Button>
      </div>
      <div className="relative hidden overflow-hidden rounded-xl border border-[#485840] p-2 sm:block">
        <IndustryArt index={1} highlight="labelled" />
        {/* Scanner line sweeping over the picture, like an inspection camera */}
        <div aria-hidden className="scan-line pointer-events-none absolute inset-x-2" />
      </div>
    </div>
    <div className="border-t border-[#485840] p-6 md:px-10 md:py-8">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#bec9b0]">What you&apos;ll learn</h3>
      <motion.ul
        className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {LEARN.map(({ Icon, title, text }) => (
          <motion.li
            key={title}
            variants={fadeInUpVariants}
            whileHover={{ y: -4 }}
            className="rounded-xl border border-[#485840] p-4 transition-colors hover:border-[#e9ff65]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e9ff65] text-[#171f1b]">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-semibold">{title}</p>
            <p className="mt-1 text-sm text-[#bec9b0]">{text}</p>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  </motion.section>
);

type StopState = "done" | "now" | "later";

/** Level 1, Level 2, done: where the student is on the way */
export const JourneyMap: React.FC<{ levels: LevelProgress[] }> = ({ levels }) => {
  const oneDone = levels.some((l) => l.level === 1 && l.finishedAt);
  const twoDone = levels.some((l) => l.level === 2 && l.finishedAt);
  const twoStarted = levels.some((l) => l.level === 2 && l.completedSteps.length > 0);
  const stops: { title: string; text: string; state: StopState }[] = [
    { title: "Level 1", text: "Learn on a real sample", state: oneDone ? "done" : twoStarted && !twoDone ? "later" : "now" },
    { title: "Level 2", text: "Build your own model", state: twoDone ? "done" : oneDone || twoStarted ? "now" : "later" },
    { title: "Done", text: "Your own AI inspection model, built and tested", state: oneDone && twoDone ? "now" : "later" },
  ];
  return (
    <ol className="grid gap-3 sm:grid-cols-3" aria-label="Your journey">
      {stops.map((stop) => (
        <li
          key={stop.title}
          aria-current={stop.state === "now" ? "step" : undefined}
          className={cn(
            "flex items-start gap-3 rounded-xl border p-4",
            stop.state === "now" && "border-ring bg-secondary/60",
            stop.state === "done" && "border-success/40 bg-success/10"
          )}
        >
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-muted-foreground",
              stop.state === "done" && "border-transparent bg-success text-white",
              stop.state === "now" && "border-transparent bg-foreground text-background"
            )}
          >
            {stop.state === "done" ? <Check className="h-4 w-4" aria-label="Done" /> : stop.title === "Done" ? <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> : stop.title.slice(-1)}
          </span>
          <span>
            <span className="block text-sm font-semibold text-foreground">{stop.title}</span>
            <span className="block text-sm text-muted-foreground">{stop.text}</span>
          </span>
        </li>
      ))}
    </ol>
  );
};

const SHOWN_BADGES = 5;

/** The count, the latest badges (or the first ones to earn) and the way to the whole collection */
export const BadgeShelf: React.FC = () => {
  const navigate = useNavigate();
  const [earned, setEarned] = useState<EarnedBadge[] | null>(null);

  useEffect(() => {
    const look = () =>
      getBadges()
        .then(({ badges }) => setEarned(badges))
        .catch(() => setEarned((prev) => prev ?? []));
    void look();
    return onProgressSaved(look);
  }, []);

  if (!earned) return null;
  const earnedInfos = earned.flatMap((b) => badgeInfo(b.id) ?? []);
  const earnedIds = new Set(earnedInfos.map((b) => b.id));
  const shown = [...earnedInfos.slice(-SHOWN_BADGES).reverse(), ...BADGES.filter((b) => !earnedIds.has(b.id))].slice(0, SHOWN_BADGES);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          Your badges <span className="ml-1 font-normal text-muted-foreground">{earnedInfos.length} of {BADGES.length} earned</span>
        </h3>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/achievements")}>
          View all badges <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={BADGES.length}
        aria-valuenow={earnedInfos.length}
        aria-label="Badges earned"
      >
        <div className="h-full rounded-full bg-success transition-all duration-500" style={{ width: `${(earnedInfos.length / BADGES.length) * 100}%` }} />
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {shown.map((badge) => {
          const has = earnedIds.has(badge.id);
          return (
            <li key={badge.id} className={cn("rounded-xl border p-3 text-center", !has && "bg-background/40")}>
              <BadgeMedal badge={badge} earned={has} size={52} className="mx-auto" />
              <p className={cn("mt-2 text-sm font-medium", has ? "text-foreground" : "text-muted-foreground")}>{badge.name}</p>
              {!has && <p className="mt-0.5 text-xs text-muted-foreground">{badge.how}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

/** Marks finishing a level, with what the student really made */
export const LevelCompleteCard: React.FC<{ level: LevelProgress; onNext: () => void }> = ({ level, onNext }) => {
  const navigate = useNavigate();
  const { company, user } = useProfile();
  const companyName = company?.name ?? "";
  // Closed once, it stays closed in this browser; finishing the level again shows it again
  const closedKey = `visionm_level_done_closed_${user?.id ?? "anon"}_${level.mission}_${level.finishedAt}`;
  const [closed, setClosed] = useState(() => {
    try {
      return !!localStorage.getItem(closedKey);
    } catch {
      return false;
    }
  });
  const [numbers, setNumbers] = useState<{ photos: number | null; score: number | null } | null>(null);

  useEffect(() => {
    if (level.level !== 2 || !companyName) return;
    let cancelled = false;
    (async () => {
      const q = new URLSearchParams({ company: companyName, project: level.mission });
      const [datasets, models] = await Promise.all([
        apiRequest<{ datasets?: { totalImages?: number; isLinkedSample?: boolean; isAugmented?: boolean }[] }>(`/datasets?${q}&includeInactive=true`).catch(() => null),
        apiRequest<{ models?: { metrics?: { mAP50?: number | null } }[] }>(`/models?${q}`).catch(() => null),
      ]);
      if (cancelled) return;
      const own = datasets?.datasets?.find((d) => !d.isLinkedSample && !d.isAugmented);
      const scores = (models?.models ?? []).map((m) => m.metrics?.mAP50).filter((s): s is number => typeof s === "number");
      setNumbers({ photos: own?.totalImages ?? null, score: scores.length ? Math.max(...scores) : null });
    })();
    return () => {
      cancelled = true;
    };
  }, [level.level, level.mission, companyName]);

  if (closed) return null;

  const close = () => {
    setClosed(true);
    try {
      localStorage.setItem(closedKey, "1");
    } catch {
      // a convenience only
    }
  };

  const isTwo = level.level === 2;
  return (
    <motion.section
      variants={fadeInUpVariants}
      aria-labelledby="level-complete-heading"
      className="relative overflow-hidden rounded-2xl bg-[#171f1b] p-6 text-[#f5f5ee] md:p-8"
    >
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="absolute right-3 top-3 rounded-md p-1.5 text-[#bec9b0] transition-colors hover:bg-white/10 hover:text-[#f5f5ee]"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e9ff65] text-[#171f1b]">
          <Trophy className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#bec9b0]">{level.mission}</p>
          <h2 id="level-complete-heading" className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
            Level {level.level} complete!
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[#bec9b0] md:text-base">
            {isTwo
              ? "You built, trained and tested your own AI model. That's the same path a real inspection project follows."
              : "You've seen how AI inspection works on real factory photos. Now you're ready to build your own."}
          </p>
          {isTwo && numbers && (
            <dl className="mt-4 flex flex-wrap gap-6">
              {numbers.photos !== null && (
                <div>
                  <dt className="text-xs text-[#bec9b0]">Photos in your dataset</dt>
                  <dd className="text-2xl font-bold">{numbers.photos}</dd>
                </div>
              )}
              {numbers.score !== null && (
                <div>
                  <dt className="flex items-center gap-1 text-xs text-[#bec9b0]">
                    <BarChart3 className="h-3 w-3" aria-hidden="true" /> Best model score
                  </dt>
                  <dd className="text-2xl font-bold">{Math.round(numbers.score * 100)}%</dd>
                </div>
              )}
            </dl>
          )}
          <Button
            className="mt-5 gap-1.5 bg-[#e9ff65] text-[#171f1b] hover:bg-[#e9ff65]/90"
            onClick={() => (isTwo && level.projectId ? navigate(`/dataset/${level.projectId}`) : onNext())}
          >
            {isTwo ? "Make it better: label more photos" : "Go to Level 2"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </motion.section>
  );
};
