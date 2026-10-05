import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Cpu, ScanLine, XCircle } from "lucide-react";
import { DEMO_SAMPLES, type DemoDetection } from "./generatedData";

const DEFECT_LABELS = new Set(["defect", "tear", "stain"]);
const SCAN_MS = 1100;
const MAX_STAGE_HEIGHT = 500;

const isDefect = (d: DemoDetection) => DEFECT_LABELS.has(d.label);
const pct = (v: number) => `${Math.round(v * 100)}%`;

export function DetectionPlayground() {
  const [sampleId, setSampleId] = useState(DEMO_SAMPLES[0].id);
  const [threshold, setThreshold] = useState(0.5);
  const [showProduct, setShowProduct] = useState(true);
  const [scanning, setScanning] = useState(true);

  const sample = DEMO_SAMPLES.find((s) => s.id === sampleId) ?? DEMO_SAMPLES[0];

  useEffect(() => {
    setScanning(true);
    const t = window.setTimeout(() => setScanning(false), SCAN_MS);
    return () => window.clearTimeout(t);
  }, [sampleId]);

  // Product boxes first so defect boxes render on top of them.
  const detections = useMemo(
    () => [...sample.detections].sort((a, b) => Number(isDefect(a)) - Number(isDefect(b)) || b.confidence - a.confidence),
    [sample]
  );
  const kept = detections.filter((d) => d.confidence >= threshold);
  const defectsKept = kept.filter(isDefect);
  const verdictOk = defectsKept.length === 0;
  const listed = [...detections].sort((a, b) => b.confidence - a.confidence);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* Stage */}
      <div className="flex flex-col gap-4 min-w-0">
        <div className="relative rounded-2xl border border-white/10 bg-black/40 p-3 sm:p-4">
          <div
            className="relative mx-auto overflow-hidden rounded-xl"
            style={{
              aspectRatio: `${sample.width} / ${sample.height}`,
              width: `min(100%, ${(MAX_STAGE_HEIGHT * sample.width) / sample.height}px)`,
            }}
          >
            <AnimatePresence mode="popLayout">
              <motion.img
                key={sample.id}
                src={sample.image}
                alt={`${sample.product} sample`}
                className="absolute inset-0 h-full w-full object-cover"
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
              />
            </AnimatePresence>

            {/* Scan sweep */}
            <AnimatePresence>
              {scanning && (
                <motion.div
                  key={`scan-${sample.id}`}
                  className="pointer-events-none absolute inset-0"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.08)_1px,transparent_1px)] bg-[size:28px_28px]" />
                  <motion.div
                    className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-cyan-400/35 to-transparent"
                    initial={{ top: "-25%" }}
                    animate={{ top: "100%" }}
                    transition={{ duration: SCAN_MS / 1000, ease: "easeInOut" }}
                  >
                    <div className="absolute inset-x-0 top-1/2 h-px bg-cyan-300 shadow-[0_0_16px_4px_rgba(34,211,238,0.7)]" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Boxes */}
            {!scanning &&
              detections.map((d, i) => {
                const visible = d.confidence >= threshold && (isDefect(d) || showProduct);
                const [x1, y1, x2, y2] = d.box;
                const defect = isDefect(d);
                return (
                  <motion.div
                    key={`${sample.id}-${i}`}
                    className={`pointer-events-none absolute rounded-[4px] ${
                      defect
                        ? "border-2 border-rose-500 bg-rose-500/10 shadow-[0_0_18px_rgba(244,63,94,0.55)]"
                        : "border-2 border-dashed border-cyan-300/80"
                    }`}
                    style={{ left: pct(x1), top: pct(y1), width: pct(x2 - x1), height: pct(y2 - y1) }}
                    initial={{ opacity: 0, scale: 1.12 }}
                    animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.96 }}
                    transition={{ duration: 0.3, delay: visible ? i * 0.08 : 0 }}
                  >
                    <span
                      className={`absolute -top-[22px] left-[-2px] whitespace-nowrap rounded-t px-1.5 py-0.5 text-[11px] font-semibold leading-none ${
                        defect ? "bg-rose-500 text-white" : "bg-cyan-300 text-slate-900"
                      }`}
                      style={y1 < 0.06 ? { top: 2, left: 2, borderRadius: 4 } : undefined}
                    >
                      {d.label} {Math.round(d.confidence * 100)}%
                    </span>
                  </motion.div>
                );
              })}

            {/* HUD */}
            <div className="pointer-events-none absolute left-3 bottom-3 flex items-center gap-2">
              <AnimatePresence mode="wait">
                {scanning ? (
                  <motion.span
                    key="scan"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5 rounded-full bg-slate-950/80 px-3 py-1.5 text-xs font-semibold text-cyan-200 backdrop-blur"
                  >
                    <ScanLine className="h-3.5 w-3.5 animate-pulse" /> Analyzing…
                  </motion.span>
                ) : (
                  <motion.span
                    key={verdictOk ? "ok" : "nok"}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold tracking-wide text-white shadow-lg ${
                      verdictOk ? "bg-emerald-500" : "bg-rose-600"
                    }`}
                  >
                    {verdictOk ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {verdictOk ? "OK" : "NOT OK"}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <span className="pointer-events-none absolute right-3 bottom-3 flex items-center gap-1 rounded-full bg-slate-950/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 backdrop-blur">
              <Cpu className="h-3 w-3" /> {sample.inferenceMs} ms
            </span>
          </div>
        </div>

        {/* Sample picker */}
        <div className="flex gap-2.5 overflow-x-auto pb-1" role="tablist" aria-label="Sample images">
          {DEMO_SAMPLES.map((s) => {
            const active = s.id === sample.id;
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={active}
                onClick={() => setSampleId(s.id)}
                className={`group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition sm:h-20 sm:w-20 ${
                  active ? "border-cyan-400 shadow-[0_0_0_4px_rgba(34,211,238,0.15)]" : "border-white/10 opacity-70 hover:opacity-100"
                }`}
              >
                <img src={s.image} alt={s.product} className="h-full w-full object-cover" loading="lazy" />
                <span className="absolute inset-x-0 bottom-0 bg-slate-950/75 py-0.5 text-center text-[10px] font-medium text-slate-200">
                  {s.product === "Car seat" ? "Seat" : "Blister"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control panel */}
      <div className="flex flex-col gap-4">
        <div
          className={`rounded-2xl border p-5 transition-colors ${
            scanning
              ? "border-white/10 bg-white/[0.03]"
              : verdictOk
                ? "border-emerald-500/40 bg-emerald-500/10"
                : "border-rose-500/40 bg-rose-500/10"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Verdict · {sample.product}</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {scanning ? "Inspecting…" : verdictOk ? "Pass" : `Reject · ${defectsKept.length} defect${defectsKept.length > 1 ? "s" : ""}`}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {scanning
              ? "Running the trained model on this image."
              : verdictOk
                ? "No defect above the confidence threshold."
                : "The part would be flagged and pulled from the line."}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-baseline justify-between">
            <label htmlFor="conf-threshold" className="text-sm font-semibold text-white">
              Confidence threshold
            </label>
            <span className="font-mono text-sm text-cyan-300">{threshold.toFixed(2)}</span>
          </div>
          <input
            id="conf-threshold"
            type="range"
            min={0.1}
            max={0.95}
            step={0.01}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="mt-3 w-full accent-cyan-400"
          />
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Drag it down to see weaker guesses appear. Drag it up and only very confident detections stay. On the line, this is
            tuned per product.
          </p>
          <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={showProduct}
              onChange={(e) => setShowProduct(e.target.checked)}
              className="h-4 w-4 accent-cyan-400"
            />
            Show product outline
          </label>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm font-semibold text-white">
            Detections <span className="font-normal text-slate-400">({kept.length} of {detections.length} kept)</span>
          </p>
          <ul className="mt-3 space-y-2.5">
            {listed.map((d, i) => {
              const on = d.confidence >= threshold;
              return (
                <li key={i} className={`transition-opacity ${on ? "opacity-100" : "opacity-35"}`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-medium capitalize text-slate-200">
                      <span className={`h-2 w-2 rounded-full ${isDefect(d) ? "bg-rose-500" : "bg-cyan-300"}`} />
                      {d.label}
                      {!on && <span className="text-[10px] font-normal normal-case text-slate-500">filtered</span>}
                    </span>
                    <span className="font-mono text-slate-300">{Math.round(d.confidence * 100)}%</span>
                  </div>
                  <div className="relative mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${isDefect(d) ? "bg-rose-500" : "bg-cyan-400"}`}
                      style={{ width: pct(d.confidence) }}
                    />
                    <div className="absolute inset-y-0 w-0.5 bg-white" style={{ left: pct(threshold) }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
