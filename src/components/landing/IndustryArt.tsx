import React from "react";

/**
 * Line drawings for the landing page's industry tabs: one product per industry with a
 * single highlighted defect. Same palette as the rest of the dark section.
 */

const GRID = "#485840";
const PART = "#88987c";
const DETAIL = "#bec9b0";
const FILL = "#171f1b";
const LIME = "#e9ff65";

/** Lime box around the defect with a leader line to the "REGION OF INTEREST" label */
const Callout: React.FC<{ x: number; y: number; w: number; h: number }> = ({ x, y, w, h }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} fill="none" stroke={LIME} />
    <path d={`M${x + w} ${y}l30-30h120`} fill="none" stroke={LIME} />
    {/* backing so the label stays readable over busy drawings */}
    <rect x={x + w + 34} y={y - 48} width={118} height={15} fill="#242f27" />
    <text x={x + w + 38} y={y - 37} fontSize="10" fontFamily="monospace" fill={LIME}>
      REGION OF INTEREST
    </text>
  </g>
);

const hexagon = (cx: number, cy: number, r: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");

const Automotive = () => (
  <>
    <g fill="none" stroke={PART} strokeWidth="8" strokeLinejoin="round">
      {[95, 250, 405].map((cx) => (
        <polygon key={cx} points={hexagon(cx, 130, 56)} />
      ))}
    </g>
    <g fill={FILL} stroke={DETAIL} strokeWidth="2">
      {[95, 250, 405].map((cx) => (
        <circle key={cx} cx={cx} cy={130} r={22} />
      ))}
    </g>
    {/* scratch on the middle nut */}
    <path d="M226 96l10-6 8 3 11-7 7 2" fill="none" stroke={LIME} strokeWidth="2.5" strokeLinecap="round" />
    <Callout x={218} y={78} w={52} h={26} />
  </>
);

const chipPins = (x: number, y: number, w: number, h: number) => {
  const pins: string[] = [];
  for (let py = y + 10; py < y + h; py += 10) pins.push(`M${x - 8} ${py}h8M${x + w} ${py}h8`);
  return pins.join("");
};

const Electronics = () => (
  <>
    <rect x="40" y="35" width="420" height="190" rx="8" fill="none" stroke={PART} strokeWidth="3" />
    {/* traces */}
    <path
      d="M148 100h52v60h22M262 160h70M110 140v50h60M376 188v18h-26M80 80h-20M430 160h-10"
      fill="none"
      stroke={PART}
      strokeWidth="1.5"
    />
    {/* chips */}
    <rect x="80" y="70" width="60" height="60" fill={FILL} stroke={DETAIL} strokeWidth="2" />
    <path d={chipPins(80, 70, 60, 60)} stroke={DETAIL} strokeWidth="2" />
    <rect x="340" y="140" width="72" height="48" fill={FILL} stroke={DETAIL} strokeWidth="2" />
    <path d={chipPins(340, 140, 72, 48)} stroke={DETAIL} strokeWidth="2" />
    {/* resistors */}
    <g fill={FILL} stroke={DETAIL} strokeWidth="2">
      <rect x="170" y="180" width="30" height="12" />
      <rect x="320" y="200" width="30" height="12" />
      <rect x="200" y="62" width="30" height="12" />
    </g>
    {/* mounting holes */}
    <g fill="none" stroke={PART} strokeWidth="2">
      {[
        [58, 53],
        [442, 53],
        [58, 207],
        [442, 207],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={6} />
      ))}
    </g>
    {/* empty footprint: missing component */}
    <rect x="218" y="148" width="48" height="24" fill="none" stroke={DETAIL} strokeWidth="1.5" strokeDasharray="3 3" />
    <g fill="none" stroke={LIME} strokeWidth="2">
      <rect x="222" y="153" width="10" height="14" />
      <rect x="252" y="153" width="10" height="14" />
    </g>
    <Callout x={210} y={140} w={64} h={40} />
  </>
);

const Pharma = () => {
  const cols = [110, 180, 250, 320, 390];
  const rows = [95, 165];
  return (
    <>
      <rect x="60" y="45" width="380" height="170" rx="14" fill="none" stroke={PART} strokeWidth="3" />
      <path d="M70 130h360" stroke={PART} strokeWidth="1.5" strokeDasharray="4 4" />
      {rows.map((cy) =>
        cols.map((cx) => {
          const empty = cy === 95 && cx === 180;
          return (
            <g key={`${cx}-${cy}`}>
              <ellipse cx={cx} cy={cy} rx={25} ry={19} fill="none" stroke={PART} strokeWidth="6" />
              {!empty && (
                <>
                  <ellipse cx={cx} cy={cy} rx={14} ry={9} fill={FILL} stroke={DETAIL} strokeWidth="2" />
                  <path d={`M${cx} ${cy - 9}v18`} stroke={DETAIL} strokeWidth="1.5" />
                </>
              )}
            </g>
          );
        })
      )}
      <Callout x={148} y={70} w={64} h={50} />
    </>
  );
};

