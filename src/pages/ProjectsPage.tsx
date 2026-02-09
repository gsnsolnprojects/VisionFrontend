import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { PageHeader } from "@/components/pages/PageHeader";
import { EmptyState } from "@/components/pages/EmptyState";
import { LoadingState } from "@/components/pages/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FolderKanban, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fadeInUpVariants } from "@/utils/animations";
import { safeText } from "@/lib/utils";
import { ProtectedComponent } from "@/components/permissions/ProtectedComponent";
import { DeleteProjectModal } from "@/components/dashboard/DeleteProjectModal";

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { sessionReady, user, profile, company, hasPermission, loading: profileLoading } = useProfile();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectToDelete, setProjectToDelete] = useState<{ companyName: string; projectName: string } | null>(null);

  useEffect(() => {
    // Early return if session not ready
    if (!sessionReady) return;

    // Clear data if no user
    if (sessionReady && !user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    // Fetch only when session ready, user exists, and profile has company_id
    if (sessionReady && user && profile?.company_id && !profileLoading) {
      loadProjects();
    } else if (sessionReady && user && !profileLoading) {
      setLoading(false);
    }
  }, [sessionReady, user?.id, profile?.company_id, profileLoading]);

  const loadProjects = async () => {
    if (!profile?.company_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      console.error("Error loading projects:", error);
      toast({
        title: "Error",
        description: "Failed to load projects.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = () => {
    if (!profile?.company_id) {
      toast({
        title: "Company required",
        description: "Please create or join a company before creating a project.",
        variant: "destructive",
      });
      navigate("/dashboard?action=create-company");
      return;
    }
    navigate("/dashboard?action=create-project");
  };

  const handleOpenProject = (projectId: string) => {
    navigate(`/dataset/${projectId}`);
  };

  if (profileLoading || loading) {
    return <LoadingState message="Loading projects..." />;
  }

  if (!profile?.company_id) {
    return (
      <div>
        <PageHeader
          title="Projects"
          description="Create and manage your dataset projects"
        />
        <EmptyState
          icon={FolderKanban}
          title="No workspace"
          description="You need to create or join a workspace before you can create projects."
          action={{
            label: "Create Workspace",
            onClick: () => navigate("/dashboard?action=create-company"),
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Create and manage your dataset projects"
        actions={
          <ProtectedComponent requiredPermission="manageProjects">
            <Button 
              onClick={handleCreateProject}
              disabled={!profile?.company_id}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          </ProtectedComponent>
        }
      />

      <motion.div variants={fadeInUpVariants} initial="hidden" animate="visible">
        {projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Get started by creating your first project to organize your datasets."
            action={hasPermission("manageProjects") ? {
              label: "Create Project",
              onClick: handleCreateProject,
            } : undefined}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleOpenProject(project.id)}
              >
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="line-clamp-1">{safeText(project.name)}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {safeText(project.description) || "No description"}
                    </CardDescription>
                  </div>
                  {hasPermission("deleteProjects") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectToDelete({
                          companyName: company?.name ?? "",
                          projectName: project.name ?? "",
                        });
                      }}
                      title="Delete project"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>

      <DeleteProjectModal
        open={projectToDelete != null}
        onOpenChange={(open) => {
          if (!open) setProjectToDelete(null);
        }}
        companyName={projectToDelete?.companyName ?? ""}
        projectName={projectToDelete?.projectName ?? ""}
        onDeleted={async () => {
          // Project list is from Supabase; remove the row so UI updates
          if (profile?.company_id && projectToDelete?.projectName) {
            await supabase
              .from("projects")
              .delete()
              .eq("company_id", profile.company_id)
              .eq("name", projectToDelete.projectName);
          }
          await loadProjects();
          toast({
            title: "Project deleted",
            description: "Project and all its data have been deleted.",
          });
        }}
      />
    </div>
  );
};


