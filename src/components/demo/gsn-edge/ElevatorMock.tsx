import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { EdgeWindow } from "./edgeShared";
import { seeded, useTicker } from "./edgeHooks";

/*
 * Re-creation of GSN Edge "Elevator Overview" with three simulated lifts.
 * Lift 2 periodically raises error 51D (a real controller code shown in GSN Edge) and recovers.
 */

const LIFTS = [
  { id: "ELEV001", name: "Tower A · Lift 1", floors: 24, seed: 11 },
  { id: "ELEV002", name: "Tower A · Lift 2", floors: 24, seed: 29 },
  { id: "ELEV003", name: "Tower B · Service lift", floors: 12, seed: 47 },
];

const FAULT_LIFT = 1;
const FAULT_EVERY = 34; // ticks
const FAULT_LENGTH = 8;
const DOOR_TICKS = 2;

type LiftState = { floor: number; dir: -1 | 0 | 1; trips: number; fault: boolean; doorsOpen: boolean };

/** Replays each lift from tick 0: move one floor per tick to a random target, open doors, repeat. */
function simulate(tick: number): LiftState[] {
  return LIFTS.map((l, idx) => {
    const rand = seeded(l.seed);
    let floor = Math.floor(rand() * l.floors);
    let target = floor;
    let wait = 0;
    let trips = 120 + idx * 37;
    let dir: -1 | 0 | 1 = 0;
    let fault = false;
    for (let t = 0; t <= tick; t++) {
      fault = idx === FAULT_LIFT && t % FAULT_EVERY >= FAULT_EVERY - FAULT_LENGTH;
      if (fault) {
        dir = 0;
        continue;
      }
      if (wait > 0) {
        wait--;
        dir = 0;
        continue;
      }
      if (floor === target) {
        target = Math.floor(rand() * (l.floors + 1));
        if (target !== floor) trips++;
      }
      dir = target > floor ? 1 : target < floor ? -1 : 0;
      floor += dir;
      if (floor === target) wait = DOOR_TICKS;
    }
    return { floor, dir, trips, fault, doorsOpen: !fault && wait > 0 };
  });
}

function Building({ lifts }: { lifts: LiftState[] }) {
  const max = 24;
  return (
    <div className="relative flex h-full min-h-[300px] items-end gap-3 rounded-xl border border-[rgb(var(--sc-tint)/0.1)] bg-gradient-to-b from-[rgb(var(--sc-deep))] to-[rgb(var(--sc-panel))] px-4 pb-3 pt-6">
      {/* floor lines */}
      <div className="pointer-events-none absolute inset-x-4 bottom-3 top-6">
        {Array.from({ length: max / 4 + 1 }, (_, i) => (
          <div key={i} className="absolute inset-x-0 border-t border-dashed border-[rgb(var(--sc-tint)/0.05)]" style={{ bottom: `${(i * 4 * 100) / max}%` }}>
            <span className="absolute -left-1 -translate-x-full -translate-y-1/2 text-[9px] text-[rgb(var(--sc-subtle))]">{i * 4}</span>
          </div>
        ))}
      </div>
      {lifts.map((s, i) => {
        const l = LIFTS[i];
        return (
          <div key={l.id} className="relative flex h-full flex-1 flex-col items-center">
            <div className="relative w-full flex-1 rounded-md border border-[rgb(var(--sc-tint)/0.1)] bg-[rgb(var(--sc-shade)/0.3)]" style={{ maxHeight: `${(l.floors / max) * 100}%`, marginTop: "auto" }}>
              <motion.div
                className={`absolute inset-x-1 flex h-7 items-center justify-center rounded border text-[10px] font-bold ${
                  s.fault ? "border-[rgb(var(--sc-bad))] bg-[rgb(var(--sc-bad)/0.3)] text-[rgb(var(--sc-badtext))]" : "border-[rgb(var(--sc-accent)/0.7)] bg-[rgb(var(--sc-accent)/0.2)] text-[rgb(var(--sc-accentsoft))]"
                }`}
                animate={{ bottom: `calc(${(s.floor / l.floors) * 100}% - ${(s.floor / l.floors) * 28}px)` }}
                transition={{ duration: 0.9, ease: "easeInOut" }}
              >
                {s.fault ? "!" : s.doorsOpen ? "◂ ▸" : s.dir > 0 ? "▲" : s.dir < 0 ? "▼" : "■"}
              </motion.div>
            </div>
            <p className="mt-2 text-[10px] font-semibold text-[rgb(var(--sc-muted))]">{l.id}</p>
            <p className={`text-xs font-bold tabular-nums ${s.fault ? "text-[rgb(var(--sc-badtext))]" : "text-[rgb(var(--sc-fg))]"}`}>Floor {s.floor}</p>
          </div>
        );
      })}
    </div>
  );
}

