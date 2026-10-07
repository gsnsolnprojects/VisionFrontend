import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  Brain,
  Camera,
  CheckCheck,
  Cpu,
  Factory,
  Handshake,
  MonitorCheck,
  Plug,
  Plus,
  ShieldCheck,
  Timer,
  TrendingDown,
  Users,
  FileCheck,
  Zap,
} from "lucide-react";
import { DesktopAppPreview } from "./DesktopAppPreview";
import { StationSimulator } from "./StationSimulator";
import {
  AutoVideo,
  ClosingCta,
  LiveBadge,
  ProductHero,
  Section,
  primaryBtn,
  secondaryBtn,
  type Benefit,
} from "./shared";
import { scrollToId } from "./media";

const BENEFITS: Benefit[] = [
  { Icon: CheckCheck, title: "Every part checked", text: "Not random samples. 100% of the line." },
  { Icon: Zap, title: "Instant OK / NOT OK", text: "Bad parts flagged the moment they pass." },
  { Icon: FileCheck, title: "Every result on record", text: "Photo and verdict saved for every part, ready for audits." },
  { Icon: Handshake, title: "Installed & supported", text: "We set it up, train it and look after it." },
];

const PROBLEMS = [
  {
    Icon: TrendingDown,
    problem: "Manual checks get tired",
    detail: "Inspectors miss more defects late in a shift, and every shift judges a little differently.",
    fix: "The station applies the same standard to every part, every hour.",
  },
  {
    Icon: Timer,
    problem: "Sampling lets defects through",
    detail: "Checking a few parts per batch means the rest go out unchecked.",
    fix: "Every single part is photographed and checked at line speed.",
  },
  {
    Icon: Users,
    problem: "Vision projects stall",
    detail: "Buying cameras is easy. Getting them to reliably catch your defects is the hard part.",
    fix: "We deliver it working: hardware, software and a model trained on your parts.",
  },
];

