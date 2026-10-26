import { usePlanAccess } from "@/contexts/plan-access-context";
import { useProfile } from "@/hooks/useProfile";

/**
 * Which version of the app a workspace sees:
 *  - "playground": a Playground company (not GSN): the Playground app
 *  - "preview": a company that hasn't chosen a plan yet (not GSN): the Playground look with an
 *    informative overview, Learning centre, Plan & billing and Settings only
 *  - "standard": everyone else (GSN, other plans), and while the plan is still loading
 */
export type WorkspaceKind = "playground" | "preview" | "standard";

export function useWorkspaceKind(): WorkspaceKind {
  const { company } = useProfile();
  const { data } = usePlanAccess();
  const companyName = (company?.name ?? "").trim().toLowerCase();
  if (!data || !companyName || companyName === "gsn") return "standard";
  if (data.access?.plan === "playground") return "playground";
  if (!data.access?.plan && data.access?.reason === "no_plan") return "preview";
  return "standard";
}

/** Pages a preview workspace may open; anything else goes back to the overview */
export const isPreviewPath = (pathname: string, search: string) =>
  (pathname === "/dashboard" && !new URLSearchParams(search).get("view")) ||
  pathname === "/learn" ||
  pathname.startsWith("/dashboard/settings");
