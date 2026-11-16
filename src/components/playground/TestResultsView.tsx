import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { apiUrl, getAuthHeaders } from "@/lib/api/config";
import { cn } from "@/lib/utils";

/**
 * A test's results, made easy to read: how many defects the model found, missed or added, a verdict
 * on every photo, and the photo with boxes drawn by us (the right answers dashed, the model's boxes
 * coloured by how they did). Click a photo to see it large. Photos without right answers (the
 * student's own) show the model's own picture and what it found.
 */

/** A box in 0-1 units of the photo (x/y the top-left corner) */
export interface NamedBox {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  conf?: number;
}

export interface ResultItem {
  key: string;
  shownName: string;
  /** The model's own picture of the result (with its boxes and labels) */
  url: string;
  /** The held-out photo in the dataset, for drawing our own boxes on it */
  fileId?: string;
  /** What the model found, by kind, with how many */
  foundCounts: Record<string, number>;
  /** Where the model's boxes are, when the server sent them */
  modelBoxes?: NamedBox[];
  /** The right answers, for a held-out photo */
  truthBoxes?: NamedBox[];
  /** The kinds labelled on a held-out photo, when its boxes aren't known */
  labelledKinds?: Set<string>;
}

const GREEN = "#22c55e";
const AMBER = "#f59e0b";
const RED = "#ef4444";
/** Same rule as mAP50: a box counts as found when it covers half or more of the right one */
const FOUND_OVERLAP = 0.5;

const nice = (name: string) => name.replace(/_/g, " ");
const kindKey = (name: string) => name.trim().toLowerCase().replace(/[\s_-]+/g, " ");

function overlap(a: NamedBox, b: NamedBox) {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const inter = ix * iy;
  const union = a.w * a.h + b.w * b.h - inter;
  return union > 0 ? inter / union : 0;
}

export interface Compared {
  found: { truth: NamedBox; model: NamedBox }[];
  missed: NamedBox[];
  extra: NamedBox[];
}

/** Pairs each right answer with the model's box of the same kind that covers it most (each used once) */
function compareBoxes(truth: NamedBox[], model: NamedBox[]): Compared {
  const pairs: { t: number; m: number; o: number }[] = [];
  truth.forEach((t, ti) =>
    model.forEach((m, mi) => {
      if (kindKey(t.name) !== kindKey(m.name)) return;
      const o = overlap(t, m);
      if (o >= FOUND_OVERLAP) pairs.push({ t: ti, m: mi, o });
    })
  );
  pairs.sort((a, b) => b.o - a.o);
  const usedT = new Set<number>();
  const usedM = new Set<number>();
  const found: Compared["found"] = [];
  for (const p of pairs) {
    if (usedT.has(p.t) || usedM.has(p.m)) continue;
    usedT.add(p.t);
    usedM.add(p.m);
    found.push({ truth: truth[p.t], model: model[p.m] });
  }
  return { found, missed: truth.filter((_, i) => !usedT.has(i)), extra: model.filter((_, i) => !usedM.has(i)) };
}

const countByKind = (boxes: NamedBox[]) => {
  const out: Record<string, number> = {};
  for (const b of boxes) out[nice(b.name)] = (out[nice(b.name)] ?? 0) + 1;
  return out;
};
const listKinds = (counts: Record<string, number>) =>
  Object.entries(counts)
    .map(([k, n]) => (n > 1 ? `${k} ×${n}` : k))
    .join(", ");

