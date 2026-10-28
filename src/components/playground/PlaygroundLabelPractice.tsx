import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Hand,
  Lightbulb,
  Loader2,
  Minus,
  PenLine,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Undo2,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, apiUrl, getAuthHeaders } from "@/lib/api/config";
import { markPracticeDone } from "@/lib/api/dashboard";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";

/**
 * Learn to label (?step=practice on a GSN sample): the student draws boxes on a few of GSN's
 * labelled photos, can ask for a hint (GSN's box, dotted) and checks each photo against GSN's
 * labels. After PRACTICE_UNLOCK checked photos, auto-label runs GSN's ready-made model on more
 * photos and shows its boxes next to GSN's. Practice labels live in this component only: they
 * are never sent to the server, and training keeps using GSN's labels.
 */

const PRACTICE_PHOTOS = 20;
const PRACTICE_UNLOCK = 10;
const AUTO_LABEL_PHOTOS = 30;
/** Photos whose labels are read to pick the practice set from */
const CANDIDATES = 150;
/** Boxes overlapping at least this much (intersection over union) count as the same box */
const GOOD_IOU = 0.5;
const MIN_OVERLAP = 0.1;
/** Photo zoom: up to 8x, in steps of 1.25x (a wheel click or a +/- press) */
const MAX_ZOOM = 8;
const ZOOM_STEP = 1.25;
// Same colours as the project grid and the labelling tool, by class index
const BOX_COLORS = ["#ef4444", "#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

interface PracticeFile {
  id: string;
  storedName: string;
  originalName: string;
  folder: string | null;
}

/** A box in 0-1 units of the photo, x/y = top-left corner; c = class index */
interface Box {
  c: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

type Verdict = "good" | "name" | "big" | "small" | "off" | "missed" | "extra";

interface Feedback {
  verdict: Verdict;
  text: string;
  /** index into the student's boxes, when the feedback is about one of them */
  mine?: number;
}

interface PhotoState {
  boxes: Box[];
  hinted: boolean;
  checked: boolean;
  /** 0-1 share of boxes right at the last check */
  score: number | null;
  feedback: Feedback[];
}

interface AutoLabelResult {
  fileId: string;
  boxes: Box[];
}

const nice = (name: string) => name.replace(/_/g, " ");

/** One line on what each label in the GSN samples marks, keyed by the name in lower case with letters only */
const LABEL_HINTS: Record<string, string> = {
  missinghole: "A drill hole that should be there is missing.",
  mousebite: "Small bite-shaped notches in the edge of a copper track.",
  opencircuit: "A copper track that is broken, so the connection is cut.",
  short: "Copper joining two tracks or pads that should stay apart.",
  spur: "A thin spike of copper sticking out from a track.",
  spuriouscopper: "A stray patch of copper where the board should be bare.",
  fullblackish: "The whole terminal looks dark or blackened instead of bright metal.",
  bothblackish: "Both sides of the terminal look dark or blackened.",
  missingbar: "The metal bar that should sit across the terminal isn't there.",
  missingonescrew: "One of the terminal's screws is missing.",
  packetissue: "A blister packet that is damaged or badly formed.",
  crack: "A crack or split in the pack.",
  defect: "Any fault on the pack, such as an empty, broken or crushed pocket.",
};
const hintOf = (name: string) => LABEL_HINTS[name.toLowerCase().replace(/[^a-z]/g, "")];
const colorOf = (c: number) => BOX_COLORS[c % BOX_COLORS.length];
const emptyPhoto = (): PhotoState => ({ boxes: [], hinted: false, checked: false, score: null, feedback: [] });

/**
 * Practice progress kept in this browser only (never sent to the server), so a reload carries on
 * where the student was. Kept for SAVED_DAYS; dropped if the practice photos have changed.
 */
interface SavedPractice {
  savedAt: number;
  photoIds: string[];
  states: Record<string, PhotoState>;
  index: number;
  phase: "practice" | "autolabel" | "done";
  autoRunId: string | null;
}
const SAVED_DAYS = 14;
const savedKey = (userId: string, datasetId: string) => `vm.labelPractice.v1.${userId}.${datasetId}`;

function loadSaved(key: string, photoIds: string[]): SavedPractice | null {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "null") as SavedPractice | null;
    if (!saved || Date.now() - saved.savedAt > SAVED_DAYS * 24 * 60 * 60 * 1000) return null;
    if (saved.photoIds.join(",") !== photoIds.join(",")) return null;
    return saved;
  } catch {
    return null;
  }
}

function iou(a: Box, b: Box) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.w * a.h + b.w * b.h - inter;
  return union > 0 ? inter / union : 0;
}

/** Pairs each of GSN's boxes with the student's box that overlaps it most (each box used once) */
function matchBoxes(truth: Box[], mine: Box[]) {
  const pairs: { t: number; m: number; overlap: number }[] = [];
  truth.forEach((t, ti) => mine.forEach((m, mi) => pairs.push({ t: ti, m: mi, overlap: iou(t, m) })));
  pairs.sort((a, b) => b.overlap - a.overlap);
  const usedT = new Set<number>();
  const usedM = new Set<number>();
  const matched: typeof pairs = [];
  for (const p of pairs) {
    if (p.overlap < MIN_OVERLAP || usedT.has(p.t) || usedM.has(p.m)) continue;
    usedT.add(p.t);
    usedM.add(p.m);
    matched.push(p);
  }
  return {
    matched,
    missed: truth.map((_, i) => i).filter((i) => !usedT.has(i)),
    extra: mine.map((_, i) => i).filter((i) => !usedM.has(i)),
  };
}

