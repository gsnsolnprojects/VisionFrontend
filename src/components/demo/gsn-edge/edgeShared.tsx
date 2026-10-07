import { useEffect, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/* Dark re-creations of GSN Edge UI pieces, shared by the case-study mock-ups. */

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const iv = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(iv);
  }, []);
  return now;
}

const LOGO_SIZE = {
  sm: { chip: "rounded-md px-1.5 py-1", img: "h-3.5" },
  md: { chip: "rounded-lg px-2.5 py-1.5", img: "h-5" },
  lg: { chip: "rounded-xl px-3.5 py-2", img: "h-8" },
};

/** Official GSN Edge logo. It has a white background, so it sits on a white chip on dark surfaces. */
export function EdgeLogo({ size = "md" }: { size?: keyof typeof LOGO_SIZE }) {
  const s = LOGO_SIZE[size];
  return (
    <span className={`inline-flex shrink-0 items-center bg-white shadow-sm ${s.chip}`}>
      <img src="/demo/gsn-edge/gsn-edge-logo.png" alt="GSN Edge" className={`${s.img} w-auto max-w-none`} />
    </span>
  );
}

/** App window in the style of GSN Edge: logo, breadcrumb, live clock and a simulated-data tag. */
export function EdgeWindow({ section, tabs, children }: { section: string; tabs?: string[]; children: ReactNode }) {
  const now = useClock();
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1224] shadow-2xl shadow-black/60">
      <div className="flex items-center gap-3 border-b border-white/10 bg-slate-900/80 px-4 py-2.5">
        <EdgeLogo size="sm" />
        <span className="text-slate-600">/</span>
        <span className="truncate text-sm text-slate-300">{section}</span>
        <span className="ml-auto hidden text-xs tabular-nums text-slate-400 sm:inline">
          {now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })},{" "}
          {now.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-400">Simulated data</span>
      </div>
      {tabs && (
        <div className="flex gap-5 overflow-x-auto border-b border-white/10 px-4 text-sm">
          {tabs.map((t, i) => (
            <span
              key={t}
              className={`whitespace-nowrap border-b-2 py-2.5 font-medium ${i === 0 ? "border-teal-400 text-teal-300" : "border-transparent text-slate-500"}`}
            >
              {t}
            </span>
          ))}
        </div>
      )}
      <div className="relative p-3 sm:p-4">{children}</div>
    </div>
  );
}

/** KPI card with a coloured left edge, like GSN Edge's fleet and machine overviews. */
export function KpiCard({
  value,
  label,
  sub,
  Icon,
  tone,
}: {
  value: ReactNode;
  label: string;
  sub?: string;
  Icon: LucideIcon;
  tone: "teal" | "green" | "amber" | "blue" | "rose" | "slate";
}) {
  const tones = {
    teal: "border-l-teal-400 text-teal-300 bg-teal-400/10",
    green: "border-l-emerald-400 text-emerald-300 bg-emerald-400/10",
    amber: "border-l-amber-400 text-amber-300 bg-amber-400/10",
    blue: "border-l-sky-400 text-sky-300 bg-sky-400/10",
    rose: "border-l-rose-400 text-rose-300 bg-rose-400/10",
    slate: "border-l-slate-400 text-slate-300 bg-slate-400/10",
  }[tone];
  const [edge, text, chip] = tones.split(" ");
  return (
    <div className={`flex items-start justify-between rounded-xl border border-l-4 border-white/10 ${edge} bg-white/[0.03] px-3 py-2.5 sm:px-4 sm:py-3`}>
      <div className="min-w-0">
        <p className="text-xl font-bold tabular-nums text-white sm:text-2xl">{value}</p>
        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300 sm:text-[11px]">{label}</p>
        {sub && <p className="text-[10px] text-slate-500 sm:text-[11px]">{sub}</p>}
      </div>
      <span className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:flex ${chip} ${text}`}>
        <Icon className="h-4 w-4" />
      </span>
    </div>
  );
}

export type StatusTone = "green" | "amber" | "slate" | "rose" | "blue";
const STATUS_DOT: Record<StatusTone, string> = {
  green: "bg-emerald-400",
  amber: "bg-amber-400",
  slate: "bg-slate-400",
  rose: "bg-rose-500",
  blue: "bg-sky-400",
};
const STATUS_PILL: Record<StatusTone, string> = {
  green: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  amber: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  slate: "bg-slate-500/15 text-slate-300 border-slate-400/30",
  rose: "bg-rose-500/20 text-rose-300 border-rose-400/40",
  blue: "bg-sky-500/15 text-sky-300 border-sky-400/30",
};

export function StatusPill({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_PILL[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[tone]}`} />
      {children}
    </span>
  );
}

export function Legend({ items }: { items: { tone: StatusTone; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-sm ${STATUS_DOT[i.tone]}`} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
