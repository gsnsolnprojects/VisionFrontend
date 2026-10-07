import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

/** Counts up once per `ms` while the returned ref is on screen, so off-screen mock-ups stay idle. */
export function useTicker(ms: number) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.15 });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const iv = window.setInterval(() => setTick((t) => t + 1), ms);
    return () => window.clearInterval(iv);
  }, [inView, ms]);

  return { ref, tick };
}

/** Small deterministic pseudo-random generator, so every visitor sees the same believable pattern. */
export function seeded(seed: number) {
  let s = (seed * 7919 + 104729) % 2147483647;
  if (s <= 0) s += 2147483646;
  const next = () => (s = (s * 16807) % 2147483647) / 2147483647;
  // Small seeds give near-identical first values; burn a few so each machine/lift diverges.
  for (let i = 0; i < 8; i++) next();
  return next;
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