/** What the student got right and wrong on one photo, and the share of boxes right */
function checkPhoto(truth: Box[], mine: Box[], classNames: string[]): { feedback: Feedback[]; score: number } {
  const name = (c: number) => nice(classNames[c] ?? `class ${c}`);
  const { matched, missed, extra } = matchBoxes(truth, mine);
  const feedback: Feedback[] = [];
  let good = 0;
  for (const { t, m, overlap } of matched) {
    const tb = truth[t];
    const mb = mine[m];
    if (tb.c !== mb.c) {
      feedback.push({ verdict: "name", mine: m, text: `Right place, wrong name: this is a ${name(tb.c)}, not a ${name(mb.c)}.` });
    } else if (overlap >= GOOD_IOU) {
      good += 1;
      feedback.push({ verdict: "good", mine: m, text: `Great match: ${name(tb.c)}.` });
    } else {
      const ratio = (mb.w * mb.h) / Math.max(1e-6, tb.w * tb.h);
      if (ratio > 1.5) feedback.push({ verdict: "big", mine: m, text: `Box too big: draw it tighter around the ${name(tb.c)}.` });
      else if (ratio < 0.67) feedback.push({ verdict: "small", mine: m, text: `Box too small: cover the whole ${name(tb.c)}.` });
      else feedback.push({ verdict: "off", mine: m, text: `Box is off to one side: move it over the ${name(tb.c)}.` });
    }
  }
  for (const t of missed) feedback.push({ verdict: "missed", text: `Missed one: there's a ${name(truth[t].c)} you haven't boxed.` });
  for (const m of extra) feedback.push({ verdict: "extra", mine: m, text: "Extra box: GSN didn't label anything here." });
  const total = truth.length + extra.length;
  return { feedback, score: total === 0 ? 1 : good / total };
}

const VERDICT_STYLE: Record<Verdict, string> = {
  good: "border-success/40 bg-success/10",
  name: "border-amber-500/40 bg-amber-500/10",
  big: "border-amber-500/40 bg-amber-500/10",
  small: "border-amber-500/40 bg-amber-500/10",
  off: "border-amber-500/40 bg-amber-500/10",
  missed: "border-destructive/40 bg-destructive/10",
  extra: "border-destructive/40 bg-destructive/10",
};

/** Stable shuffle (same photos for the same dataset each time) */
function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const next = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Practice photos covering every defect: one per class in turn, rarest classes first */
function pickPractice(files: PracticeFile[], labels: Record<string, Box[]>, count: number) {
  const usable = files.filter((f) => (labels[f.id]?.length ?? 0) > 0 && labels[f.id].length <= 6);
  const byClass = new Map<number, PracticeFile[]>();
  for (const f of usable) {
    for (const c of new Set(labels[f.id].map((b) => b.c))) {
      if (!byClass.has(c)) byClass.set(c, []);
      byClass.get(c)!.push(f);
    }
  }
  const queues = [...byClass.values()].sort((a, b) => a.length - b.length);
  const picked: PracticeFile[] = [];
  const taken = new Set<string>();
  while (picked.length < count && queues.some((q) => q.length)) {
    for (const q of queues) {
      while (q.length && taken.has(q[0].id)) q.shift();
      const f = q.shift();
      if (f && picked.length < count) {
        picked.push(f);
        taken.add(f.id);
      }
    }
  }
  return picked;
}

/** Loads a dataset photo (full size or thumbnail) as an object URL, with its pixel size */
function usePhoto(datasetId: string, fileId: string | null, thumbnail = false) {
  const [photo, setPhoto] = useState<{ src: string; w: number; h: number } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setPhoto(null);
    setFailed(false);
    if (!fileId) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          apiUrl(`/dataset/${encodeURIComponent(datasetId)}/file/${encodeURIComponent(fileId)}${thumbnail ? "/thumbnail" : ""}`),
          { headers: await getAuthHeaders() }
        );
        if (!res.ok) throw new Error(String(res.status));
        objectUrl = URL.createObjectURL(await res.blob());
        const img = new Image();
        img.onload = () => !cancelled && setPhoto({ src: objectUrl!, w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => !cancelled && setFailed(true);
        img.src = objectUrl;
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [datasetId, fileId, thumbnail]);
  return { photo, failed };
}

/** Boxes drawn over a photo in its own pixel space, so they stay aligned at any size */
const BoxLayer: React.FC<{
  boxes: Box[];
  w: number;
  h: number;
  classNames: string[];
  dashed?: boolean;
  colors?: (string | null)[];
  selected?: number | null;
  onSelect?: (i: number) => void;
  /** Write each box's label name above it */
  named?: boolean;
  /** 1 / zoom, so lines and names keep the same size on screen when zoomed in */
  scale?: number;
}> = ({ boxes, w, h, classNames, dashed, colors, selected, onSelect, named, scale = 1 }) => {
  const stroke = (Math.max(w, h) / 260) * scale;
  const fontSize = (Math.max(w, h) / 55) * scale;
  return (
    <>
      {named &&
        boxes.map((b, i) => (
          <text
            key={`name-${i}`}
            x={b.x * w + stroke}
            y={Math.max(fontSize, b.y * h - stroke * 1.5)}
            fontSize={fontSize}
            fontWeight={600}
            fill={colors?.[i] ?? colorOf(b.c)}
            stroke="#171f1b"
            strokeWidth={fontSize / 5}
            paintOrder="stroke"
            style={{ pointerEvents: "none" }}
          >
            {nice(classNames[b.c] ?? `class ${b.c}`)}
          </text>
        ))}
      {boxes.map((b, i) => (
        <rect
          key={i}
          x={b.x * w}
          y={b.y * h}
          width={b.w * w}
          height={b.h * h}
          fill={selected === i ? "rgba(255,255,255,0.15)" : "transparent"}
          stroke={colors?.[i] ?? colorOf(b.c)}
          strokeWidth={selected === i ? stroke * 1.8 : stroke}
          strokeDasharray={dashed ? `${stroke * 4} ${stroke * 3}` : undefined}
          // Only the edge picks a box, so a defect inside a bigger box (e.g. "product") can still be drawn
          style={{ cursor: onSelect ? "pointer" : undefined, pointerEvents: onSelect ? "stroke" : "none" }}
          onPointerDown={(e) => {
            if (!onSelect) return;
            e.stopPropagation();
            onSelect(i);
          }}
        >
          <title>{nice(classNames[b.c] ?? `class ${b.c}`)}</title>
        </rect>
      ))}
    </>
  );
};

