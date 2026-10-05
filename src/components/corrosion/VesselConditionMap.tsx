import React from "react";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { partLabel, type SurveyPart } from "@/lib/api/mobileInspect";

function formatPct(n: number | null | undefined): string {
  return typeof n === "number" && Number.isFinite(n) ? `${n.toFixed(2)}%` : "—";
}

/** Small colored badge showing a change in corrosion % vs the previous survey (overall or per-part). */
export function SurveyChangeBadge({
  delta,
  previousSurveyName,
}: {
  delta: number;
  previousSurveyName?: string;
}) {
  const rounded = Math.round(delta * 100) / 100;
  const Icon = rounded > 0 ? ArrowUp : rounded < 0 ? ArrowDown : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-sm font-medium",
        rounded > 0
          ? "text-red-600 dark:text-red-400"
          : rounded < 0
            ? "text-green-600 dark:text-green-400"
            : "text-muted-foreground"
      )}
      title={previousSurveyName ? `vs ${previousSurveyName}` : "vs previous survey"}
    >
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(rounded).toFixed(2)}% vs last survey
    </span>
  );
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// viewBox coordinate space the ship art is drawn in — pin positions below
// are computed as percentages of these, so they always land correctly no
// matter how the SVG is scaled by its container.
const VB_W = 800;
const VB_H = 240;
const DECK_Y = 148;
const PIN_MIN_X = 95;
const PIN_MAX_X = 495;

/** A generic cargo-ship side silhouette — decorative, not a per-vessel deck plan. */
function ShipSilhouette({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Schematic ship illustration"
    >
      <line x1="10" y1="196" x2="790" y2="196" stroke="currentColor" className="text-border" strokeWidth="2" strokeDasharray="7 7" />

      {/* hull */}
      <path
        d="M40,196 L40,170 Q40,148 68,148 L620,148 L682,180 L682,196 Z"
        className="fill-slate-700 dark:fill-slate-300"
      />
      {/* waterline highlight along the bottom of the hull */}
      <path d="M40,188 L682,188 L682,196 L40,196 Z" className="fill-slate-800 dark:fill-slate-400" opacity="0.5" />

      {/* bridge / superstructure */}
      <rect x="518" y="92" width="96" height="56" rx="3" className="fill-slate-700 dark:fill-slate-300" />
      {[534, 562, 590].map((x) => (
        <rect key={x} x={x} y="108" width="14" height="12" rx="1.5" className="fill-card" />
      ))}
      {/* mast */}
      <line x1="566" y1="92" x2="566" y2="72" stroke="currentColor" className="text-slate-700 dark:text-slate-300" strokeWidth="3" />

      {/* funnel with accent stripe */}
      <rect x="608" y="78" width="24" height="42" rx="2" className="fill-slate-700 dark:fill-slate-300" />
      <rect x="608" y="78" width="24" height="13" rx="2" className="fill-primary" />

      {/* a few deck containers for texture, kept neutral so they don't compete with severity pins */}
      {[
        { x: 100, w: 46, h: 22 },
        { x: 156, w: 46, h: 30 },
        { x: 212, w: 46, h: 22 },
      ].map((c) => (
        <rect
          key={c.x}
          x={c.x}
          y={148 - c.h}
          width={c.w}
          height={c.h}
          className="fill-slate-500 dark:fill-slate-500"
          opacity="0.35"
        />
      ))}
    </svg>
  );
}

const SEVERITY_DOT: Record<string, string> = {
  low: "bg-green-600",
  medium: "bg-amber-500",
  high: "bg-orange-600",
  critical: "bg-red-600",
};

const SEVERITY_CHIP_BG: Record<string, string> = {
  low: "bg-green-600 hover:bg-green-700",
  medium: "bg-amber-500 hover:bg-amber-600",
  high: "bg-orange-600 hover:bg-orange-700",
  critical: "bg-red-600 hover:bg-red-700",
};

function SummaryBox({ label, sub, count, colorClass }: { label: string; sub: string; count: number; colorClass: string }) {
  return (
    <div className={cn("rounded-lg p-4 text-white", colorClass)}>
      <div className="text-3xl font-bold leading-none">{count}</div>
      <div className="text-sm font-semibold mt-1.5">{label}</div>
      <div className="text-xs opacity-90">{sub}</div>
    </div>
  );
}

