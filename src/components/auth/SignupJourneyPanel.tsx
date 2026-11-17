import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BarChart3, Boxes, Cpu, FileCheck2, PenTool, ScanSearch } from "lucide-react";

/**
 * Dark side panel for sign-up: a small Playground scene plays on a loop — a box is drawn around a
 * defect (Label), the model learns (Train), it finds the defects itself (Test), and the result
 * becomes a report (Report). On small screens only the logo and a short line show above the form.
 */

const STAGES = [
  { id: "label", label: "Label", icon: PenTool, caption: "Draw a box around each defect" },
  { id: "train", label: "Train", icon: Cpu, caption: "Your model learns from your boxes" },
  { id: "test", label: "Test", icon: ScanSearch, caption: "It finds defects on photos it never saw" },
  { id: "report", label: "Report", icon: FileCheck2, caption: "Share the results with your team" },
] as const;

const STAGE_MS = 3400;

/** Defects on the drawn circuit board, in the board's 320 × 200 units */
const DEFECTS = [
  { x: 58, y: 44, w: 34, h: 30, name: "missing hole", score: 96 },
  { x: 186, y: 118, w: 40, h: 26, name: "short", score: 91 },
  { x: 244, y: 4, w: 30, h: 22, name: "mouse bite", score: 88 },
];

const LIME = "#e9ff65";

/** A plain circuit board with a few parts, drawn so the boxes have something to sit on */
const Board: React.FC = () => (
  <g>
    <rect x="6" y="6" width="308" height="188" rx="10" fill="#21402c" stroke="#3d6a48" strokeWidth="1.5" />
    {/* Traces */}
    <g stroke="#4f8a5c" strokeWidth="2" fill="none" opacity="0.7">
      <path d="M20 100 H110 V60 H170" />
      <path d="M20 140 H150 V130 H230" />
      <path d="M120 170 V150 H290" />
      <path d="M200 20 V80 H300" />
      <path d="M60 180 V120 H100" />
    </g>
    {/* Chips */}
    <rect x="120" y="70" width="58" height="40" rx="3" fill="#152219" stroke="#5c7a5f" />
    <g fill="#9aa69a">
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={`t${i}`} x={126 + i * 11} y="64" width="4" height="6" />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={`b${i}`} x={126 + i * 11} y="110" width="4" height="6" />
      ))}
    </g>
    <rect x="230" y="150" width="44" height="26" rx="3" fill="#152219" stroke="#5c7a5f" />
    <rect x="30" y="20" width="22" height="12" rx="2" fill="#b98b4a" />
    <rect x="270" y="96" width="22" height="12" rx="2" fill="#b98b4a" />
    {/* Drilled holes: one is missing (the first defect) */}
    <g fill="#0f1712" stroke="#c9b27a" strokeWidth="2">
      <circle cx="40" cy="60" r="5" />
      <circle cx="98" cy="58" r="5" />
      <circle cx="40" cy="160" r="5" />
      <circle cx="290" cy="130" r="5" />
    </g>
    <circle cx="75" cy="59" r="5" fill="none" stroke="#c9b27a" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
    {/* A short between two traces (second defect) */}
    <path d="M196 131 L216 131" stroke="#d8c26a" strokeWidth="5" strokeLinecap="round" />
    {/* A bite out of the board edge (third defect) */}
    <path d="M250 6 q9 22 18 0" fill="rgb(23,31,27)" />
  </g>
);

/** A box's name, above it, or under it when the box is at the top edge */
const Tag: React.FC<{ x: number; y: number; h?: number; text: string; solid?: boolean }> = ({ x, y, h = 0, text, solid }) => (
  <g transform={`translate(${Math.min(x, 310 - (text.length * 5.6 + 10))} ${y < 16 ? y + h + 2 : y - 13})`}>
    <rect width={text.length * 5.6 + 10} height="12" rx="2" fill={solid ? LIME : "rgba(233,255,101,0.18)"} />
    <text x="5" y="9" fontSize="8" fontFamily="ui-monospace, monospace" fill={solid ? "#171f1b" : LIME}>
      {text}
    </text>
  </g>
);