/** A photo from the server, loaded with the student's sign-in */
function useAuthImage(path: string | null) {
  const [img, setImg] = useState<{ src: string; w: number; h: number } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!path) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    setImg(null);
    setFailed(false);
    (async () => {
      try {
        const res = await fetch(apiUrl(path), { headers: await getAuthHeaders() });
        if (!res.ok) throw new Error(String(res.status));
        objectUrl = URL.createObjectURL(await res.blob());
        const el = new Image();
        el.onload = () => !cancelled && setImg({ src: objectUrl as string, w: el.naturalWidth, h: el.naturalHeight });
        el.onerror = () => !cancelled && setFailed(true);
        el.src = objectUrl;
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);
  return { img, failed };
}

/**
 * The boxes drawn over a photo: right answers dashed white (red when missed), the model's boxes
 * green when they found something and amber when there was nothing there. A tiny box also gets a
 * ring around it, so it can be seen on a small picture.
 */
const BoxDrawing: React.FC<{ W: number; H: number; compared: Compared; large?: boolean }> = ({ W, H, compared, large }) => {
  const unit = Math.max(W, H);
  const line = unit / (large ? 380 : 170);
  const ringFor = (b: NamedBox) => Math.max(b.w * W, b.h * H) < unit * 0.03;
  const rect = (b: NamedBox, color: string, dashed: boolean, width: number, key: string) => (
    <g key={key}>
      <rect
        x={b.x * W}
        y={b.y * H}
        width={b.w * W}
        height={b.h * H}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeDasharray={dashed ? `${width * 2.5} ${width * 1.8}` : undefined}
      />
      {ringFor(b) && (
        <circle
          cx={(b.x + b.w / 2) * W}
          cy={(b.y + b.h / 2) * H}
          r={unit * (large ? 0.022 : 0.035)}
          fill="none"
          stroke={color}
          strokeOpacity={0.85}
          strokeWidth={width}
          strokeDasharray={dashed ? `${width * 2.5} ${width * 1.8}` : undefined}
        />
      )}
    </g>
  );
  return (
    <>
      {compared.found.map((f, i) => rect(f.truth, "#ffffff", true, line * 0.8, `ft${i}`))}
      {compared.found.map((f, i) => rect(f.model, GREEN, false, line, `fm${i}`))}
      {compared.missed.map((b, i) => rect(b, RED, true, line * 1.1, `mi${i}`))}
      {compared.extra.map((b, i) => rect(b, AMBER, false, line, `ex${i}`))}
    </>
  );
};

/** A held-out photo with our boxes, or the model's own picture when there's nothing to compare */
const ResultPicture: React.FC<{ item: ResultItem; datasetId: string; compared: Compared | null; large?: boolean }> = ({
  item,
  datasetId,
  compared,
  large,
}) => {
  const ownPath =
    compared && item.fileId
      ? `/dataset/${encodeURIComponent(datasetId)}/file/${encodeURIComponent(item.fileId)}${large ? "" : "/thumbnail"}`
      : null;
  const modelPath = !ownPath ? item.url.replace(/^\/api\//, "") : null;
  const { img, failed } = useAuthImage(ownPath ?? modelPath);
  if (failed) return <div className="flex h-full items-center justify-center text-xs text-white/60">Photo couldn&apos;t load</div>;
  if (!img) return <div className="h-full w-full animate-pulse bg-white/5" />;
  if (!ownPath || !compared) return <img src={img.src} alt="" className="h-full w-full object-contain" />;
  return (
    <svg viewBox={`0 0 ${img.w} ${img.h}`} preserveAspectRatio="xMidYMid meet" className="h-full w-full" role="img" aria-label={`${item.shownName} with the model's boxes`}>
      <image href={img.src} width={img.w} height={img.h} />
      <BoxDrawing W={img.w} H={img.h} compared={compared} large={large} />
    </svg>
  );
};

type Verdict = "perfect" | "missed" | "extra" | "unknown";

const VerdictBadges: React.FC<{ compared: Compared | null; item: ResultItem }> = ({ compared, item }) => {
  if (!compared) {
    const total = Object.values(item.foundCounts).reduce((a, b) => a + b, 0);
    return (
      <span className="rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">
        {total ? `${total} found` : "Nothing found"}
      </span>
    );
  }
  const badges: { text: string; color: string; Icon: typeof Check }[] = [];
  if (compared.missed.length) badges.push({ text: `Missed ${compared.missed.length}`, color: "#b91c1c", Icon: X });
  if (compared.extra.length) badges.push({ text: `${compared.extra.length} extra`, color: "#b45309", Icon: AlertTriangle });
  if (!badges.length) {
    badges.push({ text: compared.found.length ? "All found" : "Nothing to find", color: "#15803d", Icon: Check });
  }
  return (
    <span className="flex flex-wrap gap-1">
      {badges.map(({ text, color, Icon }) => (
        <span key={text} className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold text-white shadow" style={{ background: color }}>
          <Icon className="h-3 w-3" aria-hidden="true" /> {text}
        </span>
      ))}
    </span>
  );
};

/** What happened on one photo, in plain lines */
const ResultLines: React.FC<{ compared: Compared | null; item: ResultItem }> = ({ compared, item }) => {
  if (!compared) {
    return (
      <>
        <p className="text-foreground">
          <span className="text-muted-foreground">Model found: </span>
          {Object.keys(item.foundCounts).length ? listKinds(item.foundCounts) : "nothing"}
        </p>
        {item.labelledKinds && (
          <p className="text-foreground">
            <span className="text-muted-foreground">Labelled in the dataset: </span>
            {item.labelledKinds.size ? [...item.labelledKinds].map(nice).join(", ") : "nothing"}
          </p>
        )}
      </>
    );
  }
  const found = countByKind(compared.found.map((f) => f.truth));
  const missed = countByKind(compared.missed);
  const extra = countByKind(compared.extra);
  const empty = !compared.found.length && !compared.missed.length && !compared.extra.length;
  return (
    <>
      {empty && <p className="text-muted-foreground">No defects here, and the model found none. Right!</p>}
      {compared.found.length > 0 && (
        <p className="flex gap-1.5 text-foreground">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
          <span>
            <span className="font-medium">Found:</span> {listKinds(found)}
          </span>
        </p>
      )}
      {compared.missed.length > 0 && (
        <p className="flex gap-1.5 text-foreground">
          <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden="true" />
          <span>
            <span className="font-medium">Missed:</span> {listKinds(missed)}
          </span>
        </p>
      )}
      {compared.extra.length > 0 && (
        <p className="flex gap-1.5 text-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden="true" />
          <span>
            <span className="font-medium">Extra:</span> {listKinds(extra)} <span className="text-muted-foreground">(nothing there)</span>
          </span>
        </p>
      )}
    </>
  );
};

/** What the colours and lines on the photos mean */
export const BoxKey: React.FC<{ className?: string }> = ({ className }) => (
  <p className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground", className)}>
    {[
      ["#9ca3af", true, "Right answer (GSN's label)"],
      [GREEN, false, "Model found it"],
      [RED, true, "Model missed it"],
      [AMBER, false, "Extra: nothing there"],
    ].map(([color, dashed, label]) => (
      <span key={label as string} className="inline-flex items-center gap-1.5">
        <span className={cn("h-3 w-4 rounded-sm border-2", dashed && "border-dashed")} style={{ borderColor: color as string }} />
        {label as string}
      </span>
    ))}
  </p>
);

/** Totals over every photo that has right answers */
function summarise(compared: (Compared | null)[]) {
  let found = 0;
  let missed = 0;
  let extra = 0;
  let photos = 0;
  for (const c of compared) {
    if (!c) continue;
    photos += 1;
    found += c.found.length;
    missed += c.missed.length;
    extra += c.extra.length;
  }
  return { found, missed, extra, total: found + missed, photos };
}

const verdictOf = (c: Compared | null): Verdict => (!c ? "unknown" : c.missed.length ? "missed" : c.extra.length ? "extra" : "perfect");

/** The three numbers that sum up the test */
const Summary: React.FC<{ totals: ReturnType<typeof summarise> }> = ({ totals }) => {
  const reduced = useReducedMotion();
  const pct = totals.total ? Math.round((totals.found / totals.total) * 100) : 0;
  const cards = [
    {
      Icon: Check,
      color: GREEN,
      big: `${totals.found} of ${totals.total}`,
      title: "defects found",
      text: `${pct}% of the real defects`,
    },
    { Icon: X, color: RED, big: String(totals.missed), title: "missed", text: "A bad part would slip through" },
    { Icon: AlertTriangle, color: AMBER, big: String(totals.extra), title: "extra boxes", text: "A good part would be thrown away" },
  ];
  return (
    <div data-tour="result-summary" className="mt-4 grid gap-3 sm:grid-cols-3">
      {cards.map(({ Icon, color, big, title, text }, i) => (
        <motion.div
          key={title}
          className="rounded-xl border bg-background/40 p-4"
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: color }}>
              <Icon className="h-3.5 w-3.5 text-white" aria-hidden="true" />
            </span>
            {title}
          </p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">{big}</p>
          <p className="text-xs text-muted-foreground">{text}</p>
        </motion.div>
      ))}
    </div>
  );
};