function SummaryCard({ value, label, Icon, gradient }: { value: number; label: string; Icon: typeof CheckCircle2; gradient: string }) {
  return (
    <div className={`flex items-center justify-between rounded-xl bg-gradient-to-br ${gradient} px-4 py-3 text-[rgb(var(--sc-fg))] shadow-lg`}>
      <div>
        <motion.p key={value} initial={{ scale: 1.3, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} className="text-2xl font-extrabold tabular-nums sm:text-3xl">
          {value}
        </motion.p>
        <p className="text-xs font-medium text-[rgb(var(--sc-fg)/0.85)] sm:text-sm">{label}</p>
      </div>
      <Icon className="h-7 w-7 text-[rgb(var(--sc-fg)/0.8)]" />
    </div>
  );
}

export function ElevatorMock() {
  const { ref, tick } = useTicker(1000);
  const lifts = useMemo(() => simulate(tick), [tick]);
  const errors = lifts.filter((l) => l.fault).length;

  return (
    <div ref={ref}>
      <EdgeWindow section="Elevator Overview · All zones">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <SummaryCard value={lifts.length - errors} label="Active elevators" Icon={CheckCircle2} gradient="from-[rgb(var(--sc-accent2))] to-[rgb(var(--sc-accent))]" />
          <SummaryCard value={errors} label="Inactive elevators" Icon={XCircle} gradient="from-[rgb(var(--sc-accent2))] to-[rgb(var(--sc-accent))]" />
          <SummaryCard value={errors} label="Error status" Icon={AlertTriangle} gradient={errors ? "from-[rgb(var(--sc-bad))] to-[rgb(var(--sc-bad))]" : "from-[rgb(var(--sc-accent2))] to-[rgb(var(--sc-accent))]"} />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-[rgb(var(--sc-fg))]">
            Elevator status <span className="ml-1 text-xs font-medium text-[rgb(var(--sc-badtext))]">Live</span>
          </p>
          <p className="text-[11px] text-[rgb(var(--sc-subtle))]">Last updated: just now</p>
        </div>

        <div className="mt-2 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <Building lifts={lifts} />
          <div className="grid gap-2">
            {lifts.map((s, i) => {
              const l = LIFTS[i];
              return (
                <motion.div
                  key={l.id}
                  layout
                  className={`rounded-xl border p-3 transition-colors ${s.fault ? "border-[rgb(var(--sc-bad)/0.5)] bg-[rgb(var(--sc-bad)/0.1)]" : "border-[rgb(var(--sc-tint)/0.1)] bg-[rgb(var(--sc-tint)/0.03)]"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[rgb(var(--sc-deep))] px-1.5 py-0.5 text-[10px] font-bold text-[rgb(var(--sc-fg))]">{l.id}</span>
                      <span className="text-xs text-[rgb(var(--sc-muted))]">{l.name}</span>
                    </div>
                    <span className={`text-xs font-semibold ${s.fault ? "text-[rgb(var(--sc-badtext))]" : "text-[rgb(var(--sc-oktext))]"}`}>{s.fault ? "Out of service" : "In service"}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                    <span className="text-[rgb(var(--sc-accentsoft))]">
                      Floor: <b className="tabular-nums">{s.floor}</b>
                    </span>
                    <span className="text-[rgb(var(--sc-fg2))]">
                      Trips today: <b className="tabular-nums">{s.trips}</b>
                    </span>
                    <span className="text-[rgb(var(--sc-muted))]">{s.doorsOpen ? "Doors open" : s.dir ? (s.dir > 0 ? "Going up" : "Going down") : "Stopped"}</span>
                  </div>
                  <AnimatePresence>
                    {s.fault && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[rgb(var(--sc-badtext))]">
                          <AlertTriangle className="h-3.5 w-3.5" /> Error code: 51D
                        </p>
                        <p className="text-[11px] text-[rgb(var(--sc-badtext)/0.7)]">Relay SFS - BKP pull-in error · flagged on the dashboard instantly</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {!s.fault && <p className="mt-1 text-[11px] text-[rgb(var(--sc-oktext)/0.8)]">No active errors</p>}
                </motion.div>
              );
            })}
          </div>
        </div>
      </EdgeWindow>
    </div>
  );
}
