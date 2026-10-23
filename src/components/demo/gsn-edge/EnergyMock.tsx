import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, AlertTriangle, Bell, FileText, Gauge, Radio, Zap } from "lucide-react";
import { EdgeWindow } from "./edgeShared";
import { useTicker } from "./edgeHooks";

/*
 * Re-creation of GSN Edge "Energy Overview" with four simulated meters.
 * Parameters and alarm levels mirror the real app (V, A, kW, PF, Hz, kWh; Warning / Critical).
 * Every SPIKE_EVERY seconds the compressor's demand pushes the plant over the alarm limit.
 */

const POINTS = 60;
const THRESHOLD_KW = 300;
const SPIKE_EVERY = 16;
const SPIKE_LENGTH = 4;

const METERS = [
  { name: "Compressor house", base: 92, swing: 10, spike: 78 },
  { name: "CNC shop", base: 84, swing: 12, spike: 0 },
  { name: "HVAC", base: 46, swing: 6, spike: 0 },
  { name: "Lighting & office", base: 18, swing: 2, spike: 0 },
];

function metersAt(t: number) {
  const spiking = t % SPIKE_EVERY >= SPIKE_EVERY - SPIKE_LENGTH;
  return METERS.map((m, i) => Math.max(1, m.base + Math.sin(t / (3 + i)) * m.swing + (spiking ? m.spike : 0) + Math.sin(t * 1.7 + i) * 2));
}

function LiveChart({ data }: { data: number[] }) {
  const w = 600;
  const h = 200;
  const min = 150;
  const max = 360;
  const y = (v: number) => h - ((v - min) / (max - min)) * h;
  const x = (i: number) => (i / (POINTS - 1)) * w;
  const line = data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const ty = y(THRESHOLD_KW);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-full w-full">
      <defs>
        <linearGradient id="edge-energy-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--sc-accent))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(var(--sc-accent))" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" x2={w} y1={h * f} y2={h * f} stroke="rgb(var(--sc-muted)/0.12)" />
      ))}
      <line x1="0" x2={w} y1={ty} y2={ty} stroke="rgb(var(--sc-bad))" strokeDasharray="6 6" strokeWidth="1.5" />
      <text x={w - 6} y={ty - 6} textAnchor="end" fill="rgb(var(--sc-badtext))" fontSize="12">
        Critical above {THRESHOLD_KW} kW
      </text>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill="url(#edge-energy-fill)" />
      <path d={line} fill="none" stroke="rgb(var(--sc-accent))" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r="4.5" fill="rgb(var(--sc-accent))" stroke="rgb(var(--sc-panel))" strokeWidth="2" />
    </svg>
  );
}

function Kpi({ label, value, unit, Icon, tone = "text-[rgb(var(--sc-fg))]", badge }: { label: string; value: string; unit?: string; Icon: typeof Zap; tone?: string; badge?: string }) {
  return (
    <div className="relative rounded-xl border border-[rgb(var(--sc-tint)/0.1)] bg-[rgb(var(--sc-tint)/0.03)] px-3 py-2.5">
      {badge && <span className="absolute -top-2 left-2 rounded bg-[rgb(var(--sc-warn))] px-1.5 text-[9px] font-bold text-[#111827]">{badge}</span>}
      <Icon className="h-3.5 w-3.5 text-[rgb(var(--sc-subtle))]" />
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--sc-muted))]">{label}</p>
      <p className={`text-base font-bold tabular-nums sm:text-lg ${tone}`}>
        {value}
        {unit && <span className="ml-1 text-[10px] font-medium text-[rgb(var(--sc-subtle))]">{unit}</span>}
      </p>
    </div>
  );
}

