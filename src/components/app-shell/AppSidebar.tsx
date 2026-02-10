import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useSidebar } from "./sidebar-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { ProtectedComponent } from "@/components/permissions/ProtectedComponent";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  ChevronRight,
  ChevronDown,
  Plus,
  FileText,
  Cpu,
  BrainCircuit,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AppSidebarProps {
  onNavigate?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { profile, isAdmin, company, loading: profileLoading, hasPermission, userRole } = useProfile();
  const { toast } = useToast();
  const { isOpen, toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  
  // Debug admin status in development (only when profile loading is complete)
  useEffect(() => {
    if (import.meta.env.DEV && !profileLoading) {
      console.log("[AppSidebar] Admin Status Check:", {
        hasProfile: !!profile,
        hasCompany: !!company,
        profileEmail: profile?.email,
        companyAdminEmail: company?.admin_email,
        companyFromProfile: profile?.companies?.admin_email,
        emailsMatch: profile?.email === company?.admin_email,
        emailsMatchWithProfile: profile?.email === profile?.companies?.admin_email,
        isAdmin,
        companyId: profile?.company_id,
        shouldShowTeam: isAdmin && profile?.company_id,
        shouldShowAddUser: isAdmin && profile?.company_id,
        loading: profileLoading,
      });
    }
  }, [profile, company, isAdmin, profileLoading]);

  const [projectsOpen, setProjectsOpen] = useState<boolean>(false);
  const [teamOpen, setTeamOpen] = useState<boolean>(false);
  const [manageOpen, setManageOpen] = useState<boolean>(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const companyId = profile?.company_id ?? null;

  // Load projects when company_id is available (optimized: don't wait for profileLoading)
  useEffect(() => {
    if (companyId) {
      const loadProjects = async () => {
        setLoadingProjects(true);
        try {
          const { data: projectsData, error } = await supabase
            .from("projects")
            .select("id, name, description")
            .eq("company_id", companyId)
            .order("created_at", { ascending: false });

          if (error) {
            console.error("Error loading projects:", error);
            return;
          }

          if (projectsData) setProjects(projectsData);
        } catch (err) {
          console.error("Error loading projects:", err);
        } finally {
          setLoadingProjects(false);
        }
      };

      loadProjects();
    } else {
      setProjects([]);
    }
  }, [companyId, location.pathname]);

  const openProject = (id: string) => navigate(`/dataset/${id}`);

  const handleCreateProject = () => {
    if (!companyId) {
      toast({
        title: "Company required",
        description: "Please create or join a company before creating a project.",
        variant: "destructive",
      });
      return;
    }
    navigate("/dashboard?action=create-project");
  };
  const handleSimulation = () => navigate("/dashboard?view=simulation");
  const handlePrediction = () => navigate("/project/prediction");

  const isActive = (path: string) => location.pathname === path;
  const isActiveStartsWith = (path: string) => location.pathname.startsWith(path);
  const viewParam = searchParams.get("view");

  const navItems = [
    {
      label: "Overview",
      icon: LayoutDashboard,
      href: "/dashboard",
      active: isActive("/dashboard") && 
              !location.pathname.includes("/dashboard/") && 
              (!viewParam || viewParam === "overview"),
    },
    {
      label: "Projects",
      icon: FolderKanban,
      href: "/dashboard/projects",
      active: isActiveStartsWith("/dashboard/projects") || isActiveStartsWith("/dataset/"),
      children: projects.length > 0 ? projects.map((p) => ({
        label: p.name,
        href: `/dataset/${p.id}`,
        active: location.pathname === `/dataset/${p.id}`,
      })) : [],
    },
    ...(hasPermission("manageWorkspaceUsers") && companyId
      ? [
          {
            label: "Team",
            icon: Users,
            href: "/dashboard/team",
            active: isActiveStartsWith("/dashboard/team"),
            children: [
              {
                label: "Manage Members",
                href: "/dashboard/team/members",
                active: isActive("/dashboard/team/members"),
              },
            ],
          },
        ]
      : []),
  ];


  return (
    <>
      <aside className={cn(
        "border-r min-h-[calc(100vh-4rem)] h-full",
        "transition-all duration-300 ease-in-out",
        "bg-background dark:bg-background",
        "bg-slate-50/50",
        isOpen ? "w-64" : "w-16"
      )}>
        <nav className={cn("h-full flex flex-col", isOpen ? "p-4 space-y-1" : "p-3 space-y-2")}>
          {/* Sidebar Toggle Button - Above Overview */}
          {!isMobile && (
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "mb-2 transition-all duration-200 flex-shrink-0",
                      isOpen ? "w-full justify-start" : "w-full justify-center p-0"
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      toggleSidebar();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleSidebar();
                      }
                    }}
                    aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
                    aria-expanded={isOpen}
                  >
                    {isOpen ? (
                      <>
                        <Menu className="h-5 w-5" />
                        <span className="ml-2">Menu</span>
                      </>
                    ) : (
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 dark:bg-primary/20 border border-primary/20 hover:bg-primary/20 dark:hover:bg-primary/30 hover:scale-105 transition-all duration-200">
                        <Menu className="h-5 w-5 text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]" />
                      </div>
                    )}
                  </Button>
                </TooltipTrigger>
                {!isOpen && (
                  <TooltipContent side="right" className="ml-2">
                    <p>Menu</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}

          <div className="flex-1 overflow-y-auto">
            <TooltipProvider>
              {navItems.map((item) => {
                const Icon = item.icon;
                const hasChildren = item.children && item.children.length > 0;
                const isProjectsExpanded = projectsOpen && item.label === "Projects";
                const isTeamExpanded = teamOpen && item.label === "Team";

                const navButton = (
                  <Button
                    variant={item.active ? "secondary" : "ghost"}
                    className={cn(
                      "transition-all duration-200",
                      isOpen ? "w-full justify-start" : "w-full justify-center p-0",
                      !isOpen && "h-auto",
                      item.active && isOpen && cn(
                        "bg-primary/10 dark:bg-primary/20",
                        "bg-primary/15",
                        "border-l-2 border-l-primary"
                      )
                    )}
                    onClick={() => {
                      if (item.label === "Overview") {
                        // Always navigate to clean /dashboard route
                        navigate("/dashboard", { replace: false });
                        onNavigate?.();
                      } else if (item.label === "Projects") {
                        if (!isOpen) {
                          toggleSidebar();
                        } else {
                          setProjectsOpen(!projectsOpen);
                          if (projectsOpen) setManageOpen(false);
                        }
                      } else if (item.label === "Team") {
                        if (!isOpen) {
                          toggleSidebar();
                        } else {
                          setTeamOpen(!teamOpen);
                        }
                      } else if (!hasChildren) {
                        navigate(item.href);
                        onNavigate?.();
                      }
                    }}
                  >
                    {isOpen ? (
                      <>
                        <Icon className="h-4 w-4 flex-shrink-0 mr-2" />
                        <span>{item.label}</span>
                        {hasChildren && (
                          <span className="ml-auto">
                            {(isProjectsExpanded || isTeamExpanded) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </span>
                        )}
                      </>
                    ) : (
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200",
                        "bg-primary/10 dark:bg-primary/20",
                        "border border-primary/20",
                        "hover:bg-primary/20 dark:hover:bg-primary/30",
                        "hover:scale-105",
                        item.active && cn(
                          "bg-primary/20 dark:bg-primary/30",
                          "border-primary/40",
                          "shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
                        )
                      )}>
                        <Icon className={cn(
                          "h-5 w-5 text-primary transition-all duration-200",
                          "drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]",
                          item.active && "drop-shadow-[0_0_12px_hsl(var(--primary)/0.7)]"
                        )} />
                      </div>
                    )}
                  </Button>
                );

                return (
                  <div key={item.label}>
                    {isOpen ? (
                      navButton
                    ) : (
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          {navButton}
                        </TooltipTrigger>
                        <TooltipContent side="right" className="ml-2">
                          <p>{item.label}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                  {/* Team submenu */}
                  {item.label === "Team" && isTeamExpanded && isOpen && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.children?.map((child) => (
                        <Button
                          key={child.href}
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "w-full justify-start",
                            child.active && cn(
                              "bg-primary/10 dark:bg-primary/20",
                              "bg-primary/15",
                              "border-l-2 border-l-primary"
                            )
                          )}
                          onClick={() => {
                            navigate(child.href!);
                            onNavigate?.();
                          }}
                        >
                          {child.label}
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Projects submenu */}
                  {item.label === "Projects" && isProjectsExpanded && isOpen && (
                    <div className="ml-6 mt-1 space-y-1">
                      <ProtectedComponent requiredPermission="manageProjects">
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={handleCreateProject}
                            disabled={!companyId}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Create Project
                          </Button>
                        {!companyId && (
                          <div
                            className="absolute inset-0 cursor-not-allowed"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toast({
                                title: "Company required",
                                description: "Please create or join a company before creating a project.",
                                variant: "destructive",
                              });
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          />
                        )}
                        </div>
                      </ProtectedComponent>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setManageOpen(!manageOpen)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Manage Projects
                        <span className="ml-auto">
                          {manageOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </span>
                      </Button>

                      {manageOpen && (
                        <div className="ml-4 mt-1 space-y-1 max-h-60 overflow-auto">
                          {loadingProjects && (
                            <div className="px-4 py-2 text-xs text-muted-foreground">
                              Loading...
                            </div>
                          )}

                          {!loadingProjects && projects.length === 0 && (
                            <div className="px-4 py-2 text-xs text-muted-foreground">
                              No projects yet
                            </div>
                          )}

                          {!loadingProjects &&
                            projects.map((p) => (
                              <Button
                                key={p.id}
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "w-full justify-start",
                                  location.pathname === `/dataset/${p.id}` && cn(
                                    "bg-primary/10 dark:bg-primary/20",
                                    "bg-primary/15",
                                    "border-l-2 border-l-primary"
                                  )
                                )}
                                onClick={() => {
                                  openProject(p.id);
                                  onNavigate?.();
                                }}
                              >
                                <span className="truncate">{p.name}</span>
                              </Button>
                            ))}
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={handleSimulation}
                      >
                        <Cpu className="mr-2 h-4 w-4" />
                        Simulation
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "w-full justify-start",
                          location.pathname === "/project/prediction" && cn(
                            "bg-primary/10 dark:bg-primary/20",
                            "bg-primary/15",
                            "border-l-2 border-l-primary"
                          )
                        )}
                        onClick={handlePrediction}
                      >
                        <BrainCircuit className="mr-2 h-4 w-4" />
                        Prediction (Testing)
                      </Button>

                    </div>
                  )}
                </div>
              );
            })}
            </TooltipProvider>
          </div>
        </nav>
      </aside>
    </>
  );
};

