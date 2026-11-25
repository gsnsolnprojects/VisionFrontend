import type { BlogCoverArt } from "@/content/blog/types";

/**
 * Cover drawings for blog posts, in the same dark-green / lime style as the landing page's
 * industry art. One simple line drawing per cover type.
 */

const BG = "#1d2621";
const GRID = "#2c3830";
const PART = "#88987c";
const DETAIL = "#bec9b0";
const LIME = "#e9ff65";
const MONO = "monospace";

const Tag = ({ x, y, text }: { x: number; y: number; text: string }) => (
  <g>
    <rect x={x} y={y - 13} width={text.length * 6.6 + 10} height={15} fill={LIME} />
    <text x={x + 5} y={y - 2} fontSize="10" fontFamily={MONO} fill={BG}>
      {text}
    </text>
  </g>
);

const ART: Record<BlogCoverArt, JSX.Element> = {
  // An eye made of pixels
  eye: (
    <g>
      <path d="M90 120 Q200 30 310 120 Q200 210 90 120Z" fill="none" stroke={PART} strokeWidth="2" />
      {Array.from({ length: 7 }).map((_, r) =>
        Array.from({ length: 7 }).map((__, c) => {
          const dx = c - 3;
          const dy = r - 3;
          if (dx * dx + dy * dy > 10) return null;
          const inner = dx * dx + dy * dy <= 2;
          return (
            <rect
              key={`${r}-${c}`}
              x={172 + c * 8}
              y={92 + r * 8}
              width="7"
              height="7"
              fill={inner ? LIME : DETAIL}
              opacity={inner ? 1 : 0.35 + ((r + c) % 3) * 0.2}
            />
          );
        }),
      )}
      <Tag x={262} y={66} text="PIXELS → MEANING" />
    </g>
  ),
  // A bottle with labelled boxes
  labels: (
    <g>
      <path d="M180 60h40v22q22 10 22 34v86h-84v-86q0-24 22-34z" fill="none" stroke={PART} strokeWidth="2" />
      <rect x="176" y="48" width="48" height="14" fill="none" stroke={DETAIL} strokeWidth="2" />
      <rect x="168" y="40" width="64" height="30" fill="none" stroke={LIME} strokeWidth="2" />
      <Tag x={168} y={38} text="CAP OK" />
      <rect x="164" y="136" width="30" height="40" fill="none" stroke={LIME} strokeWidth="2" strokeDasharray="6 4" />
      <path d="M176 146l6 18" stroke={DETAIL} strokeWidth="2" />
      <Tag x={198} y={150} text="SCRATCH" />
    </g>
  ),
  // Two model sizes side by side
  models: (
    <g>
      {[0, 1, 2].map((i) => (
        <circle key={`n${i}`} cx={120} cy={90 + i * 30} r="7" fill="none" stroke={PART} strokeWidth="2" />
      ))}
      {[0, 1, 2].map((i) => (
        <circle key={`n2${i}`} cx={160} cy={90 + i * 30} r="7" fill="none" stroke={PART} strokeWidth="2" />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={`s${i}`} cx={250} cy={60 + i * 30} r="7" fill="none" stroke={LIME} strokeWidth="2" />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={`s2${i}`} cx={290} cy={60 + i * 30} r="7" fill="none" stroke={LIME} strokeWidth="2" />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={`s3${i}`} cx={330} cy={60 + i * 30} r="7" fill="none" stroke={LIME} strokeWidth="2" />
      ))}
      <text x="118" y="196" fontSize="11" fontFamily={MONO} fill={DETAIL}>NANO</text>
      <text x="262" y="214" fontSize="11" fontFamily={MONO} fill={LIME}>SMALL</text>
      <path d="M190 120h30" stroke={DETAIL} strokeWidth="2" markerEnd="url(#arrow)" />
    </g>
  ),
  // A stack of images
  dataset: (
    <g>
      {[3, 2, 1, 0].map((i) => (
        <rect
          key={i}
          x={140 + i * 14}
          y={60 + i * 12}
          width="120"
          height="90"
          fill={BG}
          stroke={i === 0 ? LIME : PART}
          strokeWidth="2"
        />
      ))}
      <circle cx="200" cy="105" r="22" fill="none" stroke={DETAIL} strokeWidth="2" />
      <path d="M210 92l6 14" stroke={LIME} strokeWidth="2" />
      <text x="140" y="196" fontSize="11" fontFamily={MONO} fill={DETAIL}>TRAIN 80% · TEST 20%</text>
    </g>
  ),
  // A magnifier over a part
  inspector: (
    <g>
      <rect x="110" y="80" width="140" height="90" rx="6" fill="none" stroke={PART} strokeWidth="2" />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={140 + i * 40} cy="125" r="12" fill="none" stroke={DETAIL} strokeWidth="2" />
      ))}
      <circle cx="250" cy="110" r="40" fill="none" stroke={LIME} strokeWidth="3" />
      <path d="M279 139l40 40" stroke={LIME} strokeWidth="6" strokeLinecap="round" />
      <path d="M244 100l10 16" stroke={DETAIL} strokeWidth="2" />
      <Tag x={110} y={70} text="QC + AI" />
    </g>
  ),
  // Precision / recall curve
  metrics: (
    <g>
      <path d="M110 190V50M110 190h200" stroke={PART} strokeWidth="2" />
      <path d="M110 62 Q230 66 260 110 T306 186" fill="none" stroke={LIME} strokeWidth="3" />
      <circle cx="248" cy="96" r="5" fill={LIME} />
      <text x="116" y="44" fontSize="10" fontFamily={MONO} fill={DETAIL}>PRECISION</text>
      <text x="262" y="206" fontSize="10" fontFamily={MONO} fill={DETAIL}>RECALL</text>
      <Tag x={256} y={86} text="mAP50" />
    </g>
  ),
  // Scales: manual vs AI
  costs: (
    <g>
      <path d="M200 60v130M150 190h100M120 90h160" stroke={PART} strokeWidth="2" />
      <path d="M120 90l-24 50h48z" fill="none" stroke={DETAIL} strokeWidth="2" />
      <path d="M280 90l-24 50h48z" fill="none" stroke={LIME} strokeWidth="2" />
      <text x="98" y="160" fontSize="10" fontFamily={MONO} fill={DETAIL}>MANUAL</text>
      <text x="268" y="160" fontSize="10" fontFamily={MONO} fill={LIME}>AI</text>
      <text x="166" y="54" fontSize="14" fontFamily={MONO} fill={LIME}>₹ ? </text>
    </g>
  ),
  // Pilot steps
  pilot: (
    <g>
      {["DEFINE", "COLLECT", "TEST", "DECIDE"].map((s, i) => (
        <g key={s}>
          <rect
            x={70 + i * 70}
            y={150 - i * 26}
            width="58"
            height={40 + i * 26}
            fill="none"
            stroke={i === 3 ? LIME : PART}
            strokeWidth="2"
          />
          <text x={72 + i * 70} y={210} fontSize="9" fontFamily={MONO} fill={i === 3 ? LIME : DETAIL}>
            {s}
          </text>
        </g>
      ))}
      <path d="M86 140 L160 112 L226 88 L300 62" fill="none" stroke={LIME} strokeWidth="2" strokeDasharray="5 4" />
    </g>
  ),
  // Resume with project tiles
  projects: (
    <g>
      <rect x="120" y="40" width="160" height="170" rx="4" fill="none" stroke={PART} strokeWidth="2" />
      <path d="M140 64h70M140 78h110" stroke={DETAIL} strokeWidth="2" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="140" y={98 + i * 34} width="26" height="22" fill="none" stroke={i === 0 ? LIME : PART} strokeWidth="2" />
          <path d={`M176 ${104 + i * 34}h80M176 ${114 + i * 34}h56`} stroke={i === 0 ? LIME : PART} strokeWidth="2" />
        </g>
      ))}
      <Tag x={244} y={44} text="PROJECTS" />
    </g>
  ),
  // One image becoming flipped / rotated / brighter copies
  augment: (
    <g>
      <rect x="70" y="80" width="80" height="80" fill="none" stroke={LIME} strokeWidth="2" />
      <path d="M92 140l18-36 18 36z" fill="none" stroke={DETAIL} strokeWidth="2" />
      <path d="M160 120h36" stroke={DETAIL} strokeWidth="2" markerEnd="url(#arrow)" />
      <rect x="214" y="40" width="56" height="56" fill="none" stroke={PART} strokeWidth="2" />
      <path d="M229 54l13 26 13-26z" fill="none" stroke={DETAIL} strokeWidth="2" />
      <rect x="290" y="40" width="56" height="56" fill="none" stroke={PART} strokeWidth="2" transform="rotate(12 318 68)" />
      <path d="M305 82l13-26 13 26z" fill="none" stroke={DETAIL} strokeWidth="2" transform="rotate(12 318 68)" />
      <rect x="214" y="120" width="56" height="56" fill={DETAIL} fillOpacity="0.18" stroke={PART} strokeWidth="2" />
      <path d="M229 162l13-26 13 26z" fill="none" stroke={LIME} strokeWidth="2" />
      <rect x="290" y="120" width="56" height="56" fill="none" stroke={PART} strokeWidth="2" strokeDasharray="4 3" />
      <path d="M305 162l13-26 13 26z" fill="none" stroke={DETAIL} strokeWidth="2" strokeDasharray="4 3" />
      <text x="214" y="200" fontSize="10" fontFamily={MONO} fill={DETAIL}>FLIP · ROTATE · LIGHT · BLUR</text>
    </g>
  ),
};

export const BlogCover = ({ art, className }: { art: BlogCoverArt; className?: string }) => (
  <svg className={className} viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true">
    <defs>
      <pattern id="blog-grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M20 0H0V20" fill="none" stroke={GRID} strokeWidth="1" />
      </pattern>
      <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0 0L10 5L0 10z" fill={DETAIL} />
      </marker>
    </defs>
    <rect width="400" height="240" fill={BG} />
    <rect width="400" height="240" fill="url(#blog-grid)" />
    {ART[art]}
  </svg>
);
