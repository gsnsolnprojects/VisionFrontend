import React from "react";
import {
  Award,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Boxes,
  Crosshair,
  Database,
  FileText,
  FlaskConical,
  GraduationCap,
  Layers,
  Lightbulb,
  Lock,
  PenLine,
  Search,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Every Playground badge. The server decides who has earned which (services/playgroundBadgeService.js). */

export type BadgeGroup = "level1" | "level2" | "skill";

export interface BadgeInfo {
  id: string;
  name: string;
  group: BadgeGroup;
  Icon: LucideIcon;
  /** How to earn it, shown while it's locked */
  how: string;
  /** What the student learned or did, shown when it's awarded */
  learned: string;
  /** What comes next, on the award card */
  next?: string;
  /** Finishing a whole level: the bigger award */
  milestone?: boolean;
}

export const BADGES: BadgeInfo[] = [
  {
    id: "data_explorer",
    name: "Data Explorer",
    group: "level1",
    Icon: Search,
    how: "Finish See the data in Level 1",
    learned: "You know what a dataset is, what labels are and why photos are split into groups.",
    next: "Next: draw your own labels.",
  },
  {
    id: "labelling_practice",
    name: "Labelling Practice",
    group: "level1",
    Icon: PenLine,
    how: "Get at least one practice photo checked in Level 1",
    learned: "You drew your own labels and compared them with GSN's.",
    next: "Next: see how a model learns from labels like these.",
  },
  {
    id: "training_fundamentals",
    name: "Training Fundamentals",
    group: "level1",
    Icon: BookOpen,
    how: "Finish How training works in Level 1",
    learned: "You know the stages of training, what its settings do and how a model is scored.",
    next: "Next: test GSN's model.",
  },
  {
    id: "first_model_test",
    name: "First Model Test",
    group: "level1",
    Icon: FlaskConical,
    how: "Test GSN's model in Level 1",
    learned: "You tested a model and compared what it found with the right answers.",
    next: "Next: turn your test into a report.",
  },
  {
    id: "first_report",
    name: "First Inspection Report",
    group: "level1",
    Icon: FileText,
    how: "Make a report in Level 1",
    learned: "You turned test results into a report, the way a factory team shares them.",
  },
  {
    id: "vision_m_foundations",
    name: "Vision-M Foundations",
    group: "level1",
    Icon: Award,
    how: "Finish every step of Level 1",
    learned: "You finished Level 1 and saw how AI inspection works from photos to report.",
    next: "Next: build your own model in Level 2.",
    milestone: true,
  },
  {
    id: "dataset_builder",
    name: "Dataset Builder",
    group: "level2",
    Icon: Database,
    how: "Upload your own photos in Level 2",
    learned: "You started your own dataset with your own photos.",
    next: "Next: label at least 20 of them.",
  },
  {
    id: "data_labeller",
    name: "Data Labeller",
    group: "level2",
    Icon: Boxes,
    how: "Label 20 of your own photos in Level 2",
    learned: "You labelled enough photos for a model to learn from.",
    next: "Next: train your model.",
  },
  {
    id: "model_trainer",
    name: "Model Trainer",
    group: "level2",
    Icon: GraduationCap,
    how: "Finish a training run in Level 2",
    learned: "You trained your own AI inspection model.",
    next: "Next: test it on photos it hasn't seen.",
  },
  {
    id: "model_evaluator",
    name: "Model Evaluator",
    group: "level2",
    Icon: Target,
    how: "Test your own model in Level 2",
    learned: "You measured how your own model really performs.",
    next: "Next: make a report of its results.",
  },
  {
    id: "inspection_reporter",
    name: "Inspection Reporter",
    group: "level2",
    Icon: BarChart3,
    how: "Make a report of your own model in Level 2",
    learned: "You reported your own model's results.",
  },
  {
    id: "vision_m_builder",
    name: "Vision-M Builder",
    group: "level2",
    Icon: Trophy,
    how: "Finish every step of Level 2",
    learned: "You built, trained, tested and reported on your own AI inspection model.",
    next: "Label more photos to make your model even better.",
    milestone: true,
  },
  {
    id: "accurate_labeller",
    name: "Accurate Labeller",
    group: "skill",
    Icon: Crosshair,
    how: "Score an average match of 80% or more in label practice",
    learned: "Your labels closely matched GSN's. Careful labels make better models.",
  },
  {
    id: "no_hints_used",
    name: "No Hints Used",
    group: "skill",
    Icon: Lightbulb,
    how: "Label 5 practice photos well without a hint",
    learned: "You labelled 5 photos well by yourself, without a single hint.",
  },
  {
    id: "high_accuracy_model",
    name: "High Accuracy Model",
    group: "skill",
    Icon: BadgeCheck,
    how: "Train your own model to a score of 90% or more",
    learned: "Your own model reached a score of 90% or more.",
  },
];

export const BADGE_GROUPS: { id: BadgeGroup; title: string; text: string; Icon: LucideIcon }[] = [
  { id: "level1", title: "Level 1: Learn", text: "Earned by working through a real GSN sample.", Icon: Layers },
  { id: "level2", title: "Level 2: Build", text: "Earned by building your own model.", Icon: Boxes },
  { id: "skill", title: "Skill", text: "Earned by doing the work especially well.", Icon: Crosshair },
];

export const badgeInfo = (id: string) => BADGES.find((b) => b.id === id);

/** Dark for Level 1, lime for Level 2, gold for skill, and an extra ring for finishing a level */
const MEDAL_COLORS: Record<BadgeGroup, { fill: string; ring: string; icon: string }> = {
  level1: { fill: "#171f1b", ring: "#e9ff65", icon: "#e9ff65" },
  level2: { fill: "#e9ff65", ring: "#171f1b", icon: "#171f1b" },
  skill: { fill: "#f2c14e", ring: "#8a6410", icon: "#3d2c05" },
};

const HEXAGON = "50,3 91,26.5 91,73.5 50,97 9,73.5 9,26.5";
const OUTER_HEXAGON = "50,0 93.5,25 93.5,75 50,100 6.5,75 6.5,25";

export const BadgeMedal: React.FC<{ badge: BadgeInfo; earned?: boolean; size?: number; className?: string }> = ({
  badge,
  earned = true,
  size = 64,
  className,
}) => {
  const colors = MEDAL_COLORS[badge.group];
  const Icon = earned ? badge.Icon : Lock;
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        {earned ? (
          <>
            {badge.milestone && <polygon points={OUTER_HEXAGON} fill="#f2c14e" />}
            <polygon points={HEXAGON} fill={colors.fill} stroke={colors.ring} strokeWidth={badge.milestone ? 3 : 4} strokeLinejoin="round" />
          </>
        ) : (
          <polygon points={HEXAGON} className="fill-muted stroke-border" strokeWidth={3} strokeLinejoin="round" />
        )}
      </svg>
      <Icon
        className={cn("relative", !earned && "text-muted-foreground")}
        style={{ width: size * (earned ? 0.42 : 0.3), height: size * (earned ? 0.42 : 0.3), color: earned ? colors.icon : undefined }}
      />
    </span>
  );
};
