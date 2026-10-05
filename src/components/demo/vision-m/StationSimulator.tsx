import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { Camera, CheckCircle2, Cpu, XCircle } from "lucide-react";
import { DEMO_SAMPLES, LINE_OK_SAMPLES, type DemoSample } from "./generatedData";

const DEFECT_LABELS = new Set(["defect", "tear", "stain"]);
const VERDICT_THRESHOLD = 0.5;
const isBad = (s: DemoSample) => s.detections.some((d) => DEFECT_LABELS.has(d.label) && d.confidence >= VERDICT_THRESHOLD);

const BLISTERS = DEMO_SAMPLES.filter((s) => s.product === "Blister pack");
const OK_POOL = [...LINE_OK_SAMPLES, ...BLISTERS.filter((s) => !isBad(s))];
const BAD_POOL = BLISTERS.filter(isBad);
/** Mostly good parts with the occasional reject, like a real line. */
const PATTERN = [false, false, true, false, false, false, false, true, false, false];

// Belt geometry, in % of the scene width.
const START = -12;
const END = 112;
const CAMERA = 40;
const GATE = 74;
const TRAVEL_S = 8;
const SPAWN_MS = 1700;
const DROP_S = 0.8;
const secondsTo = (x: number) => ((x - START) / (END - START)) * TRAVEL_S;

/** Light colour per state: idle cyan, green for a good part, red for a reject. */
const SIGNAL = {
  idle: { bar: "bg-cyan-200 shadow-[0_0_14px_4px_rgba(103,232,249,0.55)]", cone: "from-cyan-200/40 via-cyan-300/15 to-cyan-300/10", spot: "bg-cyan-300/25", led: "bg-cyan-300 shadow-[0_0_6px_rgba(103,232,249,0.9)]" },
  ok: { bar: "bg-emerald-300 shadow-[0_0_18px_6px_rgba(52,211,153,0.7)]", cone: "from-emerald-300/50 via-emerald-400/20 to-emerald-400/10", spot: "bg-emerald-400/35", led: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,1)]" },
  bad: { bar: "bg-rose-400 shadow-[0_0_18px_6px_rgba(244,63,94,0.75)]", cone: "from-rose-400/50 via-rose-500/20 to-rose-500/10", spot: "bg-rose-500/35", led: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,1)]" },
} as const;
const SIGNAL_HOLD_MS = 1200;

interface Part {
  uid: number;
  sample: DemoSample;
  bad: boolean;
}

