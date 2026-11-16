import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, GraduationCap, Sparkles, Star, Target, X } from "lucide-react";
import type { SampleModel } from "@/lib/api/samples";
import { cn } from "@/lib/utils";
import { PhotoFrame, Replayable } from "./DatasetTourVisuals";
import { LIME, MUTED, biggest, cropAround, usePhoto, useStages, type TourExample } from "./tourVisualHelpers";

/**
 * The short animations in the How training works guide (Level 1): the four stages of a training run,
 * what each setting does, and what the scores mean. Real photos are used where they help; the
 * charts are examples and say so. Each plays once and can be replayed; with reduced motion the
 * finished picture shows straight away.
 */

const GREEN = "#22c55e";
const RED = "#ef4444";
const BLUE = "#8ab4f8";

const Frame: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  // Room at the top for the Replay button
  <div className={cn("relative overflow-hidden rounded-lg border border-[#485840] bg-black/30 p-2 pt-10", className)}>{children}</div>
);

const ExampleTag: React.FC = () => (
  <span className="absolute left-2 top-2 z-10 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#bec9b0]">
    Example
  </span>
);

const t = (reduced: boolean, s: number) => (reduced ? 0 : s);

// ---------------------------------------------------------------------------------------------
// The four stages

const STAGES = [
  { Icon: Check, title: "Check", text: "Every photo and its labels are checked" },
  { Icon: GraduationCap, title: "Learn", text: "Training photos go in, again and again" },
  { Icon: Target, title: "Self-test", text: "It tries the validation photos and gets a score" },
  { Icon: Sparkles, title: "Save", text: "Its best version is kept" },
];

/** The scene under the stage that's lit */
const StageScene: React.FC<{ stage: number; reduced: boolean }> = ({ stage, reduced }) => {
  const cards = [0, 1, 2, 3];
  if (stage === 0) {
    return (
      <div className="flex items-center justify-center gap-3">
        {cards.map((i) => (
          <motion.div
            key={i}
            className="relative h-12 w-14 rounded-md border border-white/20 bg-[#2a3a2f]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: t(reduced, i * 0.12) }}
          >
            <span className="absolute left-2 top-2 h-4 w-5 rounded-sm border-2" style={{ borderColor: LIME }} />
            <motion.span
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full"
              style={{ background: GREEN }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: t(reduced, 0.5 + i * 0.18), type: "spring", stiffness: 300, damping: 15 }}
            >
              <Check className="h-3 w-3 text-white" aria-hidden="true" />
            </motion.span>
          </motion.div>
        ))}
      </div>
    );
  }
  if (stage === 1) {
    return (
      <div className="relative mx-auto h-16 w-full max-w-[340px]">
        {cards.map((i) => (
          <motion.div
            key={i}
            className="absolute top-3 h-10 w-12 rounded-md border border-white/20 bg-[#2a3a2f]"
            initial={{ left: "0%", opacity: 0 }}
            animate={{ left: ["0%", "62%"], opacity: [0, 1, 1, 0] }}
            transition={{ delay: t(reduced, i * 0.35), duration: t(reduced, 1.1), repeat: reduced ? 0 : 1, repeatDelay: 0.3 }}
          />
        ))}
        <div className="absolute right-0 top-0 flex h-16 w-24 flex-col items-center justify-center rounded-xl border-2" style={{ borderColor: LIME }}>
          <GraduationCap className="h-6 w-6 text-[#e9ff65]" aria-hidden="true" />
          <span className="text-[10px] font-semibold text-[#f5f5ee]">Model</span>
        </div>
      </div>
    );
  }
  if (stage === 2) {
    return (
      <div className="mx-auto w-full max-w-[300px] space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-[#bec9b0]">
          <span>Score on validation photos</span>
          <motion.span className="font-semibold text-[#f5f5ee]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: t(reduced, 0.9) }}>
            78%
          </motion.span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full"
            style={{ background: BLUE }}
            initial={{ width: "0%" }}
            animate={{ width: "78%" }}
            transition={{ duration: t(reduced, 1), ease: "easeOut" }}
          />
        </div>
        <p className="text-center text-[11px] text-[#bec9b0]">It doesn&apos;t learn from these: it only checks itself</p>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-3">
      <motion.span
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: LIME }}
        initial={{ scale: 0.4, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 14 }}
      >
        <Star className="h-7 w-7 text-[#171f1b]" aria-hidden="true" />
      </motion.span>
      <div className="text-left">
        <p className="text-sm font-semibold text-[#f5f5ee]">Best version saved</p>
        <p className="text-[11px] text-[#bec9b0]">Ready to test on the held-out photos</p>
      </div>
    </div>
  );
};

