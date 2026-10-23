import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from "recharts";
import { TRAINING_CURVES, type TrainingPoint } from "./generatedData";

// Validated (dataviz validate_palette.js) against the rgb(var(--sc-panel)) chart surface: lightness band, CVD and contrast all pass.
const SERIES = [
  { key: "map50", name: "mAP@50", color: "rgb(var(--sc-accent2))" },
  { key: "precision", name: "Precision", color: "rgb(var(--sc-accent))" },
  { key: "recall", name: "Recall", color: "rgb(var(--sc-warn))" },
] as const;

const MODELS = {
  blister: { label: "Blister pack", classes: "product · defect" },
  seat: { label: "Car seat", classes: "tear · stain · product" },
} as const;
type ModelKey = keyof typeof MODELS;

const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[rgb(var(--sc-tint)/0.1)] bg-[rgb(var(--sc-deep)/0.95)] px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-semibold text-[rgb(var(--sc-fg2))]">Epoch {label}</p>
      {SERIES.map((s) => {
        const item = payload.find((p) => p.dataKey === s.key);
        if (!item) return null;
        return (
          <p key={s.key} className="flex items-center justify-between gap-4 text-[rgb(var(--sc-fg2))]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.name}
            </span>
            <span className="font-mono text-[rgb(var(--sc-fg))]">{fmtPct(item.value as number)}</span>
          </p>
        );
      })}
    </div>
  );
}

export function TrainingProof() {
  const [model, setModel] = useState<ModelKey>("blister");
  const data = TRAINING_CURVES[model];

  const best = useMemo(
    () => data.reduce<TrainingPoint>((b, p) => (p.map50 > b.map50 || (p.map50 === b.map50 && p.map5095 > b.map5095) ? p : b), data[0]),
    [data]
  );

  // The three lines converge near 100%, so end labels are fanned out vertically to avoid collisions.
  const endLabel =
    (name: string, color: string, slot: number) =>
    ({ x, y, index }: { x?: number; y?: number; index?: number }) =>
      index === data.length - 1 && x != null && y != null ? (
        <text x={x + 6} y={y} dy={4 + (slot - 1) * 13} fill="rgb(var(--sc-fg2))" fontSize={11}>
          <tspan fill={color}>●</tspan> {name}
        </text>
      ) : null;

  const tiles = [
    { label: "mAP@50", value: fmtPct(best.map50) },
    { label: "Precision", value: fmtPct(best.precision) },
    { label: "Recall", value: fmtPct(best.recall) },
    { label: "mAP@50-95", value: fmtPct(best.map5095) },
  ];

  return (
    <div className="rounded-2xl border border-[rgb(var(--sc-tint)/0.1)] bg-[rgb(var(--sc-panel))] p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[rgb(var(--sc-fg))]">Validation metrics while training · {MODELS[model].label}</h3>
          <p className="text-sm text-[rgb(var(--sc-muted))]">
            Classes: {MODELS[model].classes} · {data.length} epochs · YOLO nano · 640px
          </p>
        </div>
        <div className="flex rounded-lg border border-[rgb(var(--sc-tint)/0.1)] bg-[rgb(var(--sc-tint)/0.05)] p-1" role="tablist" aria-label="Model">
          {(Object.keys(MODELS) as ModelKey[]).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={model === k}
              onClick={() => setModel(k)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                model === k ? "bg-[rgb(var(--sc-accent))] text-[rgb(var(--sc-onaccent))]" : "text-[rgb(var(--sc-fg2))] hover:text-[rgb(var(--sc-fg))]"
              }`}
            >
              {MODELS[k].label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-[rgb(var(--sc-tint)/0.1)] bg-[rgb(var(--sc-tint)/0.03)] px-4 py-3">
            <p className="text-2xl font-bold tabular-nums text-[rgb(var(--sc-fg))]">{t.value}</p>
            <p className="text-xs text-[rgb(var(--sc-muted))]">
              {t.label} <span className="text-[rgb(var(--sc-subtle))]">· best epoch {best.epoch}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-[rgb(var(--sc-fg2))]" aria-hidden>
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>

      <div className="mt-2 h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 24, right: 78, bottom: 4, left: -8 }}>
            <CartesianGrid stroke="rgb(var(--sc-muted)/0.12)" vertical={false} />
            <XAxis
              dataKey="epoch"
              tick={{ fill: "rgb(var(--sc-muted))", fontSize: 11 }}
              tickLine={false}
              minTickGap={28}
              axisLine={{ stroke: "rgb(var(--sc-muted)/0.25)" }}
              label={{ value: "Epoch", position: "insideBottomRight", offset: -2, fill: "rgb(var(--sc-subtle))", fontSize: 11 }}
            />
            <YAxis
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={(v: number) => `${v * 100}%`}
              tick={{ fill: "rgb(var(--sc-muted))", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgb(var(--sc-fg2)/0.35)", strokeWidth: 1 }} />
            {SERIES.map((s, i) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: "rgb(var(--sc-panel))", strokeWidth: 2 }}
                isAnimationActive
                animationDuration={1200}
                label={endLabel(s.name, s.color, i)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-xs text-[rgb(var(--sc-subtle))]">
        Straight from the training run logs of our deployed models, measured on images the model never trained on.
      </p>
    </div>
  );
}
