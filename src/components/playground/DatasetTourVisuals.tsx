import React, { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, EyeOff, Lock, LockOpen, RotateCcw, Star } from "lucide-react";
import { apiRequest } from "@/lib/api/config";
import type { Box } from "@/components/playground/LabelledThumbnail";
import {
  INK,
  LIME,
  MUTED,
  biggest,
  colorOf,
  cropAround,
  usePhoto,
  useStages,
  type TourExample,
} from "./tourVisualHelpers";
import { cn } from "@/lib/utils";

/**
 * The short animations in the See the data guide (Level 1): a label being drawn on a real photo,
 * the kinds of defect lighting up one by one, the photos being split into three groups, and what each
 * group is for (the model learning from training photos, checking itself on validation photos, and
 * taking its final exam on the held-out test photos).
 * Each plays once and can be replayed; with reduced motion the finished picture shows straight away.
 */

const nameOf = (classNames: string[], c: number) => (classNames[c] ?? `defect ${c + 1}`).replace(/_/g, " ");

/** Holds an animation, with a Replay button that plays it again from the start */
export const Replayable: React.FC<{ label: string; children: (run: number) => React.ReactNode }> = ({ label, children }) => {
  const [run, setRun] = useState(0);
  return (
    <figure className="relative" aria-label={label}>
      <React.Fragment key={run}>{children(run)}</React.Fragment>
      <button
        type="button"
        onClick={() => setRun((r) => r + 1)}
        className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-[#f5f5ee] transition-colors hover:bg-black/80"
      >
        <RotateCcw className="h-3 w-3" aria-hidden="true" /> Replay
      </button>
    </figure>
  );
};

/** A dark 4:3 frame, so the popup keeps its size while the photo loads */
export const PhotoFrame: React.FC<{ children?: React.ReactNode; failed?: boolean }> = ({ children, failed }) => (
  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-[#485840] bg-black/40">
    {children ?? (
      <div className={cn("flex h-full items-center justify-center text-xs text-[#bec9b0]", !failed && "animate-pulse")}>
        {failed ? "Photo couldn't load" : ""}
      </div>
    )}
  </div>
);

/** Step "A photo and its labels": the photo zooms in on one defect, a box draws itself around it, then its name appears */
export const LabelDrawing: React.FC<{ example: TourExample }> = ({ example }) => {
  const reduced = useReducedMotion();
  const { photo, failed } = usePhoto(example.datasetId, example.fileId, true);
  // The biggest box: the easiest defect to see
  const box = [...example.boxes].sort((a, b) => b.w * b.h - a.w * a.h)[0];
  const t = (s: number) => (reduced ? 0 : s);

  let zoom = "";
  let full = "";
  let shape: { x: number; y: number; w: number; h: number; font: number; top: number } | null = null;
  if (photo && box) {
    const { w: W, h: H } = photo;
    full = `0 0 ${W} ${H}`;
    // A 4:3 view around the defect, about four times its size, kept inside the photo
    let cw = Math.min(W, Math.max(box.w * W * 4, ((box.h * H * 4) * 4) / 3, W * 0.2));
    let ch = (cw * 3) / 4;
    if (ch > H) {
      ch = H;
      cw = Math.min(W, (ch * 4) / 3);
    }
    const cx = Math.min(Math.max((box.x + box.w / 2) * W - cw / 2, 0), W - cw);
    const cy = Math.min(Math.max((box.y + box.h / 2) * H - ch / 2, 0), H - ch);
    zoom = `${cx} ${cy} ${cw} ${ch}`;
    shape = { x: box.x * W, y: box.y * H, w: box.w * W, h: box.h * H, font: cw / 16, top: cy };
  }
  const name = box ? nameOf(example.classNames, box.c) : "";

  return (
    <Replayable label="A label being drawn on a real photo">
      {() => (
        <div className="space-y-2">
          <PhotoFrame failed={failed}>
            {photo && shape && (
              <motion.svg
                viewBox={reduced ? zoom : full}
                initial={{ viewBox: reduced ? zoom : full }}
                animate={{ viewBox: zoom }}
                transition={{ delay: t(0.7), duration: t(1.1), ease: "easeInOut" }}
                preserveAspectRatio="xMidYMid slice"
                className="h-full w-full"
                aria-hidden
              >
                <image href={photo.src} width={photo.w} height={photo.h} />
                <motion.rect
                  x={shape.x}
                  y={shape.y}
                  width={shape.w}
                  height={shape.h}
                  fill="none"
                  stroke={colorOf(box.c)}
                  strokeWidth={shape.font / 6}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: t(2), duration: t(0.8), ease: "easeInOut" }}
                />
                <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: t(2.9), duration: t(0.3) }}>
                  {(() => {
                    const f = shape.font;
                    const tagW = name.length * f * 0.6 + f;
                    const tagH = f * 1.45;
                    // Above the box, or below it when the box is at the top of the view
                    const above = shape.y - tagH - f * 0.1;
                    const tagY = above >= shape.top ? above : shape.y + shape.h + f * 0.1;
                    return (
                      <>
                        <rect x={shape.x - f / 12} y={tagY} width={tagW} height={tagH} rx={f / 4} fill={colorOf(box.c)} />
                        <text x={shape.x + f * 0.45} y={tagY + tagH * 0.72} fontSize={f} fontWeight={700} fill="#fff">
                          {name}
                        </text>
                      </>
                    );
                  })()}
                </motion.g>
              </motion.svg>
            )}
          </PhotoFrame>
          {box && (
            <motion.div
              className="flex flex-wrap items-center justify-center gap-1.5 text-xs font-semibold"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: t(3.5), duration: t(0.4) }}
            >
              <span className="rounded-md border-2 px-2 py-0.5 text-[#f5f5ee]" style={{ borderColor: colorOf(box.c) }}>
                Box
              </span>
              <span className="text-[#bec9b0]">+</span>
              <span className="rounded-md px-2 py-0.5 text-white" style={{ background: colorOf(box.c) }}>
                {name}
              </span>
              <span className="text-[#bec9b0]">=</span>
              <span className="rounded-md px-2 py-0.5 text-[#171f1b]" style={{ background: LIME }}>
                a label
              </span>
            </motion.div>
          )}
        </div>
      )}
    </Replayable>
  );
};

