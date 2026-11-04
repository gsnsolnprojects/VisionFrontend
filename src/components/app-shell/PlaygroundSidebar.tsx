import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams, matchPath } from "react-router-dom";
import { BookOpen, ChevronDown, CreditCard, FileBarChart, FlaskConical, FolderOpen, GraduationCap, Images, LayoutDashboard, Menu, Settings, Sparkles, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { liveProjectFilter } from "@/lib/liveProjects";
import { useProfile } from "@/hooks/useProfile";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebar } from "./sidebar-context";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { guidedMissionForSample } from "@/components/dashboard/IndustryPicker";
import { getLevels, type LevelProgress } from "@/lib/api/levels";
import { getSamples, type SampleDataset } from "@/lib/api/samples";
import { cn } from "@/lib/utils";

/**
 * Sidebar for Playground workspaces: the overview, Level 1 (the samples the student has started) and
 * Level 2 (their projects), resources and the plan card. A sample or project opens to the same four
 * steps, which lead to it. Other workspaces keep AppSidebar's menu. With `preview`
 * (a company that hasn't chosen a plan yet): only Overview, Learning centre, Plan & billing and
 * Settings, and the plan card asks them to choose Playground.
 */

interface Project {
  id: string;
  name: string;
}

interface Item {
  label: string;
  Icon: LucideIcon;
  active: boolean;
  onClick?: () => void;
  soon?: boolean;
}

interface Group {
  key: string;
  level: 1 | 2;
  name: string;
  active: boolean;
  items: Item[];
}

const sameProject = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const lastProjectKey = (userId?: string) => `visionm_playground_last_project_${userId ?? "anon"}`;

