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
    <span className="hidden items-center gap-1.5 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-slate-300 md:inline-flex">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {label}
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
    { label: "Inspected", value: stats.total.toLocaleString("en-IN"), tone: "text-white" },
    { label: "Passed", value: (stats.total - stats.bad).toLocaleString("en-IN"), tone: "text-emerald-300" },
    { label: "Rejected", value: stats.bad.toLocaleString("en-IN"), tone: "text-rose-300" },
    { label: "Reject rate", value: `${((stats.bad / stats.total) * 100).toFixed(2)}%`, tone: "text-amber-300" },
  ];

  return (
    <div ref={ref}>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1224] shadow-2xl shadow-black/60">
        {/* Title bar */}
        <div className="flex items-center gap-3 border-b border-white/10 bg-slate-800/80 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <p className="truncate text-xs font-semibold text-slate-200">
            Vision-M <span className="font-normal text-slate-400">· Line 2 · Blister packing</span>
          </p>
          <div className="ml-auto flex items-center gap-2">
            <StatusDot label="Camera" />
            <StatusDot label="PLC" />
            <span className="hidden rounded-full bg-cyan-400/10 px-2 py-0.5 font-mono text-[11px] text-cyan-300 sm:inline">model: blister_v1</span>
            <Settings className="h-4 w-4 text-slate-500" />
          </div>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          {/* Feed */}
          <div className="min-w-0">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-300">Camera 1</p>
              <LiveBadge label="Live" />
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10">
              <CroppedVideo {...BLISTER_FEED} />
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Shift A · 06:00 – 14:00</span>
                <span>62% done</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[62%] rounded-full bg-cyan-400" />
              </div>
            </div>
          </div>

          {/* Side panel */}
          <div className="flex min-w-0 flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              {tiles.map((t) => (
                <div key={t.label} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
                  <motion.p
                    key={t.value}
                    initial={{ opacity: 0.4, y: -3 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-xl font-bold tabular-nums ${t.tone}`}
                  >
                    {t.value}
                  </motion.p>
                  <p className="text-[11px] text-slate-400">{t.label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs font-semibold text-slate-300">Recent rejects</p>
              <ul className="mt-2 space-y-2">
                {RECENT_REJECTS.map((s, i) => {
                  const n = s.detections.filter((d) => d.label === "defect" && d.confidence >= 0.5).length;
                  return (
                    <li key={s.id} className="flex items-center gap-3">
                      <img src={s.image} alt="" className="h-10 w-10 shrink-0 rounded object-cover ring-1 ring-rose-500/60" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-white">
                          {n} defect{n > 1 ? "s" : ""} found
                        </p>
                        <p className="text-[11px] text-slate-500">Camera 1 · {REJECT_AGO[i]}</p>
                      </div>
                      <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">NOT OK</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mt-auto grid grid-cols-2 gap-2 text-xs font-semibold">
              <span className="flex items-center justify-center gap-1.5 rounded-lg bg-cyan-500/90 px-3 py-2 text-slate-950">
                <FileDown className="h-3.5 w-3.5" /> Shift report
              </span>
              <span className="flex items-center justify-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-slate-200">
                <Pause className="h-3.5 w-3.5" /> Pause line
              </span>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">Preview of the Vision-M desktop app. Layout is illustrative and the numbers are simulated.</p>
    </div>
  );
}
