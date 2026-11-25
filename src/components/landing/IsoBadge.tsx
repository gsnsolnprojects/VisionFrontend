/** Round ISO certification badge (drawn as SVG so it stays sharp) */
export const IsoBadge = ({ id, top, std, num, year }: { id: string; top: string; std: string; num: string; year: string }) => (
  <svg className="iso-badge" viewBox="0 0 120 120" role="img" aria-label={`${std} ${num}:${year} certified, ${top.toLowerCase()}`}>
    <defs>
      <path id={`${id}-top`} d="M 25.4 80 A 40 40 0 1 1 94.6 80" />
      <path id={`${id}-bot`} d="M 22 60 A 38 38 0 0 0 98 60" />
    </defs>
    <circle cx="60" cy="60" r="58" fill="#1f3a8a" />
    <circle cx="60" cy="60" r="53" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
    <text fill="#fff" fontSize="8.5" fontWeight="800" letterSpacing="0.8">
      <textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">{top}</textPath>
    </text>
    <text fill="#fff" fontSize="8.5" fontWeight="800" letterSpacing="1.2" dominantBaseline="hanging">
      <textPath href={`#${id}-bot`} startOffset="50%" textAnchor="middle">CERTIFIED</textPath>
    </text>
    <rect x="31" y="38" width="58" height="44" rx="8" fill="#fff" />
    <text x="60" y="50" textAnchor="middle" fill="#1f3a8a" fontSize="8" fontWeight="800">{std}</text>
    <text x="60" y="67" textAnchor="middle" fill="#0f1f4d" fontSize={num.length > 4 ? 15 : 17} fontWeight="800">{num}</text>
    <line x1="42" y1="71" x2="78" y2="71" stroke="#c7d2fe" strokeWidth="1" />
    <text x="60" y="79" textAnchor="middle" fill="#1f3a8a" fontSize="6.5" fontWeight="700">{year}</text>
    <text x="21" y="63" textAnchor="middle" fill="#93a8f4" fontSize="7">★</text>
    <text x="99" y="63" textAnchor="middle" fill="#93a8f4" fontSize="7">★</text>
  </svg>
);