interface View {
  zoom: number;
  x: number;
  y: number;
}

/** A view kept inside the photo, with the zoom between 1 and MAX_ZOOM */
function clampView(zoom: number, x: number, y: number): View {
  const z = Math.min(MAX_ZOOM, Math.max(1, zoom));
  return { zoom: z, x: Math.min(1 - 1 / z, Math.max(0, x)), y: Math.min(1 - 1 / z, Math.max(0, y)) };
}

/** `v` zoomed to `zoom`, keeping the photo point at (fx, fy) of the frame (0-1) in place */
function zoomView(v: View, zoom: number, fx: number, fy: number): View {
  const z = Math.min(MAX_ZOOM, Math.max(1, zoom));
  return clampView(z, v.x + fx / v.zoom - fx / z, v.y + fy / v.zoom - fy / z);
}

/** The photo being labelled: drag on it to draw a box in the chosen defect's colour; zoom and move to find small ones */
const DrawingCanvas: React.FC<{
  datasetId: string;
  fileId: string;
  boxes: Box[];
  truth: Box[];
  showTruth: "none" | "hint" | "answer";
  verdictColors: (string | null)[] | null;
  classNames: string[];
  /** null until the student picks a label; drawing waits for it */
  drawClass: number | null;
  selected: number | null;
  onSelect: (i: number | null) => void;
  onDraw: (box: Box) => void;
  /** Tried to draw before picking a label */
  onNeedLabel: () => void;
}> = ({ datasetId, fileId, boxes, truth, showTruth, verdictColors, classNames, drawClass, selected, onSelect, onDraw, onNeedLabel }) => {
  const { photo, failed } = usePhoto(datasetId, fileId);
  const surface = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  // Zoom: the part of the photo in view, in 0-1 units (x/y = top-left corner, size = 1 / zoom)
  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 });
  const [mode, setMode] = useState<"draw" | "move">("draw");
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [pan, setPan] = useState<{ cx: number; cy: number; x: number; y: number } | null>(null);
  const hovering = useRef(false);
  const moving = mode === "move" || spaceHeld;

  // Each photo starts zoomed out to fit
  useEffect(() => setView({ zoom: 1, x: 0, y: 0 }), [fileId]);

  /** Zoom by `factor`, keeping the photo point at (fx, fy) of the frame (0-1) in place */
  const zoomBy = (factor: number, fx = 0.5, fy = 0.5) => setView((v) => zoomView(v, v.zoom * factor, fx, fy));

  // The mouse wheel zooms on the spot under the cursor (a non-passive listener, so the page doesn't scroll)
  useEffect(() => {
    const el = surface.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const fx = (e.clientX - r.left) / r.width;
      const fy = (e.clientY - r.top) / r.height;
      setView((v) => zoomView(v, v.zoom * (e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP), fx, fy));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [photo]);

  // Hold Space over the photo to move it, as in most labelling tools
  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement | null)?.tagName ?? "");
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || !hovering.current || isTyping(e)) return;
      e.preventDefault();
      setSpaceHeld(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (hovering.current && !isTyping(e)) e.preventDefault();
      setSpaceHeld(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  /** Where the pointer is on the photo, in 0-1 units of the whole photo */
  const point = (e: React.PointerEvent) => {
    const r = surface.current!.getBoundingClientRect();
    const fx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const fy = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    return { x: view.x + fx / view.zoom, y: view.y + fy / view.zoom };
  };

  if (failed) {
    return <div className="flex aspect-video items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">Couldn&apos;t load this photo.</div>;
  }
  if (!photo) return <div className="aspect-video w-full animate-pulse rounded-xl bg-muted" />;

  const draftBox: Box | null =
    draft && drawClass !== null
      ? {
          c: drawClass,
          x: Math.min(draft.x0, draft.x1),
          y: Math.min(draft.y0, draft.y1),
          w: Math.abs(draft.x1 - draft.x0),
          h: Math.abs(draft.y1 - draft.y0),
        }
      : null;

  const scale = 1 / view.zoom;
  const cursor = moving ? (pan ? "grabbing" : "grab") : drawClass === null ? "not-allowed" : "crosshair";

  return (
    <div className="rounded-xl bg-[#171f1b] p-2">
      <div className="flex justify-center">
        <div
          ref={surface}
          className="relative touch-none select-none overflow-hidden"
          style={{ width: `min(100%, calc(62vh * ${photo.w / photo.h}))`, aspectRatio: `${photo.w} / ${photo.h}`, cursor }}
          onPointerEnter={() => (hovering.current = true)}
          onPointerLeave={() => (hovering.current = false)}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            if (moving) {
              setPan({ cx: e.clientX, cy: e.clientY, x: view.x, y: view.y });
              return;
            }
            if (drawClass === null) {
              onNeedLabel();
              return;
            }
            const p = point(e);
            onSelect(null);
            setDraft({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
          }}
          onPointerMove={(e) => {
            if (pan) {
              const r = surface.current!.getBoundingClientRect();
              setView((v) =>
                clampView(v.zoom, pan.x - (e.clientX - pan.cx) / r.width / v.zoom, pan.y - (e.clientY - pan.cy) / r.height / v.zoom)
              );
              return;
            }
            if (!draft) return;
            const p = point(e);
            setDraft((d) => (d ? { ...d, x1: p.x, y1: p.y } : d));
          }}
          onPointerUp={() => {
            setPan(null);
            // Smallest box: about 1% of the frame, so tiny defects can still be boxed when zoomed in
            if (draftBox && draftBox.w > 0.01 * scale && draftBox.h > 0.01 * scale) onDraw(draftBox);
            setDraft(null);
          }}
          onPointerCancel={() => {
            setPan(null);
            setDraft(null);
          }}
        >
          <svg
            viewBox={`${view.x * photo.w} ${view.y * photo.h} ${photo.w * scale} ${photo.h * scale}`}
            className="absolute inset-0 h-full w-full"
            role="img"
            aria-label="Photo to label"
          >
            <image href={photo.src} width={photo.w} height={photo.h} />
            {showTruth !== "none" && (
              <BoxLayer
                boxes={truth}
                w={photo.w}
                h={photo.h}
                classNames={classNames}
                dashed
                named
                scale={scale}
                colors={showTruth === "hint" ? truth.map(() => "#e9ff65") : undefined}
              />
            )}
            <BoxLayer
              boxes={boxes}
              w={photo.w}
              h={photo.h}
              classNames={classNames}
              scale={scale}
              colors={verdictColors ?? undefined}
              selected={selected}
              onSelect={moving ? undefined : (i) => onSelect(i)}
            />
            {draftBox && <BoxLayer boxes={[draftBox]} w={photo.w} h={photo.h} classNames={classNames} scale={scale} />}
          </svg>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-white/70">
        <div className="flex items-center gap-1" role="radiogroup" aria-label="What dragging does">
          {(
            [
              ["draw", "Draw", PenLine],
              ["move", "Move", Hand],
            ] as const
          ).map(([m, label, Icon]) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 transition-colors",
                mode === m ? "bg-white/15 text-white" : "hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
        <p className="hidden text-white/50 md:block">Scroll on the photo to zoom · hold Space and drag to move</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Zoom out"
            disabled={view.zoom <= 1}
            onClick={() => zoomBy(1 / ZOOM_STEP)}
            className="rounded-md p-1 hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-11 text-center tabular-nums text-white" aria-live="polite">
            {Math.round(view.zoom * 100)}%
          </span>
          <button
            type="button"
            aria-label="Zoom in"
            disabled={view.zoom >= MAX_ZOOM}
            onClick={() => zoomBy(ZOOM_STEP)}
            className="rounded-md p-1 hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={view.zoom === 1}
            onClick={() => setView({ zoom: 1, x: 0, y: 0 })}
            className="rounded-md px-2 py-1 hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            Fit
          </button>
        </div>
      </div>
    </div>
  );
};

/** A photo strip tile: thumbnail with a dot showing how it went */
const StripTile: React.FC<{ datasetId: string; fileId: string; n: number; active: boolean; state: PhotoState; onClick: () => void }> = ({
  datasetId,
  fileId,
  n,
  active,
  state,
  onClick,
}) => {
  const { photo } = usePhoto(datasetId, fileId, true);
  const dot = !state.checked
    ? state.boxes.length
      ? "bg-sky-400"
      : "bg-muted-foreground/40"
    : (state.score ?? 0) >= 0.999
      ? "bg-success"
      : "bg-amber-500";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 bg-muted transition-colors",
        active ? "border-ring" : "border-transparent hover:border-ring/50"
      )}
      aria-label={`Photo ${n}${state.checked ? `, checked, ${Math.round((state.score ?? 0) * 100)}% right` : ""}`}
      aria-current={active ? "true" : undefined}
    >
      {photo && <img src={photo.src} alt="" className="h-full w-full object-cover" />}
      <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] text-white">{n}</span>
      <span className={cn("absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full ring-2 ring-white", dot)} />
    </button>
  );
};

