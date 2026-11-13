import React, { useEffect, useState } from "react";
import { CloudOff, Loader2 } from "lucide-react";

/**
 * Shown while a training run waits to start. When AWS has no GPU free, it says so plainly, with how
 * long it has waited, when we try next (every 2 minutes, in all 3 Mumbai zones) and how long the run
 * takes once a GPU is found. When a GPU will free up can't be known, so no total time is promised.
 */

const minutesText = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "less than a minute";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
};

const nextTryText = (ms: number) => {
  if (ms <= 15000) return "now";
  if (ms < 60000) return `in about ${Math.ceil(ms / 1000 / 10) * 10} s`;
  return `in about ${Math.ceil(ms / 60000)} min`;
};

export const TrainingWaitCard: React.FC<{
  noGpu: boolean;
  queuedAt: string | null;
  nextTryAt: string | null;
  startupMinutes: number | null;
  trainMinutes: number | null;
}> = ({ noGpu, queuedAt, nextTryAt, startupMinutes, trainMinutes }) => {
  // Ticks so the waiting time and the next try count on their own
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const waited = queuedAt ? Math.max(0, now - new Date(queuedAt).getTime()) : null;
  const untilNext = nextTryAt ? new Date(nextTryAt).getTime() - now : null;
  const afterStart =
    startupMinutes && trainMinutes
      ? `about ${startupMinutes} min to switch on, then about ${trainMinutes} min to train`
      : trainMinutes
        ? `about ${trainMinutes} min to train`
        : null;

  return (
    <div
      className={noGpu ? "mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4" : "mt-4 rounded-xl border bg-secondary/40 p-4"}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {noGpu ? (
          <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        ) : (
          <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-ring" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">
            {noGpu ? "Waiting for a GPU: none free right now" : "Getting a training computer ready"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {noGpu
              ? "Your training is saved and in line. AWS, where our training computers run, has no GPU free in Mumbai at the moment. Nothing is wrong with your photos, and waiting doesn't use up a training run."
              : "Your training is in line and starts by itself in a few minutes."}
          </p>
        </div>
      </div>

      {/* Moving bar: still waiting, not stuck */}
      <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-background" aria-hidden="true">
        <div className="absolute inset-y-0 w-1/3 animate-[training-wait_1.6s_ease-in-out_infinite] rounded-full bg-ring" />
      </div>
      <style>{"@keyframes training-wait{0%{left:-33%}100%{left:100%}}"}</style>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {waited !== null && (
          <div>
            <dt className="text-xs text-muted-foreground">Waiting for</dt>
            <dd className="font-semibold tabular-nums text-foreground">{minutesText(waited)}</dd>
          </div>
        )}
        {noGpu && untilNext !== null && (
          <div>
            <dt className="text-xs text-muted-foreground">Next try</dt>
            <dd className="font-semibold tabular-nums text-foreground">{nextTryText(untilNext)}</dd>
          </div>
        )}
        {afterStart && (
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Once a GPU is found</dt>
            <dd className="font-semibold text-foreground">{afterStart}</dd>
          </div>
        )}
      </dl>

      <p className="mt-3 text-xs text-muted-foreground">
        {noGpu
          ? "We check all three Mumbai zones every 2 minutes. When a GPU frees up depends on AWS, so it could be minutes or longer. You can leave: the bell at the top tells you when training starts and when it's done."
          : "You can leave this page: the bell at the top tells you when training starts and when it's done."}
      </p>
    </div>
  );
};
