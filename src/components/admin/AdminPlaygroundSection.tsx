import React from "react";
import { CloudUpload, Gauge, Library } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminSampleLibraryTab } from "./AdminSampleLibraryTab";
import { AdminPlaygroundTab } from "./AdminPlaygroundTab";
import { AdminPublishTab } from "./AdminPublishTab";

export type PlaygroundSection = "samples" | "industries" | "publish";

/**
 * Superadmin → Playground: everything about the Playground edition in one place, in the order it's
 * used: 1 choose the GSN samples students see, 2 set each industry's difficulty, 3 (only on the
 * local setup) pick what to copy to the live site.
 */
export const AdminPlaygroundSection: React.FC<{
  section: PlaygroundSection;
  onSectionChange: (section: PlaygroundSection) => void;
  showPublish: boolean;
}> = ({ section, onSectionChange, showPublish }) => {
  const sections = [
    {
      value: "samples" as const,
      label: "Samples",
      Icon: Library,
      hint: "Which GSN datasets students can use: name them, put them in an industry, show or hide them. A world's Level 1 uses its sample from here.",
    },
    {
      value: "industries" as const,
      label: "Industries",
      Icon: Gauge,
      hint: "The six worlds students choose from: how hard each one is, and whether its Level 1 sample is ready.",
    },
    ...(showPublish
      ? [
          {
            value: "publish" as const,
            label: "Publish to live",
            Icon: CloudUpload,
            hint: "Only on this computer. Tick the dataset versions to copy to the live site and save, then ask Claude to run the publish.",
          },
        ]
      : []),
  ];
  const current = sections.find((s) => s.value === section) ?? sections[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="Playground settings" className="lg:sticky lg:top-24 lg:self-start">
        <ol className="flex gap-2 overflow-x-auto lg:flex-col">
          {sections.map(({ value, label, Icon }, i) => {
            const active = value === current.value;
            return (
              <li key={value} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onSectionChange(value)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "border-ring bg-secondary font-medium text-foreground" : "border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px]",
                      active ? "bg-ring text-background" : "bg-secondary text-muted-foreground"
                    )}
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="whitespace-nowrap">{label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="min-w-0 space-y-4">
        <p className="rounded-lg border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            Step {sections.indexOf(current) + 1}: {current.label}.
          </span>{" "}
          {current.hint}
        </p>
        {current.value === "samples" && <AdminSampleLibraryTab />}
        {current.value === "industries" && <AdminPlaygroundTab />}
        {current.value === "publish" && <AdminPublishTab />}
      </div>
    </div>
  );
};
