import React from "react";

/** What a level's step is about, in plain words */
export const StepGuide: React.FC<{ what: string; why: string }> = ({ what, why }) => (
  <div className="border-l-2 border-ring bg-secondary/40 px-4 py-3 text-sm">
    <p className="font-medium text-foreground">{what}</p>
    <p className="mt-1 text-muted-foreground">{why}</p>
  </div>
);
