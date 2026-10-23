import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams, matchPath } from "react-router-dom";
import { BookOpen, CreditCard, FileBarChart, FlaskConical, GraduationCap, Images, LayoutDashboard, Menu, type LucideIcon } from "lucide-react";
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
 * project (the one open now, else the last one opened, else the newest; switch projects in the
 * project page's mission bar), resources and the plan card. Other workspaces keep AppSidebar's
 * menu.
 */

interface Project {
  id: string;
  name: string;
}

type Step = "label" | "train" | "test" | "report";

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

  const routeProjectId = matchPath("/dataset/:id", location.pathname)?.params.id ?? null;
  const step: Step | null = routeProjectId
    ? (["train", "test", "report"].includes(searchParams.get("step") ?? "")
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
    {
      label: "Reports",
      Icon: FileBarChart,
      active: location.pathname === "/reports" || step === "report",
      onClick: () => go("/reports"),
    },
  ];
  const resources: Item[] = [
    {
      label: "Learning centre",
      Icon: BookOpen,
      active: location.pathname === "/learn",
      onClick: () => go("/learn"),
    },
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
              {workspace.map(renderItem)}
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
