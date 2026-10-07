import { motion } from "framer-motion";
import { Bell, Cog, FileText, LayoutDashboard, MoveVertical, Smartphone, Truck, Zap, type LucideIcon } from "lucide-react";
import { EdgeLogo } from "./edgeShared";

/* Hero visual: devices → GSN Edge → what people get. Packets travel along the wires with SMIL animateMotion. */

type Node = { label: string; sub: string; Icon: LucideIcon; color: string };

const SOURCES: Node[] = [
  { label: "Machine sensors", sub: "Run / idle / fault signals", Icon: Cog, color: "#34d399" },
  { label: "Lift controllers", sub: "Floor, status, error codes", Icon: MoveVertical, color: "#38bdf8" },
  { label: "GPS trackers", sub: "Location, speed, ignition", Icon: Truck, color: "#fbbf24" },
  { label: "Energy meters", sub: "kW, V, A, PF, Hz, kWh", Icon: Zap, color: "#a78bfa" },
];

const OUTPUTS: Node[] = [
  { label: "Live dashboards", sub: "Every site on one screen", Icon: LayoutDashboard, color: "#2dd4bf" },
  { label: "Alarms", sub: "Warning & critical limits", Icon: Bell, color: "#f43f5e" },
  { label: "Reports", sub: "Export & PDF in a click", Icon: FileText, color: "#60a5fa" },
  { label: "On your phone", sub: "Same view, anywhere", Icon: Smartphone, color: "#c084fc" },
];

const W = 1000;
const H = 440;
const ROW_Y = [70, 170, 270, 370];
const HUB = { x: 500, y: 220, w: 180, h: 120 };
const LEFT_X = 40;
const RIGHT_X = 750;
const NODE_W = 210;
const NODE_H = 64;

function NodeBox({ n, x, y }: { n: Node; x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y - NODE_H / 2} width={NODE_W} height={NODE_H} rx={14} fill="#0e1830" stroke="rgba(255,255,255,0.1)" />
      <rect x={x + 12} y={y - 18} width={36} height={36} rx={10} fill={n.color} fillOpacity={0.15} />
      <n.Icon x={x + 20} y={y - 10} width={20} height={20} color={n.color} />
      <text x={x + 60} y={y - 3} fill="#f1f5f9" fontSize={15} fontWeight={600}>
        {n.label}
      </text>
      <text x={x + 60} y={y + 15} fill="#94a3b8" fontSize={11.5}>
        {n.sub}
      </text>
    </g>
  );
}

export function ConnectFlow() {
  const inPaths = ROW_Y.map((y) => `M${LEFT_X + NODE_W},${y} C ${LEFT_X + NODE_W + 120},${y} ${HUB.x - HUB.w / 2 - 110},${HUB.y} ${HUB.x - HUB.w / 2},${HUB.y}`);
  const outPaths = ROW_Y.map((y) => `M${HUB.x + HUB.w / 2},${HUB.y} C ${HUB.x + HUB.w / 2 + 110},${HUB.y} ${RIGHT_X - 120},${y} ${RIGHT_X},${y}`);

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0b1426] to-[#070d1d] p-3 shadow-2xl shadow-black/50 sm:p-5">
      {/* Wide screens: animated diagram */}
      <svg viewBox={`0 0 ${W} ${H}`} className="hidden h-auto w-full sm:block" role="img" aria-label="Devices send data to GSN Edge, which shows dashboards, alarms and reports">
        <defs>
          <radialGradient id="edge-hub-glow">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
          </radialGradient>
        </defs>

        {[...inPaths, ...outPaths].map((d, i) => (
          <path key={i} d={d} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth={2} />
        ))}

        {inPaths.map((d, i) => (
          <circle key={`in${i}`} r={5} fill={SOURCES[i].color}>
            <animateMotion dur="2.4s" repeatCount="indefinite" begin={`${i * 0.55}s`} path={d} />
          </circle>
        ))}
        {outPaths.map((d, i) => (
          <circle key={`out${i}`} r={5} fill={OUTPUTS[i].color}>
            <animateMotion dur="2.4s" repeatCount="indefinite" begin={`${1.2 + i * 0.55}s`} path={d} />
          </circle>
        ))}

        <circle cx={HUB.x} cy={HUB.y} r={150} fill="url(#edge-hub-glow)">
          <animate attributeName="r" values="120;160;120" dur="3s" repeatCount="indefinite" />
        </circle>
        <rect x={HUB.x - HUB.w / 2} y={HUB.y - HUB.h / 2} width={HUB.w} height={HUB.h} rx={22} fill="#0f2438" stroke="#2dd4bf" strokeOpacity={0.6} strokeWidth={1.5} />
        <foreignObject x={HUB.x - HUB.w / 2} y={HUB.y - 36} width={HUB.w} height={72}>
          <div className="flex h-full flex-col items-center justify-center gap-1.5">
            <EdgeLogo size="lg" />
            <span className="text-[11px] text-teal-200/80">cloud platform</span>
          </div>
        </foreignObject>

        {SOURCES.map((n, i) => (
          <NodeBox key={n.label} n={n} x={LEFT_X} y={ROW_Y[i]} />
        ))}
        {OUTPUTS.map((n, i) => (
          <NodeBox key={n.label} n={n} x={RIGHT_X} y={ROW_Y[i]} />
        ))}

        <text x={LEFT_X} y={22} fill="#64748b" fontSize={12} fontWeight={600} letterSpacing="0.12em">
          ON YOUR SITE
        </text>
        <text x={RIGHT_X} y={22} fill="#64748b" fontSize={12} fontWeight={600} letterSpacing="0.12em">
          WHAT YOU GET
        </text>
      </svg>

      {/* Phones: simple stacked version */}
      <div className="space-y-3 sm:hidden">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">On your site</p>
        <div className="grid grid-cols-2 gap-2">
          {SOURCES.map((n) => (
            <div key={n.label} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
              <n.Icon className="h-4 w-4 shrink-0" color={n.color} />
              <span className="text-xs text-slate-200">{n.label}</span>
            </div>
          ))}
        </div>
        <motion.div
          animate={{ boxShadow: ["0 0 0 0 rgba(45,212,191,0.4)", "0 0 0 12px rgba(45,212,191,0)"] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          className="mx-auto flex w-fit flex-col items-center rounded-2xl border border-teal-400/50 bg-[#0f2438] px-6 py-3"
        >
          <EdgeLogo size="md" />
          <span className="text-[10px] text-teal-200/80">cloud platform</span>
        </motion.div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">What you get</p>
        <div className="grid grid-cols-2 gap-2">
          {OUTPUTS.map((n) => (
            <div key={n.label} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
              <n.Icon className="h-4 w-4 shrink-0" color={n.color} />
              <span className="text-xs text-slate-200">{n.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