/** What plays over the board in each stage */
const Scene: React.FC<{ stage: number; reduced: boolean }> = ({ stage, reduced }) => {
  const d = reduced ? 0 : 1;
  return (
    <svg viewBox="0 0 320 200" className="block h-auto w-full" role="img" aria-label={STAGES[stage].caption}>
      <Board />
      {/* Scenes crossfade (no waiting on the old one to leave, so a paused tab can't get stuck) */}
      <AnimatePresence initial={false}>
        {stage === 0 && (
          <motion.g key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* The box being drawn, corner to corner, then its name */}
            <motion.rect
              x={DEFECTS[0].x}
              y={DEFECTS[0].y}
              fill="rgba(233,255,101,0.08)"
              stroke={LIME}
              strokeWidth="2"
              strokeDasharray="5 3"
              initial={{ width: 0, height: 0 }}
              animate={{ width: DEFECTS[0].w, height: DEFECTS[0].h }}
              transition={{ duration: 1.1 * d, delay: 0.3 * d, ease: "easeInOut" }}
            />
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 * d }}>
              <Tag x={DEFECTS[0].x} y={DEFECTS[0].y} text={DEFECTS[0].name} />
            </motion.g>
            {/* The pointer drawing it */}
            <motion.path
              d="M0 0 L0 14 L4 10 L8 17 L10 16 L6 9 L11 9 Z"
              fill="#fff"
              stroke="#171f1b"
              strokeWidth="1"
              initial={{ x: DEFECTS[0].x - 2, y: DEFECTS[0].y - 2 }}
              animate={{ x: DEFECTS[0].x + DEFECTS[0].w - 2, y: DEFECTS[0].y + DEFECTS[0].h - 2 }}
              transition={{ duration: 1.1 * d, delay: 0.3 * d, ease: "easeInOut" }}
            />
          </motion.g>
        )}

        {stage === 1 && (
          <motion.g key="train" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <rect x="6" y="6" width="308" height="188" rx="10" fill="rgba(10,16,12,0.45)" />
            {/* Scanning passes over the board while it learns */}
            {!reduced && (
              <motion.rect
                x="6"
                width="308"
                height="3"
                fill={LIME}
                style={{ filter: "drop-shadow(0 0 6px #e9ff65)" }}
                initial={{ y: 8, opacity: 0.8 }}
                animate={{ y: [8, 188, 8] }}
                transition={{ duration: 2.4, ease: "linear", repeat: Infinity }}
              />
            )}
          </motion.g>
        )}

        {stage === 2 && (
          <motion.g key="test" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {DEFECTS.map((b, i) => (
              <motion.g
                key={b.name}
                initial={{ opacity: 0, scale: 1.4 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: (0.3 + i * 0.45) * d, type: "spring", stiffness: 260, damping: 18 }}
                style={{ transformOrigin: `${b.x + b.w / 2}px ${b.y + b.h / 2}px` }}
              >
                <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="rgba(233,255,101,0.1)" stroke={LIME} strokeWidth="2" rx="2" />
                <Tag x={b.x} y={b.y} h={b.h} text={`${b.name} ${b.score}%`} solid />
              </motion.g>
            ))}
          </motion.g>
        )}

        {stage === 3 && (
          <motion.g key="report" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <rect x="6" y="6" width="308" height="188" rx="10" fill="rgba(10,16,12,0.35)" />
            {DEFECTS.map((b) => (
              <rect key={b.name} x={b.x} y={b.y} width={b.w} height={b.h} fill="rgba(233,255,101,0.08)" stroke={LIME} strokeWidth="1.5" rx="2" opacity="0.75" />
            ))}
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
};

/** The numbers under the board: epochs while training, the score while testing, the report summary */
const Readout: React.FC<{ stage: number; reduced: boolean }> = ({ stage, reduced }) => {
  const [epoch, setEpoch] = useState(1);
  useEffect(() => {
    if (stage !== 1) return;
    if (reduced) {
      setEpoch(50);
      return;
    }
    setEpoch(1);
    const timer = window.setInterval(() => setEpoch((e) => (e >= 50 ? 50 : e + 2)), 55);
    return () => window.clearInterval(timer);
  }, [stage, reduced]);

  return (
    <div className="flex h-[52px] items-center">
      <AnimatePresence mode="wait">
        {stage === 0 && (
          <motion.p key="r0" className="font-mono text-xs text-[#a4b797]" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            1 box drawn · <span className="text-[#e9ff65]">missing hole</span>
          </motion.p>
        )}
        {stage === 1 && (
          <motion.div key="r1" className="w-full space-y-1.5" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            <div className="flex justify-between font-mono text-xs text-[#a4b797]">
              <span>Training on GPU · epoch {epoch} of 50</span>
              <span className="text-[#e9ff65]">{Math.round((epoch / 50) * 100)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#33433a]">
              <div className="h-full rounded-full bg-[#e9ff65] transition-[width] duration-75" style={{ width: `${(epoch / 50) * 100}%` }} />
            </div>
          </motion.div>
        )}
        {stage === 2 && (
          <motion.p key="r2" className="font-mono text-xs text-[#a4b797]" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            <span className="text-[#e9ff65]">3 defects found</span> on a photo it never saw
          </motion.p>
        )}
        {stage === 3 && (
          <motion.div
            key="r3"
            className="flex w-full items-center gap-3 rounded-lg border border-[#425140] bg-[#242f27] px-3 py-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <BarChart3 className="h-5 w-5 shrink-0 text-[#e9ff65]" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#f5f5ee]">Inspection report</p>
              <p className="font-mono text-[11px] text-[#a4b797]">3 of 3 defects found · ready to share</p>
            </div>
            <span className="rounded bg-[#e9ff65] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#171f1b]">PDF</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const SignupJourneyPanel: React.FC = () => {
  const reduced = !!useReducedMotion();
  const [stage, setStage] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => setStage((s) => (s + 1) % STAGES.length), STAGE_MS);
    return () => window.clearTimeout(timer);
  }, [stage, paused]);

  return (
    <aside
      className="relative order-first flex flex-col overflow-hidden px-6 py-5 text-[#f5f5ee] lg:order-last lg:sticky lg:top-0 lg:h-screen lg:min-h-[640px] lg:px-14 lg:py-8"
      style={{ background: "rgb(23, 31, 27)", fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      {/* Soft moving glow behind everything */}
      {!reduced && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-32 hidden h-[28rem] w-[28rem] rounded-full lg:block"
          style={{ background: "radial-gradient(circle, rgba(233,255,101,0.14), transparent 65%)" }}
          animate={{ x: [0, -60, 0], y: [0, 50, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden opacity-[0.07] lg:block"
        style={{ backgroundImage: "radial-gradient(#e9ff65 1px, transparent 1px)", backgroundSize: "22px 22px" }}
      />

      <Link to="/" className="relative text-2xl font-extrabold tracking-tight" aria-label="Vision-M home">
        Vision-M<span className="ml-1 inline-block h-2 w-2 bg-[#88a530]" />
      </Link>

      {/* Centred column; the app window below grows with the screen's height so it fills the space without spilling */}
      <div className="relative mx-auto hidden min-h-0 w-full max-w-[600px] flex-1 flex-col justify-center gap-5 py-4 lg:flex">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#e9ff65]">Vision-M Playground</p>
          <h2 className="mt-2 text-4xl font-normal leading-[1.05] tracking-tight xl:text-[42px]">
            Teach a machine
            <br />
            to{" "}
            <em className="bg-[#e9ff65] px-1.5 pb-0.5 not-italic text-[#171c1b]">see defects.</em>
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[#b9c7b2]">
            Label real inspection photos, train your own model and test it, all in your browser. No code needed.
          </p>
        </div>

        <div style={{ width: "min(100%, max(320px, calc((100vh - 510px) * 1.6)))" }} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          {/* The app window */}
          <motion.div
            className="overflow-hidden rounded-xl border border-[#425140] bg-[#1c2620] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]"
            initial={reduced ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div className="flex items-center gap-1.5 border-b border-[#33433a] px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#425140]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#425140]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#425140]" />
              <span className="ml-3 font-mono text-[11px] text-[#7f927a]">PCB defect check</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={stage}
                  className="ml-auto rounded bg-[#e9ff65]/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[#e9ff65]"
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                >
                  {STAGES[stage].label}
                </motion.span>
              </AnimatePresence>
            </div>
            <div className="p-2.5">
              <Scene stage={stage} reduced={reduced} />
              <div className="mt-2 px-1">
                <Readout stage={stage} reduced={reduced} />
              </div>
            </div>
          </motion.div>

          {/* The four steps, the current one lit, with a bar filling towards the next */}
          <ol className="mt-4 grid grid-cols-4 gap-2" aria-label="What you'll do in the Playground">
            {STAGES.map((s, i) => {
              const Icon = s.icon;
              const active = i === stage;
              return (
                <li key={s.id}>
                  <button type="button" className="group w-full text-left" onClick={() => setStage(i)} aria-current={active ? "step" : undefined}>
                    <div className="h-1 overflow-hidden rounded-full bg-[#33433a]">
                      {active ? (
                        <motion.div
                          key={`bar-${stage}`}
                          className="h-full bg-[#e9ff65]"
                          initial={{ width: reduced || paused ? "100%" : "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: reduced || paused ? 0 : STAGE_MS / 1000, ease: "linear" }}
                        />
                      ) : (
                        <div className={i < stage ? "h-full w-full bg-[#88a530]" : "h-full w-0"} />
                      )}
                    </div>
                    <span
                      className={`mt-2 flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                        active ? "text-[#e9ff65]" : "text-[#7f927a] group-hover:text-[#b9c7b2]"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {s.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-2 min-h-[1.25rem] text-sm text-[#b9c7b2]" aria-live="polite">
            {STAGES[stage].caption}
          </p>
        </div>

        <ul className="grid grid-cols-3 gap-3 text-xs text-[#a4b797] [@media(max-height:900px)]:hidden">
          {[
            { icon: Boxes, text: "Ready-made industry samples to start with" },
            { icon: Cpu, text: "Models trained on cloud GPUs" },
            { icon: FileCheck2, text: "Reports you can download and share" },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-2 rounded-lg border border-[#33433a] bg-[#1c2620]/60 p-2.5">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#88a530]" aria-hidden="true" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative hidden text-xs text-[#9aad95] lg:block">Machine vision. Human possibilities.</p>
      <p className="relative mt-1 text-sm text-[#a4b797] lg:hidden">Teach a machine to see defects. No code needed.</p>
    </aside>
  );
};
