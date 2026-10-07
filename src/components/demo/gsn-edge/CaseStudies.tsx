import { useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Cog, MoveVertical, Quote, Sparkles, Truck, Zap, type LucideIcon } from "lucide-react";
import { MachineMock } from "./MachineMock";
import { ElevatorMock } from "./ElevatorMock";
import { FleetMock } from "./FleetMock";
import { EnergyMock } from "./EnergyMock";

interface CaseStudy {
  id: string;
  tab: string;
  Icon: LucideIcon;
  color: string;
  audience: string;
  problem: string;
  sees: string[];
  changes: string[];
  Mock: ComponentType;
}

const CASE_STUDIES: CaseStudy[] = [
  {
    id: "machines",
    tab: "Machine monitoring",
    Icon: Cog,
    color: "text-emerald-300 bg-emerald-400/15",
    audience: "Toolrooms & manufacturing plants",
    problem: "You usually find out a machine sat idle only after the shift has ended.",
    sees: ["Running, idle and down status for every machine, live", "Working and idle hours per machine and per shift", "A shift timeline that shows exactly when each machine stopped", "Downtime alerts the moment a machine goes down"],
    changes: ["Spot idle machines while there's still time to act", "Plan maintenance from real running hours", "Compare machines and shifts with facts, not guesses"],
    Mock: MachineMock,
  },
  {
    id: "elevators",
    tab: "Elevators",
    Icon: MoveVertical,
    color: "text-sky-300 bg-sky-400/15",
    audience: "Building owners & lift maintenance companies",
    problem: "A stuck lift is usually reported by the people standing inside it.",
    sees: ["Floor and in-service status of every lift, live", "Controller error codes with a plain description", "Working hours and current session per lift", "Active, inactive and error counts across zones"],
    changes: ["Technicians know the fault before they reach the site", "Shorter downtime and fewer repeat visits", "Maintenance planned on real usage"],
    Mock: ElevatorMock,
  },
  {
    id: "fleet",
    tab: "Vehicle fleet",
    Icon: Truck,
    color: "text-amber-300 bg-amber-400/15",
    audience: "Delivery, logistics & field-service fleets",
    problem: "Where is the van right now, and why has it been parked for an hour?",
    sees: ["Every vehicle on a live map: moving, idle or parked", "Distance, speed and utilisation per vehicle", "Trip history and route replay for any day", "Driver attendance and shift summaries"],
    changes: ["Less idle time and fewer wasted trips", "A GPS record of every trip and stop", "Better routes and fairer workloads"],
    Mock: FleetMock,
  },
  {
    id: "energy",
    tab: "Energy monitoring",
    Icon: Zap,
    color: "text-violet-300 bg-violet-400/15",
    audience: "Factories, commercial buildings & multi-site businesses",
    problem: "The power bill arrives once a month. The waste happens every minute.",
    sees: ["Live kW, voltage, current, power factor and frequency per meter", "Consumption by hour, day and site", "Warning and critical alarms on any parameter", "One-click PDF energy reports"],
    changes: ["Catch demand peaks before they become penalties", "Fix low power factor early", "See which line, floor or site uses the most"],
    Mock: EnergyMock,
  },
];

export function CaseStudies() {
  const [active, setActive] = useState(CASE_STUDIES[0].id);
  const study = CASE_STUDIES.find((c) => c.id === active) ?? CASE_STUDIES[0];

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label="Case studies">
        {CASE_STUDIES.map((c) => {
          const on = c.id === active;
          return (
            <button
              key={c.id}
              role="tab"
              aria-selected={on}
              onClick={() => setActive(c.id)}
              className={`relative flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
                on ? "border-teal-400/50 bg-teal-400/10" : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
              }`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.color}`}>
                <c.Icon className="h-5 w-5" />
              </span>
              <span className={`text-sm font-semibold ${on ? "text-white" : "text-slate-300"}`}>{c.tab}</span>
              {on && <motion.span layoutId="edge-case-underline" className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-teal-400" />}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={study.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="mt-6">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr_1fr]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-300">{study.audience}</p>
              <p className="mt-3 flex gap-2 text-lg font-semibold leading-snug text-white">
                <Quote className="h-5 w-5 shrink-0 rotate-180 text-slate-600" />
                {study.problem}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-sm font-semibold text-white">What you see</p>
              <ul className="mt-3 space-y-2">
                {study.sees.map((s) => (
                  <li key={s} className="flex gap-2 text-sm text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5">
              <p className="text-sm font-semibold text-white">What changes</p>
              <ul className="mt-3 space-y-2">
                {study.changes.map((s) => (
                  <li key={s} className="flex gap-2 text-sm text-emerald-100/90">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-5">
            <study.Mock />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