export const PlaygroundSidebar: React.FC<{ onNavigate?: () => void; preview?: boolean }> = ({ onNavigate, preview = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { profile, user } = useProfile();
  const { isOpen, toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  const [projects, setProjects] = useState<Project[]>([]);
  const [levels, setLevels] = useState<LevelProgress[]>([]);
  const [samples, setSamples] = useState<SampleDataset[]>([]);
  /** The open level and the open sample or project in it; opening another closes them */
  const [openLevel, setOpenLevel] = useState<1 | 2 | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const routeProjectId = matchPath("/dataset/:id", location.pathname)?.params.id ?? null;
  const routeSampleId =
    matchPath("/level-1/:sampleId", location.pathname)?.params.sampleId ??
    matchPath("/practice/:sampleId", location.pathname)?.params.sampleId ??
    null;
  const stepParam = searchParams.get("step");

  useEffect(() => {
    if (!profile?.company_id) return;
    supabase
      .from("projects")
      .select("id, name")
      .eq("company_id", profile.company_id)
      .match(liveProjectFilter)
      .order("created_at", { ascending: false })
      .then(({ data }) => setProjects((data as Project[]) ?? []));
  }, [profile?.company_id, location.pathname]);

  useEffect(() => {
    if (preview) return;
    getLevels()
      .then(({ levels: list }) => setLevels(list))
      .catch(() => undefined);
    getSamples()
      .then(({ datasets }) => setSamples(datasets))
      .catch(() => undefined);
  }, [preview, location.pathname]);

  // Remember the project being worked on
  useEffect(() => {
    if (!routeProjectId) return;
    try {
      localStorage.setItem(lastProjectKey(user?.id), routeProjectId);
    } catch {
      // a convenience only
    }
  }, [routeProjectId, user?.id]);

  const go = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const onOverview = location.pathname === "/dashboard" && !searchParams.get("view");

  /** The four steps of a level or project; `isOn` says whether that step's page is open now */
  const stepItems = (paths: [string, string, string, string], isOn: (i: number) => boolean): Item[] =>
    [
      { label: "Dataset & labels", Icon: Images },
      { label: "Train a model", Icon: GraduationCap },
      { label: "Test & evaluate", Icon: FlaskConical },
      { label: "Reports", Icon: FileBarChart },
    ].map((item, i) => ({ ...item, active: isOn(i), onClick: () => go(paths[i]) }));

  const groups: Group[] = useMemo(() => {
    if (preview) return [];
    // Level 1 belongs to a GSN sample. The one open now shows even before its progress has come back.
    const levelOne = new Map<string, string>();
    for (const row of levels) {
      if (row.level !== 1 || !row.sample) continue;
      const sample = samples.find((d) => sameProject(d.project, row.sample ?? ""));
      if (sample) levelOne.set(sample.id, row.mission);
    }
    const openSample = routeSampleId ? samples.find((d) => d.id === routeSampleId) : null;
    if (openSample && !levelOne.has(openSample.id)) {
      levelOne.set(openSample.id, guidedMissionForSample(openSample.project)?.mission.title ?? openSample.name);
    }
    const levelOneStep = ["dataset", "training", "test", "report"].indexOf(stepParam === "practice" ? "dataset" : stepParam ?? "dataset");
    const projectStep = ["label", "train", "test", "report"].indexOf(stepParam ?? "label");
    return [
      ...[...levelOne.entries()].map(([id, mission]) => ({
        key: `level-1-${id}`,
        level: 1 as const,
        name: mission,
        active: routeSampleId === id,
        items: stepItems(
          [`/level-1/${id}?step=dataset`, `/level-1/${id}?step=training`, `/level-1/${id}?step=test`, `/level-1/${id}?step=report`],
          (i) => routeSampleId === id && levelOneStep === i
        ),
      })),
      ...projects.map((p) => ({
        key: `project-${p.id}`,
        level: 2 as const,
        name: p.name,
        active: routeProjectId === p.id,
        items: stepItems(
          [`/dataset/${p.id}`, `/dataset/${p.id}?step=train`, `/dataset/${p.id}?step=test`, `/dataset/${p.id}?step=report`],
          (i) => routeProjectId === p.id && projectStep === i
        ),
      })),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, levels, samples, projects, routeSampleId, routeProjectId, stepParam]);

  // The level or project on screen stays open as the student moves around in it
  const activeGroup = groups.find((g) => g.active) ?? null;
  const activeKey = activeGroup?.key ?? null;
  const activeLevel = activeGroup?.level ?? null;
  useEffect(() => {
    if (!activeKey) return;
    setOpenKey(activeKey);
    setOpenLevel(activeLevel);
  }, [activeKey, activeLevel]);

  const overview: Item = { label: "Overview", Icon: LayoutDashboard, active: onOverview, onClick: () => go("/dashboard") };
  const resources: Item[] = [
    {
      label: "Learning centre",
      Icon: BookOpen,
      active: location.pathname === "/learn",
      onClick: () => go("/learn"),
    },
    {
      label: preview ? "Plan & billing" : "Plan & usage",
      Icon: CreditCard,
      active: location.pathname.startsWith("/dashboard/settings/billing"),
      onClick: () => go("/dashboard/settings/billing"),
    },
    {
      label: "Settings",
      Icon: Settings,
      active:
        location.pathname.startsWith("/dashboard/settings") &&
        !location.pathname.startsWith("/dashboard/settings/billing"),
      onClick: () => go("/dashboard/settings"),
    },
  ];

  const renderItem = (item: Item) => {
    const button = (
      <button
        key={item.label}
        type="button"
        onClick={item.onClick}
        disabled={item.soon}
        aria-current={item.active ? "page" : undefined}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg text-sm transition-colors",
          isOpen ? "px-3 py-2.5" : "h-10 justify-center",
          item.active
            ? "border-l-2 border-l-primary bg-primary/15 font-medium text-foreground dark:bg-primary/20"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          item.soon && "cursor-not-allowed opacity-60 hover:bg-transparent hover:text-muted-foreground"
        )}
      >
        <item.Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {isOpen && <span className="flex-1 text-left">{item.label}</span>}
        {isOpen && item.soon && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">Soon</span>
        )}
      </button>
    );
    if (isOpen) return button;
    return (
      <Tooltip key={item.label} delayDuration={0}>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right">
          {item.label}
          {item.soon && " (soon)"}
        </TooltipContent>
      </Tooltip>
    );
  };

  const renderGroup = (group: Group) => {
    const open = openKey === group.key;
    return (
      <div key={group.key}>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpenKey(open ? null : group.key)}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted hover:text-foreground",
            group.active ? "font-medium text-foreground" : "text-muted-foreground"
          )}
        >
          <span className="min-w-0 flex-1 break-words">{group.name}</span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
        {open && <div className="ml-3 mt-1 space-y-1 border-l pl-2">{group.items.map(renderItem)}</div>}
      </div>
    );
  };

  const renderLevel = (level: 1 | 2, Icon: LucideIcon) => {
    const inLevel = groups.filter((g) => g.level === level);
    if (!inLevel.length) return null;
    const label = `Level ${level}`;
    const open = isOpen && openLevel === level;
    const button = (
      <button
        key={label}
        type="button"
        aria-expanded={open}
        onClick={() => {
          if (!isOpen) {
            toggleSidebar();
            setOpenLevel(level);
            return;
          }
          setOpenLevel(open ? null : level);
        }}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg text-sm transition-colors hover:bg-muted hover:text-foreground",
          isOpen ? "px-3 py-2.5" : "h-10 justify-center",
          inLevel.some((g) => g.active) ? "font-medium text-foreground" : "text-muted-foreground"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {isOpen && (
          <>
            <span className="flex-1 text-left">{label}</span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} aria-hidden="true" />
          </>
        )}
      </button>
    );
    return (
      <div key={label}>
        {isOpen ? (
          button
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        )}
        {open && <div className="ml-5 mt-1 space-y-1 border-l pl-2">{inLevel.map(renderGroup)}</div>}
      </div>
    );
  };

  return (
    <aside
      className={cn(
        "h-full min-h-[calc(100vh-4rem)] border-r bg-muted/25 transition-all duration-300 ease-in-out",
        isOpen ? "w-64" : "w-16"
      )}
    >
      <TooltipProvider>
        <nav className={cn("flex h-full flex-col", isOpen ? "p-4" : "p-3")} aria-label="Playground">
          {/* Product name (the header shows GSN's logo) and the collapse button */}
          <div className={cn("mb-5 flex shrink-0 items-start", isOpen ? "justify-between gap-2" : "justify-center")}>
            {isOpen && (
              <div className="px-1">
                <p className="text-xl font-bold tracking-tight text-foreground">Vision-M</p>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ring">Playground edition</p>
              </div>
            )}
            {!isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={toggleSidebar}
                aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
                aria-expanded={isOpen}
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto">
            <div className="space-y-1">
              {isOpen && (
                <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>
              )}
              {renderItem(overview)}
              {renderLevel(1, Sparkles)}
              {renderLevel(2, FolderOpen)}
            </div>

            <div className="space-y-1">
              {isOpen && (
                <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Resources</p>
              )}
              {resources.map(renderItem)}
            </div>
          </div>

          {isOpen && (
            <div className="mt-4 rounded-xl border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">{preview ? "Unlock the Playground" : "Playground subscription"}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                ₹999 <span className="text-xs font-normal text-muted-foreground">/ month</span>
              </p>
              <p className="text-[11px] text-muted-foreground">+ applicable taxes</p>
              <button
                type="button"
                onClick={() => go("/dashboard/settings/billing")}
                className="mt-3 text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                {preview ? "Choose Playground →" : "Explore your plan →"}
              </button>
            </div>
          )}
        </nav>
      </TooltipProvider>
    </aside>
  );
};