/** One auto-labelled photo: the model's boxes, with GSN's dotted on top when asked */
const AutoLabelTile: React.FC<{
  datasetId: string;
  fileId: string;
  name: string;
  model: Box[];
  truth: Box[];
  showTruth: boolean;
  classNames: string[];
}> = ({ datasetId, fileId, name, model, truth, showTruth, classNames }) => {
  const { photo } = usePhoto(datasetId, fileId);
  const { matched, missed, extra } = matchBoxes(truth, model);
  const agree = matched.filter((p) => p.overlap >= GOOD_IOU && truth[p.t].c === model[p.m].c).length;
  return (
    <article className="overflow-hidden rounded-xl border bg-background/40">
      <div className="relative aspect-video bg-[#171f1b]">
        {photo ? (
          <svg viewBox={`0 0 ${photo.w} ${photo.h}`} preserveAspectRatio="xMidYMid meet" className="h-full w-full" role="img" aria-label={name}>
            <image href={photo.src} width={photo.w} height={photo.h} />
            <BoxLayer boxes={model} w={photo.w} h={photo.h} classNames={classNames} />
            {showTruth && <BoxLayer boxes={truth} w={photo.w} h={photo.h} classNames={classNames} dashed colors={truth.map(() => "#e9ff65")} />}
          </svg>
        ) : (
          <div className="h-full w-full animate-pulse bg-muted" />
        )}
      </div>
      <div className="space-y-0.5 p-3 text-xs">
        <p className="text-foreground">
          <strong className="font-medium">Auto-label:</strong>{" "}
          {model.length ? [...new Set(model.map((b) => nice(classNames[b.c] ?? "")))].join(", ") : "nothing found"}
        </p>
        <p className={cn(agree === truth.length && extra.length === 0 ? "text-success" : "text-amber-600 dark:text-amber-400")}>
          {agree} of {truth.length} GSN label{truth.length === 1 ? "" : "s"} matched
          {missed.length > 0 && ` · ${missed.length} missed`}
          {extra.length > 0 && ` · ${extra.length} extra`}
        </p>
      </div>
    </article>
  );
};

