import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Lightbulb, Loader2, ScanSearch, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/api/config";
import { BOX_COLORS } from "./LabelledThumbnail";
import type { Advice, DatasetFacts, TrainChoice } from "./trainingAdvice";
import { cn } from "@/lib/utils";

/**
 * The look of the training suggestions: one line of advice under each setting, a short check of
 * the dataset, and the "use suggested settings" button.
 */

/** At most this many training photos are read to measure labels (enough for a fair picture) */
const SAMPLE_LIMIT = 1000;
const CHUNK = 200;

/** Reads the training photos' labels once, and works out what the suggestions need */
export const useDatasetFacts = (
  datasetId: string,
  trainFileIds: string[],
  trainPhotos: number,
  augmented: boolean
): { facts: DatasetFacts; loading: boolean; classIndex: Record<string, number> } => {
  const [boxesPerClass, setBoxesPerClass] = useState<{ name: string; boxes: number }[]>([]);
  const [classIndex, setClassIndex] = useState<Record<string, number>>({});
  const [smallDefect, setSmallDefect] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const key = `${datasetId}:${trainFileIds.length}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      // An even spread of photos, so a large dataset is still measured fairly
      const step = Math.max(1, trainFileIds.length / SAMPLE_LIMIT);
      const ids: string[] = [];
      for (let i = 0; i < trainFileIds.length && ids.length < SAMPLE_LIMIT; i += step) ids.push(trainFileIds[Math.floor(i)]);
      const counts = new Map<number, number>();
      const sizes: number[] = [];
      let names: { index: number; name: string }[] = [];
      try {
        for (let i = 0; i < ids.length; i += CHUNK) {
          const part = ids.slice(i, i + CHUNK);
          const json = await apiRequest<{ classes: { index: number; name: string }[]; labels: Record<string, { c: number; w: number; h: number }[]> }>(
            `/dataset/${encodeURIComponent(datasetId)}/file-labels?ids=${part.map(encodeURIComponent).join(",")}`
          );
          if (cancelled) return;
          names = json.classes;
          for (const boxes of Object.values(json.labels)) {
            for (const b of boxes) {
              counts.set(b.c, (counts.get(b.c) ?? 0) + 1);
              if (b.w > 0 && b.h > 0) sizes.push(Math.sqrt(b.w * b.h));
            }
          }
        }
      } catch {
        // Without labels the suggestions still use the photo count
      }
      if (cancelled) return;
      // Counted on a sample: scale back up to the whole training set
      const scale = ids.length ? trainFileIds.length / ids.length : 1;
      setBoxesPerClass(names.map((c) => ({ name: c.name, boxes: Math.round((counts.get(c.index) ?? 0) * scale) })));
      setClassIndex(Object.fromEntries(names.map((c) => [c.name, c.index])));
      sizes.sort((a, b) => a - b);
      setSmallDefect(sizes.length ? sizes[Math.floor(sizes.length * 0.1)] : null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { facts: { trainPhotos, augmented, boxesPerClass, smallDefect }, loading, classIndex };
};

const TONE = {
  good: { Icon: CheckCircle2, text: "text-success", bg: "bg-success/10", ring: "ring-success/25" },
  warn: { Icon: AlertTriangle, text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", ring: "ring-amber-500/30" },
  info: { Icon: Lightbulb, text: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10", ring: "ring-sky-500/25" },
} as const;

/** One line of advice under a setting; it fades in when the advice changes (a new key remounts it) */
export const AdviceLine: React.FC<{ advice: Advice; className?: string }> = ({ advice, className }) => {
  const { Icon, text, bg, ring } = TONE[advice.tone];
  return (
    <p
      key={advice.text}
      role={advice.tone === "warn" ? "alert" : undefined}
      className={cn(
        "mt-1.5 flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-xs leading-snug ring-1 animate-in fade-in-0 slide-in-from-top-1 duration-200",
        bg,
        ring,
        className
      )}
    >
      <Icon className={cn("mt-px h-3.5 w-3.5 shrink-0", text)} aria-hidden="true" />
      <span className="text-foreground/90">{advice.text}</span>
    </p>
  );
};

/** A small pill for the closed settings header: are the settings right for this dataset? */
export const AdviceBadge: React.FC<{ warnings: number; loading: boolean }> = ({ warnings, loading }) =>
  loading ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" /> Checking
    </span>
  ) : warnings ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
      <AlertTriangle className="h-3 w-3" /> {warnings} to check
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
      <CheckCircle2 className="h-3 w-3" /> Fits your data
    </span>
  );

/** What the dataset looks like to the model, with what to fix before training */
export const DatasetCheck: React.FC<{
  facts: DatasetFacts;
  loading: boolean;
  classIndex: Record<string, number>;
  advice: Advice[];
}> = ({ facts, loading, classIndex, advice }) => {
  const most = Math.max(1, ...facts.boxesPerClass.map((c) => c.boxes));
  const small = facts.smallDefect;
  return (
    <div className="rounded-xl border bg-gradient-to-br from-secondary/50 to-background p-4">
      <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        <ScanSearch className="h-4 w-4" aria-hidden="true" /> Your data, as the model sees it
      </p>
      {loading ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading your labels...
        </p>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              ["Training photos", facts.trainPhotos.toLocaleString()],
              ["Labels", facts.boxesPerClass.reduce((s, c) => s + c.boxes, 0).toLocaleString()],
              ["Smallest defects", small === null ? "–" : `${Math.max(1, Math.round(small * 100))}% of photo`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-background/70 px-2 py-2 ring-1 ring-border">
                <dd className="text-base font-semibold tabular-nums text-foreground">{value}</dd>
                <dt className="text-[11px] text-muted-foreground">{label}</dt>
              </div>
            ))}
          </dl>
          {facts.boxesPerClass.length > 0 && (
            <ul className="mt-3 space-y-1.5" aria-label="Labels of each kind">
              {facts.boxesPerClass.map((c) => (
                <li key={c.name} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-2 text-xs">
                  <span className="truncate text-foreground" title={c.name}>
                    {c.name.replace(/_/g, " ")}
                  </span>
                  <span className="h-2 overflow-hidden rounded-full bg-secondary">
                    <motion.span
                      className="block h-full rounded-full"
                      style={{ background: BOX_COLORS[(classIndex[c.name] ?? 0) % BOX_COLORS.length] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(3, (c.boxes / most) * 100)}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </span>
                  <span className={cn("tabular-nums", c.boxes < 15 ? "font-semibold text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                    {c.boxes}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2">
            {advice.map((a) => (
              <AdviceLine key={a.text} advice={a} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/** The one-click fix: shows what it would set, and is quiet when the settings already match */
export const SuggestedSettings: React.FC<{
  suggested: TrainChoice;
  current: TrainChoice;
  sizeName: (letter: "n" | "s") => string;
  disabled: boolean;
  onApply: () => void;
}> = ({ suggested, current, sizeName, disabled, onApply }) => {
  const same =
    suggested.size === current.size &&
    suggested.epochs === current.epochs &&
    suggested.batchSize === current.batchSize &&
    suggested.imgSize === current.imgSize &&
    suggested.learningRate === current.learningRate;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#171f1b] p-3 text-white">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-[#e9ff65]" aria-hidden="true" /> Suggested for your data
        </p>
        <p className="mt-0.5 text-xs text-white/70">
          {sizeName(suggested.size)} · {suggested.epochs} epochs · batch {suggested.batchSize} · image size {suggested.imgSize} · learning rate{" "}
          {suggested.learningRate}
        </p>
      </div>
      {same ? (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#e9ff65]">
          <CheckCircle2 className="h-3.5 w-3.5" /> In use
        </span>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={onApply}
          className="rounded-lg bg-[#e9ff65] px-3 py-1.5 text-xs font-semibold text-[#171f1b] transition hover:brightness-95 disabled:opacity-50"
        >
          Use these
        </button>
      )}
    </div>
  );
};
