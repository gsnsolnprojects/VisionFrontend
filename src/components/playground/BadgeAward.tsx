import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBadges, markBadgesSeen, onProgressSaved, type EarnedBadge } from "@/lib/api/badges";
import { BADGES, BadgeMedal, badgeInfo } from "./badges";

/**
 * Shows the award card when a badge has been earned, one card per badge. It looks whenever progress
 * is saved or the page changes, so a training that finished while the student was away still gets
 * its card. A card counts as shown once it's closed; until then it comes back on the next look.
 */

const SPARKS = 12;

/** A short burst around the medal when a whole level is finished */
const Sparks: React.FC = () => (
  <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2">
    {Array.from({ length: SPARKS }, (_, i) => {
      const angle = (i / SPARKS) * Math.PI * 2;
      return (
        <motion.span
          key={i}
          className="absolute h-2 w-2 rounded-full"
          style={{ background: i % 2 ? "#e9ff65" : "#f2c14e" }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: Math.cos(angle) * 92, y: Math.sin(angle) * 92, opacity: 0, scale: 0.4 }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
        />
      );
    })}
  </span>
);

export const BadgeAwardHost: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [queue, setQueue] = useState<EarnedBadge[]>([]);
  const [earnedCount, setEarnedCount] = useState(0);
  const continueRef = useRef<HTMLButtonElement>(null);
  const shownIds = useRef(new Set<string>());

  const look = useCallback(() => {
    getBadges()
      .then(({ badges }) => {
        setEarnedCount(badges.filter((b) => badgeInfo(b.id)).length);
        const fresh = badges.filter((b) => !b.seen && badgeInfo(b.id) && !shownIds.current.has(b.id));
        if (!fresh.length) return;
        fresh.forEach((b) => shownIds.current.add(b.id));
        setQueue((prev) => [...prev, ...fresh]);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => look(), [look, location.pathname, location.search]);
  useEffect(() => onProgressSaved(look), [look]);

  const current = queue[0];
  const info = current ? badgeInfo(current.id) : undefined;

  useEffect(() => {
    if (info) continueRef.current?.focus({ preventScroll: true });
  }, [info]);

  const currentId = current?.id;
  const close = useCallback(() => {
    if (currentId) void markBadgesSeen([currentId]);
    setQueue((prev) => prev.slice(1));
  }, [currentId]);

  useEffect(() => {
    if (!info) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [info, close]);

  if (!current || !info) return null;

  return createPortal(
    <div
      data-badge-award
      className="fixed inset-0 z-[190] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="badge-award-title"
    >
      <motion.div
        key={current.id}
        initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#485840] bg-[#171f1b] p-6 text-center text-[#f5f5ee] shadow-2xl md:p-8"
      >
        <div className="relative mx-auto flex w-fit justify-center">
          {info.milestone && !reduceMotion && <Sparks />}
          <motion.span
            className="inline-flex"
            initial={reduceMotion ? false : { scale: 0.3, rotate: -14 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 15 }}
          >
            <BadgeMedal badge={info} size={info.milestone ? 124 : 104} />
          </motion.span>
        </div>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e9ff65]">
          {info.milestone ? "Level complete" : "Badge earned"}
        </p>
        <h2 id="badge-award-title" className="mt-1.5 text-2xl font-bold tracking-tight">
          {info.name}
        </h2>
        {current.detail && <p className="mt-1 text-sm font-medium text-[#e9ff65]">{current.detail}</p>}
        <p className="mt-3 text-sm leading-relaxed text-[#bec9b0]">{info.learned}</p>
        {info.next && <p className="mt-2 text-sm font-medium text-[#f5f5ee]">{info.next}</p>}
        <p className="mt-4 text-xs text-[#bec9b0]">
          {earnedCount} of {BADGES.length} badges earned
        </p>
        <div className="mt-5 flex flex-col-reverse justify-center gap-2 sm:flex-row">
          <Button
            variant="ghost"
            className="text-[#f5f5ee] hover:bg-white/10 hover:text-[#f5f5ee]"
            onClick={() => {
              close();
              navigate("/achievements");
            }}
          >
            View all badges
          </Button>
          <Button ref={continueRef} className="gap-1.5 bg-[#e9ff65] text-[#171f1b] hover:bg-[#e9ff65]/90" onClick={close}>
            Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