/** A close-up of one real defect, cut from its full-size photo */
const DefectCloseUp: React.FC<{ datasetId: string; fileId: string; box: Box }> = ({ datasetId, fileId, box }) => {
  const { photo, failed } = usePhoto(datasetId, fileId, true);
  if (!photo) return <div className={cn("h-full w-full bg-white/5", !failed && "animate-pulse")} />;
  const { w: W, h: H } = photo;
  // A square view about three times the defect's size, kept inside the photo
  const side = Math.min(W, H, Math.max(box.w * W * 3, box.h * H * 3, Math.min(W, H) * 0.12));
  const x = Math.min(Math.max((box.x + box.w / 2) * W - side / 2, 0), W - side);
  const y = Math.min(Math.max((box.y + box.h / 2) * H - side / 2, 0), H - side);
  return (
    <svg viewBox={`${x} ${y} ${side} ${side}`} preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden>
      <image href={photo.src} width={W} height={H} />
      <rect x={box.x * W} y={box.y * H} width={box.w * W} height={box.h * H} fill="none" stroke={colorOf(box.c)} strokeWidth={side / 40} />
    </svg>
  );
};

/** Up to 8 kinds of defect, so the close-ups stay big enough to see */
const MAX_KINDS = 8;

/**
 * Step "The kinds of defects": a close-up of a real example of each kind, lighting up in turn with its
 * name, then a reminder that what isn't labelled stays invisible. Examples come from photos across the
 * whole dataset, as one photo often shows only one kind.
 */
