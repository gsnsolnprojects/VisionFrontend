import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { motion, useInView } from "framer-motion";
import type { LucideIcon } from "lucide-react";

/* Building blocks shared by the Vision-M and Vision-M Studio demos. */

export function Section({
  id,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: ReactNode;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
        className="mb-10 max-w-3xl"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h2>
        {subtitle && <p className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg">{subtitle}</p>}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {children}
      </motion.div>
    </section>
  );
}

/** Muted looping video that only downloads/plays while on screen. */
export function AutoVideo({
  src,
  poster,
  className,
  style,
  startAt = 0,
}: {
  src: string;
  poster?: string;
  className?: string;
  style?: CSSProperties;
  startAt?: number;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (inView) v.play().catch(() => undefined);
    else v.pause();
  }, [inView]);
  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      className={className}
      style={style}
      // Also re-applies after each loop, so the empty intro frames never show.
      onTimeUpdate={(e) => {
        if (e.currentTarget.currentTime < startAt) e.currentTarget.currentTime = startAt;
      }}
    />
  );
}

/** Shows only the camera feed region of a screen recording (crop given as fractions of the frame). */
export function CroppedVideo({
  src,
  poster,
  frame,
  crop,
  startAt,
}: {
  src: string;
  poster: string;
  frame: { w: number; h: number };
  crop: { x: number; y: number; w: number; h: number };
  startAt?: number;
}) {
  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: `${crop.w * frame.w} / ${crop.h * frame.h}` }}>
      <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <AutoVideo
        src={src}
        startAt={startAt}
        className="absolute max-w-none"
        style={{
          width: `${100 / crop.w}%`,
          left: `${(-crop.x / crop.w) * 100}%`,
          top: `${(-crop.y / crop.h) * 100}%`,
        }}
      />
    </div>
  );
}

export function LiveBadge({ label = "Live recording" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
      </span>
      {label}
    </span>
  );
}

export interface Benefit {
  Icon: LucideIcon;
  title: string;
  text: string;
}

export function ProductHero({
  badge,
  title,
  text,
  actions,
  visual,
  caption,
  benefits,
  layout = "split",
}: {
  badge: ReactNode;
  title: ReactNode;
  text: string;
  actions: ReactNode;
  visual: ReactNode;
  caption?: string;
  benefits: Benefit[];
  /** "split": text left, framed visual right. "stacked": text on top, full-width unframed visual below. */
  layout?: "split" | "stacked";
}) {
  const stacked = layout === "stacked";
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_85%_0%,rgba(14,165,233,0.25),transparent_60%),radial-gradient(700px_400px_at_0%_20%,rgba(59,130,246,0.18),transparent_65%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />

      <div
        className={`relative mx-auto grid w-full max-w-6xl items-center px-4 pt-10 sm:px-6 lg:pt-16 ${
          stacked ? "gap-10 pb-12 lg:pb-16" : "gap-12 pb-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:pb-24"
        }`}
      >
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200">
            {badge}
          </span>
          <h1 className="mt-5 text-5xl font-extrabold tracking-tight text-white sm:text-6xl">{title}</h1>
          <p className={`mt-5 text-lg leading-relaxed text-slate-300 sm:text-xl ${stacked ? "max-w-3xl" : "max-w-xl"}`}>{text}</p>
          <div className="mt-8 flex flex-wrap gap-3">{actions}</div>
        </motion.div>

        {stacked ? (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }} className="min-w-0">
            {visual}
            {caption && <p className="mt-3 text-center text-xs text-slate-500">{caption}</p>}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, rotateX: 8 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="relative [perspective:1200px]"
          >
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-tr from-cyan-500/30 via-sky-500/10 to-blue-600/30 blur-3xl" />
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/60">{visual}</div>
            {caption && <p className="mt-3 text-center text-xs text-slate-500">{caption}</p>}
          </motion.div>
        )}
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4 lg:mb-4">
        {benefits.map(({ Icon, title: t, text: d }, i) => (
          <motion.div
            key={t}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="group bg-[#070d1d] px-5 py-6 transition-colors hover:bg-[#0a1428]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300 transition group-hover:scale-110">
              <Icon className="h-5 w-5" />
            </span>
            <p className="mt-4 font-semibold text-white sm:text-lg">{t}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400 sm:text-sm">{d}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export const primaryBtn =
  "inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:-translate-y-0.5 hover:shadow-cyan-500/50";
export const secondaryBtn =
  "inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-semibold text-slate-100 transition hover:-translate-y-0.5 hover:bg-white/10";

export function ClosingCta({ title, text, actions }: { title: string; text: string; actions: ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/20 via-sky-600/10 to-blue-700/20 p-8 text-center sm:p-14">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />
        <h2 className="relative text-3xl font-bold text-white sm:text-4xl">{title}</h2>
        <p className="relative mx-auto mt-4 max-w-xl text-slate-300">{text}</p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">{actions}</div>
      </div>
    </section>
  );
}
