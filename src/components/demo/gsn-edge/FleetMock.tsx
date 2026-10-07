import { useMemo } from "react";
import { motion } from "framer-motion";
import { Gauge, Navigation, ParkingSquare, Radio, Route } from "lucide-react";
import { EdgeWindow, KpiCard, Legend, StatusPill, type StatusTone } from "./edgeShared";
import { useTicker } from "./edgeHooks";

/*
 * Re-creation of GSN Edge "Fleet Monitor" + "Fleet Map" with simulated vehicles.
 * Time runs fast: one tick (1 s) = one minute on the road, so distances visibly grow.
 */

type Pt = [number, number];
type Mode = "moving" | "idle" | "parked";

const MAP_W = 420;
const MAP_H = 280;
const DEPOT: Pt = [60, 238];

const ROUTES: Pt[][] = [
  [[60, 238], [60, 150], [160, 150], [160, 60], [300, 60], [300, 150], [380, 150]],
  [[60, 238], [200, 238], [200, 150], [300, 150], [300, 238], [380, 238]],
  [[60, 238], [60, 60], [160, 60], [160, 238], [300, 238], [300, 60], [380, 60]],
  [[60, 238], [200, 238], [200, 60], [380, 60], [380, 238]],
];

const VEHICLES = [
  { name: "Delivery Van 1", id: "TRK001", route: 0, offset: 0, pattern: ["moving", "moving", "idle", "moving", "moving", "moving"] as Mode[] },
  { name: "Delivery Van 2", id: "TRK002", route: 1, offset: 7, pattern: ["moving", "moving", "moving", "idle", "idle", "moving"] as Mode[] },
  { name: "Delivery Van 3", id: "TRK003", route: 2, offset: 3, pattern: ["moving", "idle", "moving", "moving", "moving", "parked"] as Mode[] },
  { name: "Service Truck", id: "TRK004", route: 3, offset: 11, pattern: ["parked", "parked", "moving", "moving", "idle", "moving"] as Mode[] },
  { name: "Field Bike 01", id: "BIK001", route: 1, offset: 15, pattern: ["moving", "moving", "moving", "moving", "idle", "moving"] as Mode[] },
  { name: "Pickup 02", id: "TRK005", route: 0, offset: 20, pattern: ["parked", "parked", "parked", "parked", "parked", "parked"] as Mode[] },
];

const PHASE_TICKS = 8; // each pattern step lasts 8 s
const MODE_TONE: Record<Mode, StatusTone> = { moving: "green", idle: "amber", parked: "slate" };
const MODE_LABEL: Record<Mode, string> = { moving: "Moving", idle: "Idle", parked: "Parked" };

function routeLength(r: Pt[]) {
  let len = 0;
  for (let i = 1; i < r.length; i++) len += Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]);
  return len;
}

/** Point at distance `d` along a route that runs out and back (ping-pong). */
function pointAt(r: Pt[], d: number): Pt {
  const len = routeLength(r);
  let pos = d % (2 * len);
  if (pos > len) pos = 2 * len - pos;
  for (let i = 1; i < r.length; i++) {
    const seg = Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]);
    if (pos <= seg) {
      const f = seg ? pos / seg : 0;
      return [r[i - 1][0] + (r[i][0] - r[i - 1][0]) * f, r[i - 1][1] + (r[i][1] - r[i - 1][1]) * f];
    }
    pos -= seg;
  }
  return r[r.length - 1];
}

/** Replays a vehicle's day up to `tick`: current mode, speed, km and moving share. */
function simulate(v: (typeof VEHICLES)[number], tick: number) {
  let dist = 0;
  let km = 0;
  let movingTicks = 0;
  let mode: Mode = "parked";
  let speed = 0;
  const t0 = 40; // start mid-morning so the dashboard isn't empty
  for (let t = 0; t <= t0 + tick; t++) {
    mode = v.pattern[Math.floor((t + v.offset) / PHASE_TICKS) % v.pattern.length];
    speed = mode === "moving" ? Math.round(32 + 14 * Math.sin((t + v.offset) / 3) + (v.offset % 5)) : 0;
    if (mode === "moving") {
      dist += speed * 0.18;
      km += speed / 60;
      movingTicks++;
    }
  }
  const pos = mode === "parked" && dist === 0 ? DEPOT : pointAt(ROUTES[v.route], dist);
  return { mode, speed, km, util: Math.round((movingTicks / (t0 + tick + 1)) * 100), pos };
}

