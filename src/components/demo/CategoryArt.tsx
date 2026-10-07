import { Cog, MoveVertical, RadioTower, Truck, Zap } from "lucide-react";

/*
 * Designed folder covers for the showcase home page. Drawn in SVG so they stay crisp,
 * match the theme, and animate gently (SMIL) without any JavaScript timers.
 */

/** Vision: a camera viewfinder scanning a blister pack and locking onto one defect. */
export function VisionArt() {
  const cols = 5;
  const rows = 2;
  return (
    <svg viewBox="0 0 400 240" className="h-full w-full transition-transform duration-700 group-hover:scale-105" aria-hidden>
      <defs>
        <radialGradient id="va-glow" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="va-scan" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
          <stop offset="70%" stopColor="#22d3ee" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.9" />
        </linearGradient>
        <clipPath id="va-frame">
          <rect x="95" y="45" width="210" height="150" rx="10" />
        </clipPath>
      </defs>
      <rect width="400" height="240" fill="url(#va-glow)" />

      {/* blister pack */}
      <rect x="118" y="78" width="164" height="84" rx="12" fill="#1e3a5f" stroke="#38bdf8" strokeOpacity="0.35" />
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const cx = 140 + c * 30;
          const cy = 102 + r * 36;
          const bad = r === 0 && c === 3;
          return (
            <circle key={`${r}-${c}`} cx={cx} cy={cy} r={11} fill={bad ? "#334155" : "#0ea5e9"} fillOpacity={bad ? 1 : 0.55} stroke="#7dd3fc" strokeOpacity={bad ? 0.2 : 0.5} />
          );
        })
      )}

      {/* scan sweep inside the viewfinder */}
      <g clipPath="url(#va-frame)">
        <rect x="95" y="0" width="210" height="46" fill="url(#va-scan)">
          <animate attributeName="y" values="-10;160;-10" dur="4s" repeatCount="indefinite" />
        </rect>
      </g>

      {/* detection box on the crushed pocket */}
      <g>
        <rect x="216" y="88" width="28" height="28" rx="3" fill="#f43f5e" fillOpacity="0.15" stroke="#f43f5e" strokeWidth="2">
          <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.35;0.45;0.9;1" dur="4s" repeatCount="indefinite" />
        </rect>
        <g>
          <rect x="216" y="70" width="66" height="15" rx="3" fill="#f43f5e" />
          <text x="222" y="81" fontSize="10" fontWeight="700" fill="white">
            defect 94%
          </text>
          <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.35;0.45;0.9;1" dur="4s" repeatCount="indefinite" />
        </g>
      </g>

      {/* viewfinder corners */}
      {[
        "M95 70 V45 H120",
        "M280 45 H305 V70",
        "M305 170 V195 H280",
        "M120 195 H95 V170",
      ].map((d) => (
        <path key={d} d={d} fill="none" stroke="#e0f2fe" strokeWidth="3" strokeLinecap="round" />
      ))}
      <circle cx="292" cy="58" r="4" fill="#f43f5e">
        <animate attributeName="opacity" values="1;0.2;1" dur="1.2s" repeatCount="indefinite" />
      </circle>
      <text x="200" y="215" textAnchor="middle" fontSize="11" letterSpacing="2" fill="#7dd3fc" fillOpacity="0.8">
        AI INSPECTION
      </text>
    </svg>
  );
}

/** IoT: a hub broadcasting to four connected device types, with data pulses on the links. */
export function IotArt() {
  const hub = { x: 200, y: 112 };
  const nodes = [
    { x: 80, y: 60, Icon: Cog, color: "#34d399" },
    { x: 320, y: 60, Icon: MoveVertical, color: "#38bdf8" },
    { x: 80, y: 170, Icon: Truck, color: "#fbbf24" },
    { x: 320, y: 170, Icon: Zap, color: "#a78bfa" },
  ];
  return (
    <svg viewBox="0 0 400 240" className="h-full w-full transition-transform duration-700 group-hover:scale-105" aria-hidden>
      <defs>
        <radialGradient id="ia-glow" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ia-hub" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill="url(#ia-glow)" />

      {/* signal rings */}
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={hub.x} cy={hub.y} r="34" fill="none" stroke="#5eead4" strokeWidth="1.5">
          <animate attributeName="r" values="34;95" dur="3s" begin={`${i}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0" dur="3s" begin={`${i}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* links + pulses */}
      {nodes.map((n, i) => {
        const d = `M${n.x},${n.y} L${hub.x},${hub.y}`;
        return (
          <g key={i}>
            <path d={d} stroke="rgba(148,163,184,0.35)" strokeWidth="1.5" strokeDasharray="4 5" />
            <circle r="3.5" fill={n.color}>
              <animateMotion dur="2s" begin={`${i * 0.5}s`} repeatCount="indefinite" path={d} />
            </circle>
          </g>
        );
      })}

      {/* device nodes */}
      {nodes.map((n, i) => (
        <g key={`n${i}`}>
          <rect x={n.x - 22} y={n.y - 22} width="44" height="44" rx="12" fill="#0e1830" stroke={n.color} strokeOpacity="0.5" />
          <n.Icon x={n.x - 11} y={n.y - 11} width={22} height={22} color={n.color} />
        </g>
      ))}

      {/* hub */}
      <rect x={hub.x - 32} y={hub.y - 32} width="64" height="64" rx="18" fill="url(#ia-hub)" />
      <RadioTower x={hub.x - 16} y={hub.y - 16} width={32} height={32} color="white" />
      <text x="200" y="215" textAnchor="middle" fontSize="11" letterSpacing="2" fill="#5eead4" fillOpacity="0.8">
        CONNECTED MONITORING
      </text>
    </svg>
  );
}
