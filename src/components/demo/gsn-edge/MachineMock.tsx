import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, AlertTriangle, Clock, PauseCircle, Wrench } from "lucide-react";
import { EdgeWindow, KpiCard, Legend, StatusPill, type StatusTone } from "./edgeShared";
import { seeded, useTicker } from "./edgeHooks";

/*
 * Machine monitoring for a toolroom, modelled on GSN Edge's working / idle / maintenance tracking.
 * One tick (1 s) = 5 minutes of a 12-hour shift (08:00–20:00), so the timelines fill in live.
 */

type State = "running" | "idle" | "down";

const MACHINES = [
  { name: "CNC Lathe 01", seed: 3, runBias: 0.82 },
  { name: "VMC 02", seed: 17, runBias: 0.75 },
  { name: "VMC 03", seed: 23, runBias: 0.7, hasBreakdown: true },
  { name: "EDM 04", seed: 31, runBias: 0.6 },
  { name: "Surface Grinder 05", seed: 41, runBias: 0.55 },
  { name: "Power Press 06", seed: 53, runBias: 0.68 },
];

const SHIFT_SLOTS = 144; // 12 h × 12 five-minute slots
const START_SLOT = 54; // the demo opens at 12:30
const MINUTES_PER_SLOT = 5;
const STATE_TONE: Record<State, StatusTone> = { running: "green", idle: "amber", down: "rose" };
const STATE_LABEL: Record<State, string> = { running: "Running", idle: "Idle", down: "Down" };
const BAR: Record<State, string> = { running: "bg-emerald-400", idle: "bg-amber-400", down: "bg-rose-500" };

/** Builds the full shift for one machine as runs of states, deterministic per machine. */
function buildShift(m: (typeof MACHINES)[number]): State[] {
  const rand = seeded(m.seed);
  const slots: State[] = [];
  while (slots.length < SHIFT_SLOTS) {
    const r = rand();
    const state: State = r < m.runBias ? "running" : "idle";
    const len = state === "running" ? 6 + Math.floor(rand() * 16) : 1 + Math.floor(rand() * 5);
    for (let i = 0; i < len && slots.length < SHIFT_SLOTS; i++) slots.push(state);
  }
  // Lunch break for everyone, and one breakdown on VMC 03 shortly after the demo opens.
  for (let i = 48; i < 54; i++) slots[i] = "idle";
  if (m.hasBreakdown) for (let i = START_SLOT + 10; i < START_SLOT + 19; i++) slots[i] = "down";
  return slots;
}

const SHIFTS = MACHINES.map(buildShift);

function segments(slots: State[]) {
  const out: { state: State; len: number }[] = [];
  for (const s of slots) {
    const last = out[out.length - 1];
    if (last && last.state === s) last.len++;
    else out.push({ state: s, len: 1 });
  }
  return out;
}

const fmtHours = (slots: number) => {
  const mins = slots * MINUTES_PER_SLOT;
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
};

const clockAt = (slot: number) => {
  const mins = 8 * 60 + slot * MINUTES_PER_SLOT;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
};

export function MachineMock() {
  const { ref, tick } = useTicker(1000);
  // Loop the second half of the shift so the demo never runs out.
  const now = START_SLOT + (tick % (SHIFT_SLOTS - START_SLOT));

  const machines = useMemo(
    () =>
      MACHINES.map((m, i) => {
        const done = SHIFTS[i].slice(0, now + 1);
        const run = done.filter((s) => s === "running").length;
        const idle = done.filter((s) => s === "idle").length;
        const down = done.filter((s) => s === "down").length;
        return { ...m, state: done[done.length - 1], segs: segments(done), run, idle, down, util: Math.round((run / done.length) * 100) };
      }),
    [now]
  );

  const count = (s: State) => machines.filter((m) => m.state === s).length;
  const avgUtil = Math.round(machines.reduce((a, m) => a + m.util, 0) / machines.length);
  const downMachine = machines.find((m) => m.state === "down");

  return (
    <div ref={ref}>
      <EdgeWindow section="Machine Overview · Toolroom">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <KpiCard value={count("running")} label="Running" sub="Cutting right now" Icon={Activity} tone="green" />
          <KpiCard value={count("idle")} label="Idle" sub="Powered, not working" Icon={PauseCircle} tone="amber" />
          <KpiCard value={count("down")} label="Down" sub="Breakdown / maintenance" Icon={Wrench} tone="rose" />
          <KpiCard value={`${avgUtil}%`} label="Utilisation" sub="Shift average" Icon={Clock} tone="teal" />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <Legend
            items={[
              { tone: "green", label: "Running" },
              { tone: "amber", label: "Idle" },
              { tone: "rose", label: "Down" },
            ]}
          />
          <p className="text-[11px] text-slate-400">
            Shift A · 08:00 – 20:00 · now <span className="font-semibold tabular-nums text-white">{clockAt(now)}</span>
          </p>
        </div>

        <div className="relative mt-3 space-y-2">
          {machines.map((m) => (
            <div key={m.name} className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 sm:grid-cols-[150px_minmax(0,1fr)_170px]">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">{m.name}</p>
                <StatusPill tone={STATE_TONE[m.state]}>{STATE_LABEL[m.state]}</StatusPill>
              </div>
              {/* shift timeline */}
              <div className="relative h-5 overflow-hidden rounded-md bg-white/5">
                <div className="flex h-full">
                  {m.segs.map((s, i) => (
                    <motion.div key={i} layout className={`h-full ${BAR[s.state]} ${s.state === "running" ? "opacity-80" : "opacity-90"}`} style={{ width: `${(s.len / SHIFT_SLOTS) * 100}%` }} />
                  ))}
                </div>
                <div className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" style={{ left: `${((now + 1) / SHIFT_SLOTS) * 100}%` }} />
              </div>
              <div className="hidden grid-cols-3 gap-1 text-[10px] sm:grid">
                <div>
                  <p className="text-slate-500">Working</p>
                  <p className="font-semibold tabular-nums text-emerald-300">{fmtHours(m.run)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Idle</p>
                  <p className="font-semibold tabular-nums text-amber-300">{fmtHours(m.idle)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Util</p>
                  <p className="font-semibold tabular-nums text-white">{m.util}%</p>
                </div>
              </div>
            </div>
          ))}

          <AnimatePresence>
            {downMachine && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute -top-2 right-2 z-10 flex max-w-xs items-start gap-2 rounded-xl border border-rose-500/40 bg-[#2a0f1a]/95 p-3 shadow-xl backdrop-blur"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <div>
                  <p className="text-xs font-semibold text-rose-200">{downMachine.name} stopped</p>
                  <p className="text-[11px] text-rose-200/70">Down for {fmtHours(downMachine.down)} · flagged on the dashboard</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="mt-1 flex justify-between pl-[122px] pr-0 text-[9px] text-slate-600 sm:pl-[162px] sm:pr-[182px]">
          <span>08:00</span>
          <span>14:00</span>
          <span>20:00</span>
        </div>
      </EdgeWindow>
    </div>
  );
}