function FleetMap({ states }: { states: ReturnType<typeof simulate>[] }) {
  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="h-full w-full">
      <rect width={MAP_W} height={MAP_H} fill="#0a1426" />
      {/* city blocks */}
      {[40, 100, 180, 240].flatMap((y) =>
        [80, 180, 230, 320].map((x) => <rect key={`${x}-${y}`} x={x} y={y - 30} width={60} height={34} rx={4} fill="#101d36" />)
      )}
      <path d="M0 110 C 120 90, 200 130, 420 100" stroke="#12304f" strokeWidth={14} fill="none" />
      {/* roads */}
      {[60, 150, 238].map((y) => (
        <line key={`h${y}`} x1={20} x2={400} y1={y} y2={y} stroke="#1e2d4a" strokeWidth={7} strokeLinecap="round" />
      ))}
      {[60, 160, 200, 300, 380].map((x) => (
        <line key={`v${x}`} x1={x} x2={x} y1={40} y2={258} stroke="#1e2d4a" strokeWidth={7} strokeLinecap="round" />
      ))}
      {/* active routes */}
      {ROUTES.map((r, i) => (
        <polyline
          key={i}
          points={r.map((p) => p.join(",")).join(" ")}
          fill="none"
          stroke="#2dd4bf"
          strokeOpacity={0.18}
          strokeWidth={3}
          strokeDasharray="6 6"
        />
      ))}
      <g>
        <rect x={DEPOT[0] - 22} y={DEPOT[1] - 12} width={44} height={24} rx={6} fill="#14233f" stroke="#334155" />
        <text x={DEPOT[0]} y={DEPOT[1] + 4} textAnchor="middle" fontSize={9} fill="#94a3b8">
          Depot
        </text>
      </g>
      {/* vehicles */}
      {states.map((s, i) => {
        const color = s.mode === "moving" ? "#34d399" : s.mode === "idle" ? "#fbbf24" : "#94a3b8";
        return (
          <motion.g key={VEHICLES[i].id} animate={{ x: s.pos[0], y: s.pos[1] }} transition={{ duration: 1, ease: "linear" }}>
            {s.mode === "moving" && (
              <circle r={11} fill={color} opacity={0.25}>
                <animate attributeName="r" values="6;14;6" dur="1.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0;0.4" dur="1.6s" repeatCount="indefinite" />
              </circle>
            )}
            <circle r={6} fill={color} stroke="#0a1426" strokeWidth={2} />
            <text y={-10} textAnchor="middle" fontSize={8.5} fill="#cbd5e1">
              {VEHICLES[i].id}
            </text>
          </motion.g>
        );
      })}
    </svg>
  );
}

export function FleetMock() {
  const { ref, tick } = useTicker(1000);
  const states = useMemo(() => VEHICLES.map((v) => simulate(v, tick)), [tick]);

  const totalKm = states.reduce((s, v) => s + v.km, 0);
  const moving = states.filter((s) => s.mode === "moving").length;
  const stopped = states.length - moving;

  return (
    <div ref={ref}>
      <EdgeWindow section="Fleet Monitor" tabs={["Fleet Monitor", "Fleet Map", "Attendance"]}>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <KpiCard value={`${totalKm.toFixed(1)} km`} label="Distance" sub="Today" Icon={Route} tone="teal" />
          <KpiCard value={moving} label="Moving" sub="In transit now" Icon={Navigation} tone="green" />
          <KpiCard value={stopped} label="Idle / parked" sub="Online, not moving" Icon={ParkingSquare} tone="amber" />
          <KpiCard value={states.length} label="Online" sub={`of ${states.length}`} Icon={Radio} tone="blue" />
        </div>

        <div className="mt-3">
          <Legend
            items={[
              { tone: "green", label: "Moving" },
              { tone: "amber", label: "Idle" },
              { tone: "slate", label: "Parked" },
            ]}
          />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-xl border border-white/10" style={{ aspectRatio: `${MAP_W} / ${MAP_H}` }}>
            <FleetMap states={states} />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {states.map((s, i) => (
              <div key={VEHICLES[i].id} className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-white">{VEHICLES[i].name}</p>
                    <p className="text-[10px] text-slate-500">{VEHICLES[i].id}</p>
                  </div>
                  <StatusPill tone={MODE_TONE[s.mode]}>{MODE_LABEL[s.mode]}</StatusPill>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
                  <div>
                    <p className="text-slate-500">Speed</p>
                    <p className="flex items-center gap-1 font-semibold tabular-nums text-slate-200">
                      <Gauge className="h-3 w-3 text-slate-500" />
                      {s.speed} km/h
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Today</p>
                    <p className="font-semibold tabular-nums text-slate-200">{s.km.toFixed(1)} km</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Util</p>
                    <p className="font-semibold tabular-nums text-slate-200">{s.util}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </EdgeWindow>
    </div>
  );
}
