import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FolderKanban, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityItem, type Activity } from "./ActivityItem";
import { useProfile } from "@/hooks/useProfile";
import { getAuthHeaders, apiUrl } from "@/lib/api/config";

interface ActivityFeedProps {
  projects: any[];
  companyId: string | null;
}

/**
 * ActivityFeed Component
 * 
 * Displays recent activity feed with:
 * - Project creation events (from the projects table)
 * - Prediction events (from backend API, optional)
 * 
 * Gracefully handles API failures and shows fallback content.
 */
export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  projects,
  companyId,
}) => {
  const navigate = useNavigate();
  const { profile, company } = useProfile();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!companyId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    const fetchActivities = async () => {
      setLoading(true);
      const allActivities: Activity[] = [];

      try {
        // 1. Fetch project creation events (using already-loaded projects)
        // Use projects prop (already loaded) to avoid duplicate fetch
        try {
          const projectActivities: Activity[] = projects
            .filter((project) => project.created_at)
            .slice(0, 5) // Limit to 5 most recent
            .map((project) => ({
              id: `project-${project.id}`,
              type: "project" as const,
              description: `New Project ${project.name} was created`,
              timestamp: project.created_at,
              icon: FolderKanban,
              projectName: project.name,
            }));

          allActivities.push(...projectActivities);
        } catch (error) {
          console.error("Error fetching project activities:", error);
          // Continue even if projects fail - we might have predictions
        }

        // 2. Fetch activity events from backend dashboard API (optional)
        try {
          // Derive company name for the dashboard activity API
          const companyName =
            company?.name ||
            // some profiles embed company under companies
            (profile as any)?.companies?.name ||
            "";

          if (companyName) {
            const headers = await getAuthHeaders();
            const params = new URLSearchParams({
              company: String(companyName),
              limit: "5",
            });
            const url = apiUrl(`/dashboard/activity?${params.toString()}`);

            const response = await fetch(url, {
              method: "GET",
              headers,
            });

            // Only process if request succeeds
            if (response.ok) {
              const data = await response.json();

              const activitiesFromApi = Array.isArray(data.activities)
                ? data.activities
                : [];

              const mappedActivities: Activity[] = activitiesFromApi.map(
                (item: any, index: number) => {
                  const action = item.action as string | undefined;
                  const resourceType = item.resourceType as string | undefined;
                  const timestamp =
                    item.timestamp || new Date().toISOString();
                  const projName =
                    item.project ||
                    (item.details && item.details.projectName) ||
                    "Project";

                  // Basic label mapping based on action + resourceType
                  let description = "Activity";
                  if (resourceType === "dataset") {
                    if (action === "create") description = "Dataset uploaded";
                    else if (action === "update") description = "Dataset updated";
                    else if (action === "delete") description = "Dataset deleted";
                    else description = "Dataset activity";
                  } else if (resourceType === "training") {
                    if (action === "execute") description = "Training job executed";
                    else if (action === "create") description = "Training job created";
                    else description = "Training activity";
                  } else if (resourceType === "inference") {
                    if (action === "execute") description = "Inference run";
                    else description = "Inference activity";
                  } else if (resourceType === "user") {
                    if (action === "create") description = "Member added";
                    else if (action === "delete") description = "Member removed";
                    else description = "User activity";
                  } else if (resourceType === "project") {
                    if (action === "create") description = "New project created";
                    else description = "Project activity";
                  }

                  return {
                    id: item.logId || `activity-${index}`,
                    type: "prediction" as const, // reuse prediction styling for now
                    description,
                    timestamp,
                    icon: resourceType === "inference" ? Camera : FolderKanban,
                    projectName: projName,
                  };
                }
              );

              allActivities.push(...mappedActivities);
            }
          }
        } catch (error) {
          // Silently fail - predictions are optional
          console.debug("Could not fetch prediction activities:", error);
        }

        // Sort all activities by timestamp (most recent first)
        allActivities.sort((a, b) => {
          const timeA = typeof a.timestamp === "string" 
            ? new Date(a.timestamp).getTime() 
            : a.timestamp.getTime();
          const timeB = typeof b.timestamp === "string" 
            ? new Date(b.timestamp).getTime() 
            : b.timestamp.getTime();
          return timeB - timeA;
        });

        // Limit to 5 most recent activities
        setActivities(allActivities.slice(0, 5));
      } catch (error) {
        console.error("Error fetching activities:", error);
        // Set empty array on error - will show "No recent activity"
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [projects, companyId]);

  if (loading) {
    return (
      <section className="space-y-4" aria-label="Recent activity loading">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
        </div>
        <div className="space-y-2" role="list" aria-label="Loading activities">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 p-3">
              <Skeleton className="h-8 w-8 rounded-md flex-shrink-0" />
              <div className="flex-1 space-y-2 min-w-0">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 transition-colors duration-300 ease-in-out" aria-label="Recent activity">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
        {activities.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="text-xs h-7 px-2 hover:bg-muted hover:text-foreground transition-colors duration-200"
            aria-label="View all activities"
          >
            View All
          </Button>
        )}
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-10" role="status" aria-live="polite">
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-1 relative pl-8 before:absolute before:left-6 before:top-0 before:bottom-0 before:w-0.5 before:bg-border/50" role="list" aria-label="Activity list">
          {activities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </section>
  );
};