const bottlePath = (cx: number) =>
  `M${cx - 12} 70V92Q${cx - 32} 100 ${cx - 32} 118V218Q${cx - 32} 226 ${cx - 24} 226H${cx + 24}Q${cx + 32} 226 ${cx + 32} 218V118Q${cx + 32} 100 ${cx + 12} 92V70Z`;

const Food = () => (
  <>
    {[90, 190, 290, 390].map((cx) => (
      <g key={cx}>
        <path d={bottlePath(cx)} fill="none" stroke={PART} strokeWidth="4" strokeLinejoin="round" />
        <rect x={cx - 15} y={56} width={30} height={14} fill={FILL} stroke={DETAIL} strokeWidth="2" />
        <rect
          x={cx - 32}
          y={140}
          width={64}
          height={40}
          fill={FILL}
          stroke={cx === 190 ? LIME : DETAIL}
          strokeWidth="2"
          transform={cx === 190 ? `rotate(-10 ${cx} 160)` : undefined}
        />
        <path d={`M${cx - 18} 156h36M${cx - 12} 166h24`} stroke={DETAIL} strokeWidth="1.5" transform={cx === 190 ? `rotate(-10 ${cx} 160)` : undefined} />
      </g>
    ))}
    <Callout x={148} y={124} w={84} h={72} />
  </>
);

const Plastics = () => (
  <>
    <g fill="none" stroke={PART} strokeWidth="10" strokeLinejoin="round">
      <rect x="45" y="80" width="100" height="100" rx="22" />
      {/* middle part: chipped top-right corner */}
      <path d="M222 80H268L280 93L276 103L300 109V158Q300 180 278 180H222Q200 180 200 158V102Q200 80 222 80Z" />
      <rect x="355" y="80" width="100" height="100" rx="22" />
    </g>
    <g fill={FILL} stroke={DETAIL} strokeWidth="2">
      {[95, 250, 405].map((cx) => (
        <g key={cx}>
          <circle cx={cx - 20} cy={130} r={10} />
          <circle cx={cx + 20} cy={130} r={10} />
        </g>
      ))}
    </g>
    <path d="M268 80L280 93L276 103L300 109" fill="none" stroke={LIME} strokeWidth="3" strokeLinejoin="round" />
    <Callout x={260} y={70} w={50} h={48} />
  </>
);

const Textiles = () => {
  const xs = Array.from({ length: 26 }, (_, i) => 50 + i * 16);
  const ys = Array.from({ length: 12 }, (_, i) => 42 + i * 16);
  return (
    <>
      <g stroke="#6b7a61" strokeWidth="4">
        {xs.map((x) => (
          <path key={x} d={`M${x} 34V226`} />
        ))}
      </g>
      <g stroke={PART} strokeWidth="4" fill="none">
        {ys.map((y) =>
          y === 122 ? (
            // pulled thread: loops up out of the weave
            <path key={y} d={`M42 ${y}H206Q222 ${y} 226 ${y - 14}Q232 ${y - 26} 238 ${y - 14}Q242 ${y} 258 ${y}H458`} />
          ) : (
            <path key={y} d={`M42 ${y}H458`} />
          )
        )}
      </g>
      {/* hole where threads broke */}
      <ellipse cx="232" cy="148" rx="11" ry="8" fill={FILL} stroke={DETAIL} strokeWidth="2" />
      <Callout x={212} y={98} w={44} h={62} />
    </>
  );
};

const ART: { label: string; Drawing: React.FC }[] = [
  { label: "Automotive nuts, one with a surface scratch highlighted", Drawing: Automotive },
  { label: "Circuit board with one missing component highlighted", Drawing: Electronics },
  { label: "Blister pack with one empty pocket highlighted", Drawing: Pharma },
  { label: "Row of bottles, one with a crooked label highlighted", Drawing: Food },
  { label: "Moulded plastic parts, one with a chipped corner highlighted", Drawing: Plastics },
  { label: "Woven fabric with a pulled thread and a hole highlighted", Drawing: Textiles },
];

export const IndustryArt: React.FC<{ index: number }> = ({ index }) => {
  const { label, Drawing } = ART[index] ?? ART[0];
  return (
    <svg viewBox="0 0 500 260" role="img" aria-label={label}>
      <defs>
        <pattern id="vm2-g" width="25" height="25" patternUnits="userSpaceOnUse">
          <path d="M 25 0 L 0 0 0 25" fill="none" stroke={GRID} strokeWidth=".5" />
        </pattern>
      </defs>
      <rect width="500" height="260" fill="url(#vm2-g)" />
      <Drawing />
    </svg>
  );
};
