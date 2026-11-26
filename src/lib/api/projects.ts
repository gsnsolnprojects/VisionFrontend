import { apiRequest } from "./config";

/**
 * Cascade-renames a project across every MongoDB collection that scopes
 * records by company/project name (surveys, action items, trained models,
 * datasets, training jobs, the pinned mobile-inspect config). Call this
 * immediately after the project-row rename succeeds — the projects table
 * stays the source of truth for the name; this just keeps Mongo in sync so
 * historical data doesn't get orphaned under the old name.
 */
export async function renameProjectCascade(
  company: string,
  oldProjectName: string,
  newProjectName: string
): Promise<{ message: string; collections: Record<string, number | string> }> {
  return apiRequest(`/projects/rename`, {
    method: "POST",
    body: JSON.stringify({ company, oldProjectName, newProjectName }),
  });
}
