import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  Brain,
  Database,
  Eye,
  FileText,
  FlaskConical,
  History,
  Layers,
  MonitorSmartphone,
  MousePointerClick,
  Package,
  PenTool,
  Server,
  Shapes,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  Wand2,
  Workflow,
  Zap,
} from "lucide-react";
import { DetectionPlayground } from "./DetectionPlayground";
import { PipelineWalkthrough } from "./PipelineWalkthrough";
import { TrainingProof } from "./TrainingProof";
import {
  ClosingCta,
  CroppedVideo,
  LiveBadge,
  ProductHero,
  Section,
  primaryBtn,
  secondaryBtn,
  type Benefit,
} from "./shared";
import { BLISTER_FEED, scrollToId } from "./media";

const STUDIO_BENEFITS: Benefit[] = [
  { Icon: PenTool, title: "AI-assisted labelling", text: "Click once and AI outlines the defect." },
  { Icon: Brain, title: "Train without code", text: "Pick a model, press train, watch it learn." },
  { Icon: FlaskConical, title: "Test right away", text: "Try a photo, a video or a live webcam." },
  { Icon: Package, title: "Take it anywhere", text: "Export for edge PCs or Android phones." },
];

const CAPABILITIES = [
  { Icon: Shapes, title: "Box & polygon labelling", text: "Precise outlines for irregular defects." },
  { Icon: MousePointerClick, title: "SAM click-to-segment", text: "One click and AI traces the object." },
  { Icon: Wand2, title: "Smart augmentation", text: "Grow datasets with labels kept in sync." },
  { Icon: Brain, title: "YOLO & RF-DETR", text: "v8, v11, v26 and transformer detectors." },
  { Icon: Sparkles, title: "AI training assistant", text: "Suggests hyperparameters and explains metrics." },
  { Icon: Video, title: "Live, video & image", text: "Inspect from a webcam, a clip or a photo." },
  { Icon: Package, title: "Edge & mobile export", text: "ONNX for edge PCs, TFLite for Android." },
  { Icon: History, title: "Prediction history", text: "Every inspection stored for audits." },
  { Icon: Layers, title: "Dataset versioning", text: "Every change is a version with lineage." },
  { Icon: Users, title: "Teams & roles", text: "Invite members with role-based access." },
  { Icon: FileText, title: "OCR field reading", text: "Reads labels and nameplates from images." },
  { Icon: ShieldCheck, title: "Corrosion module", text: "Mobile surveys, observations, PDF reports." },
];

function Capabilities() {
  return (
    <Section eyebrow="Platform" title="Everything in one place">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CAPABILITIES.map(({ Icon, title, text }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: (i % 4) * 0.06 }}
            className="group rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:-translate-y-0.5 hover:border-cyan-400/40 hover:bg-cyan-400/[0.06]"
          >
            <Icon className="h-5 w-5 text-cyan-300 transition group-hover:scale-110" />
            <p className="mt-3 font-semibold text-white">{title}</p>
            <p className="mt-1 text-sm text-slate-400">{text}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

const ARCH = [
  { Icon: Eye, title: "Capture", items: ["Web app (React)", "Android app", "Line cameras"] },
  { Icon: Server, title: "API", items: ["Node.js / Express", "Supabase auth", "Role-based access"] },
  { Icon: Workflow, title: "Job queue", items: ["Redis + Bull", "Retries & progress", "Per-job status"] },
  { Icon: Zap, title: "GPU workers", items: ["Training", "Inference", "SAM & augmentation"] },
  { Icon: Database, title: "Storage", items: ["MongoDB metadata", "Azure Blob images", "Model registry"] },
];

function Architecture() {
  return (
    <Section
      eyebrow="Under the hood"
      title="Built to scale with your data"
      subtitle="Heavy work goes to a queue, so the app stays fast while GPUs train and run models in the background."
    >
      <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-center">
        {ARCH.map(({ Icon, title, items }, i) => (
          <div key={title} className="flex flex-col items-center gap-2 lg:flex-1 lg:flex-row">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="w-full rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-300">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="font-semibold text-white">{title}</p>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-slate-400">
                {items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </motion.div>
            {i < ARCH.length - 1 && (
              <div className="relative h-6 w-0.5 shrink-0 overflow-hidden bg-white/10 lg:h-0.5 lg:w-6">
                <span className="absolute inset-0 animate-[pulse_1.6s_ease-in-out_infinite] bg-cyan-400/70" />
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

export function StudioDemo({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="text-slate-100">
      <ProductHero
        badge={
          <>
            <MonitorSmartphone className="h-3.5 w-3.5" /> Web app · Build your own inspection AI
          </>
        }
        title={
          <>
            Vision-M{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 bg-clip-text text-transparent">Studio</span>
          </>
        }
        text="Teach a camera to spot defects, right in your browser. Six steps take you from a folder of photos to a working model. Click any step below, or let it play."
        actions={
          <>
            <button onClick={() => scrollToId("playground")} className={primaryBtn}>
              Try a trained model <ArrowDown className="h-4 w-4" />
            </button>
            <Link to="/auth" className={secondaryBtn}>
              Open Studio <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        }
        layout="stacked"
        visual={<PipelineWalkthrough />}
        benefits={STUDIO_BENEFITS}
      />
      <Section
        id="playground"
        eyebrow="Interactive · real model output"
        title={
          <>
            Be the inspector. <span className="text-cyan-300">Move the threshold.</span>
          </>
        }
        subtitle="Real predictions from blister-pack and car-seat models trained in Studio, on images they never saw while training. Pick an image, then drag the slider to see how confidence changes the verdict."
      >
        <DetectionPlayground />
      </Section>
      <Section
        eyebrow="Tested live"
        title="From Studio to a live camera"
        subtitle="A blister-pack model built in Studio, running on a live webcam. Unedited recording."
      >
        <figure className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/60">
          <div className="relative">
            <CroppedVideo {...BLISTER_FEED} />
            <div className="absolute right-3 top-3">
              <LiveBadge />
            </div>
          </div>
          <figcaption className="p-5 text-sm text-slate-400">
            Each pack is called OK or NOT OK as it is held up to the camera, with defect boxes drawn live.
          </figcaption>
        </figure>
      </Section>
      <Section
        eyebrow="Proof"
        title="Watch the model learn"
        subtitle="Training logs from the same models used above. Hover the chart to read any epoch."
      >
        <TrainingProof />
      </Section>
      <Capabilities />
      <Architecture />
      <ClosingCta
        title="Build your first model"
        text="Start with photos of good and defective parts. Need a complete station on your line instead? That's Vision-M."
        actions={
          <>
            <Link to="/auth" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-slate-900 transition hover:-translate-y-0.5">
              Open Studio <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={() => navigate("/showcase/vision-m")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              See Vision-M for factories
            </button>
            <button onClick={onClose} className="inline-flex items-center gap-2 rounded-xl px-4 py-3 font-semibold text-slate-300 transition hover:text-white">
              All projects
            </button>
          </>
        }
      />
    </div>
  );
}
