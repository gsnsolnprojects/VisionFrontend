import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Cpu, FileBarChart, FolderOpen, Images, ScanSearch, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fadeInUpVariants } from "@/utils/animations";
import type { Plan } from "@/lib/api/subscription";

/**
 * "What's included" for companies that haven't chosen a plan yet: shown on the preview overview in
 * place of the allowance meters. Numbers come from the Playground plan on the backend.
 */

const formatCount = (n: number) => n.toLocaleString("en-IN");

export const PlaygroundIncluded: React.FC<{ plan: Plan | null; onChoosePlan: () => void }> = ({ plan, onChoosePlan }) => {
  const limits = plan?.limits;
  const images =
    typeof limits?.imagesPerDataset === "number" ? limits.imagesPerDataset * (limits.ownDatasets ?? 1) : null;
  const items: { Icon: LucideIcon; title: string; text: string }[] = [
    {
      Icon: FolderOpen,
      title: limits?.projects ? `${limits.projects} projects` : "Projects",
      text: "Work on two missions at a time. Delete one any time to start another.",
    },
    {
      Icon: Images,
      title: images ? `${formatCount(images)} of your own images` : "Your own images",
      text: `Upload and label your own photos${limits?.maxImageSizeMB ? `, up to ${limits.maxImageSizeMB} MB each` : ""}, plus GSN's ready-made samples.`,
    },
    {
      Icon: Cpu,
      title: limits?.trainingRunsPerMonth ? `${limits.trainingRunsPerMonth} training runs a month` : "Training runs",
      text: "Teach a model to spot the defects you labelled.",
    },
    {
      Icon: ScanSearch,
      title: limits?.predictionsPerMonth ? `${formatCount(limits.predictionsPerMonth)} predictions a month` : "Predictions",
      text: "Test models on held-out photos or your own, and see what they find.",
    },
    { Icon: FileBarChart, title: "Test reports", text: "Download each test as a PDF or spreadsheet to share." },
    { Icon: BookOpen, title: "Learning centre", text: "Short lessons for first-timers. Open now, even before you choose a plan." },
  ];

  return (
    <motion.section variants={fadeInUpVariants} aria-labelledby="included-heading" className="rounded-2xl border bg-card p-5 md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 id="included-heading" className="text-lg font-semibold text-foreground">
            What's included in the Playground
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {plan ? `${plan.name} · ₹${formatCount(plan.priceMonthlyInr)}/month + applicable taxes. Cancel any time.` : "Choose a plan to unlock everything below."}
          </p>
        </div>
        <Button onClick={onChoosePlan} className="gap-1.5">
          Choose Playground
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ Icon, title, text }) => (
          <li key={title} className="flex gap-3 rounded-xl border bg-background/40 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#171f1b] text-[#e9ff65]">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-medium text-foreground">{title}</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </motion.section>
  );
};
