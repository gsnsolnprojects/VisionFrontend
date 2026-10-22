import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, RotateCcw, Trophy, X } from "lucide-react";
import { fadeInUpVariants } from "@/utils/animations";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * "Can you spot the issue?" warm-up on the Playground overview. Each photo is a crop of a real
 * board from the PCB dataset in GSN's sample library, and each highlight is that image's
 * labelled defect box, so every answer is the dataset's own label.
 */

type DefectId = "missing_hole" | "mouse_bite" | "open_circuit" | "short" | "spur" | "spurious_copper";

const DEFECTS: Record<DefectId, { label: string; meaning: string }> = {
  missing_hole: { label: "Missing hole", meaning: "a pad that should be drilled through has no hole." },
  mouse_bite: { label: "Mouse bite", meaning: "a small piece is bitten out of a track's edge, leaving it thin and weak." },
  open_circuit: { label: "Open circuit", meaning: "a track is broken, so the signal can't get through." },
  short: { label: "Short circuit", meaning: "copper joins two tracks that should stay apart." },
  spur: { label: "Spur", meaning: "a thin sliver of copper sticks out from a track and could touch a neighbour." },
  spurious_copper: { label: "Spurious copper", meaning: "an extra patch of copper is left where there should be none." },
};

/** "a spur", "an open circuit" */
const withArticle = (id: DefectId) => {
  const label = DEFECTS[id].label.toLowerCase();
  return `${/^[aeiou]/.test(label) ? "an" : "a"} ${label}`;
};

interface Question {
  image: string;
  alt: string;
  hint: string;
  /** what the photo actually shows, used in the explanation */
  observed: string;
  answer: DefectId;
  options: [DefectId, DefectId, DefectId, DefectId];
  /** the labelled defect, as a percentage of the cropped image */
  box: { left: number; top: number; width: number; height: number };
}

const QUESTIONS: Question[] = [
  {
    image: "/playground/quiz-pcb-open-circuit.jpg", // open_circuit_14
    alt: "Close-up of a circuit board with parallel copper tracks",
    hint: "Look closely at the copper tracks.",
    observed: "one copper track is cut in the middle",
    answer: "open_circuit",
    options: ["missing_hole", "short", "open_circuit", "spurious_copper"],
    box: { left: 41.7, top: 44.9, width: 16.7, height: 10.3 },
  },
  {
    image: "/playground/quiz-pcb-short.jpg", // short_10
    alt: "Close-up of a circuit board with long tracks running down to a row of pins",
    hint: "Follow the long tracks running down to the pins.",
    observed: "a thin strip of copper bridges two neighbouring tracks",
    answer: "short",
    options: ["open_circuit", "short", "spur", "mouse_bite"],
    box: { left: 41.7, top: 43.4, width: 16.7, height: 13.3 },
  },
  {
    image: "/playground/quiz-pcb-mouse-bite.jpg", // mouse_bite_14
    alt: "Close-up of a circuit board with a horizontal copper track",
    hint: "Check the edges of the horizontal track.",
    observed: "a small round piece is missing from the edge of a track",
    answer: "mouse_bite",
    options: ["mouse_bite", "open_circuit", "spur", "missing_hole"],
    box: { left: 40.0, top: 40.8, width: 20.0, height: 18.4 },
  },
  {
    image: "/playground/quiz-pcb-spur.jpg", // spur_02
    alt: "Close-up of a circuit board with tracks between two rows of solder pads",
    hint: "Look at the tracks between the solder pads.",
    observed: "a thin sliver of copper sticks out beside a track",
    answer: "spur",
    options: ["short", "spur", "mouse_bite", "spurious_copper"],
    box: { left: 40.0, top: 41.7, width: 20.0, height: 16.6 },
  },
];

