import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { fadeInUpVariants } from "@/utils/animations";
import { cn } from "@/lib/utils";
import type { PlanLimits } from "@/lib/api/subscription";

/**
 * "Your playground allowance" meters at the bottom of the Playground overview. Every limit
 * comes from the plan on the backend (null = no limit); the backend enforces the same.
 */

interface Meter {
  label: string;
  used: number | null;
  limit: number | null;
  note: string;
  to: string;
}

const formatCount = (n: number) => n.toLocaleString("en-IN");

export const AllowanceMeters: React.FC<{
  limits: PlanLimits | null;
  projectsUsed: number | null;
  storedImages: number | null;
  trainingRunsThisMonth: number | null;
  predictionsThisMonth: number | null;
}> = ({ limits, projectsUsed, storedImages, trainingRunsThisMonth, predictionsThisMonth }) => {
  const projectLimit = limits?.projects ?? null;
  const imageLimit =
    typeof limits?.imagesPerDataset === "number" ? limits.imagesPerDataset * (limits.ownDatasets ?? 1) : null;
  const navigate = useNavigate();

  const meters: Meter[] = [
    {
      label: "Active projects",
      used: projectsUsed,
      limit: projectLimit,
      note: projectLimit === 2 ? "Two spaces to experiment" : "Spaces to experiment",
      to: "/dashboard/projects",
    },
    {
      label: "Stored images",
      used: storedImages,
      limit: imageLimit,
      note: "Your own dataset, across projects",
      to: "/datasets",
    },
    {
      label: "Training runs",
      used: trainingRunsThisMonth,
      limit: limits?.trainingRunsPerMonth ?? null,
      note: "Monthly allowance",
      to: "/dashboard?view=simulation",
    },
    {
      label: "Image predictions",
      used: predictionsThisMonth,
      limit: limits?.predictionsPerMonth ?? null,
      note: "Monthly allowance",
      to: "/project/prediction",
    },
  ];

  return (
    <motion.section variants={fadeInUpVariants} aria-labelledby="allowance-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <h3 id="allowance-heading" className="text-lg font-semibold text-foreground">
          Your playground allowance
        </h3>
        <p className="text-xs text-muted-foreground">Playground Edition · ₹999/month</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {meters.map((meter) => {
          const percent =
            meter.used !== null && meter.limit ? Math.min(100, Math.round((meter.used / meter.limit) * 100)) : 0;
          const atLimit = meter.used !== null && meter.limit !== null && meter.used >= meter.limit;
          return (
            <button
              key={meter.label}
              type="button"
              onClick={() => navigate(meter.to)}
              className="group rounded-xl border bg-card p-5 text-left transition-colors hover:border-ring/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-start justify-between">
                <span className="text-sm text-muted-foreground">{meter.label}</span>
                <ArrowUpRight
                  className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-foreground">
                  {meter.used === null ? "—" : formatCount(meter.used)}
                </span>
                {meter.limit !== null && (
                  <span className="text-sm text-muted-foreground">/ {formatCount(meter.limit)}</span>
                )}
              </p>
              <div
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"
                role="progressbar"
                aria-label={`${meter.label} used`}
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={cn("h-full rounded-full transition-all", atLimit ? "bg-destructive" : "bg-ring")}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className={cn("mt-3 text-xs", atLimit ? "text-destructive" : "text-muted-foreground")}>
                {atLimit ? "Limit reached" : meter.note}
              </p>
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Vision-M by GSN · Playground Edition · For learning and experimentation, not production inspection
      </p>
    </motion.section>
  );
};