const FILTERS: { id: "all" | Verdict; label: string }[] = [
  { id: "all", label: "All" },
  { id: "missed", label: "Missed" },
  { id: "extra", label: "Extra" },
  { id: "perfect", label: "Perfect" },
];

/** A photo large, with its boxes and what happened, and the way to the next one */
const Lightbox: React.FC<{
  items: { item: ResultItem; compared: Compared | null }[];
  index: number;
  datasetId: string;
  onIndex: (i: number) => void;
  onClose: () => void;
}> = ({ items, index, datasetId, onIndex, onClose }) => {
  const { item, compared } = items[index];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < items.length - 1) onIndex(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, items.length, onIndex, onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/80 p-3 md:p-6" role="dialog" aria-modal="true" aria-label={item.shownName} onClick={onClose}>
      <div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{item.shownName}</p>
            <VerdictBadges compared={compared} item={item} />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span className="mr-1 text-xs tabular-nums text-muted-foreground">
              {index + 1} of {items.length}
            </span>
            <button type="button" className="rounded-md p-1.5 hover:bg-secondary disabled:opacity-40" disabled={index === 0} onClick={() => onIndex(index - 1)} aria-label="Previous photo">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-md p-1.5 hover:bg-secondary disabled:opacity-40"
              disabled={index >= items.length - 1}
              onClick={() => onIndex(index + 1)}
              aria-label="Next photo"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button type="button" className="rounded-md p-1.5 hover:bg-secondary" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 bg-[#171f1b]">
          <div className="h-[62vh] w-full">
            <ResultPicture item={item} datasetId={datasetId} compared={compared} large />
          </div>
        </div>
        <div className="space-y-1 border-t px-4 py-3 text-sm">
          <ResultLines compared={compared} item={item} />
          {compared && <BoxKey className="pt-1" />}
        </div>
      </div>
    </div>,
    document.body
  );
};