/**
 * A vessel-level overview: Good/Fair/Poor area counts, plus a generic ship
 * silhouette with a color-coded pin for every inspected area placed along
 * the deck, and matching labeled chips below. Not a per-vessel deck plan —
 * areas are free-text/dropdown names with no fixed physical position, so
 * pins are spread evenly rather than placed at real coordinates.
 */
export function VesselConditionMap({
  parts,
  onSelectArea,
  vesselName,
  surveyName,
  createdAt,
  updatedAt,
  partCount,
  changeFromPreviousSurvey,
  previousSurveyName,
}: {
  parts: SurveyPart[];
  onSelectArea?: (regionName: string) => void;
  /** Display name of the vessel this survey belongs to — shown as the card title. */
  vesselName?: string;
  /** Name of this survey — shown alongside the title. */
  surveyName?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  /** Number of parts surveyed. Defaults to parts.length when omitted. */
  partCount?: number;
  /** Overall mean corrosion % change vs the previous survey for this vessel (positive = worse). */
  changeFromPreviousSurvey?: number | null;
  /** Name of the previous survey being compared against, for a tooltip. */
  previousSurveyName?: string;
}) {
  const good = parts.filter((p) => p.severityBand === "low");
  const fair = parts.filter((p) => p.severityBand === "medium");
  const poor = parts.filter((p) => p.severityBand === "high" || p.severityBand === "critical");

  const pinLeftPct = (index: number) => {
    if (parts.length <= 1) return ((PIN_MIN_X + PIN_MAX_X) / 2 / VB_W) * 100;
    const x = PIN_MIN_X + (index / (parts.length - 1)) * (PIN_MAX_X - PIN_MIN_X);
    return (x / VB_W) * 100;
  };
  const deckTopPct = (DECK_Y / VB_H) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-baseline gap-x-2">
          <span>{vesselName || "Vessel condition map"}</span>
          {surveyName ? (
            <span className="text-sm font-normal text-muted-foreground">{surveyName}</span>
          ) : null}
          {typeof changeFromPreviousSurvey === "number" ? (
            <SurveyChangeBadge delta={changeFromPreviousSurvey} previousSurveyName={previousSurveyName} />
          ) : null}
        </CardTitle>
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
          <span>{partCount ?? parts.length} part{(partCount ?? parts.length) === 1 ? "" : "s"} surveyed</span>
          <span>Created {formatDateTime(createdAt)}</span>
          <span>Last edited {formatDateTime(updatedAt)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <SummaryBox label="Good" sub="≤ 5% corrosion" count={good.length} colorClass="bg-green-600" />
          <SummaryBox label="Fair" sub="5–30% corrosion" count={fair.length} colorClass="bg-amber-500" />
          <SummaryBox label="Poor" sub="> 30% corrosion" count={poor.length} colorClass="bg-red-600" />
        </div>

        {parts.length > 0 ? (
          <div className="rounded-lg bg-muted/40 p-4">
            <div className="relative w-full max-w-2xl mx-auto" style={{ aspectRatio: `${VB_W} / ${VB_H}` }}>
              <ShipSilhouette className="absolute inset-0 w-full h-full" />
              <TooltipProvider delayDuration={100}>
                {parts.map((part, i) => (
                  <Tooltip key={part.partKey}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => onSelectArea?.(part.partKey)}
                        className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                        style={{ left: `${pinLeftPct(i)}%`, top: `${deckTopPct}%` }}
                        aria-label={`${partLabel(part)}, ${formatPct(part.meanCorrosionPercent)} corrosion`}
                      >
                        <span
                          className={cn(
                            "block w-3.5 h-3.5 rounded-full ring-2 ring-card shadow-sm transition-transform hover:scale-125",
                            part.severityBand ? SEVERITY_DOT[part.severityBand] : "bg-muted-foreground"
                          )}
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {partLabel(part)} · {formatPct(part.meanCorrosionPercent)}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {parts.map((part) => (
                <button
                  key={part.partKey}
                  type="button"
                  onClick={() => onSelectArea?.(part.partKey)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium text-white transition-colors",
                    part.severityBand ? SEVERITY_CHIP_BG[part.severityBand] : "bg-muted-foreground/60"
                  )}
                >
                  {partLabel(part)} · {formatPct(part.meanCorrosionPercent)}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