export const DefectKinds: React.FC<{ datasetId: string; fileIds: string[]; classNames: string[] }> = ({ datasetId, fileIds, classNames }) => {
  const reduced = useReducedMotion();
  const [examples, setExamples] = useState<{ c: number; fileId: string; box: Box }[] | null>(null);
  // By content, so the page loading more labels doesn't start again
  const namesKey = classNames.join("|");
  const idsKey = fileIds.join(",");

  useEffect(() => {
    const ids = idsKey ? idsKey.split(",") : [];
    // About 40 photos spread evenly through the dataset
    const step = Math.max(1, Math.floor(ids.length / 40));
    const picked = ids.filter((_, i) => i % step === 0).slice(0, 40);
    if (!picked.length) return;
    let cancelled = false;
    apiRequest<{ labels: Record<string, Box[]> }>(
      `/dataset/${encodeURIComponent(datasetId)}/file-labels?ids=${picked.map(encodeURIComponent).join(",")}`
    )
      .then((json) => {
        if (cancelled) return;
        const names = namesKey.split("|");
        const best = new Map<number, { c: number; fileId: string; box: Box }>();
        for (const id of picked) {
          for (const b of json.labels[id] ?? []) {
            if (!names[b.c]) continue;
            const had = best.get(b.c);
            if (!had || b.w * b.h > had.box.w * had.box.h) best.set(b.c, { c: b.c, fileId: id, box: b });
          }
        }
        setExamples([...best.values()].sort((a, b) => a.c - b.c).slice(0, MAX_KINDS));
      })
      .catch(() => !cancelled && setExamples([]));
    return () => {
      cancelled = true;
    };
  }, [datasetId, idsKey, namesKey]);

  return (
    <Replayable label="A real example of each kind of defect">
      {() => <DefectKindsRun datasetId={datasetId} examples={examples} classNames={classNames} reduced={!!reduced} />}
    </Replayable>
  );
};

const DefectKindsRun: React.FC<{
  datasetId: string;
  examples: { c: number; fileId: string; box: Box }[] | null;
  classNames: string[];
  reduced: boolean;
}> = ({ datasetId, examples, classNames, reduced }) => {
  const count = examples?.length ?? 0;
  // -1 before it starts, then each kind in turn, then count for the end ("not labelled")
  const [active, setActive] = useState(reduced ? count : -1);
  useEffect(() => {
    if (reduced) {
      setActive(count);
      return;
    }
    if (!count) return;
    const timers = Array.from({ length: count }, (_, i) => window.setTimeout(() => setActive(i), 600 + i * 1100));
    timers.push(window.setTimeout(() => setActive(count), 600 + count * 1100));
    return () => timers.forEach(window.clearTimeout);
  }, [reduced, count]);

  const end = active >= count && count > 0;
  const cols = count <= 4 ? 2 : count <= 6 ? 3 : 4;

  return (
    <div className="space-y-2">
      <div className="grid gap-2 rounded-lg border border-[#485840] bg-black/30 p-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {!examples
          ? Array.from({ length: 6 }, (_, i) => <div key={i} className="aspect-square animate-pulse rounded-md bg-white/5" />)
          : examples.map((e, i) => {
              const lit = end || i === active;
              return (
                <motion.div
                  key={e.c}
                  className="overflow-hidden rounded-md border-2"
                  initial={false}
                  animate={{
                    opacity: active === -1 ? 0.5 : lit ? 1 : 0.3,
                    scale: i === active ? 1.06 : 1,
                    borderColor: lit ? colorOf(e.c) : "rgba(255,255,255,0.08)",
                  }}
                  transition={{ duration: reduced ? 0 : 0.3 }}
                >
                  <div className="aspect-square bg-black">
                    <DefectCloseUp datasetId={datasetId} fileId={e.fileId} box={e.box} />
                  </div>
                  <p className="flex items-center gap-1 truncate px-1.5 py-1 text-[11px] font-medium text-[#f5f5ee]" style={{ background: "rgba(23,31,27,0.9)" }}>
                    <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: colorOf(e.c) }} />
                    {nameOf(classNames, e.c)}
                  </p>
                </motion.div>
              );
            })}
      </div>
      <motion.p
        className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-white/25 px-2 py-1 text-xs text-[#bec9b0]"
        initial={{ opacity: reduced ? 1 : 0 }}
        animate={{ opacity: end ? 1 : 0 }}
        transition={{ duration: reduced ? 0 : 0.4 }}
      >
        <EyeOff className="h-3 w-3" aria-hidden="true" /> A defect that isn&apos;t labelled stays invisible to the model
      </motion.p>
    </div>
  );
};