export const TestResultsView: React.FC<{ items: ResultItem[]; datasetId: string }> = ({ items, datasetId }) => {
  const rows = useMemo(
    () =>
      items.map((item) => ({
        item,
        compared: item.truthBoxes && item.modelBoxes && item.fileId ? compareBoxes(item.truthBoxes, item.modelBoxes) : null,
      })),
    [items]
  );
  const totals = useMemo(() => summarise(rows.map((r) => r.compared)), [rows]);
  const compareable = totals.photos > 0;
  const [filter, setFilter] = useState<"all" | Verdict>("all");
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length, missed: 0, extra: 0, perfect: 0 };
    for (const r of rows) {
      const v = verdictOf(r.compared);
      if (v !== "unknown") c[v] += 1;
    }
    return c;
  }, [rows]);
  const visible = filter === "all" ? rows : rows.filter((r) => verdictOf(r.compared) === filter);
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);

  return (
    <>
      {compareable && <Summary totals={totals} />}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        {compareable ? (
          <div data-tour="result-filters" className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Show photos">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  filter === f.id ? "border-foreground bg-foreground text-background" : "hover:bg-secondary"
                )}
              >
                {f.label} <span className="tabular-nums opacity-70">{counts[f.id]}</span>
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" /> Click a photo to see it large
        </p>
      </div>
      {compareable && <BoxKey className="mt-2" />}
      {visible.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No photos here.</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map(({ item, compared }, i) => (
            <article key={item.key} data-tour={i === 0 ? "result-first" : undefined} className="overflow-hidden rounded-xl border bg-background/40">
              <button
                type="button"
                className="group relative block aspect-[4/3] w-full bg-[#171f1b]"
                onClick={() => setOpen(rows.findIndex((r) => r.item.key === item.key))}
                aria-label={`See ${item.shownName} large`}
              >
                <ResultPicture item={item} datasetId={datasetId} compared={compared} />
                <span className="absolute left-2 top-2">
                  <VerdictBadges compared={compared} item={item} />
                </span>
                <span className="absolute bottom-2 right-2 rounded-md bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100" aria-hidden>
                  <Maximize2 className="h-3.5 w-3.5" />
                </span>
              </button>
              <div data-tour={i === 0 ? "result-compare" : undefined} className="space-y-1 p-3 text-xs">
                <p className="truncate font-medium text-foreground" title={item.shownName}>
                  {item.shownName}
                </p>
                <ResultLines compared={compared} item={item} />
              </div>
            </article>
          ))}
        </div>
      )}
      {open !== null && rows[open] && <Lightbox items={rows} index={open} datasetId={datasetId} onIndex={setOpen} onClose={close} />}
    </>
  );
};

/**
 * For the results guide: a board with three real defects. The right answers appear dashed, the
 * model's boxes find two of them, the third turns red (missed), and an extra box appears where
 * nothing's wrong.
 */
