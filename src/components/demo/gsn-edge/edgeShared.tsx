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
    <span className={`inline-flex shrink-0 items-center bg-[#ffffff] shadow-sm ${s.chip}`}>
      <img src="/demo/gsn-edge/gsn-edge-logo.png" alt="GSN Edge" className={`${s.img} w-auto max-w-none`} />
    </span>
  );
}

/** App window in the style of GSN Edge: logo, breadcrumb, live clock and a simulated-data tag. */
export function EdgeWindow({ section, tabs, children }: { section: string; tabs?: string[]; children: ReactNode }) {
  const now = useClock();
  return (
    <div className="overflow-hidden rounded-2xl border border-[rgb(var(--sc-tint)/0.1)] bg-[rgb(var(--sc-panel))] shadow-2xl shadow-[color:rgb(var(--sc-shade)/0.6)]">
      <div className="flex items-center gap-3 border-b border-[rgb(var(--sc-tint)/0.1)] bg-[rgb(var(--sc-deep)/0.8)] px-4 py-2.5">
        <EdgeLogo size="sm" />
        <span className="text-[rgb(var(--sc-subtle))]">/</span>
        <span className="truncate text-sm text-[rgb(var(--sc-fg2))]">{section}</span>
        <span className="ml-auto hidden text-xs tabular-nums text-[rgb(var(--sc-muted))] sm:inline">
          {now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })},{" "}
          {now.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
        </span>
        <span className="rounded-full border border-[rgb(var(--sc-tint)/0.1)] bg-[rgb(var(--sc-tint)/0.05)] px-2 py-0.5 text-[10px] font-medium text-[rgb(var(--sc-muted))]">Simulated data</span>
      </div>
      {tabs && (
        <div className="flex gap-5 overflow-x-auto border-b border-[rgb(var(--sc-tint)/0.1)] px-4 text-sm">
          {tabs.map((t, i) => (
            <span
              key={t}
              className={`whitespace-nowrap border-b-2 py-2.5 font-medium ${i === 0 ? "border-[rgb(var(--sc-accent))] text-[rgb(var(--sc-accentsoft))]" : "border-transparent text-[rgb(var(--sc-subtle))]"}`}
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
    teal: "border-l-[rgb(var(--sc-accent))] text-[rgb(var(--sc-accentsoft))] bg-[rgb(var(--sc-accent)/0.1)]",
    green: "border-l-[rgb(var(--sc-ok))] text-[rgb(var(--sc-oktext))] bg-[rgb(var(--sc-ok)/0.1)]",
    amber: "border-l-[rgb(var(--sc-warn))] text-[rgb(var(--sc-warntext))] bg-[rgb(var(--sc-warn)/0.1)]",
    blue: "border-l-[rgb(var(--sc-accent))] text-[rgb(var(--sc-accentsoft))] bg-[rgb(var(--sc-accent)/0.1)]",
    rose: "border-l-[rgb(var(--sc-bad))] text-[rgb(var(--sc-badtext))] bg-[rgb(var(--sc-bad)/0.1)]",
    slate: "border-l-[rgb(var(--sc-subtle))] text-[rgb(var(--sc-fg2))] bg-[rgb(var(--sc-subtle)/0.1)]",
  }[tone];
  const [edge, text, chip] = tones.split(" ");
  return (
    <div className={`flex items-start justify-between rounded-xl border border-l-4 border-[rgb(var(--sc-tint)/0.1)] ${edge} bg-[rgb(var(--sc-tint)/0.03)] px-3 py-2.5 sm:px-4 sm:py-3`}>
      <div className="min-w-0">
        <p className="text-xl font-bold tabular-nums text-[rgb(var(--sc-fg))] sm:text-2xl">{value}</p>
        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--sc-fg2))] sm:text-[11px]">{label}</p>
        {sub && <p className="text-[10px] text-[rgb(var(--sc-subtle))] sm:text-[11px]">{sub}</p>}
      </div>
      <span className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:flex ${chip} ${text}`}>
        <Icon className="h-4 w-4" />
      </span>
    </div>
  );
}

export type StatusTone = "green" | "amber" | "slate" | "rose" | "blue";
const STATUS_DOT: Record<StatusTone, string> = {
  green: "bg-[rgb(var(--sc-ok))]",
  amber: "bg-[rgb(var(--sc-warn))]",
  slate: "bg-[rgb(var(--sc-subtle))]",
  rose: "bg-[rgb(var(--sc-bad))]",
  blue: "bg-[rgb(var(--sc-accent))]",
};
const STATUS_PILL: Record<StatusTone, string> = {
  green: "bg-[rgb(var(--sc-ok)/0.15)] text-[rgb(var(--sc-oktext))] border-[rgb(var(--sc-ok)/0.3)]",
  amber: "bg-[rgb(var(--sc-warn)/0.15)] text-[rgb(var(--sc-warntext))] border-[rgb(var(--sc-warn)/0.3)]",
  slate: "bg-[rgb(var(--sc-subtle)/0.15)] text-[rgb(var(--sc-fg2))] border-[rgb(var(--sc-subtle)/0.3)]",
  rose: "bg-[rgb(var(--sc-bad)/0.2)] text-[rgb(var(--sc-badtext))] border-[rgb(var(--sc-bad)/0.4)]",
  blue: "bg-[rgb(var(--sc-accent)/0.15)] text-[rgb(var(--sc-accentsoft))] border-[rgb(var(--sc-accent)/0.3)]",
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
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[rgb(var(--sc-muted))]">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-sm ${STATUS_DOT[i.tone]}`} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
