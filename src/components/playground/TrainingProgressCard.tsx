import React, { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";

/**
 * One progress bar for the whole run, so it always looks alive:
 * - Starting the GPU (3-5 min): the bar creeps from 0 to about 20% by itself, slowing as it nears 20%,
 *   with changing messages and a timer. It is worked out from when the run was queued, so a refresh
 *   picks up in the right place.
 * - Training: 20% to 100% follows the real epochs, with time left from how fast epochs are going.
 * A soft shine moves across the bar the whole time.
 */

const STARTUP_SHARE = 20;

const STEPS = ["Starting GPU", "Training", "Checking results", "Done"];

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const minutesLeft = (ms: number) => {
  const m = Math.round(ms / 60000);
  return m < 1 ? "less than a minute left" : `about ${m} min left`;
};

export const TrainingProgressCard: React.FC<{
  status: "queued" | "running";
  queuedAt: string | null;
  currentEpoch: number;
  totalEpochs: number;
  percent: number;
  startupMinutes: number | null;
  trainMinutes: number | null;
  photoCount: number;
  modelName: string;
  scoreLine: string | null;
}> = ({ status, queuedAt, currentEpoch, totalEpochs, percent, startupMinutes, trainMinutes, photoCount, modelName, scoreLine }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // When this page first saw an epoch, to measure how fast epochs go
  const firstSeen = useRef<{ epoch: number; at: number } | null>(null);
  if (currentEpoch > 0 && !firstSeen.current) firstSeen.current = { epoch: currentEpoch, at: Date.now() };

  const fallbackStart = useRef(Date.now());
  const startedAt = queuedAt ? new Date(queuedAt).getTime() : fallbackStart.current;
  const elapsed = Math.max(0, now - startedAt);

  const training = status === "running" && currentEpoch > 0;
  const finishing = training && totalEpochs > 0 && currentEpoch >= totalEpochs;
  const step = finishing ? 2 : training ? 1 : 0;

  // Startup creeps towards 20% and never quite stops; about 17% at the usual startup time
  const tau = ((startupMinutes || 4) * 60000) / 2;
  const startupPct = STARTUP_SHARE * 0.97 * (1 - Math.exp(-elapsed / tau));
  const trainShare = totalEpochs > 0 ? (currentEpoch / totalEpochs) * 100 : percent;
  const shown = training ? STARTUP_SHARE + ((100 - STARTUP_SHARE) * Math.min(100, trainShare)) / 100 : startupPct;

  const startupMessages = [
    "Finding a free GPU for you…",
    "Starting the training computer…",
    `Loading your ${photoCount} training photos…`,
    `Setting up the ${modelName} model…`,
    "Almost ready, the first round starts soon…",
  ];
  const message = startupMessages[Math.min(startupMessages.length - 1, Math.floor(elapsed / 25000))];

  let timeLeft: string | null = null;
  if (training && !finishing && firstSeen.current && currentEpoch > firstSeen.current.epoch) {
    const perEpoch = (Date.now() - firstSeen.current.at) / (currentEpoch - firstSeen.current.epoch);
    timeLeft = minutesLeft(perEpoch * (totalEpochs - currentEpoch));
  } else if (training && !finishing && trainMinutes && totalEpochs) {
    timeLeft = minutesLeft(trainMinutes * 60000 * (1 - currentEpoch / totalEpochs));
  }

  const headline = finishing
    ? "Checking how well it learned…"
    : training
      ? `Round ${currentEpoch} of ${totalEpochs}${timeLeft ? ` · ${timeLeft}` : ""}`
      : message;

  return (
    <div className="mt-4 rounded-xl border bg-secondary/40 p-4" role="status" aria-live="polite">
      {/* Step dots */}
      <ol className="mb-4 flex items-center gap-1 text-[11px] sm:text-xs">
        {STEPS.map((label, i) => (
          <React.Fragment key={label}>
            {i > 0 && <span className={`h-px flex-1 ${i <= step ? "bg-ring" : "bg-border"}`} aria-hidden="true" />}
            <li className="flex items-center gap-1.5">
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                  i < step ? "bg-ring text-background" : i === step ? "bg-ring ring-4 ring-ring/25" : "bg-border"
                }`}
              >
                {i < step && <Check className="h-2.5 w-2.5" aria-hidden="true" />}
              </span>
              <span className={i === step ? "font-semibold text-foreground" : "text-muted-foreground"}>{label}</span>
            </li>
          </React.Fragment>
        ))}
      </ol>

      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ring" aria-hidden="true" />
          <span key={headline} className="truncate animate-in fade-in duration-500">
            {headline}
          </span>
        </span>
        <span className="font-semibold tabular-nums text-foreground">{Math.floor(shown)}%</span>
      </div>

      {/* Bar with a moving shine */}
      <div className="relative mt-2 h-3 overflow-hidden rounded-full bg-background" aria-hidden="true">
        <div
          className="relative h-full overflow-hidden rounded-full bg-ring transition-[width] duration-1000 ease-out"
          style={{ width: `${Math.max(2, shown)}%` }}
        >
          <div className="absolute inset-y-0 w-1/2 animate-[training-shine_1.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        </div>
      </div>
      <style>{"@keyframes training-shine{0%{left:-50%}100%{left:100%}}"}</style>

      <p className="mt-2 text-xs text-muted-foreground">
        {!training
          ? `Waiting ${clock(elapsed)} · usually ${startupMinutes ? `about ${startupMinutes}` : "3–5"} min to start. `
          : scoreLine
            ? `${scoreLine} `
            : ""}
        You can leave this page and come back: training keeps going.
      </p>
    </div>
  );
};
