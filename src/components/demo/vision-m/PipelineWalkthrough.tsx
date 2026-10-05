import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { Brain, Check, Cloud, Cpu, Layers, MonitorPlay, PenTool, Rocket, Smartphone, UploadCloud, Wand2 } from "lucide-react";

const STEP_MS = 7000;

function ScreenshotFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/50">
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-slate-800/80 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <span className="ml-3 truncate text-[11px] text-slate-400">app.vision-m · {alt}</span>
      </div>
      <img src={src} alt={alt} className="block w-full" loading="lazy" />
    </div>
  );
}

const AUG_SRC = "/demo/vision-m/samples/blister-3.jpg";
const AUGMENTS: { name: string; style: CSSProperties }[] = [
  { name: "Flip", style: { transform: "scaleX(-1)" } },
  { name: "Rotate", style: { transform: "rotate(14deg) scale(1.25)" } },
  { name: "Crop", style: { transform: "scale(1.7)", transformOrigin: "28% 35%" } },
  { name: "Brightness", style: { filter: "brightness(1.5)" } },
  { name: "Contrast", style: { filter: "contrast(1.7) saturate(1.2)" } },
  { name: "Blur", style: { filter: "blur(2.5px)" } },
];

function AugmentVisual() {
  return (
    <div className="grid grid-cols-[1.1fr_2fr] items-center gap-4 rounded-xl border border-white/10 bg-slate-900/70 p-4 sm:gap-6 sm:p-6">
      <div>
        <div className="overflow-hidden rounded-lg ring-2 ring-cyan-400">
          <img src={AUG_SRC} alt="Original" className="aspect-square w-full object-cover" />
        </div>
        <p className="mt-2 text-center text-xs font-semibold text-cyan-300">1 original</p>
      </div>
      <div>
        <div className="grid grid-cols-3 gap-2">
          {AUGMENTS.map((a, i) => (
            <motion.div
              key={a.name}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.12 }}
            >
              <div className="overflow-hidden rounded-md border border-white/10">
                <img src={AUG_SRC} alt={a.name} className="aspect-square w-full object-cover" style={a.style} />
              </div>
              <p className="mt-1 text-center text-[10px] text-slate-400 sm:text-[11px]">{a.name}</p>
            </motion.div>
          ))}
        </div>
        <p className="mt-2 text-center text-xs font-semibold text-slate-300">→ 6 new training images, labels moved with them</p>
      </div>
    </div>
  );
}

