import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { FileDown, Pause, Settings } from "lucide-react";
import { DEMO_SAMPLES } from "./generatedData";
import { CroppedVideo, LiveBadge } from "./shared";
import { BLISTER_FEED } from "./media";

const RECENT_REJECTS = DEMO_SAMPLES.filter(
  (s) => s.product === "Blister pack" && s.detections.some((d) => d.label === "defect" && d.confidence >= 0.5)
).slice(0, 3);
const REJECT_AGO = ["just now", "4 min ago", "11 min ago"];
const TICK_MS = 1100;
const SIMULATED_REJECT_RATE = 0.025;

function StatusDot({ label }: { label: string }) {
  return (
    <span className="hidden items-center gap-1.5 rounded-full bg-[rgb(var(--sc-tint)/0.05)] px-2 py-0.5 text-[11px] text-[rgb(var(--sc-fg2))] md:inline-flex">
      <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--sc-ok))]" /> {label}
    </span>
  );
}

/** Illustrative mock-up of the Vision-M station desktop app. Counts are simulated. */
export function DesktopAppPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const [stats, setStats] = useState({ total: 4812, bad: 37 });

  useEffect(() => {
    if (!inView) return;
    const iv = window.setInterval(
      () => setStats((s) => ({ total: s.total + 1, bad: s.bad + (Math.random() < SIMULATED_REJECT_RATE ? 1 : 0) })),
      TICK_MS
    );
    return () => window.clearInterval(iv);
  }, [inView]);

  const tiles = [
    { label: "Inspected", value: stats.total.toLocaleString("en-IN"), tone: "text-[rgb(var(--sc-fg))]" },
    { label: "Passed", value: (stats.total - stats.bad).toLocaleString("en-IN"), tone: "text-[rgb(var(--sc-oktext))]" },
    { label: "Rejected", value: stats.bad.toLocaleString("en-IN"), tone: "text-[rgb(var(--sc-badtext))]" },
    { label: "Reject rate", value: `${((stats.bad / stats.total) * 100).toFixed(2)}%`, tone: "text-[rgb(var(--sc-warntext))]" },
  ];

  return (
    <div ref={ref}>
      <div className="overflow-hidden rounded-2xl border border-[rgb(var(--sc-tint)/0.1)] bg-[rgb(var(--sc-panel))] shadow-2xl shadow-[color:rgb(var(--sc-shade)/0.6)]">
        {/* Title bar */}
        <div className="flex items-center gap-3 border-b border-[rgb(var(--sc-tint)/0.1)] bg-[rgb(var(--sc-panel2)/0.8)] px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[rgb(var(--sc-bad)/0.8)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[rgb(var(--sc-warn)/0.8)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[rgb(var(--sc-ok)/0.8)]" />
          </div>
          <p className="truncate text-xs font-semibold text-[rgb(var(--sc-fg2))]">
            Vision-M <span className="font-normal text-[rgb(var(--sc-muted))]">· Line 2 · Blister packing</span>
          </p>
          <div className="ml-auto flex items-center gap-2">
            <StatusDot label="Camera" />
            <StatusDot label="PLC" />
            <span className="hidden rounded-full bg-[rgb(var(--sc-accent)/0.1)] px-2 py-0.5 font-mono text-[11px] text-[rgb(var(--sc-accentsoft))] sm:inline">model: blister_v1</span>
            <Settings className="h-4 w-4 text-[rgb(var(--sc-subtle))]" />
          </div>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          {/* Feed */}
          <div className="min-w-0">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-[rgb(var(--sc-fg2))]">Camera 1</p>
              <LiveBadge label="Live" />
            </div>
            <div className="overflow-hidden rounded-xl border border-[rgb(var(--sc-tint)/0.1)]">
              <CroppedVideo {...BLISTER_FEED} />
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[11px] text-[rgb(var(--sc-muted))]">
                <span>Shift A · 06:00 – 14:00</span>
                <span>62% done</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[rgb(var(--sc-tint)/0.1)]">
                <div className="h-full w-[62%] rounded-full bg-[rgb(var(--sc-accent))]" />
              </div>
            </div>
          </div>

          {/* Side panel */}
          <div className="flex min-w-0 flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              {tiles.map((t) => (
                <div key={t.label} className="rounded-lg border border-[rgb(var(--sc-tint)/0.1)] bg-[rgb(var(--sc-tint)/0.03)] px-3 py-2.5">
                  <motion.p
                    key={t.value}
                    initial={{ opacity: 0.4, y: -3 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-xl font-bold tabular-nums ${t.tone}`}
                  >
                    {t.value}
                  </motion.p>
                  <p className="text-[11px] text-[rgb(var(--sc-muted))]">{t.label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-[rgb(var(--sc-tint)/0.1)] bg-[rgb(var(--sc-tint)/0.03)] p-3">
              <p className="text-xs font-semibold text-[rgb(var(--sc-fg2))]">Recent rejects</p>
              <ul className="mt-2 space-y-2">
                {RECENT_REJECTS.map((s, i) => {
                  const n = s.detections.filter((d) => d.label === "defect" && d.confidence >= 0.5).length;
                  return (
                    <li key={s.id} className="flex items-center gap-3">
                      <img src={s.image} alt="" className="h-10 w-10 shrink-0 rounded object-cover ring-1 ring-[color:rgb(var(--sc-bad)/0.6)]" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-[rgb(var(--sc-fg))]">
                          {n} defect{n > 1 ? "s" : ""} found
                        </p>
                        <p className="text-[11px] text-[rgb(var(--sc-subtle))]">Camera 1 · {REJECT_AGO[i]}</p>
                      </div>
                      <span className="rounded bg-[rgb(var(--sc-bad)/0.15)] px-1.5 py-0.5 text-[10px] font-bold text-[rgb(var(--sc-badtext))]">NOT OK</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mt-auto grid grid-cols-2 gap-2 text-xs font-semibold">
              <span className="flex items-center justify-center gap-1.5 rounded-lg bg-[rgb(var(--sc-accent)/0.9)] px-3 py-2 text-[rgb(var(--sc-onaccent))]">
                <FileDown className="h-3.5 w-3.5" /> Shift report
              </span>
              <span className="flex items-center justify-center gap-1.5 rounded-lg border border-[rgb(var(--sc-tint)/0.15)] px-3 py-2 text-[rgb(var(--sc-fg2))]">
                <Pause className="h-3.5 w-3.5" /> Pause line
              </span>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs text-[rgb(var(--sc-subtle))]">Preview of the Vision-M desktop app. Layout is illustrative and the numbers are simulated.</p>
    </div>
  );
}