export const TrainingStages: React.FC = () => {
  const reduced = !!useReducedMotion();
  return (
    <Replayable label="The four stages of training, one after another">
      {() => <TrainingStagesRun reduced={reduced} />}
    </Replayable>
  );
};

const TrainingStagesRun: React.FC<{ reduced: boolean }> = ({ reduced }) => {
  // 1 to 4: each stage in turn; it stays on the last
  const stage = useStages([0.2, 2.2, 4.4, 6.4], reduced);
  const active = Math.max(0, Math.min(stage, 4) - 1);
  return (
    <Frame>
      <div className="relative flex items-start justify-between px-2 pt-1">
        <div className="absolute left-8 right-8 top-[22px] h-0.5 bg-white/15" aria-hidden />
        <motion.div
          className="absolute left-8 top-[22px] h-0.5"
          style={{ background: LIME }}
          animate={{ width: `calc(${(active / 3) * 100}% - ${(active / 3) * 64}px)` }}
          transition={{ duration: t(reduced, 0.5) }}
          aria-hidden
        />
        {STAGES.map(({ Icon, title }, i) => (
          <div key={title} className="relative flex w-16 flex-col items-center gap-1">
            <motion.span
              className="flex h-11 w-11 items-center justify-center rounded-full border-2"
              animate={{
                backgroundColor: i <= active ? LIME : "#171f1b",
                borderColor: i <= active ? LIME : "rgba(255,255,255,0.25)",
                scale: i === active ? 1.12 : 1,
              }}
              transition={{ duration: t(reduced, 0.3) }}
            >
              <Icon className={cn("h-5 w-5", i <= active ? "text-[#171f1b]" : "text-[#bec9b0]")} aria-hidden="true" />
            </motion.span>
            <span className={cn("text-[11px] font-semibold", i <= active ? "text-[#f5f5ee]" : "text-[#bec9b0]")}>
              {i + 1}. {title}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex h-[104px] flex-col justify-center rounded-md bg-black/25 px-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: t(reduced, 0.25) }}
            className="space-y-2"
          >
            <StageScene stage={active} reduced={reduced} />
            <p className="text-center text-xs font-medium text-[#f5f5ee]">{STAGES[active].text}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </Frame>
  );
};

// ---------------------------------------------------------------------------------------------
// Model size

/** A small drawing of a network: dots in layers, joined up */
const Network: React.FC<{ layers: number[]; reduced: boolean; delay: number }> = ({ layers, reduced, delay }) => {
  const W = 150;
  const H = 96;
  const points = layers.map((n, li) =>
    Array.from({ length: n }, (_, i) => ({ x: 14 + (li * (W - 28)) / (layers.length - 1), y: H / 2 + (i - (n - 1) / 2) * Math.min(14, (H - 16) / n) }))
  );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" aria-hidden>
      {points.slice(1).map((layer, li) =>
        layer.flatMap((b, bi) =>
          points[li].map((a, ai) => (
            <motion.line
              key={`${li}-${ai}-${bi}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={LIME}
              strokeOpacity={0.35}
              strokeWidth={0.8}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: t(reduced, delay + li * 0.3), duration: t(reduced, 0.5) }}
            />
          ))
        )
      )}
      {points.flat().map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={3.4}
          fill={LIME}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: t(reduced, delay + i * 0.02), duration: t(reduced, 0.2) }}
        />
      ))}
    </svg>
  );
};

const Bar: React.FC<{ label: string; value: number; color: string; reduced: boolean; delay: number }> = ({ label, value, color, reduced, delay }) => (
  <div>
    <p className="text-[10px] text-[#bec9b0]">{label}</p>
    <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-white/10">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: "0%" }}
        animate={{ width: `${value}%` }}
        transition={{ delay: t(reduced, delay), duration: t(reduced, 0.8), ease: "easeOut" }}
      />
    </div>
  </div>
);

export const ModelSizeCompare: React.FC = () => {
  const reduced = !!useReducedMotion();
  const sizes = [
    { name: "Nano", layers: [3, 4, 3], speed: 92, spots: 68, note: "Quick to train and to run" },
    { name: "Small", layers: [5, 7, 7, 5], speed: 55, spots: 86, note: "Slower, often spots more" },
  ];
  return (
    <Replayable label="A smaller and a bigger model compared">
      {() => (
        <Frame>
          <div className="grid grid-cols-2 gap-3">
            {sizes.map((s, i) => (
              <div key={s.name} className="rounded-md bg-black/25 p-2">
                <p className="text-sm font-semibold text-[#f5f5ee]">{s.name}</p>
                <Network layers={s.layers} reduced={reduced} delay={i * 0.6} />
                <div className="space-y-1.5">
                  <Bar label="Training speed" value={s.speed} color={BLUE} reduced={reduced} delay={1.4} />
                  <Bar label="Spots defects" value={s.spots} color={LIME} reduced={reduced} delay={1.7} />
                </div>
                <p className="mt-1.5 text-[11px] text-[#bec9b0]">{s.note}</p>
              </div>
            ))}
          </div>
        </Frame>
      )}
    </Replayable>
  );
};

// ---------------------------------------------------------------------------------------------
// Epochs

const TRAIN_CURVE = [30, 47, 59, 68, 75, 81, 86, 90, 93, 95];
const VAL_CURVE = [28, 44, 55, 63, 68, 71, 72, 70, 66, 62];

export const EpochsChart: React.FC = () => {
  const reduced = !!useReducedMotion();
  return (
    <Replayable label="An example of scores over ten epochs: training keeps rising while validation dips when the model memorises">
      {() => <EpochsChartRun reduced={reduced} />}
    </Replayable>
  );
};

const EpochsChartRun: React.FC<{ reduced: boolean }> = ({ reduced }) => {
  const n = TRAIN_CURVE.length;
  const stage = useStages([...TRAIN_CURVE.map((_, i) => 0.3 + i * 0.45), 0.3 + n * 0.45 + 0.2], reduced);
  const shown = Math.min(stage, n);
  const done = stage > n;
  const X0 = 34;
  const X1 = 388;
  const Y0 = 156;
  const Y1 = 26;
  const x = (i: number) => X0 + (i * (X1 - X0)) / (n - 1);
  const y = (v: number) => Y0 - ((v - 20) / 80) * (Y0 - Y1);
  const path = (curve: number[]) =>
    curve
      .slice(0, Math.max(shown, 1))
      .map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`)
      .join(" ");
  const best = VAL_CURVE.indexOf(Math.max(...VAL_CURVE));
  return (
    <Frame>
      <ExampleTag />
      <span className="absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded bg-black/60 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#f5f5ee]">
        Epoch {Math.max(shown, 1)} of {n}
      </span>
      <svg viewBox="0 0 400 190" className="h-auto w-full" aria-hidden>
        {/* Too many epochs: past the best */}
        <motion.rect
          x={x(best) + 8}
          y={Y1 - 6}
          width={X1 - x(best) - 2}
          height={Y0 - Y1 + 6}
          fill={RED}
          initial={{ opacity: 0 }}
          animate={{ opacity: done ? 0.12 : 0 }}
          transition={{ duration: t(reduced, 0.4) }}
        />
        <motion.text
          x={(x(best) + 8 + X1) / 2}
          y={Y0 - 12}
          textAnchor="middle"
          fontSize={10.5}
          fontWeight={700}
          fill="#fca5a5"
          initial={{ opacity: 0 }}
          animate={{ opacity: done ? 1 : 0 }}
          transition={{ duration: t(reduced, 0.4) }}
        >
          <tspan x={(x(best) + 8 + X1) / 2}>Too many:</tspan>
          <tspan x={(x(best) + 8 + X1) / 2} dy={12}>memorising</tspan>
        </motion.text>
        <line x1={X0} x2={X1} y1={Y0} y2={Y0} stroke="rgba(255,255,255,0.2)" />
        {Array.from({ length: n }, (_, i) => (
          <text key={i} x={x(i)} y={Y0 + 14} textAnchor="middle" fontSize={10} fill={MUTED}>
            {i + 1}
          </text>
        ))}
        <text x={X1} y={Y0 + 28} textAnchor="end" fontSize={10} fill={MUTED}>
          epochs
        </text>
        <path d={path(TRAIN_CURVE)} fill="none" stroke={LIME} strokeWidth={2.5} strokeLinejoin="round" />
        <path d={path(VAL_CURVE)} fill="none" stroke={BLUE} strokeWidth={2.5} strokeLinejoin="round" strokeDasharray="6 4" />
        {shown > 0 && <circle cx={x(shown - 1)} cy={y(TRAIN_CURVE[shown - 1])} r={3.5} fill={LIME} />}
        {shown > 0 && <circle cx={x(shown - 1)} cy={y(VAL_CURVE[shown - 1])} r={3.5} fill={BLUE} />}
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: done ? 1 : 0 }} transition={{ duration: t(reduced, 0.4) }}>
          <circle cx={x(best)} cy={y(VAL_CURVE[best])} r={6} fill="none" stroke={LIME} strokeWidth={2} />
          <text x={x(best)} y={y(VAL_CURVE[best]) + 20} textAnchor="middle" fontSize={10} fontWeight={700} fill={LIME}>
            ★ best kept
          </text>
        </motion.g>
      </svg>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-[#bec9b0]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4" style={{ background: LIME }} /> Score on training photos
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-t-2 border-dashed" style={{ borderColor: BLUE }} /> Score on validation photos
        </span>
      </div>
    </Frame>
  );
};

// ---------------------------------------------------------------------------------------------
// Batch size

export const BatchAnimation: React.FC = () => {
  const reduced = !!useReducedMotion();
  return (
    <Replayable label="Photos going into the model in batches of four, with the model adjusting after each batch">
      {() => <BatchAnimationRun reduced={reduced} />}
    </Replayable>
  );
};

const BatchAnimationRun: React.FC<{ reduced: boolean }> = ({ reduced }) => {
  const BATCHES = 3;
  const SIZE = 4;
  // Stage k: k batches have gone in
  const stage = useStages([0.8, 2.2, 3.6], reduced);
  return (
    <Frame>
      <div className="flex items-center gap-3">
        <div className="grid flex-1 grid-cols-4 gap-1.5">
          {Array.from({ length: BATCHES * SIZE }, (_, i) => {
            const batch = Math.floor(i / SIZE);
            const gone = stage > batch;
            return (
              <motion.div
                key={i}
                className="h-7 rounded border border-white/20"
                style={{ background: ["#3a4f42", "#41523f", "#4a4f3a"][batch] }}
                animate={{ x: gone ? 140 : 0, opacity: gone ? 0 : 1, scale: stage === batch + 1 ? 0.9 : 1 }}
                transition={{ duration: t(reduced, 0.6), delay: t(reduced, (i % SIZE) * 0.05) }}
              />
            );
          })}
        </div>
        <div className="relative flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-xl border-2" style={{ borderColor: LIME }}>
          <GraduationCap className="h-6 w-6 text-[#e9ff65]" aria-hidden="true" />
          <span className="text-[10px] font-semibold text-[#f5f5ee]">Model</span>
          <AnimatePresence>
            {stage > 0 && (
              <motion.span
                key={stage}
                className="absolute -bottom-2.5 rounded-full px-2 py-0.5 text-[10px] font-bold text-[#171f1b]"
                style={{ background: LIME }}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: t(reduced, 0.25) }}
              >
                adjusts ✓
              </motion.span>
            )}
          </AnimatePresence>
          {stage > 0 && !reduced && (
            <motion.span
              key={`ring-${stage}`}
              className="absolute inset-0 rounded-xl border-2"
              style={{ borderColor: LIME }}
              initial={{ opacity: 0.9, scale: 1 }}
              animate={{ opacity: 0, scale: 1.35 }}
              transition={{ duration: 0.7 }}
              aria-hidden
            />
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-[#bec9b0]">
        <span>
          Batch size 4 · batch <span className="font-semibold tabular-nums text-[#f5f5ee]">{Math.min(Math.max(stage, 1), BATCHES)}</span> of {BATCHES}
        </span>
        <span>Bigger batch = more memory</span>
      </div>
      <div className="mt-1 grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1 text-[10px] text-[#bec9b0]">
        <span>Batch 4</span>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full rounded-full" style={{ background: BLUE }} initial={{ width: 0 }} animate={{ width: "35%" }} transition={{ duration: t(reduced, 0.8) }} />
        </div>
        <span>Batch 16</span>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full rounded-full" style={{ background: "#f59e0b" }} initial={{ width: 0 }} animate={{ width: "90%" }} transition={{ delay: t(reduced, 0.3), duration: t(reduced, 0.8) }} />
        </div>
      </div>
    </Frame>
  );
};

// ---------------------------------------------------------------------------------------------
// Image size

/** Part of the photo (`view`), drawn as if the whole photo were `size` pixels wide: small sizes go blocky */
const ResizedCrop: React.FC<{ src: string; W: number; view: { x: number; y: number; w: number; h: number }; size: number }> = ({
  src,
  W,
  view,
  size,
}) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const c = canvas.current;
      if (!c) return;
      const scale = size / W;
      c.width = Math.max(2, Math.round(view.w * scale));
      c.height = Math.max(2, Math.round(view.h * scale));
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, view.x, view.y, view.w, view.h, 0, 0, c.width, c.height);
    };
    img.src = src;
    // By its numbers: the view is worked out afresh on every render, but only a real change redraws
  }, [src, size, W, view.x, view.y, view.w, view.h]);
  return <canvas ref={canvas} className="h-full w-full" style={{ imageRendering: "pixelated" }} />;
};

export const ImageSizeCompare: React.FC<{ example: TourExample }> = ({ example }) => {
  const reduced = !!useReducedMotion();
  const { photo, failed } = usePhoto(example.datasetId, example.fileId, true);
  const box = biggest(example.boxes);
  return (
    <Replayable label="The same defect at a large and a small image size">
      {() => <ImageSizeRun photo={photo} failed={failed} box={box} reduced={reduced} />}
    </Replayable>
  );
};

const ImageSizeRun: React.FC<{
  photo: { src: string; w: number; h: number } | null;
  failed: boolean;
  box?: { c: number; x: number; y: number; w: number; h: number };
  reduced: boolean;
}> = ({ photo, failed, box, reduced }) => {
  // The right-hand photo shrinks step by step: 640, 320, 160
  const stage = useStages(photo ? [1, 2, 3] : [], reduced || !photo);
  const small = [640, 640, 320, 160][Math.min(stage, 3)];
  if (!photo || !box) {
    return (
      <div className="grid grid-cols-2 gap-2">
        <PhotoFrame failed={failed} />
        <PhotoFrame failed={failed} />
      </div>
    );
  }
  const abs = { x: box.x * photo.w, y: box.y * photo.h, w: box.w * photo.w, h: box.h * photo.h };
  const view = cropAround(photo.w, photo.h, box, 4);
  // Where the defect sits in the view, as a share of it, for the outline
  const mark = { left: (abs.x - view.x) / view.w, top: (abs.y - view.y) / view.h, width: abs.w / view.w, height: abs.h / view.h };
  const panels = [
    { size: 640, label: "Large: 640 px", note: "Defect is clear" },
    { size: small, label: `Small: ${small} px`, note: small <= 160 ? "Defect almost gone" : "Getting blurry" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {panels.map((p, i) => (
        <div key={i} className="space-y-1">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-[#485840] bg-black">
            <ResizedCrop src={photo.src} W={photo.w} view={view} size={p.size} />
            <span
              className="pointer-events-none absolute rounded-sm border-2 border-dashed"
              style={{
                left: `${mark.left * 100}%`,
                top: `${mark.top * 100}%`,
                width: `${mark.width * 100}%`,
                height: `${mark.height * 100}%`,
                borderColor: i === 1 && p.size <= 160 ? RED : LIME,
              }}
            />
          </div>
          <p className={cn("text-xs font-semibold", i === 1 && p.size <= 160 ? "text-[#fca5a5]" : "text-[#f5f5ee]")}>{p.label}</p>
          <motion.p key={p.note} className="text-[11px] text-[#bec9b0]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: t(reduced, 0.3) }}>
            {p.note}
          </motion.p>
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// Learning rate

const LANES = [
  { name: "Too big", color: RED, path: [-0.9, 0.8, -0.75, 0.85, -0.8, 0.78], note: "Keeps overshooting" },
  { name: "Too small", color: "#f59e0b", path: [-0.9, -0.86, -0.82, -0.78, -0.74, -0.7], note: "Barely moves" },
  { name: "Just right", color: GREEN, path: [-0.9, -0.5, -0.22, -0.08, -0.02, 0], note: "Reaches the bottom" },
];

export const LearningRateValleys: React.FC = () => {
  const reduced = !!useReducedMotion();
  return (
    <Replayable label="A ball rolling into a valley with a learning rate that is too big, too small and just right">
      {() => <LearningRateRun reduced={reduced} />}
    </Replayable>
  );
};

const LearningRateRun: React.FC<{ reduced: boolean }> = ({ reduced }) => {
  const steps = LANES[0].path.length;
  const stage = useStages(Array.from({ length: steps - 1 }, (_, i) => 0.6 + i * 0.7), reduced);
  const W = 120;
  const H = 80;
  const px = (u: number) => W / 2 + u * (W / 2 - 10);
  // A valley: high at both sides, lowest (the best answer) in the middle
  const py = (u: number) => 14 + (1 - u * u) * (H - 30);
  const valley = Array.from({ length: 41 }, (_, i) => {
    const u = -1 + i / 20;
    return `${i ? "L" : "M"}${px(u)},${py(u)}`;
  }).join(" ");
  return (
    <Frame>
      <p className="mb-1 text-center text-[11px] text-[#bec9b0]">The bottom of the valley is the best answer. Each jump is one correction.</p>
      <div className="grid grid-cols-3 gap-2">
        {LANES.map((lane) => {
          const u = lane.path[Math.min(stage, steps - 1)];
          return (
            <div key={lane.name} className="rounded-md bg-black/25 p-1.5 text-center">
              <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" aria-hidden>
                <path d={valley} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={2} />
                <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={8} fill={MUTED}>
                  best
                </text>
                <motion.circle
                  r={6}
                  fill={lane.color}
                  stroke="#fff"
                  strokeWidth={1.2}
                  initial={false}
                  animate={{ cx: px(u), cy: py(u) - 6 }}
                  transition={{ duration: t(reduced, 0.55), ease: "easeInOut" }}
                />
              </svg>
              <p className="text-xs font-semibold" style={{ color: lane.color }}>
                {lane.name}
              </p>
              <p className="text-[10px] text-[#bec9b0]">{lane.note}</p>
            </div>
          );
        })}
      </div>
    </Frame>
  );
};

// ---------------------------------------------------------------------------------------------
// More training photos (augmentation)

const COPIES = [
  { label: "Flipped", style: { transform: "scaleX(-1)" } },
  { label: "Rotated", style: { transform: "rotate(90deg) scale(0.75)" } },
  { label: "Brighter", style: { filter: "brightness(1.45)" } },
  { label: "Darker", style: { filter: "brightness(0.55)" } },
];

export const AugmentFan: React.FC<{ example: TourExample }> = ({ example }) => {
  const reduced = !!useReducedMotion();
  const { photo, failed } = usePhoto(example.datasetId, example.fileId);
  return (
    <Replayable label="One labelled photo turned into flipped, rotated, brighter and darker copies">
      {() => (
        <Frame>
          {!photo ? (
            <PhotoFrame failed={failed} />
          ) : (
            <div className="space-y-2">
              <div className="mx-auto w-1/2">
                <div className="aspect-[4/3] overflow-hidden rounded-md border-2" style={{ borderColor: LIME }}>
                  <img src={photo.src} alt="" className="h-full w-full object-cover" />
                </div>
                <p className="mt-1 text-center text-[11px] font-semibold text-[#f5f5ee]">Your labelled photo</p>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {COPIES.map((c, i) => (
                  <motion.div
                    key={c.label}
                    initial={{ opacity: 0, y: -40, scale: 0.6 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: t(reduced, 0.6 + i * 0.35), duration: t(reduced, 0.45), ease: "easeOut" }}
                  >
                    <div className="aspect-[4/3] overflow-hidden rounded-md border border-white/20 bg-black">
                      <img src={photo.src} alt="" className="h-full w-full object-cover" style={c.style} />
                    </div>
                    <p className="mt-0.5 text-center text-[10px] text-[#bec9b0]">{c.label}</p>
                  </motion.div>
                ))}
              </div>
              <motion.p
                className="text-center text-xs font-semibold text-[#e9ff65]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: t(reduced, 2.2) }}
              >
                1 photo → 5 to learn from
              </motion.p>
            </div>
          )}
        </Frame>
      )}
    </Replayable>
  );
};

// ---------------------------------------------------------------------------------------------
// GSN's finished model

/** A number counting up to its value */
const CountUp: React.FC<{ value: number; reduced: boolean; delay: number }> = ({ value, reduced, delay }) => {
  const [shown, setShown] = useState(reduced ? value : 0);
  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now() + delay * 1000;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / 900));
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced, delay]);
  return <>{shown}%</>;
};

export const ModelScoresCard: React.FC<{ model: SampleModel }> = ({ model }) => {
  const reduced = !!useReducedMotion();
  const scores = [
    ["Overall score", model.mAP50, LIME],
    ["Precision", model.precision, BLUE],
    ["Recall", model.recall, "#f59e0b"],
  ] as const;
  return (
    <Replayable label="GSN's model and its scores">
      {() => (
        <Frame>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: LIME }}>
              <Sparkles className="h-5 w-5 text-[#171f1b]" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#f5f5ee]">GSN&apos;s model {model.modelVersion}</p>
              <p className="text-[11px] text-[#bec9b0]">Trained on photos like the ones you&apos;ve seen</p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {scores.map(([name, value, color], i) => {
              const pct = typeof value === "number" ? Math.round(value * 100) : null;
              return (
                <div key={name}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#bec9b0]">{name}</span>
                    <span className="font-semibold tabular-nums text-[#f5f5ee]">
                      {pct === null ? "–" : <CountUp value={pct} reduced={reduced} delay={0.3 + i * 0.3} />}
                    </span>
                  </div>
                  <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct ?? 0}%` }}
                      transition={{ delay: t(reduced, 0.3 + i * 0.3), duration: t(reduced, 0.9), ease: "easeOut" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Frame>
      )}
    </Replayable>
  );
};

// ---------------------------------------------------------------------------------------------
// Overall score: does the model's box overlap the label enough?

const overlapOf = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const inter = ix * iy;
  return inter / (a.w * a.h + b.w * b.h - inter);
};

export const OverlapHit: React.FC<{ example: TourExample }> = ({ example }) => {
  const reduced = !!useReducedMotion();
  const { photo, failed } = usePhoto(example.datasetId, example.fileId, true);
  const box = biggest(example.boxes);
  return (
    <Replayable label="The model's box sliding over the label until they overlap enough to count as found">
      {() => <OverlapRun photo={photo} failed={failed} box={box} reduced={reduced} />}
    </Replayable>
  );
};

const OverlapRun: React.FC<{
  photo: { src: string; w: number; h: number } | null;
  failed: boolean;
  box?: { c: number; x: number; y: number; w: number; h: number };
  reduced: boolean;
}> = ({ photo, failed, box, reduced }) => {
  const stage = useStages(photo ? [0.6, 1.9, 3.2] : [], reduced || !photo);
  if (!photo || !box) return <PhotoFrame failed={failed} />;
  const W = photo.w;
  const H = photo.h;
  const real = { x: box.x * W, y: box.y * H, w: box.w * W, h: box.h * H };
  const view = cropAround(W, H, box, 4);
  // The model's box: far off, then partly over, then nearly right
  const shifts = [
    { dx: 1.1, dy: 0.9 },
    { dx: 1.1, dy: 0.9 },
    { dx: 0.55, dy: 0.45 },
    { dx: 0.12, dy: 0.08 },
  ];
  const s = shifts[Math.min(stage, 3)];
  const guess = { x: real.x + s.dx * real.w, y: real.y + s.dy * real.h, w: real.w, h: real.h };
  const overlap = overlapOf(real, guess);
  const hit = overlap >= 0.5;
  const line = view.w / 90;
  return (
    <div className="space-y-2">
      <PhotoFrame>
        <svg viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden>
          <image href={photo.src} width={W} height={H} />
          <rect x={real.x} y={real.y} width={real.w} height={real.h} fill="none" stroke="#fff" strokeWidth={line} strokeDasharray={`${line * 3} ${line * 2}`} />
          <motion.rect
            width={guess.w}
            height={guess.h}
            fill={hit ? "rgba(34,197,94,0.2)" : "none"}
            stroke={hit ? GREEN : "#f59e0b"}
            strokeWidth={line * 1.4}
            initial={false}
            animate={{ x: guess.x, y: guess.y, opacity: stage >= 1 ? 1 : 0 }}
            transition={{ duration: t(reduced, 0.7), ease: "easeInOut" }}
          />
        </svg>
        <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-[#f5f5ee]">
          <span className="text-white">- - -</span> GSN&apos;s label · <span style={{ color: hit ? GREEN : "#f59e0b" }}>■</span> model&apos;s box
        </span>
      </PhotoFrame>
      <div className="flex items-center gap-2 text-xs">
        <span className="w-24 shrink-0 text-[#bec9b0]">Overlap {Math.round((stage >= 1 ? overlap : 0) * 100)}%</span>
        <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full"
            animate={{ width: `${(stage >= 1 ? overlap : 0) * 100}%`, backgroundColor: hit ? GREEN : "#f59e0b" }}
            transition={{ duration: t(reduced, 0.7) }}
          />
          <span className="absolute inset-y-0 left-1/2 w-0.5 bg-white/70" aria-hidden />
        </div>
        <span className={cn("w-20 shrink-0 text-right font-semibold", hit ? "text-[#4ade80]" : "text-[#fbbf24]")}>
          {stage === 0 ? "" : hit ? "Found ✓" : "Not yet"}
        </span>
      </div>
      <p className="text-center text-[11px] text-[#bec9b0]">Half or more overlapping (the white line) counts as found: that&apos;s the 50 in mAP50</p>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// Precision and recall: five parts, with an example of what the model says about them

/** A part on the line, drawn simply; a defect is a crack across it */
const Part: React.FC<{ crack: boolean; children?: React.ReactNode; dim?: boolean }> = ({ crack, children, dim }) => (
  <div className={cn("relative aspect-square rounded-lg border border-white/15 bg-[#2a3a2f] transition-opacity", dim && "opacity-40")}>
    <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full" aria-hidden>
      <circle cx={20} cy={20} r={13} fill="#4a5d50" stroke="#6b7f71" strokeWidth={1.5} />
      <circle cx={20} cy={20} r={4} fill="#2a3a2f" />
      {crack && <path d="M11,13 L16,18 L13,21 L19,26 L17,29" fill="none" stroke="#1a1a1a" strokeWidth={2} strokeLinecap="round" />}
    </svg>
    {children}
  </div>
);

const Verdict: React.FC<{ ok: boolean; delay: number; reduced: boolean }> = ({ ok, delay, reduced }) => (
  <motion.span
    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full"
    style={{ background: ok ? GREEN : RED }}
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ delay: t(reduced, delay), type: "spring", stiffness: 300, damping: 15 }}
  >
    {ok ? <Check className="h-3 w-3 text-white" aria-hidden="true" /> : <X className="h-3 w-3 text-white" aria-hidden="true" />}
  </motion.span>
);

const Outline: React.FC<{ color: string; dashed?: boolean; delay: number; reduced: boolean }> = ({ color, dashed, delay, reduced }) => (
  <motion.span
    className={cn("absolute inset-1 rounded-md border-2", dashed && "border-dashed")}
    style={{ borderColor: color }}
    initial={{ opacity: 0, scale: 1.2 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: t(reduced, delay), duration: t(reduced, 0.3) }}
  />
);

/** Precision: of the parts the model marked as bad, how many really were */
export const PrecisionExample: React.FC = () => {
  const reduced = !!useReducedMotion();
  // The model marks five parts; the fourth is a good part (a false alarm)
  const marked = [true, true, true, false, true];
  return (
    <Replayable label="An example of precision: the model marks five parts, four are real defects and one is a false alarm">
      {() => (
        <Frame>
          <ExampleTag />
          <p className="mb-2 text-center text-[11px] text-[#bec9b0]">The model says these 5 parts have a defect</p>
          <div className="grid grid-cols-5 gap-2">
            {marked.map((real, i) => (
              <div key={i} className="space-y-1">
                <Part crack={real}>
                  <Outline color={LIME} delay={0.2 + i * 0.15} reduced={reduced} />
                  <Verdict ok={real} delay={1.2 + i * 0.25} reduced={reduced} />
                </Part>
                <motion.p
                  className={cn("text-center text-[10px] font-semibold", real ? "text-[#4ade80]" : "text-[#fca5a5]")}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: t(reduced, 1.2 + i * 0.25) }}
                >
                  {real ? "Real" : "False alarm"}
                </motion.p>
              </div>
            ))}
          </div>
          <motion.p
            className="mt-2 text-center text-sm font-semibold text-[#f5f5ee]"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: t(reduced, 2.6) }}
          >
            4 of 5 right = <span className="text-[#e9ff65]">80% precision</span>
          </motion.p>
          <motion.p
            className="text-center text-[11px] text-[#bec9b0]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: t(reduced, 2.9) }}
          >
            The false alarm is a good part thrown away
          </motion.p>
        </Frame>
      )}
    </Replayable>
  );
};

/** Recall: of the parts that really were bad, how many the model found */
export const RecallExample: React.FC = () => {
  const reduced = !!useReducedMotion();
  // Five parts with a real defect; the model misses the third
  const found = [true, true, false, true, true];
  return (
    <Replayable label="An example of recall: five parts have a real defect, the model finds four and misses one">
      {() => (
        <Frame>
          <ExampleTag />
          <p className="mb-2 text-center text-[11px] text-[#bec9b0]">These 5 parts really have a defect</p>
          <div className="grid grid-cols-5 gap-2">
            {found.map((ok, i) => (
              <div key={i} className="space-y-1">
                <Part crack>
                  <Outline color={ok ? GREEN : RED} dashed={!ok} delay={0.5 + i * 0.3} reduced={reduced} />
                  <Verdict ok={ok} delay={0.8 + i * 0.3} reduced={reduced} />
                </Part>
                <motion.p
                  className={cn("text-center text-[10px] font-semibold", ok ? "text-[#4ade80]" : "text-[#fca5a5]")}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: t(reduced, 0.8 + i * 0.3) }}
                >
                  {ok ? "Found" : "Missed"}
                </motion.p>
              </div>
            ))}
          </div>
          <motion.p
            className="mt-2 text-center text-sm font-semibold text-[#f5f5ee]"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: t(reduced, 2.6) }}
          >
            Found 4 of 5 = <span className="text-[#e9ff65]">80% recall</span>
          </motion.p>
          <motion.p
            className="text-center text-[11px] text-[#bec9b0]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: t(reduced, 2.9) }}
          >
            The missed one is a bad part that reaches the customer
          </motion.p>
        </Frame>
      )}
    </Replayable>
  );
};
