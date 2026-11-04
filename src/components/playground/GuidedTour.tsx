import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { firstLevelStart, getLevels } from "@/lib/api/levels";
import { cn } from "@/lib/utils";

/**
 * A walkthrough: dims the page, lights up one element at a time (found by its data-tour attribute)
 * and explains it in a popup, with Next, Back and Skip. A step with no target is a card in the middle
 * of the screen; a step whose element isn't on the page is left out.
 */

export interface TourStep {
  /** The element's data-tour value */
  target?: string;
  title: string;
  text: string;
}

/**
 * Opens a page's walkthrough by itself the first time a student gets there, once the page is `ready`;
 * setOpen(true) replays it. "First time" goes by when they first started a level, so an account reset
 * to fresh sees it again. Remembered in this browser.
 */
export function useFirstTimeTour(name: string, ready: boolean): [boolean, (open: boolean) => void] {
  const { user } = useProfile();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready || !user?.id) return;
    let cancelled = false;
    let timer: number | undefined;
    getLevels()
      .then(({ levels }) => {
        if (cancelled) return;
        const seenKey = `visionm_tour_${name}_${user.id}_${firstLevelStart(levels)}`;
        try {
          if (localStorage.getItem(seenKey)) return;
        } catch {
          // without storage it may open again: only a convenience
        }
        // Lets the page's photos and lists appear first. Counts as seen only once it opens, as the
        // student may already have moved on
        timer = window.setTimeout(() => {
          setOpen(true);
          try {
            localStorage.setItem(seenKey, "1");
          } catch {
            // as above
          }
        }, 1200);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [name, ready, user?.id]);

  return [open, setOpen];
}

const GAP = 14;
const EDGE = 16;
const POPUP_WIDTH = 380;

const findTarget = (step?: TourStep) => (step?.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null);
const isShown = (step: TourStep) => !step.target || !!findTarget(step);

export const GuidedTour: React.FC<{ steps: TourStep[]; open: boolean; onClose: () => void }> = ({ steps, open, onClose }) => {
  const [shown, setShown] = useState<TourStep[]>([]);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [popupHeight, setPopupHeight] = useState(0);
  const popupRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setShown(steps.filter(isShown));
    setIndex(0);
  }, [open, steps]);

  const step = open ? shown[index] : undefined;
  const isLast = index === shown.length - 1;

  const measure = useCallback(() => {
    const el = findTarget(step);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step]);

  // Bring the element into view, then follow it while the page settles or moves
  useEffect(() => {
    if (!step) return;
    const el = findTarget(step);
    el?.scrollIntoView({ block: "center" });
    measure();
    const settle = [120, 300, 600].map((ms) => window.setTimeout(measure, ms));
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      settle.forEach(window.clearTimeout);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step, measure]);

  useLayoutEffect(() => {
    if (popupRef.current) setPopupHeight(popupRef.current.offsetHeight);
    nextRef.current?.focus({ preventScroll: true });
  }, [step]);

  const goNext = useCallback(() => {
    // Looks again: something that has loaded since (like the labels list) joins the guide
    const fresh = steps.filter(isShown);
    const at = shown[index] ? fresh.indexOf(shown[index]) : -1;
    if (at >= fresh.length - 1) {
      onClose();
      return;
    }
    setShown(fresh);
    setIndex(at + 1);
  }, [index, shown, steps, onClose]);
  const goBack = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    if (!step) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, onClose, goNext, goBack]);

  if (!step) return null;

  const width = Math.min(POPUP_WIDTH, window.innerWidth - EDGE * 2);
  const height = popupHeight || 220;
  let style: React.CSSProperties = {
    width,
    left: (window.innerWidth - width) / 2,
    top: Math.max(EDGE, (window.innerHeight - height) / 2),
  };
  if (rect) {
    const below = rect.bottom + GAP;
    const above = rect.top - GAP - height;
    const maxTop = Math.max(EDGE, window.innerHeight - height - EDGE);
    let top = maxTop;
    let left = Math.min(Math.max(EDGE, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - EDGE);
    if (below >= EDGE && below <= maxTop) top = below;
    else if (above >= EDGE && above <= maxTop) top = above;
    else {
      // A tall element: beside it, if there's room, so the popup doesn't cover it
      const sideTop = Math.min(Math.max(EDGE, rect.top + rect.height / 2 - height / 2), maxTop);
      if (rect.right + GAP + width <= window.innerWidth - EDGE) {
        left = rect.right + GAP;
        top = sideTop;
      } else if (rect.left - GAP - width >= EDGE) {
        left = rect.left - GAP - width;
        top = sideTop;
      }
    }
    style = { width, left, top };
  }

  return createPortal(
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {/* Keeps clicks away from the page while the guide is open */}
      <div className={cn("absolute inset-0", !rect && "bg-black/60")} />
      {rect && (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-xl ring-2 ring-[#e9ff65] transition-all duration-300 motion-reduce:transition-none"
          style={{
            left: rect.left - 6,
            top: rect.top - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
          }}
        />
      )}
      <div
        ref={popupRef}
        className="absolute rounded-2xl border border-[#485840] bg-[#171f1b] p-5 text-[#f5f5ee] shadow-2xl transition-all duration-300 motion-reduce:transition-none"
        style={style}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the guide"
          className="absolute right-3 top-3 rounded-md p-1.5 text-[#bec9b0] transition-colors hover:bg-white/10 hover:text-[#f5f5ee]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e9ff65]">
          Step {index + 1} of {shown.length}
        </p>
        <h2 id="tour-title" className="mt-2 pr-6 text-lg font-bold tracking-tight">
          {step.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#bec9b0]">{step.text}</p>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10" aria-hidden>
          <div className="h-full rounded-full bg-[#e9ff65] transition-all duration-300" style={{ width: `${((index + 1) / shown.length) * 100}%` }} />
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button type="button" onClick={onClose} className="text-sm text-[#bec9b0] underline-offset-4 hover:text-[#f5f5ee] hover:underline">
            Skip guide
          </button>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <Button variant="ghost" size="sm" className="gap-1 text-[#f5f5ee] hover:bg-white/10 hover:text-[#f5f5ee]" onClick={goBack}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
              </Button>
            )}
            <Button ref={nextRef} size="sm" className="gap-1 bg-[#e9ff65] text-[#171f1b] hover:bg-[#e9ff65]/90" onClick={goNext}>
              {isLast ? "Got it" : "Next"}
              {isLast ? <Check className="h-4 w-4" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