/** Step "What is a dataset split?": a pile of photos flies into three groups, and the test group is locked away */
export const SplitAnimation: React.FC<{ train: number; val: number; test: number }> = ({ train, val, test }) => {
  const reduced = useReducedMotion();
  const total = train + val + test;
  if (!total) return null;

  // About 15 cards, in the dataset's real proportions, at least one per group that has photos
  const share = (n: number) => (n ? Math.max(1, Math.round((15 * n) / total)) : 0);
  const groups = [
    { name: "Training", count: train, cards: share(train), color: MUTED },
    { name: "Validation", count: val, cards: share(val), color: "#8ab4f8" },
    { name: "Test", count: test, cards: share(test), color: LIME },
  ];

  // Cards dealt in turn, like a shuffled pile, each to its place in its group's box
  const BIN_W = 120;
  const GAP = 20;
  const BIN_Y = 92;
  const CARD_W = 22;
  const CARD_H = 16;
  const placed = groups.map(() => 0);
  const cards: { g: number; x: number; y: number; px: number; py: number }[] = [];
  const left = groups.map((g) => g.cards);
  let i = 0;
  while (left.some((n) => n > 0)) {
    const g = [0, 0, 1, 0, 2][i % 5] ?? 0;
    const pick = left[g] > 0 ? g : left.findIndex((n) => n > 0);
    const slot = placed[pick]++;
    left[pick]--;
    cards.push({
      g: pick,
      x: pick * (BIN_W + GAP) + 8 + (slot % 4) * 27,
      y: BIN_Y + 30 + Math.floor(slot / 4) * 20,
      px: 189 + ((i * 7) % 9) - 4,
      py: 30 + ((i * 5) % 7) - 3,
    });
    i++;
  }
  const deal = (n: number) => (reduced ? 0 : 0.5 + n * 0.14);
  const settled = reduced ? 0 : deal(cards.length) + 0.5;

  return (
    <Replayable label="The photos being split into training, validation and test groups">
      {() => (
        <div className="overflow-hidden rounded-lg border border-[#485840] bg-black/30 p-2">
          <svg viewBox="0 0 400 200" className="h-auto w-full" aria-hidden>
            <text x={200} y={12} textAnchor="middle" fontSize={11} fill={MUTED}>
              All {total} photos
            </text>
            {groups.map((g, gi) => {
              const x = gi * (BIN_W + GAP);
              const isTest = g.name === "Test";
              return (
                <g key={g.name}>
                  <motion.rect
                    x={x}
                    y={BIN_Y}
                    width={BIN_W}
                    height={104}
                    rx={10}
                    fill="rgba(255,255,255,0.04)"
                    initial={{ stroke: "rgba(255,255,255,0.2)" }}
                    animate={{ stroke: isTest ? LIME : "rgba(255,255,255,0.2)" }}
                    transition={{ delay: isTest ? settled : 0, duration: reduced ? 0 : 0.4 }}
                    strokeWidth={1.5}
                  />
                  <text x={x + 10} y={BIN_Y + 18} fontSize={12} fontWeight={700} fill={INK}>
                    {g.name}
                  </text>
                  <motion.text
                    x={x + BIN_W - 10}
                    y={BIN_Y + 18}
                    textAnchor="end"
                    fontSize={12}
                    fontWeight={700}
                    fill={g.color}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: settled, duration: reduced ? 0 : 0.3 }}
                  >
                    {g.count}
                  </motion.text>
                </g>
              );
            })}
            {cards.map((c, n) => (
              <motion.rect
                key={n}
                width={CARD_W}
                height={CARD_H}
                rx={3}
                fill={groups[c.g].color}
                stroke="#171f1b"
                strokeWidth={1}
                initial={{ x: reduced ? c.x : c.px, y: reduced ? c.y : c.py }}
                animate={{ x: c.x, y: c.y }}
                transition={{ delay: deal(n), duration: reduced ? 0 : 0.5, ease: "easeOut" }}
              />
            ))}
            {/* The test group is kept away until the final exam */}
            <motion.g
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: settled + (reduced ? 0 : 0.3), duration: reduced ? 0 : 0.4 }}
            >
              <rect x={2 * (BIN_W + GAP) + 6} y={BIN_Y + 26} width={BIN_W - 12} height={72} rx={8} fill="rgba(23,31,27,0.82)" />
              <foreignObject x={2 * (BIN_W + GAP)} y={BIN_Y + 34} width={BIN_W} height={60}>
                <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-[11px] font-semibold leading-tight text-[#e9ff65]">
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  Locked until
                  <br />
                  the final exam
                </div>
              </foreignObject>
            </motion.g>
          </svg>
        </div>
      )}
    </Replayable>
  );
};

