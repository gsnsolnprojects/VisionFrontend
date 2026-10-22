import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams, matchPath } from "react-router-dom";
import { BookOpen, ChevronDown, CreditCard, FileBarChart, FlaskConical, GraduationCap, Images, LayoutDashboard, Menu, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { liveProjectFilter } from "@/lib/liveProjects";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebar } from "./sidebar-context";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Sidebar for Playground workspaces: the overview, the three steps of the current mission
 * project (the one open now, else the last one opened, else the newest), resources and the
 * plan card. Other workspaces keep AppSidebar's menu.
 */

interface Project {
  id: string;
  name: string;
}

type Step = "label" | "train" | "test";

interface Item {
  label: string;
  Icon: LucideIcon;
  active: boolean;
  onClick?: () => void;
  soon?: boolean;
}

const lastProjectKey = (userId?: string) => `visionm_playground_last_project_${userId ?? "anon"}`;

export const PlaygroundSidebar: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { profile, user } = useProfile();
  const { toast } = useToast();
  const { isOpen, toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  const [projects, setProjects] = useState<Project[]>([]);
  const [lastId, setLastId] = useState<string | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const routeProjectId = matchPath("/dataset/:id", location.pathname)?.params.id ?? null;
  const step: Step | null = routeProjectId
    ? ((searchParams.get("step") as Step | null) === "train" || searchParams.get("step") === "test"
        ? (searchParams.get("step") as Step)
        : "label")
    : null;

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
    try {
      setLastId(localStorage.getItem(lastProjectKey(user?.id)));
    } catch {
      setLastId(null);
    }
  }, [user?.id]);

  // Remember the project being worked on
  useEffect(() => {
    if (!routeProjectId) return;
    setLastId(routeProjectId);
    try {
      localStorage.setItem(lastProjectKey(user?.id), routeProjectId);
    } catch {
      // a convenience only
    }
  }, [routeProjectId, user?.id]);

  const current = useMemo(
    () =>
      projects.find((p) => p.id === routeProjectId) ??
      projects.find((p) => p.id === lastId) ??
      projects[0] ??
      null,
    [projects, routeProjectId, lastId]
  );

  const go = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const openStep = (target: Step) => {
    if (!current) {
      toast({ title: "Start a mission first", description: "Pick an industry and a challenge on the overview." });
      go("/dashboard");
      return;
    }
    go(target === "label" ? `/dataset/${current.id}` : `/dataset/${current.id}?step=${target}`);
  };

  const onOverview = location.pathname === "/dashboard" && !searchParams.get("view");
  const workspace: Item[] = [
    { label: "Overview", Icon: LayoutDashboard, active: onOverview, onClick: () => go("/dashboard") },
    { label: "Dataset & labels", Icon: Images, active: step === "label", onClick: () => openStep("label") },
    { label: "Train a model", Icon: GraduationCap, active: step === "train", onClick: () => openStep("train") },
    { label: "Test & evaluate", Icon: FlaskConical, active: step === "test", onClick: () => openStep("test") },
    { label: "Reports", Icon: FileBarChart, active: false, soon: true },
  ];
  const resources: Item[] = [
    { label: "Learning centre", Icon: BookOpen, active: false, soon: true },
    {
      label: "Plan & usage",
      Icon: CreditCard,
      active: location.pathname.startsWith("/dashboard/settings/billing"),
      onClick: () => go("/dashboard/settings/billing"),
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

  return (
    <aside
      className={cn(
        "h-full min-h-[calc(100vh-4rem)] border-r bg-muted/25 transition-all duration-300 ease-in-out",
        isOpen ? "w-64" : "w-16"
      )}
    >
      <TooltipProvider>
        <nav className={cn("flex h-full flex-col", isOpen ? "p-4" : "p-3")} aria-label="Playground">
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className={cn("mb-3 shrink-0", isOpen ? "w-full justify-start" : "w-full justify-center p-0")}
              onClick={toggleSidebar}
              aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
              aria-expanded={isOpen}
            >
              <Menu className="h-5 w-5" />
              {isOpen && <span className="ml-2">Menu</span>}
            </Button>
          )}

          {isOpen && (
            <div className="mb-5 px-1">
              <p className="text-lg font-bold tracking-tight text-foreground">Vision-M</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ring">Playground edition</p>
            </div>
          )}

          <div className="flex-1 space-y-6 overflow-y-auto">
            <div className="space-y-1">
              {isOpen && (
                <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>
              )}
              {renderItem(workspace[0])}

              {isOpen && current && (
                <div className="px-1 pb-1 pt-2">
                  <button
                    type="button"
                    onClick={() => projects.length > 1 && setSwitcherOpen((o) => !o)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md border bg-card px-2.5 py-1.5 text-left text-xs",
                      projects.length > 1 && "hover:border-ring/60"
                    )}
                    aria-expanded={switcherOpen}
                    title={projects.length > 1 ? "Switch project" : undefined}
                  >
                    <span className="min-w-0">
                      <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Project</span>
                      <span className="block truncate font-medium text-foreground">{current.name}</span>
                    </span>
                    {projects.length > 1 && <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", switcherOpen && "rotate-180")} />}
                  </button>
                  {switcherOpen && (
                    <ul className="mt-1 overflow-hidden rounded-md border bg-card text-xs">
                      {projects.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSwitcherOpen(false);
                              go(step && step !== "label" ? `/dataset/${p.id}?step=${step}` : `/dataset/${p.id}`);
                            }}
                            className={cn(
                              "block w-full truncate px-2.5 py-1.5 text-left hover:bg-muted",
                              p.id === current.id && "font-medium text-foreground"
                            )}
                          >
                            {p.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {workspace.slice(1).map(renderItem)}
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
              <p className="text-sm font-semibold text-foreground">Playground subscription</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                ₹999 <span className="text-xs font-normal text-muted-foreground">/ month</span>
              </p>
              <p className="text-[11px] text-muted-foreground">+ applicable taxes</p>
              <button
                type="button"
                onClick={() => go("/dashboard/settings/billing")}
                className="mt-3 text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                Explore your plan →
              </button>
            </div>
          )}
        </nav>
      </TooltipProvider>
    </aside>
  );
};