export const SpotTheIssueQuiz: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<DefectId | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = QUESTIONS[index];
  const answered = picked !== null;
  const correct = picked === question.answer;
  const isLast = index === QUESTIONS.length - 1;

  // Warm the next photo so "Try next" swaps instantly
  useEffect(() => {
    const next = QUESTIONS[index + 1];
    if (next) new Image().src = next.image;
  }, [index]);

  const answer = (id: DefectId) => {
    setPicked(id);
    if (id === question.answer) setScore((s) => s + 1);
  };

  const next = () => {
    if (isLast) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
  };

  const restart = () => {
    setIndex(0);
    setPicked(null);
    setScore(0);
    setFinished(false);
  };

  return (
    <motion.section
      variants={fadeInUpVariants}
      aria-labelledby="quiz-heading"
      className="rounded-2xl border bg-secondary/40 p-5 md:p-7"
    >
      {finished ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center" role="status">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#171f1b] text-[#e9ff65]">
            <Trophy className="h-6 w-6" aria-hidden="true" />
          </span>
          <h3 id="quiz-heading" className="text-lg font-semibold text-foreground">
            You spotted {score} of {QUESTIONS.length}
          </h3>
          <p className="max-w-md text-sm text-muted-foreground">
            {score === QUESTIONS.length
              ? "Sharp eyes! That's exactly what a model has to learn: telling defect types apart from labelled examples."
              : "Tricky, right? Small defects are easy to miss, which is why inspection models learn from many labelled examples."}
          </p>
          <Button variant="outline" size="sm" className="mt-1 gap-1.5" onClick={restart}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Play again
          </Button>
        </div>
      ) : (
        <div className="grid items-center gap-6 md:grid-cols-[240px_1fr]">
          <figure className="relative mx-auto w-full max-w-[240px] overflow-hidden rounded-xl border bg-[#171f1b]">
            <img key={question.image} src={question.image} alt={question.alt} className="aspect-square w-full object-cover" />
            {answered && (
              <motion.div
                key={`box-${index}`}
                initial={{ opacity: 0, scale: 1.4 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute rounded-sm border-2 border-[#e9ff65] shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                style={{
                  left: `${question.box.left}%`,
                  top: `${question.box.top}%`,
                  width: `${question.box.width}%`,
                  height: `${question.box.height}%`,
                }}
                aria-hidden="true"
              />
            )}
            <figcaption className="absolute bottom-0 left-0 right-0 bg-black/55 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-[#f5f5ee]">
              Real board · GSN PCB dataset
            </figcaption>
          </figure>

          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Quick brain warm-up
              </p>
              <div className="flex items-center gap-1.5" aria-label={`Question ${index + 1} of ${QUESTIONS.length}`}>
                {QUESTIONS.map((q, i) => (
                  <span
                    key={q.image}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === index ? "w-5 bg-ring" : "w-1.5",
                      i < index ? "bg-ring/60" : i > index && "bg-border"
                    )}
                  />
                ))}
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {index + 1}/{QUESTIONS.length}
                </span>
              </div>
            </div>
            <h3 id="quiz-heading" className="mt-1 text-lg font-semibold text-foreground">
              Can you spot the issue?
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              A real photo from an inspection dataset. {question.hint} What would you flag?
            </p>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label="Answers">
              {question.options.map((id) => {
                const isAnswer = id === question.answer;
                const isPicked = id === picked;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={answered}
                    onClick={() => answer(id)}
                    className={cn(
                      "flex items-center justify-between rounded-lg border bg-card px-4 py-2.5 text-left text-sm font-medium transition-colors",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      !answered && "hover:border-ring/60",
                      answered && isAnswer && "border-success bg-success/10 text-foreground",
                      answered && isPicked && !isAnswer && "border-destructive bg-destructive/10",
                      answered && !isAnswer && !isPicked && "opacity-60"
                    )}
                  >
                    {DEFECTS[id].label}
                    {answered && isAnswer && <Check className="h-4 w-4 text-success" aria-hidden="true" />}
                    {answered && isPicked && !isAnswer && <X className="h-4 w-4 text-destructive" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>

            {answered && picked && (
              <motion.div
                key={`explain-${index}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
                role="status"
              >
                <p className="text-sm text-foreground">
                  <span className={cn("font-semibold", correct ? "text-success" : "text-destructive")}>
                    {correct ? "Spot on!" : "Not quite."}
                  </span>{" "}
                  {correct ? "" : `${withArticle(picked).replace(/^a/, "A")} means ${DEFECTS[picked].meaning} `}
                  Here, {question.observed}. That&apos;s <strong>{withArticle(question.answer)}</strong>:{" "}
                  {DEFECTS[question.answer].meaning}
                </p>
                <Button size="sm" className="shrink-0 gap-1.5" onClick={next}>
                  {isLast ? "See your score" : "Try next"}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </motion.section>
  );
};