/** Step "Training photos": the model's guess box moves closer to the label with every pass, until it fits */
export const TrainingPasses: React.FC<{ example: TourExample }> = ({ example }) => {
  const reduced = !!useReducedMotion();
  const { photo, failed } = usePhoto(example.datasetId, example.fileId, true);
  const box = biggest(example.boxes);
  return (
    <Replayable label="A model getting closer to the label with every pass over the training photos">
      {() => <TrainingPassesRun photo={photo} failed={failed} box={box} reduced={reduced} />}
    </Replayable>
  );
};

const TrainingPassesRun: React.FC<{ photo: { src: string; w: number; h: number } | null; failed: boolean; box?: Box; reduced: boolean }> = ({
  photo,
  failed,
  box,
  reduced,
}) => {
  // 0: the label (the answer); 1 to 3: the model's guess after each pass; 4: it fits
  const stage = useStages(photo ? [0.6, 1.8, 3, 4.1] : [], reduced || !photo);
  const done = stage >= 4;
  const pass = Math.min(Math.max(stage, 1), 3);

  if (!photo || !box) {
    return <PhotoFrame failed={failed} />;
  }
  const { w: W, h: H } = photo;
  const view = cropAround(W, H, box, 4);
  const real = { x: box.x * W, y: box.y * H, w: box.w * W, h: box.h * H };
  // Each pass, the guess is a bit nearer and a better size
  const guesses = [
    { dx: 0.9, dy: -0.7, s: 1.7 },
    { dx: 0.9, dy: -0.7, s: 1.7 },
    { dx: 0.35, dy: -0.25, s: 1.25 },
    { dx: 0, dy: 0, s: 1 },
  ];
  const g = guesses[Math.min(stage, 3)];
  const gw = real.w * g.s;
  const gh = real.h * g.s;
  const gx = real.x + real.w / 2 + g.dx * real.w - gw / 2;
  const gy = real.y + real.h / 2 + g.dy * real.h - gh / 2;
  const line = view.w / 90;
  const font = view.w / 18;

  return (
    <div className="space-y-2">
      <PhotoFrame>
        <svg viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden>
          <image href={photo.src} width={W} height={H} />
          {/* The label: the answer the model is aiming for */}
          <rect x={real.x} y={real.y} width={real.w} height={real.h} fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={line} strokeDasharray={`${line * 3} ${line * 2}`} />
          <text x={real.x} y={real.y + real.h + font * 1.1} fontSize={font * 0.8} fontWeight={700} fill="#fff">
            label
          </text>
          {/* The model's guess */}
          <motion.rect
            fill={done ? "rgba(16,185,129,0.18)" : "none"}
            stroke={done ? "#10b981" : "#f59e0b"}
            strokeWidth={line * 1.4}
            initial={false}
            animate={{ x: gx, y: gy, width: gw, height: gh, opacity: stage >= 1 ? 1 : 0 }}
            transition={{ duration: reduced ? 0 : 0.7, ease: "easeInOut" }}
          />
        </svg>
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1 text-[11px] font-semibold text-[#f5f5ee]">
          {done ? (
            <>
              <Check className="h-3.5 w-3.5 text-[#10b981]" aria-hidden="true" /> It fits the label
            </>
          ) : stage === 0 ? (
            "The label: the right answer"
          ) : (
            <>
              <span className="h-2.5 w-2.5 rounded-sm bg-[#f59e0b]" /> Model&apos;s guess · pass {pass}
            </>
          )}
        </div>
      </PhotoFrame>
      <div className="flex items-center justify-center gap-1.5" aria-hidden>
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={cn(
              "rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors",
              stage >= n ? "bg-[#e9ff65] text-[#171f1b]" : "bg-white/10 text-[#bec9b0]"
            )}
          >
            Pass {n}
          </span>
        ))}
      </div>
    </div>
  );
};