export function EnergyMock() {
  const { ref, tick } = useTicker(1000);
  const [series, setSeries] = useState<number[]>(() =>
    Array.from({ length: POINTS }, (_, i) => metersAt(i - POINTS).reduce((a, b) => a + b, 0))
  );
  const [alarmsToday, setAlarmsToday] = useState(2);

  const meters = metersAt(tick);
  const total = meters.reduce((a, b) => a + b, 0);
  const alarm = total > THRESHOLD_KW;

  useEffect(() => {
    setSeries((s) => [...s.slice(1), total]);
    // count each new spike once, on its first second
    if (tick % SPIKE_EVERY === SPIKE_EVERY - SPIKE_LENGTH) setAlarmsToday((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const todayKwh = 3260 + tick * 0.08;
  const pf = 0.93 - (alarm ? 0.06 : 0) + Math.sin(tick / 7) * 0.01;
  const volts = 230.4 + Math.sin(tick / 3) * 1.2;
  const amps = (total * 1000) / (3 * volts * 0.93) / 4;
  const hz = 50 + Math.sin(tick / 9) * 0.03;

  return (
    <div ref={ref}>
      <EdgeWindow section="Energy Overview">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-[rgb(var(--sc-accentsoft))]" />
              <p className="text-lg font-bold text-[rgb(var(--sc-fg))]">Energy Overview</p>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                  alarm ? "border-[rgb(var(--sc-bad)/0.4)] bg-[rgb(var(--sc-bad)/0.15)] text-[rgb(var(--sc-badtext))]" : "border-[rgb(var(--sc-ok)/0.3)] bg-[rgb(var(--sc-ok)/0.15)] text-[rgb(var(--sc-oktext))]"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${alarm ? "animate-pulse bg-[rgb(var(--sc-bad))]" : "bg-[rgb(var(--sc-ok))]"}`} />
                {alarm ? "Alarm active" : "System normal"}
              </span>
            </div>
            <p className="mt-1 text-xs text-[rgb(var(--sc-muted))]">Total meters: 4 · Online: 4 · Offline: 0</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-[rgb(var(--sc-ok))] px-1.5 py-0.5 text-[10px] font-bold text-[rgb(var(--sc-fg))]">LIVE</span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--sc-accent)/0.4)] px-2.5 py-1 text-xs font-medium text-[rgb(var(--sc-accentsoft))]">
              <FileText className="h-3.5 w-3.5" /> Generate report
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          <Kpi label="Current power" value={total.toFixed(0)} unit="kW" Icon={Zap} tone={alarm ? "text-[rgb(var(--sc-badtext))]" : "text-[rgb(var(--sc-fg))]"} />
          <Kpi label="Today" value={todayKwh.toLocaleString("en-IN", { maximumFractionDigits: 0 })} unit="kWh" Icon={Activity} tone="text-[rgb(var(--sc-oktext))]" />
          <Kpi label="Avg PF" value={pf.toFixed(2)} Icon={Gauge} badge={pf < 0.9 ? "Warning" : undefined} tone={pf < 0.9 ? "text-[rgb(var(--sc-warntext))]" : "text-[rgb(var(--sc-fg))]"} />
          <Kpi label="Avg V" value={volts.toFixed(1)} unit="V" Icon={Activity} tone="text-[rgb(var(--sc-accentsoft))]" />
          <Kpi label="Avg A" value={amps.toFixed(1)} unit="A" Icon={Activity} tone="text-[rgb(var(--sc-accentsoft))]" />
          <Kpi label="Avg Hz" value={hz.toFixed(2)} unit="Hz" Icon={Radio} tone="text-[rgb(var(--sc-accentsoft))]" />
          <Kpi label="Alarms" value={String(alarmsToday)} unit="today" Icon={Bell} tone={alarm ? "text-[rgb(var(--sc-badtext))]" : "text-[rgb(var(--sc-fg))]"} />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="rounded-xl border border-[rgb(var(--sc-tint)/0.1)] bg-[rgb(var(--sc-tint)/0.03)] p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[rgb(var(--sc-fg))]">Fleet energy (kW)</p>
              <div className="flex gap-1 text-[10px]">
                {["15m", "1h", "24h", "7d"].map((r, i) => (
                  <span key={r} className={`rounded-full border px-2 py-0.5 ${i === 0 ? "border-[rgb(var(--sc-accent))] bg-[rgb(var(--sc-accent))] text-[rgb(var(--sc-fg))]" : "border-[rgb(var(--sc-tint)/0.1)] text-[rgb(var(--sc-muted))]"}`}>
                    {r}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-2 h-[170px]">
              <LiveChart data={series} />
            </div>
          </div>

          <div className="rounded-xl border border-[rgb(var(--sc-tint)/0.1)] bg-[rgb(var(--sc-tint)/0.03)] p-3">
            <p className="text-sm font-semibold text-[rgb(var(--sc-fg))]">Meters</p>
            <ul className="mt-2 space-y-2.5">
              {METERS.map((m, i) => (
                <li key={m.name}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-[rgb(var(--sc-fg2))]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--sc-ok))]" />
                      {m.name}
                    </span>
                    <span className={`font-semibold tabular-nums ${m.spike && alarm ? "text-[rgb(var(--sc-badtext))]" : "text-[rgb(var(--sc-fg))]"}`}>{meters[i].toFixed(1)} kW</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[rgb(var(--sc-tint)/0.1)]">
                    <motion.div
                      className={`h-full rounded-full ${m.spike && alarm ? "bg-[rgb(var(--sc-bad))]" : "bg-[rgb(var(--sc-accent))]"}`}
                      animate={{ width: `${(meters[i] / 180) * 100}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <AnimatePresence>
          {alarm && (
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className="absolute right-4 top-4 z-10 flex max-w-xs items-start gap-3 rounded-xl border border-[rgb(var(--sc-bad)/0.4)] bg-[rgb(var(--sc-badbg)/0.95)] p-3 shadow-xl backdrop-blur"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[rgb(var(--sc-badtext))]" />
              <div>
                <p className="text-sm font-semibold text-[rgb(var(--sc-badtext))]">Critical · Active power</p>
                <p className="text-xs text-[rgb(var(--sc-badtext)/0.7)]">
                  Plant demand {total.toFixed(0)} kW is above the {THRESHOLD_KW} kW limit (Compressor house).
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </EdgeWindow>
    </div>
  );
}
