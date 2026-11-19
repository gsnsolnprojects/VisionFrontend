import React from "react";
import { cn } from "@/lib/utils";
import { DIFFICULTY_LABEL, type Difficulty } from "@/lib/api/playgroundIndustries";

const FILLED: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

/**
 * How hard a Playground industry is: three short segments (filled in the theme's olive) and the word,
 * in the same small mono caps as the card's "World / 04" so it sits quietly on the card.
 */
export const DifficultyBar: React.FC<{ difficulty: Difficulty; className?: string }> = ({ difficulty, className }) => {
  const filled = FILLED[difficulty];
  const label = DIFFICULTY_LABEL[difficulty];
  return (
    <span className={cn("inline-flex items-center gap-2", className)} aria-label={`Difficulty: ${label}`}>
      <span className="flex items-center gap-[3px]" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} className={cn("h-1.5 w-3.5 rounded-full", n <= filled ? "bg-ring" : "bg-border")} />
        ))}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground" aria-hidden="true">
        {label}
      </span>
    </span>
  );
};