/** An example of how a model's validation score moves pass by pass (not a real result) */
const VALIDATION_EXAMPLE = [48, 66, 79, 86, 82];

/** Step "Validation photos": the score on photos it doesn't learn from, after each pass; the best version is kept */
export const ValidationChart: React.FC = () => {
  const reduced = !!useReducedMotion();
  return (
    <Replayable label="An example of a model's validation score after each pass, with the best version kept">
      {() => <ValidationChartRun reduced={reduced} />}
    </Replayable>
  );
};

const ValidationChartRun: React.FC<{ reduced: boolean }> = ({ reduced }) => {
  const n = VALIDATION_EXAMPLE.length;
  // One bar per stage, then the best one is marked
  const stage = useStages([...VALIDATION_EXAMPLE.map((_, i) => 0.5 + i * 0.6), 0.5 + n * 0.6 + 0.3], reduced);
  const best = VALIDATION_EXAMPLE.indexOf(Math.max(...VALIDATION_EXAMPLE));
  const marked = stage > n;
  const BAR = 44;
  const GAP = 26;
  const BASE = 150;
  const left = (400 - (n * BAR + (n - 1) * GAP)) / 2;

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-lg border border-[#485840] bg-black/30 p-2">
        <span className="absolute left-2 top-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#bec9b0]">
          Example
        </span>
        <svg viewBox="0 0 400 190" className="h-auto w-full" aria-hidden>
          <text x={200} y={16} textAnchor="middle" fontSize={11} fill={MUTED}>
            Score on validation photos
          </text>
          <line x1={left - 10} x2={400 - left + 10} y1={BASE} y2={BASE} stroke="rgba(255,255,255,0.2)" />
          {VALIDATION_EXAMPLE.map((v, i) => {
            const x = left + i * (BAR + GAP);
            const h = (v / 100) * 120;
            const shown = stage > i;
            const isBest = marked && i === best;
            return (
              <g key={i}>
                <motion.rect
                  x={x}
                  width={BAR}
                  rx={4}
                  fill={isBest ? LIME : i > best && marked ? "rgba(190,201,176,0.35)" : "#8ab4f8"}
                  initial={{ y: BASE, height: 0 }}
                  animate={{ y: shown ? BASE - h : BASE, height: shown ? h : 0 }}
                  transition={{ duration: reduced ? 0 : 0.45, ease: "easeOut" }}
                />
                <motion.text
                  x={x + BAR / 2}
                  y={BASE - h - 6}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={700}
                  fill={isBest ? LIME : INK}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: shown ? 1 : 0 }}
                  transition={{ duration: reduced ? 0 : 0.3, delay: reduced ? 0 : 0.3 }}
                >
                  {v}%
                </motion.text>
                <text x={x + BAR / 2} y={BASE + 16} textAnchor="middle" fontSize={11} fill={MUTED}>
                  Pass {i + 1}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <motion.div
        className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs"
        initial={{ opacity: reduced ? 1 : 0 }}
        animate={{ opacity: marked ? 1 : 0 }}
        transition={{ duration: reduced ? 0 : 0.4 }}
      >
        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-semibold text-[#171f1b]" style={{ background: LIME }}>
          <Star className="h-3 w-3" aria-hidden="true" /> Pass {best + 1}: best version kept
        </span>
        <span className="text-[#bec9b0]">Pass {best + 2} dropped: it began memorising</span>
      </motion.div>
    </div>
  );
};

/** Step "Held-out test photos": the test group unlocks once training is over, and the model meets a photo it has never seen */
export const TestReveal: React.FC<{ datasetId: string; testFileIds: string[] }> = ({ datasetId, testFileIds }) => {
  const reduced = !!useReducedMotion();
  const [found, setFound] = useState<{ fileId: string; box: Box } | null | undefined>(undefined);
  const idsKey = testFileIds.slice(0, 20).join(",");

  // A test photo with a defect marked on it
  useEffect(() => {
    const ids = idsKey ? idsKey.split(",") : [];
    if (!ids.length) {
      setFound(null);
      return;
    }
    let cancelled = false;
    apiRequest<{ labels: Record<string, Box[]> }>(
      `/dataset/${encodeURIComponent(datasetId)}/file-labels?ids=${ids.map(encodeURIComponent).join(",")}`
    )
      .then((json) => {
        if (cancelled) return;
        const id = ids.find((i) => json.labels[i]?.length);
        setFound(id ? { fileId: id, box: biggest(json.labels[id]) } : null);
      })
      .catch(() => !cancelled && setFound(null));
    return () => {
      cancelled = true;
    };
  }, [datasetId, idsKey]);

  return (
    <Replayable label="The locked test photos opening after training, and the model finding a defect on a photo it has never seen">
      {() => <TestRevealRun datasetId={datasetId} found={found} reduced={reduced} />}
    </Replayable>
  );
};

const TestRevealRun: React.FC<{ datasetId: string; found: { fileId: string; box: Box } | null | undefined; reduced: boolean }> = ({
  datasetId,
  found,
  reduced,
}) => {
  const { photo, failed } = usePhoto(datasetId, found?.fileId ?? "", true);
  const ready = !!photo && !!found;
  // 1: unlocked; 2: the new photo; 3: the model's box; 4: found
  const stage = useStages(ready ? [0.9, 1.9, 2.8, 3.8] : [], reduced || !ready);

  let content: React.ReactNode = null;
  if (ready && found) {
    const { w: W, h: H } = photo;
    const b = found.box;
    const view = cropAround(W, H, b, 4);
    content = (
      <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: stage >= 2 ? 1 : 0 }} transition={{ duration: reduced ? 0 : 0.5 }}>
        <svg viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden>
          <image href={photo.src} width={W} height={H} />
          <motion.rect
            x={b.x * W}
            y={b.y * H}
            width={b.w * W}
            height={b.h * H}
            fill="none"
            stroke={LIME}
            strokeWidth={view.w / 70}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: stage >= 3 ? 1 : 0, opacity: stage >= 3 ? 1 : 0 }}
            transition={{ duration: reduced ? 0 : 0.8, ease: "easeInOut" }}
          />
        </svg>
        <span className="absolute left-2 top-2 rounded bg-[#e9ff65] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#171f1b]">
          Never seen before
        </span>
        <motion.span
          className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1 text-[11px] font-semibold text-[#f5f5ee]"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: stage >= 4 ? 1 : 0, y: stage >= 4 ? 0 : 6 }}
          transition={{ duration: reduced ? 0 : 0.35 }}
        >
          <Check className="h-3.5 w-3.5 text-[#10b981]" aria-hidden="true" /> Found it: this counts towards the honest score
        </motion.span>
      </motion.div>
    );
  }

  return (
    <PhotoFrame failed={found === null || failed}>
      {found === null || failed ? undefined : (
        <>
          {content}
          {/* The locked test group, opening once training is over */}
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#171f1b] text-center"
            initial={{ opacity: 1 }}
            animate={{ opacity: stage >= 2 ? 0 : 1 }}
            transition={{ duration: reduced ? 0 : 0.5 }}
          >
            <motion.div
              className="flex h-14 w-14 items-center justify-center rounded-2xl border-2"
              animate={{ borderColor: stage >= 1 ? LIME : "rgba(255,255,255,0.25)", scale: stage === 1 ? 1.1 : 1 }}
              transition={{ duration: reduced ? 0 : 0.3 }}
            >
              {stage >= 1 ? <LockOpen className="h-6 w-6 text-[#e9ff65]" aria-hidden="true" /> : <Lock className="h-6 w-6 text-[#bec9b0]" aria-hidden="true" />}
            </motion.div>
            <p className="text-sm font-semibold text-[#f5f5ee]">{stage >= 1 ? "Training is over" : "Test photos · locked"}</p>
            <p className="text-xs text-[#bec9b0]">{stage >= 1 ? "Time for the final exam" : ready ? "Kept away while the model learns" : ""}</p>
          </motion.div>
        </>
      )}
    </PhotoFrame>
  );
};