export const ReadResultsDemo: React.FC = () => {
  const reduced = !!useReducedMotion();
  const [run, setRun] = useState(0);
  const [stage, setStage] = useState(reduced ? 4 : 0);
  useEffect(() => {
    if (reduced) {
      setStage(4);
      return;
    }
    setStage(0);
    const timers = [0.4, 1.6, 2.8, 4].map((s, i) => window.setTimeout(() => setStage(i + 1), s * 1000));
    return () => timers.forEach(window.clearTimeout);
  }, [reduced, run]);
  const defects = [
    { x: 70, y: 60 },
    { x: 200, y: 120 },
    { x: 310, y: 70 },
  ];
  const extraSpot = { x: 120, y: 160 };
  const S = 34;
  const captions = [
    "",
    "Dashed white: the right answers, labelled by GSN",
    "Green: the model found these",
    "Red dashed: a defect the model missed",
    "Amber: an extra box, where nothing's wrong",
  ];
  return (
    <figure className="relative" aria-label="How to read a result photo">
      <div className="overflow-hidden rounded-lg border border-[#485840] bg-black/30 p-2 pt-10">
        <span className="absolute left-4 top-3 flex gap-1">
          {stage >= 4 && (
            <>
              <span className="rounded-md bg-[#b91c1c] px-2 py-0.5 text-[11px] font-semibold text-white">✗ Missed 1</span>
              <span className="rounded-md bg-[#b45309] px-2 py-0.5 text-[11px] font-semibold text-white">⚠ 1 extra</span>
            </>
          )}
        </span>
        <svg viewBox="0 0 400 220" className="h-auto w-full" aria-hidden>
          <rect x={6} y={6} width={388} height={208} rx={10} fill="#1f5c32" stroke="#2f7a45" strokeWidth={3} />
          {[40, 90, 140, 190].map((y) => (
            <line key={y} x1={20} x2={380} y1={y} y2={y} stroke="#2f7a45" strokeWidth={4} />
          ))}
          {defects.map((d, i) => (
            <g key={i}>
              <circle cx={d.x} cy={d.y} r={8} fill="#c9c9a8" />
              <circle cx={d.x} cy={d.y} r={3.5} fill="#1f5c32" />
              <path d={`M${d.x + 5},${d.y - 9} l6,5 l-4,3 l6,5`} fill="none" stroke="#111" strokeWidth={2.2} />
            </g>
          ))}
          {/* The right answers */}
          {defects.map((d, i) => (
            <motion.rect
              key={`t${i}`}
              x={d.x - S / 2}
              y={d.y - S / 2}
              width={S}
              height={S}
              fill="none"
              strokeWidth={2.5}
              strokeDasharray="6 4"
              initial={{ opacity: 0 }}
              animate={{ opacity: stage >= 1 ? 1 : 0, stroke: i === 2 && stage >= 3 ? RED : "#ffffff" }}
              transition={{ duration: reduced ? 0 : 0.35, delay: reduced || stage > 1 ? 0 : i * 0.15 }}
            />
          ))}
          {/* The model's boxes */}
          {defects.slice(0, 2).map((d, i) => (
            <motion.rect
              key={`m${i}`}
              x={d.x - S / 2 - 4}
              y={d.y - S / 2 - 4}
              width={S + 8}
              height={S + 8}
              rx={2}
              fill="rgba(34,197,94,0.12)"
              stroke={GREEN}
              strokeWidth={3}
              initial={{ opacity: 0, scale: 1.4 }}
              animate={{ opacity: stage >= 2 ? 1 : 0, scale: stage >= 2 ? 1 : 1.4 }}
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
              transition={{ duration: reduced ? 0 : 0.35, delay: reduced ? 0 : i * 0.15 }}
            />
          ))}
          <motion.rect
            x={extraSpot.x - S / 2}
            y={extraSpot.y - S / 2}
            width={S + 6}
            height={S}
            rx={2}
            fill="rgba(245,158,11,0.12)"
            stroke={AMBER}
            strokeWidth={3}
            initial={{ opacity: 0, scale: 1.4 }}
            animate={{ opacity: stage >= 4 ? 1 : 0, scale: stage >= 4 ? 1 : 1.4 }}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
            transition={{ duration: reduced ? 0 : 0.35 }}
          />
        </svg>
        <p className="mt-1 min-h-[2.5em] text-center text-xs font-medium text-[#f5f5ee]">{captions[stage]}</p>
      </div>
      <button
        type="button"
        onClick={() => setRun((r) => r + 1)}
        className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-[#f5f5ee] transition-colors hover:bg-black/80"
      >
        ↻ Replay
      </button>
    </figure>
  );
};