export const PlaygroundLabelPractice: React.FC<{
  datasetId: string;
  files: PracticeFile[];
  /** Practice finished: go on to training on GSN's labels */
  onContinue: () => void;
}> = ({ datasetId, files, onContinue }) => {
  const { user } = useProfile();
  const storageKey = user?.id ? savedKey(user.id, datasetId) : null;
  const [phase, setPhase] = useState<"loading" | "practice" | "autolabel" | "done">("loading");
  const [classNames, setClassNames] = useState<string[]>([]);
  /** Labels the student can draw (class indexes; a class hidden in the Playground is left out) */
  const [labelOptions, setLabelOptions] = useState<number[]>([]);
  const [truth, setTruth] = useState<Record<string, Box[]>>({});
  const [practice, setPractice] = useState<PracticeFile[]>([]);
  const [pool, setPool] = useState<PracticeFile[]>([]);
  const [states, setStates] = useState<Record<string, PhotoState>>({});
  const [index, setIndex] = useState(0);
  const [drawClass, setDrawClass] = useState<number | null>(null);
  /** Bumped when the student tries to draw without a label, to flash the prompt */
  const [nudge, setNudge] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [autoRun, setAutoRun] = useState<{ id: string; processed: number; total: number } | null>(null);
  const [autoResults, setAutoResults] = useState<AutoLabelResult[] | null>(null);
  const [autoError, setAutoError] = useState<string | null>(null);
  const [showGsnOnAuto, setShowGsnOnAuto] = useState(true);

  // ---- Pick the practice photos and the auto-label photos, with GSN's labels for both ----
  useEffect(() => {
    if (!files.length) return;
    let cancelled = false;
    (async () => {
      setPhase("loading");
      setLoadError(null);
      try {
        const training = files.filter((f) => f.folder !== "test");
        const originals = training.filter((f) => !/_aug_\d+/i.test(f.storedName));
        const source = originals.length >= PRACTICE_PHOTOS + AUTO_LABEL_PHOTOS ? originals : training;
        const candidates = seededShuffle(source, datasetId).slice(0, CANDIDATES);
        const json = await apiRequest<{ classes: { index: number; name: string }[]; labels: Record<string, Box[]> }>(
          `/dataset/${encodeURIComponent(datasetId)}/file-labels?ids=${candidates.map((f) => encodeURIComponent(f.id)).join(",")}`
        );
        if (cancelled) return;
        const names: string[] = [];
        for (const c of json.classes) names[c.index] = c.name;
        const picked = pickPractice(candidates, json.labels, PRACTICE_PHOTOS);
        const pickedIds = new Set(picked.map((f) => f.id));
        const rest = candidates.filter((f) => !pickedIds.has(f.id) && (json.labels[f.id]?.length ?? 0) > 0).slice(0, AUTO_LABEL_PHOTOS);
        if (!picked.length) throw new Error("This sample has no labelled photos to practise on.");
        setClassNames(Array.from(names, (n, i) => n ?? `class ${i}`));
        setLabelOptions(json.classes.map((c) => c.index).sort((a, b) => a - b));
        setDrawClass(null);
        setTruth(json.labels);
        setPractice(picked);
        setPool(rest);
        // Carry on from this browser's saved progress, if any
        const saved = storageKey ? loadSaved(storageKey, picked.map((f) => f.id)) : null;
        setStates({ ...Object.fromEntries(picked.map((f) => [f.id, emptyPhoto()])), ...saved?.states });
        setIndex(Math.min(saved?.index ?? 0, picked.length - 1));
        setAutoRun(saved?.autoRunId ? { id: saved.autoRunId, processed: 0, total: rest.length } : null);
        setAutoResults(null);
        setAutoError(null);
        // Auto-label only comes back with its run (its results stay on the server for an hour)
        setPhase(saved?.phase === "autolabel" && !saved.autoRunId ? "practice" : saved?.phase ?? "practice");
      } catch (err) {
        if (!cancelled) setLoadError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [datasetId, files, storageKey]);

  // Save progress after every change (the selected label, hint and zoom are not kept)
  useEffect(() => {
    if (!storageKey || phase === "loading" || !practice.length) return;
    const saved: SavedPractice = {
      savedAt: Date.now(),
      photoIds: practice.map((f) => f.id),
      states,
      index,
      phase,
      autoRunId: autoRun?.id ?? null,
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(saved));
    } catch {
      // Storage full or blocked: practice still works, it just won't survive a reload
    }
  }, [storageKey, phase, practice, states, index, autoRun?.id]);

  const current = practice[index] ?? null;
  const state = current ? states[current.id] ?? emptyPhoto() : emptyPhoto();
  const currentTruth = current ? truth[current.id] ?? [] : [];

  const update = useCallback(
    (change: (s: PhotoState) => PhotoState) => {
      if (!current) return;
      setStates((prev) => ({ ...prev, [current.id]: change(prev[current.id] ?? emptyPhoto()) }));
    },
    [current]
  );

  // Changing the boxes after a check asks for a new check
  const setBoxes = (boxes: Box[]) => update((s) => ({ ...s, boxes, checked: false, feedback: [] }));

  const goTo = (i: number) => {
    setIndex(Math.max(0, Math.min(practice.length - 1, i)));
    setSelected(null);
    setShowHint(false);
    // Each photo starts with no label picked, so the student chooses what they're marking
    setDrawClass(null);
  };

  // Delete / Backspace removes the selected box
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== "practice" || selected === null) return;
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      e.preventDefault();
      setBoxes(state.boxes.filter((_, i) => i !== selected));
      setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const check = () => {
    const result = checkPhoto(currentTruth, state.boxes, classNames);
    update((s) => ({ ...s, checked: true, score: result.score, feedback: result.feedback }));
    setShowHint(false);
  };

  const checkedStates = practice.map((f) => states[f.id]).filter((s) => s?.checked);
  const checkedCount = checkedStates.length;
  const averageScore = checkedCount ? checkedStates.reduce((sum, s) => sum + (s.score ?? 0), 0) / checkedCount : null;
  const hintsUsed = practice.filter((f) => states[f.id]?.hinted).length;
  const unlocked = checkedCount >= Math.min(PRACTICE_UNLOCK, practice.length);

  const verdictColors = useMemo(() => {
    if (!state.checked) return null;
    const colors: (string | null)[] = state.boxes.map(() => null);
    for (const f of state.feedback) {
      if (f.mine === undefined) continue;
      colors[f.mine] = f.verdict === "good" ? "#22c55e" : f.verdict === "extra" ? "#ef4444" : "#f59e0b";
    }
    return colors;
  }, [state]);

  // ---- Auto-label: start, then poll until done ----
  const startAutoLabel = async () => {
    setPhase("autolabel");
    setAutoResults(null);
    setAutoError(null);
    try {
      const res = await apiRequest<{ inferenceId: string; totalImages: number }>("/playground/practice/auto-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId, fileIds: pool.map((f) => f.id) }),
        maxRetries: 1,
      });
      setAutoRun({ id: res.inferenceId, processed: 0, total: res.totalImages });
    } catch (err) {
      setAutoError((err as Error).message);
    }
  };

  useEffect(() => {
    if (!autoRun || autoResults) return;
    let cancelled = false;
    let timer: number | undefined;
    const poll = async () => {
      try {
        const res = await apiRequest<{
          status: string;
          progress: { processed: number; total: number };
          message?: string;
          images?: { fileId: string; boxes: { name: string; x: number; y: number; w: number; h: number }[] }[];
        }>(`/playground/practice/auto-label/${encodeURIComponent(autoRun.id)}`);
        if (cancelled) return;
        if (res.status === "completed" && res.images) {
          const key = (n: string) => n.trim().toLowerCase().replace(/[\s_-]+/g, " ");
          const indexOf = new Map(classNames.map((n, i) => [key(n), i]));
          setAutoResults(
            res.images.map((img) => ({
              fileId: img.fileId,
              boxes: img.boxes
                .map((b) => ({ c: indexOf.get(key(b.name)) ?? -1, x: b.x, y: b.y, w: b.w, h: b.h }))
                .filter((b) => b.c >= 0),
            }))
          );
          return;
        }
        if (res.status === "failed" || res.status === "cancelled") {
          setAutoError(res.message || "Auto-label did not finish. Try again.");
          return;
        }
        setAutoRun((r) => (r ? { ...r, processed: res.progress.processed, total: res.progress.total || r.total } : r));
        timer = window.setTimeout(poll, 2000);
      } catch (err) {
        if (!cancelled) setAutoError((err as Error).message);
      }
    };
    timer = window.setTimeout(poll, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [autoRun, autoResults, classNames]);

  const autoSummary = useMemo(() => {
    if (!autoResults) return null;
    let agree = 0;
    let total = 0;
    for (const r of autoResults) {
      const t = truth[r.fileId] ?? [];
      total += t.length;
      agree += matchBoxes(t, r.boxes).matched.filter((p) => p.overlap >= GOOD_IOU && t[p.t].c === r.boxes[p.m].c).length;
    }
    return { agree, total };
  }, [autoResults, truth]);

  // Finishing practice unlocks the next challenge on the overview
  useEffect(() => {
    if (phase === "done") markPracticeDone().catch(() => undefined);
  }, [phase]);

  const restart = () => {
    setStates(Object.fromEntries(practice.map((f) => [f.id, emptyPhoto()])));
    setAutoRun(null);
    setAutoResults(null);
    setAutoError(null);
    goTo(0);
    setPhase("practice");
  };

  if (loadError) {
    return (
      <p className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
        Couldn&apos;t load the practice photos: {loadError}
      </p>
    );
  }
  if (phase === "loading" || !current) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border bg-card p-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Picking photos to practise on...
      </div>
    );
  }

  // ---- Finished ----
  if (phase === "done") {
    return (
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border bg-card p-6 md:p-8">
        <CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground">Practice complete</h2>
        <dl className="mt-5 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            ["Photos checked", `${checkedCount} of ${practice.length}`],
            ["Your average match", averageScore === null ? "–" : `${Math.round(averageScore * 100)}%`],
            ["Hints used", String(hintsUsed)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border bg-background/40 p-4">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="mt-1 text-xl font-semibold text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 max-w-2xl border-l-2 border-ring bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
          This was practice, so your labels aren&apos;t saved. When you train a model on this sample, it learns from GSN&apos;s
          checked labels, so it gets clean, consistent examples.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button className="gap-1.5" onClick={onContinue}>
            Continue: train &amp; test <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={restart}>
            <RotateCcw className="h-4 w-4" /> Practise again
          </Button>
        </div>
      </motion.section>
    );
  }

  // ---- Auto-label ----
  if (phase === "autolabel") {
    return (
      <section className="rounded-2xl border bg-card p-5 md:p-6" aria-labelledby="autolabel-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Learn to label · Auto-label</p>
            <h2 id="autolabel-heading" className="mt-1 text-xl font-semibold text-foreground">
              Let the model label the rest
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              In a real project you label a few photos yourself, train a model on them and let it suggest boxes for the rest.
              Then you check its suggestions instead of drawing every box. Here GSN&apos;s ready-made model labels {pool.length}{" "}
              more photos. Its boxes are solid; GSN&apos;s labels are dotted.
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setPhase("practice")}>
            <ArrowLeft className="h-4 w-4" /> Back to practice
          </Button>
        </div>

        {autoError ? (
          <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <p className="text-foreground">{autoError}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => void startAutoLabel()}>
              Try again
            </Button>
          </div>
        ) : !autoResults ? (
          <div className="mt-8 flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p>
              Auto-labelling{autoRun ? ` ${autoRun.processed} of ${autoRun.total} photos` : ""}... this takes about a minute.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-secondary/40 px-4 py-3">
              <p className="text-sm text-foreground">
                <Sparkles className="mr-1.5 inline h-4 w-4 text-ring" aria-hidden="true" />
                Auto-label matched <strong>{autoSummary?.agree}</strong> of <strong>{autoSummary?.total}</strong> GSN labels
                {autoSummary && autoSummary.total > 0 && ` (${Math.round((autoSummary.agree / autoSummary.total) * 100)}%)`}. Look at
                the misses: those are the photos you&apos;d fix by hand.
              </p>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={showGsnOnAuto} onChange={(e) => setShowGsnOnAuto(e.target.checked)} />
                Show GSN&apos;s labels
              </label>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {autoResults.map((r) => (
                <AutoLabelTile
                  key={r.fileId}
                  datasetId={datasetId}
                  fileId={r.fileId}
                  name={pool.find((f) => f.id === r.fileId)?.originalName ?? r.fileId}
                  model={r.boxes}
                  truth={truth[r.fileId] ?? []}
                  showTruth={showGsnOnAuto}
                  classNames={classNames}
                />
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <Button className="gap-1.5" onClick={() => setPhase("done")}>
                Finish practice <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </section>
    );
  }

  // ---- Practice ----
  return (
    <section className="rounded-2xl border bg-card p-5 md:p-6" aria-labelledby="practice-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Learn to label · Practice</p>
          <h2 id="practice-heading" className="mt-1 text-xl font-semibold text-foreground">
            Photo {index + 1} of {practice.length}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            First pick the defect you&apos;re marking, then drag on the photo to draw a box around each one. Keep every box tight around what
            you&apos;re marking. Your labels are for practice only and aren&apos;t saved.
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="text-muted-foreground">
            Checked <strong className="text-foreground">{checkedCount}</strong> of {practice.length}
          </p>
          {averageScore !== null && (
            <p className="text-muted-foreground">
              Average match <strong className="text-foreground">{Math.round(averageScore * 100)}%</strong>
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-3">
          <p
            key={nudge}
            aria-live="polite"
            className={cn(
              "rounded-lg border px-3 py-2 text-sm text-foreground",
              drawClass === null ? "border-ring bg-secondary" : "border-success/40 bg-success/10",
              nudge > 0 && drawClass === null && "animate-[pulse_0.4s_ease-in-out_3]"
            )}
          >
            {drawClass === null ? (
              <>
                <strong>Step 1:</strong> pick which defect you&apos;re marking from the labels on the right.
              </>
            ) : (
              <>
                <strong>Step 2:</strong> drag on the photo to draw a box around each{" "}
                <strong>{nice(classNames[drawClass] ?? "")}</strong>. Pick another label for a different defect.
              </>
            )}
          </p>
          <DrawingCanvas
            datasetId={datasetId}
            fileId={current.id}
            boxes={state.boxes}
            truth={currentTruth}
            showTruth={state.checked ? "answer" : showHint ? "hint" : "none"}
            verdictColors={verdictColors}
            classNames={classNames}
            drawClass={drawClass}
            selected={selected}
            onSelect={setSelected}
            onDraw={(box) => {
              setBoxes([...state.boxes, box]);
              setSelected(null);
            }}
            onNeedLabel={() => setNudge((n) => n + 1)}
          />
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Label to draw</p>
            {selected !== null && (
              <p className="mt-1 text-xs text-muted-foreground">Click a label to change the selected box to it.</p>
            )}
            <div
              key={nudge}
              className={cn(
                "mt-2 flex flex-col gap-1.5 rounded-lg",
                nudge > 0 && drawClass === null && "animate-[pulse_0.4s_ease-in-out_3] ring-2 ring-ring ring-offset-2 ring-offset-card"
              )}
              role="radiogroup"
              aria-label="Label to draw"
            >
              {labelOptions.map((i) => {
                const hint = hintOf(classNames[i] ?? "");
                return (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={drawClass === i}
                    onClick={() => {
                      setDrawClass(i);
                      // A selected box takes the new label (fixes a wrong pick without redrawing)
                      if (selected !== null && state.boxes[selected] && state.boxes[selected].c !== i) {
                        setBoxes(state.boxes.map((b, bi) => (bi === selected ? { ...b, c: i } : b)));
                      }
                    }}
                    className={cn(
                      "flex items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      drawClass === i ? "border-ring bg-secondary text-foreground" : "text-muted-foreground hover:border-ring/60"
                    )}
                  >
                    <span className="mt-1 h-3 w-3 shrink-0 rounded-sm" style={{ background: colorOf(i) }} />
                    <span className="min-w-0">
                      <span className={cn("block", drawClass === i && "font-medium")}>{nice(classNames[i] ?? "")}</span>
                      {hint && <span className="block text-xs font-normal text-muted-foreground">{hint}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your boxes ({state.boxes.length})</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                disabled={!state.boxes.length}
                onClick={() => {
                  setBoxes(state.boxes.slice(0, -1));
                  setSelected(null);
                }}
              >
                <Undo2 className="h-3.5 w-3.5" /> Undo
              </Button>
            </div>
            {state.boxes.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">No boxes yet. Drag on the photo to draw one.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {state.boxes.map((b, i) => (
                  <li
                    key={i}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-xs",
                      selected === i && "border-ring bg-secondary"
                    )}
                  >
                    <button type="button" className="flex min-w-0 items-center gap-2 text-left" onClick={() => setSelected(i)}>
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: colorOf(b.c) }} />
                      <span className="truncate">{nice(classNames[b.c] ?? "")}</span>
                    </button>
                    <button
                      type="button"
                      className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        setBoxes(state.boxes.filter((_, j) => j !== i));
                        setSelected(null);
                      }}
                      aria-label={`Remove box ${i + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="gap-1.5"
              disabled={state.checked}
              onClick={() => {
                setShowHint((v) => !v);
                update((s) => ({ ...s, hinted: true }));
              }}
            >
              <Lightbulb className="h-4 w-4" /> {showHint ? "Hide hint" : "Show hint"}
            </Button>
            <Button className="gap-1.5" onClick={check} disabled={state.checked || state.boxes.length === 0}>
              <Check className="h-4 w-4" /> {state.checked ? "Checked" : "Check my labels"}
            </Button>
            {!state.checked && state.boxes.length === 0 && (
              <p className="text-center text-xs text-muted-foreground">Draw at least one box to check this photo.</p>
            )}
          </div>

          {state.checked && (
            <div className="space-y-1.5" aria-live="polite">
              <p className="text-sm font-medium text-foreground">
                {Math.round((state.score ?? 0) * 100)}% right
                <span className="ml-1 font-normal text-muted-foreground">· GSN&apos;s labels are dotted</span>
              </p>
              {state.feedback.length === 0 ? (
                <p className="rounded-md border border-success/40 bg-success/10 px-2.5 py-1.5 text-xs">
                  Nothing to label here, and you drew nothing. Correct!
                </p>
              ) : (
                state.feedback.map((f, i) => (
                  <p key={i} className={cn("rounded-md border px-2.5 py-1.5 text-xs text-foreground", VERDICT_STYLE[f.verdict])}>
                    {f.text}
                  </p>
                ))
              )}
              {(state.score ?? 0) < 0.999 && (
                <p className="text-xs text-muted-foreground">Fix your boxes and check again, or move on.</p>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" className="flex-1 gap-1" disabled={index === 0} onClick={() => goTo(index - 1)}>
              <ArrowLeft className="h-4 w-4" /> Previous
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-1" disabled={index >= practice.length - 1} onClick={() => goTo(index + 1)}>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Photo strip */}
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Practice photos">
        {practice.map((f, i) => (
          <StripTile
            key={f.id}
            datasetId={datasetId}
            fileId={f.id}
            n={i + 1}
            active={i === index}
            state={states[f.id] ?? emptyPhoto()}
            onClick={() => goTo(i)}
          />
        ))}
      </div>

      {/* Auto-label */}
      <div
        className={cn(
          "mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3",
          unlocked ? "border-ring bg-secondary/60" : "bg-background/40"
        )}
      >
        <div className="flex items-start gap-3">
          <Wand2 className={cn("mt-0.5 h-5 w-5 shrink-0", unlocked ? "text-ring" : "text-muted-foreground")} aria-hidden="true" />
          <div>
            <p className="font-medium text-foreground">Auto-label the rest</p>
            <p className="text-sm text-muted-foreground">
              {unlocked
                ? `You've got the idea. Let GSN's model label ${pool.length} more photos and compare its boxes with GSN's.`
                : `Check ${Math.min(PRACTICE_UNLOCK, practice.length)} photos to unlock (${checkedCount} of ${Math.min(PRACTICE_UNLOCK, practice.length)} so far).`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {unlocked && (
            <Button variant="ghost" size="sm" onClick={() => setPhase("done")}>
              Skip to finish
            </Button>
          )}
          <Button
            className="gap-1.5"
            disabled={!unlocked || pool.length === 0}
            onClick={() => (autoRun && !autoError ? setPhase("autolabel") : void startAutoLabel())}
          >
            <Wand2 className="h-4 w-4" /> {autoRun && !autoError ? "See auto-label results" : "Auto-label the rest"}
          </Button>
        </div>
      </div>
    </section>
  );
};