function DeployVisual() {
  const formats = [
    { name: "PyTorch", ext: ".pt", target: "Cloud GPU API", Icon: Cloud },
    { name: "ONNX", ext: ".onnx", target: "Edge PC on the line", Icon: Cpu },
    { name: "TFLite", ext: ".tflite", target: "Android inspection app", Icon: Smartphone },
  ];
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/70 p-5 sm:p-7">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto flex w-fit items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200"
      >
        <Brain className="h-4 w-4" /> blister_packet_v1 · trained model
      </motion.div>
      <div className="mx-auto h-6 w-px bg-gradient-to-b from-cyan-400/60 to-white/10" />
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {formats.map(({ name, ext, target, Icon }, i) => (
          <motion.div
            key={name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.15 }}
            className="flex flex-col items-center text-center"
          >
            <div className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-3">
              <p className="text-sm font-bold text-white">{name}</p>
              <p className="font-mono text-[11px] text-cyan-300">{ext}</p>
            </div>
            <div className="h-5 w-px bg-white/15" />
            <div className="flex w-full flex-col items-center gap-1.5 rounded-lg bg-gradient-to-b from-sky-500/15 to-transparent px-2 py-3">
              <Icon className="h-5 w-5 text-sky-300" />
              <p className="text-[11px] leading-tight text-slate-300 sm:text-xs">{target}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

interface Step {
  key: string;
  title: string;
  Icon: typeof UploadCloud;
  summary: string;
  points: string[];
  visual: ReactNode;
}

const STEPS: Step[] = [
  {
    key: "upload",
    title: "Upload",
    Icon: UploadCloud,
    summary: "Drop in a folder of product photos, labelled or not.",
    points: ["YOLO-format labels are picked up automatically", "Every upload becomes a versioned dataset", "Projects keep each product line separate"],
    visual: <ScreenshotFrame src="/upload_dataset.png" alt="Upload datasets" />,
  },
  {
    key: "annotate",
    title: "Annotate",
    Icon: PenTool,
    summary: "Mark the defects. AI does most of the tracing.",
    points: ["Bounding boxes and polygons", "SAM click-to-segment: one click, the outline is drawn", "Live stats per class and keyboard shortcuts"],
    visual: <ScreenshotFrame src="/annotate.png" alt="Annotation workspace" />,
  },
  {
    key: "augment",
    title: "Augment",
    Icon: Wand2,
    summary: "Turn a small dataset into a large one, safely.",
    points: ["Flip, rotate, crop, brightness/contrast, blur", "Boxes are transformed with the image", "New version keeps lineage back to the original"],
    visual: <AugmentVisual />,
  },
  {
    key: "train",
    title: "Train",
    Icon: Brain,
    summary: "Pick a model, press train. GPUs do the rest.",
    points: ["YOLOv8 / v11 / v26 and RF-DETR", "“Ask AI” suggests hyperparameters for your data", "Jobs queue on GPU workers, metrics stream live"],
    visual: <ScreenshotFrame src="/model.png" alt="Model & hyperparameters" />,
  },
  {
    key: "deploy",
    title: "Deploy",
    Icon: Rocket,
    summary: "One model, exported to wherever the camera is.",
    points: ["Download as PyTorch, ONNX or TFLite", "Runs offline on an edge PC next to the line", "Ships inside our Android inspection app"],
    visual: <DeployVisual />,
  },
  {
    key: "inspect",
    title: "Inspect",
    Icon: MonitorPlay,
    summary: "Every part gets an instant OK / NOT OK.",
    points: ["Live camera, video or single images", "Adjustable confidence threshold per session", "Full prediction history for audits"],
    visual: <ScreenshotFrame src="/inference.png" alt="Live camera inference" />,
  },
];

export function PipelineWalkthrough() {
  const [active, setActive] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [hovering, setHovering] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const running = autoplay && inView && !hovering;

  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => setActive((a) => (a + 1) % STEPS.length), STEP_MS);
    return () => window.clearTimeout(t);
  }, [running, active]);

  const step = STEPS[active];

  return (
    <div ref={ref} onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
      {/* Stepper */}
      <div className="relative grid grid-cols-6 gap-1 sm:gap-2" role="tablist" aria-label="Pipeline steps">
        {STEPS.map((s, i) => {
          const done = i < active;
          const isActive = i === active;
          return (
            <button
              key={s.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setActive(i);
                setAutoplay(false);
              }}
              className="group flex flex-col items-center gap-2 text-center"
            >
              <span
                className={`relative flex h-10 w-10 items-center justify-center rounded-full border transition-all sm:h-12 sm:w-12 ${
                  isActive
                    ? "border-cyan-300 bg-cyan-400 text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.55)]"
                    : done
                      ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200"
                      : "border-white/15 bg-white/5 text-slate-400 group-hover:text-slate-200"
                }`}
              >
                {done ? <Check className="h-4 w-4 sm:h-5 sm:w-5" /> : <s.Icon className="h-4 w-4 sm:h-5 sm:w-5" />}
              </span>
              <span className={`text-[11px] font-semibold sm:text-sm ${isActive ? "text-white" : "text-slate-400"}`}>{s.title}</span>
              <span className="relative h-0.5 w-full overflow-hidden rounded-full bg-white/10">
                {isActive && (
                  <motion.span
                    key={`${active}-${running}`}
                    className="absolute inset-y-0 left-0 bg-cyan-400"
                    initial={{ width: running ? "0%" : "100%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: running ? STEP_MS / 1000 : 0, ease: "linear" }}
                  />
                )}
                {done && <span className="absolute inset-0 bg-cyan-400/50" />}
              </span>
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <div className="mt-8 min-h-[420px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.key}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="grid items-center gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
          >
            <div>
              <p className="font-mono text-xs text-cyan-300">
                STEP {String(active + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
              </p>
              <h3 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{step.summary}</h3>
              <ul className="mt-5 space-y-3">
                {step.points.map((p) => (
                  <li key={p} className="flex gap-3 text-slate-300">
                    <Layers className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              {!autoplay && (
                <button onClick={() => setAutoplay(true)} className="mt-6 text-sm font-medium text-cyan-300 hover:text-cyan-200">
                  ▶ Resume auto-play
                </button>
              )}
            </div>
            <div className="min-w-0">{step.visual}</div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