function PartTile({ part, inspected }: { part: Part; inspected: boolean }) {
  const { sample, bad } = part;
  const gateAt = secondsTo(GATE);
  return (
    <motion.div
      className="absolute bottom-[96px] -ml-8 w-16 sm:-ml-10 sm:w-20"
      initial={{ left: `${START}%` }}
      animate={
        bad
          ? { left: [`${START}%`, `${GATE}%`, `${GATE}%`], y: [0, 0, 130], rotate: [0, 0, 28], opacity: [1, 1, 0] }
          : { left: `${END}%` }
      }
      transition={
        bad
          ? { duration: gateAt + DROP_S, times: [0, gateAt / (gateAt + DROP_S), 1], ease: "linear" }
          : { duration: TRAVEL_S, ease: "linear" }
      }
    >
      <AnimatePresence>
        {inspected && (
          <motion.span
            initial={{ opacity: 0, y: 6, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`absolute -top-7 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow ${
              bad ? "bg-rose-600" : "bg-emerald-500"
            }`}
          >
            {bad ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
            {bad ? "NOT OK" : "OK"}
          </motion.span>
        )}
      </AnimatePresence>
      <div
        className={`relative overflow-hidden rounded-md border-2 shadow-lg shadow-black/50 transition-colors ${
          inspected ? (bad ? "border-rose-500" : "border-emerald-400") : "border-white/20"
        }`}
        style={{ aspectRatio: `${sample.width} / ${sample.height}` }}
      >
        <img src={sample.image} alt="" className="h-full w-full object-cover" draggable={false} />
        {inspected &&
          sample.detections
            .filter((d) => DEFECT_LABELS.has(d.label) && d.confidence >= VERDICT_THRESHOLD)
            .map((d, i) => {
              const [x1, y1, x2, y2] = d.box;
              return (
                <motion.span
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute border border-rose-500 bg-rose-500/20"
                  style={{ left: `${x1 * 100}%`, top: `${y1 * 100}%`, width: `${(x2 - x1) * 100}%`, height: `${(y2 - y1) * 100}%` }}
                />
              );
            })}
      </div>
    </motion.div>
  );
}

export function StationSimulator() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sceneRef, { amount: 0.3 });
  const [parts, setParts] = useState<Part[]>([]);
  const [inspected, setInspected] = useState<Set<number>>(() => new Set());
  const [counts, setCounts] = useState({ total: 0, ok: 0, bad: 0 });
  const [flash, setFlash] = useState(0);
  const [gateOpen, setGateOpen] = useState(false);
  const [last, setLast] = useState<boolean | null>(null);
  const [signal, setSignal] = useState<keyof typeof SIGNAL>("idle");
  const signalSeq = useRef(0);
  const seq = useRef(0);
  const timers = useRef(new Set<number>());

  useEffect(() => {
    if (!inView) return;
    const pending = timers.current;
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        pending.delete(id);
        fn();
      }, ms);
      pending.add(id);
    };
    const spawn = () => {
      const n = seq.current++;
      const bad = PATTERN[n % PATTERN.length];
      const pool = bad ? BAD_POOL : OK_POOL;
      const part: Part = { uid: n, sample: pool[n % pool.length], bad };
      setParts((p) => [...p, part]);

      later(() => {
        setInspected((s) => new Set(s).add(n));
        setCounts((c) => ({ total: c.total + 1, ok: c.ok + (bad ? 0 : 1), bad: c.bad + (bad ? 1 : 0) }));
        setFlash((f) => f + 1);
        setLast(bad);
        const mine = ++signalSeq.current;
        setSignal(bad ? "bad" : "ok");
        later(() => {
          if (signalSeq.current === mine) setSignal("idle");
        }, SIGNAL_HOLD_MS);
      }, secondsTo(CAMERA) * 1000);

      if (bad) {
        later(() => setGateOpen(true), secondsTo(GATE) * 1000 - 150);
        later(() => setGateOpen(false), secondsTo(GATE) * 1000 + 650);
      }

      later(
        () => {
          setParts((p) => p.filter((x) => x.uid !== n));
          setInspected((s) => {
            const next = new Set(s);
            next.delete(n);
            return next;
          });
        },
        (bad ? secondsTo(GATE) + DROP_S : TRAVEL_S) * 1000 + 100
      );
    };
    spawn();
    const iv = window.setInterval(spawn, SPAWN_MS);
    return () => window.clearInterval(iv);
  }, [inView]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  const tiles = [
    { label: "Inspected", value: counts.total, tone: "text-white" },
    { label: "Passed", value: counts.ok, tone: "text-emerald-300" },
    { label: "Rejected", value: counts.bad, tone: "text-rose-300" },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className={`text-2xl font-bold tabular-nums ${t.tone}`}>{t.value}</p>
            <p className="text-xs text-slate-400">{t.label}</p>
          </div>
        ))}
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 transition-colors ${
            last === null ? "border-white/10 bg-white/[0.03]" : last ? "border-rose-500/40 bg-rose-500/10" : "border-emerald-500/40 bg-emerald-500/10"
          }`}
        >
          {last === null ? (
            <p className="text-sm text-slate-400">Waiting for first part…</p>
          ) : (
            <>
              {last ? <XCircle className="h-6 w-6 text-rose-400" /> : <CheckCircle2 className="h-6 w-6 text-emerald-400" />}
              <div>
                <p className="text-lg font-bold leading-tight text-white">{last ? "NOT OK" : "OK"}</p>
                <p className="text-xs text-slate-400">Last result</p>
              </div>
            </>
          )}
        </div>
      </div>

      <div
        ref={sceneRef}
        className="relative mt-4 h-[380px] overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(600px_300px_at_40%_0%,rgba(34,211,238,0.10),transparent_70%)] bg-[#081022]"
      >
        <style>{`@keyframes vm-belt { from { background-position: 0 0 } to { background-position: 40px 0 } }`}</style>

        {/* Edge computer, wired to the camera */}
        <div className="absolute left-4 top-4 hidden items-center gap-2 rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-slate-300 sm:flex">
          <Cpu className="h-4 w-4 text-cyan-300" /> Edge computer
          <span className={`ml-1 h-2 w-2 rounded-full ${flash ? "bg-emerald-400" : "bg-slate-600"}`} />
        </div>
        <div className="absolute left-[150px] top-[34px] hidden h-px border-t border-dashed border-cyan-400/40 sm:block" style={{ width: `calc(${CAMERA}% - 190px)` }} />

        {/* Camera + light cone */}
        <div className="absolute top-3 z-10 -ml-11 w-[88px]" style={{ left: `${CAMERA}%` }}>
          {/* Body */}
          <div className="relative flex h-11 items-center justify-center gap-2 rounded-lg border border-white/15 bg-gradient-to-b from-slate-700 to-slate-800 shadow-lg">
            <Camera className="h-4 w-4 text-slate-300" />
            {/* Lens: always lit, flares white on each capture */}
            <span className="relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-cyan-300 bg-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.8)]">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_8px_2px_rgba(103,232,249,0.9)]" />
              <span className="absolute left-[3px] top-[3px] h-1 w-1 rounded-full bg-white/80" />
              <AnimatePresence>
                {flash > 0 && (
                  <motion.span
                    key={flash}
                    className="absolute -inset-1.5 rounded-full bg-white"
                    initial={{ opacity: 1, scale: 0.6 }}
                    animate={{ opacity: 0, scale: 1.6 }}
                    transition={{ duration: 0.4 }}
                  />
                )}
              </AnimatePresence>
            </span>
            {/* Status LED */}
            <span className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full transition-colors duration-150 ${SIGNAL[signal].led}`} />
          </div>
          {/* LED light bar */}
          <div className={`mx-auto mt-0.5 h-1.5 w-[72px] rounded-full transition-all duration-150 ${SIGNAL[signal].bar}`} />
          <p className="absolute left-full top-3 ml-2 hidden whitespace-nowrap text-[10px] font-medium text-slate-400 sm:block">Camera + light</p>
        </div>
        {/* Light cone, from the LED bar down to the belt */}
        <div
          className={`absolute -ml-[80px] w-[160px] bg-gradient-to-b transition-colors duration-150 ${SIGNAL[signal].cone}`}
          style={{ left: `${CAMERA}%`, top: 62, bottom: 96, clipPath: "polygon(27% 0, 73% 0, 100% 100%, 0 100%)" }}
        />
        {/* Lit spot where the light hits the belt */}
        <div
          className={`absolute bottom-[86px] -ml-[90px] h-8 w-[180px] rounded-[50%] blur-md transition-colors duration-150 ${SIGNAL[signal].spot}`}
          style={{ left: `${CAMERA}%` }}
        />

        {/* Parts */}
        {parts.map((p) => (
          <PartTile key={p.uid} part={p} inspected={inspected.has(p.uid)} />
        ))}

        {/* Belt */}
        <div
          className="absolute inset-x-0 bottom-[76px] h-5 border-y border-white/10 bg-slate-700"
          style={{
            backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0 2px, transparent 2px 40px)",
            animation: "vm-belt 0.65s linear infinite",
          }}
        />
        {/* Reject diverter */}
        <div
          className={`absolute bottom-[76px] -ml-7 h-5 w-14 rounded-sm transition-colors duration-150 ${
            gateOpen ? "bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.8)]" : "bg-slate-600"
          }`}
          style={{ left: `${GATE}%` }}
        />
        <div
          className="absolute bottom-2 -ml-14 flex h-14 w-28 items-end justify-center rounded-b-lg border border-t-0 border-dashed border-rose-400/40 bg-rose-500/5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-rose-300/80"
          style={{ left: `${GATE}%` }}
        >
          Reject bin
        </div>
        <p className="absolute bottom-[54px] -ml-12 w-24 text-center text-[10px] font-medium text-slate-400" style={{ left: `${CAMERA}%` }}>
          Inspection point
        </p>
        <p className="absolute bottom-[100px] right-3 text-[10px] font-medium text-emerald-300/70">Good parts →</p>
      </div>

      <ol className="mt-5 grid gap-3 text-sm text-slate-300 sm:grid-cols-4">
        {[
          "Part arrives under the camera",
          "Camera takes a photo, AI checks it on the edge computer",
          "Bad parts get a reject signal and leave the line",
          "Every result is counted and saved with its photo",
        ].map((s, i) => (
          <li key={s} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-400/15 text-xs font-bold text-cyan-300">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-slate-500">Animation for illustration. The parts and the defect boxes on them are real results from our blister-pack model.</p>
    </div>
  );
}