function ProblemSolution() {
  return (
    <Section eyebrow="Why Vision-M" title="Quality inspection, without the usual trade-offs">
      <div className="grid gap-4 md:grid-cols-3">
        {PROBLEMS.map(({ Icon, problem, detail, fix }, i) => (
          <motion.div
            key={problem}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6"
          >
            <Icon className="h-6 w-6 text-rose-400" />
            <h3 className="mt-4 text-lg font-semibold text-white">{problem}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{detail}</p>
            <div className="mt-5 flex gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              {fix}
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

const IN_THE_BOX = [
  { Icon: Camera, title: "Industrial camera & lighting", text: "Mounted over your line with controlled lighting, so every photo looks the same." },
  { Icon: Cpu, title: "Edge computer", text: "Runs the AI right at the machine. Keeps working if the internet drops." },
  { Icon: MonitorCheck, title: "Vision-M desktop app", text: "Operators see every result live, with counts, alerts and shift reports." },
  { Icon: Plug, title: "Line connection", text: "Sends a reject signal to your PLC, diverter, or alarm." },
];

function InTheBox({ onStudio }: { onStudio: () => void }) {
  return (
    <Section eyebrow="What you get" title="Everything a station needs, in one delivery">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {IN_THE_BOX.map(({ Icon, title, text }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="group rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 transition hover:-translate-y-0.5 hover:border-cyan-400/40"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300 transition group-hover:scale-110">
              <Icon className="h-5 w-5" />
            </span>
            <p className="mt-4 font-semibold text-white">{title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{text}</p>
          </motion.div>
        ))}
      </div>
      <button
        onClick={onStudio}
        className="group mt-3 flex w-full items-center gap-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] p-5 text-left transition hover:border-cyan-400/50"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300">
          <Brain className="h-5 w-5" />
        </span>
        <span className="flex-1">
          <span className="block font-semibold text-white">Plus: an AI model trained on your parts</span>
          <span className="block text-sm text-slate-400">
            We collect samples from your line and train the model in Vision-M Studio, our own training platform.
          </span>
        </span>
        <span className="hidden items-center gap-1 text-sm font-semibold text-cyan-300 transition group-hover:gap-2 sm:flex">
          See Studio <ArrowRight className="h-4 w-4" />
        </span>
      </button>
    </Section>
  );
}

const INDUSTRIES = [
  { name: "Pharma", product: "Blister packs", text: "Crushed, empty or damaged pockets.", image: "/demo/vision-m/samples/blister-1.jpg" },
  { name: "Automotive", product: "Car seats", text: "Tears and stains on upholstery.", image: "/demo/vision-m/samples/seat-1.jpg" },
  { name: "Electrical", product: "Terminal blocks", text: "Component and assembly checks.", image: "/demo/vision-m/terminal-block.jpg" },
];

function Industries() {
  return (
    <Section eyebrow="Where it works" title="Built on real production lines">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {INDUSTRIES.map((ind, i) => (
          <motion.div
            key={ind.name}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
          >
            <div className="aspect-[4/3] overflow-hidden">
              <img src={ind.image} alt={ind.product} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            </div>
            <div className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">{ind.name}</p>
              <p className="mt-1 font-semibold text-white">{ind.product}</p>
              <p className="mt-1 text-sm text-slate-400">{ind.text}</p>
            </div>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.24 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 p-6 text-center"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 text-slate-300">
            <Plus className="h-5 w-5" />
          </span>
          <p className="mt-4 font-semibold text-white">Your product?</p>
          <p className="mt-1 text-sm text-slate-400">Send us samples of good and bad parts, and we'll tell you what the camera can catch.</p>
        </motion.div>
      </div>
    </Section>
  );
}

function LiveFootage() {
  const clips = [
    {
      src: "/demo/vision-m/carseat-live.mp4",
      poster: "/demo/vision-m/carseat-live-poster.jpg",
      startAt: 0,
      title: "Automotive · car seats",
      text: "Tears and stains on upholstery, with an OK / NOT OK call for each seat.",
    },
    {
      src: "/demo/vision-m/blister-live.mp4",
      poster: "/demo/vision-m/blister-live-poster.jpg",
      startAt: 2.6,
      title: "Pharma · blister packs",
      text: "Crushed or empty pockets, across green, red, brown, blue and capsule packs.",
    },
  ];
  return (
    <Section
      id="live"
      eyebrow="In the field"
      title="Now see the real thing"
      subtitle="Unedited recordings of live inspection on real parts: car seats and blister packs, each called OK or NOT OK as it passes the camera."
    >
      <div className="grid gap-6 md:grid-cols-2">
        {clips.map((c) => (
          <figure key={c.title} className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
            <AutoVideo src={c.src} poster={c.poster} startAt={c.startAt} className="block aspect-[4/3] w-full object-cover object-top" />
            <figcaption className="flex-1 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-white">{c.title}</p>
                <LiveBadge />
              </div>
              <p className="mt-1 text-sm text-slate-400">{c.text}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}

const ROLLOUT = [
  { title: "Visit & samples", text: "We see your line and collect good and defective parts." },
  { title: "Train & prove", text: "We train a model on your parts and show you the results first." },
  { title: "Pilot on one line", text: "We install a station and tune it with your QC team." },
  { title: "Roll out & support", text: "Add more lines. We keep models and software up to date." },
];

function Rollout() {
  return (
    <Section eyebrow="How we work" title="From first visit to a running line">
      <ol className="relative grid gap-6 md:grid-cols-4">
        <div className="absolute left-5 right-5 top-5 hidden h-px bg-gradient-to-r from-cyan-400/60 via-cyan-400/30 to-cyan-400/10 md:block" />
        {ROLLOUT.map((s, i) => (
          <motion.li
            key={s.title}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12 }}
            className="relative flex gap-4 md:flex-col"
          >
            <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-300/60 bg-[#050914] font-bold text-cyan-200">
              {i + 1}
            </span>
            <div>
              <p className="font-semibold text-white">{s.title}</p>
              <p className="mt-1 text-sm text-slate-400">{s.text}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </Section>
  );
}

export function SolutionDemo({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const openStudio = () => navigate("/showcase/vision/vision-m-studio");

  return (
    <div className="text-slate-100">
      <ProductHero
        badge={
          <>
            <Factory className="h-3.5 w-3.5" /> Turnkey inspection station
          </>
        }
        title={
          <>
            Vision<span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 bg-clip-text text-transparent">-M</span>
          </>
        }
        text="An AI inspector for your production line. We install the camera, lighting, computer and software, and train it on your parts. Every part is checked as it passes: good parts keep moving, bad ones go to the reject bin, and everything is counted."
        actions={
          <>
            <button onClick={() => scrollToId("live")} className={primaryBtn}>
              Watch it run live <ArrowDown className="h-4 w-4" />
            </button>
            <Link to="/" className={secondaryBtn}>
              Request a pilot <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        }
        layout="stacked"
        visual={<StationSimulator />}
        benefits={BENEFITS}
      />
      <ProblemSolution />
      <InTheBox onStudio={openStudio} />
      <Section
        eyebrow="Desktop app"
        title="What your operators see"
        subtitle="One screen per line: live camera, pass and reject counts, recent rejects with photos, and the shift report in one click."
      >
        <DesktopAppPreview />
      </Section>
      <LiveFootage />
      <Industries />
      <Rollout />
      <ClosingCta
        title="Let's put a station on your line"
        text="Tell us what you make and what goes wrong. We'll come back with a plan for a pilot on one line."
        actions={
          <>
            <Link to="/" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-slate-900 transition hover:-translate-y-0.5">
              Request a pilot <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={openStudio}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Explore Vision-M Studio
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
