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
    color: "text-[rgb(var(--sc-oktext))] bg-[rgb(var(--sc-ok)/0.15)]",
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
    color: "text-[rgb(var(--sc-accentsoft))] bg-[rgb(var(--sc-accent)/0.15)]",
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
    color: "text-[rgb(var(--sc-warntext))] bg-[rgb(var(--sc-warn)/0.15)]",
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
    color: "text-[rgb(var(--sc-accentsoft))] bg-[rgb(var(--sc-accent)/0.15)]",
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
                on ? "border-[rgb(var(--sc-accent)/0.5)] bg-[rgb(var(--sc-accent)/0.1)]" : "border-[rgb(var(--sc-tint)/0.1)] bg-[rgb(var(--sc-tint)/0.02)] hover:border-[rgb(var(--sc-tint)/0.2)] hover:bg-[rgb(var(--sc-tint)/0.04)]"
              }`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.color}`}>
                <c.Icon className="h-5 w-5" />
              </span>
              <span className={`text-sm font-semibold ${on ? "text-[rgb(var(--sc-fg))]" : "text-[rgb(var(--sc-fg2))]"}`}>{c.tab}</span>
              {on && <motion.span layoutId="edge-case-underline" className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-[rgb(var(--sc-accent))]" />}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={study.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="mt-6">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr_1fr]">
            <div className="rounded-2xl border border-[rgb(var(--sc-tint)/0.1)] bg-[rgb(var(--sc-tint)/0.03)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--sc-accentsoft))]">{study.audience}</p>
              <p className="mt-3 flex gap-2 text-lg font-semibold leading-snug text-[rgb(var(--sc-fg))]">
                <Quote className="h-5 w-5 shrink-0 rotate-180 text-[rgb(var(--sc-subtle))]" />
                {study.problem}
              </p>
            </div>
            <div className="rounded-2xl border border-[rgb(var(--sc-tint)/0.1)] bg-[rgb(var(--sc-tint)/0.03)] p-5">
              <p className="text-sm font-semibold text-[rgb(var(--sc-fg))]">What you see</p>
              <ul className="mt-3 space-y-2">
                {study.sees.map((s) => (
                  <li key={s} className="flex gap-2 text-sm text-[rgb(var(--sc-fg2))]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--sc-accent))]" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-[rgb(var(--sc-ok)/0.2)] bg-[rgb(var(--sc-ok)/0.06)] p-5">
              <p className="text-sm font-semibold text-[rgb(var(--sc-fg))]">What changes</p>
              <ul className="mt-3 space-y-2">
                {study.changes.map((s) => (
                  <li key={s} className="flex gap-2 text-sm text-[rgb(var(--sc-oktext)/0.9)]">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--sc-oktext))]" />
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
