// src/components/CompanyMembers.tsx
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isUserAdmin } from "@/lib/utils/adminUtils";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InviteUserDialog } from "@/components/InviteUserDialog";
import { updateUserRole, setUserActive, deleteUser } from "@/lib/api/users";
import type { UserRole } from "@/types/roles";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { clearAuthCache } from "@/lib/api/config";

interface CompanyMembersProps {
  companyId: string;
  company: any;
  isAdmin: boolean;
  refreshTrigger?: number; // Optional trigger to force refresh
}

interface MemberProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  company_id: string;
  role?: string;
  is_active?: boolean;
}

export const CompanyMembers: React.FC<CompanyMembersProps> = ({
  companyId,
  company,
  isAdmin,
  refreshTrigger,
}) => {
  const { user, userRole, hasPermission } = useProfile();
  const { toast } = useToast();
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingRoles, setUpdatingRoles] = useState<Set<string>>(new Set());
  const [updatingActive, setUpdatingActive] = useState<Set<string>>(new Set());
  const [memberToDelete, setMemberToDelete] = useState<MemberProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteAccessToken, setInviteAccessToken] = useState("");
  // Track last seen invite status in this session so we don't spam notifications
  const lastInviteStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasPermission("manageWorkspaceUsers") || !companyId) {
      setLoading(false);
      return;
    }
    fetchMembers();
  }, [companyId, hasPermission, refreshTrigger]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("[CompanyMembers] Fetching members for company:", companyId);
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("id, name, email, phone, created_at, company_id, role, is_active")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (fetchError) {
        console.error("[CompanyMembers] Fetch error:", fetchError);
        throw fetchError;
      }

      console.log("[CompanyMembers] Fetched members:", data?.length || 0, data);
      setMembers(data || []);
    } catch (err: any) {
      console.error("[CompanyMembers] Error fetching company members:", err);
      setError(err?.message || "Failed to load company members");
    } finally {
      setLoading(false);
    }
  };

  if (!hasPermission("manageWorkspaceUsers")) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">You don't have permission to view company members.</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Only platform admins and workspace admins can invite users
  const canInviteUsers =
    !!companyId && (userRole === "platform_admin" || userRole === "workspace_admin");

  const handleAddUser = async () => {
    if (!companyId) {
      toast({
        title: "Company required",
        description: "Please create or join a company before inviting users.",
        variant: "destructive",
      });
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token ?? "";
      setInviteAccessToken(token);
      setInviteOpen(true);
    } catch (err) {
      console.error("[CompanyMembers] Failed to get session token for invite", err);
      setInviteAccessToken("");
      setInviteOpen(true);
    }
  };

  // When the invite dialog closes, show a one-time status notification
  // about the latest invite (pending vs accepted) for this admin + company.
  const handleInviteDialogOpenChange = async (open: boolean) => {
    setInviteOpen(open);

    // Only run the status check when dialog is being closed
    if (open || !companyId || !user?.id) return;

    try {
      const { data, error } = await supabase
        .from("company_invites")
        .select("email, status, created_at, updated_at")
        .eq("company_id", companyId)
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        return;
      }

      const { email, status, created_at, updated_at } = data as {
        email: string | null;
        status: string | null;
        created_at: string;
        updated_at: string | null;
      };

      if (!status) return;

      const key = `${email || "unknown"}|${status}`;
      if (lastInviteStatusRef.current === key) {
        // We've already shown a notification for this status in this session
        return;
      }
      lastInviteStatusRef.current = key;

      if (status === "pending") {
        toast({
          title: "Invite pending",
          description:
            email
              ? `The invite sent to ${email} is still pending.`
              : "The last invite is still pending.",
        });
      } else if (status === "accepted") {
        const acceptedAt = updated_at || created_at;
        let formatted = acceptedAt;
        try {
          formatted = new Date(acceptedAt).toLocaleString();
        } catch {
          // fall back to raw value
        }

        toast({
          title: "Invite accepted",
          description: email
            ? `${email} accepted the invite on ${formatted}.`
            : `The last invite was accepted on ${formatted}.`,
        });
      }
    } catch (err) {
      console.error("[CompanyMembers] Error checking latest invite status:", err);
    }
  };

  // Map database role to display name
  const getRoleDisplayName = (role: string | undefined | null, memberEmail?: string): string => {
    if (!role) {
      // Fallback to email-based check (backward compatibility)
      if (company && memberEmail === company.admin_email) {
        return "Workspace Admin";
      }
      return "Viewer";
    }

    const roleMap: Record<string, string> = {
      platform_admin: "Platform Admin",
      workspace_admin: "Workspace Admin",
      ml_engineer: "ML Engineer",
      operator: "Operator",
      viewer: "Viewer",
      // Legacy roles (for backward compatibility)
      admin: "Workspace Admin",
      member: "Viewer",
    };

    return roleMap[role] || role;
  };

  // Get current user's role as UserRole type (for API calls)
  const getMemberRoleValue = (member: MemberProfile): UserRole => {
    if (!member.role) {
      // Fallback to email-based check
      if (company && member.email === company.admin_email) {
        return "workspace_admin";
      }
      return "viewer";
    }

    // Map legacy roles to new roles
    if (member.role === "admin") return "workspace_admin";
    if (member.role === "member") return "viewer";

    // Return as-is if it's already one of the 5 roles
    return member.role as UserRole;
  };

  // Check if current user can assign roles
  const canAssignRoles = hasPermission("assignRoles");
  // Toggle login access and delete: same as assign (platform_admin, workspace_admin)
  const canManageAccess = hasPermission("manageWorkspaceUsers");
  const currentUserId = user?.id ?? null;

  // Can show toggle/delete for this member? (not self, and workspace_admin cannot act on platform_admin)
  const canActOnMember = (member: MemberProfile) => {
    if (!canManageAccess) return false;
    if (member.id === currentUserId) return false;
    const memberRole = getMemberRoleValue(member);
    if (userRole === "workspace_admin" && memberRole === "platform_admin") return false;
    return true;
  };

  // Handle login access toggle
  const handleToggleActive = async (member: MemberProfile, nextActive: boolean) => {
    if (!canActOnMember(member)) return;
    setUpdatingActive((prev) => new Set(prev).add(member.id));
    try {
      await setUserActive(member.id, nextActive);
      await supabase.from("profiles").update({ is_active: nextActive }).eq("id", member.id);
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, is_active: nextActive } : m))
      );
      toast({
        title: nextActive ? "Login access enabled" : "Login access revoked",
        description: `${member.name || member.email} can ${nextActive ? "now" : "no longer"} log in.`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update login access.",
        variant: "destructive",
      });
    } finally {
      setUpdatingActive((prev) => {
        const next = new Set(prev);
        next.delete(member.id);
        return next;
      });
    }
  };

  // Handle delete member (after confirm)
  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    setDeleting(true);
    try {
      await deleteUser(memberToDelete.id);
      setMembers((prev) => prev.filter((m) => m.id !== memberToDelete.id));
      toast({
        title: "Member removed",
        description: `${memberToDelete.name || memberToDelete.email} has been removed from the workspace.`,
      });
      setMemberToDelete(null);
      await fetchMembers();
    } catch (err: any) {
      toast({
        title: "Error removing member",
        description: err.message || "Failed to remove member.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Handle role update
  const handleRoleChange = async (memberId: string, newRole: UserRole) => {
    if (!canAssignRoles) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to assign roles.",
        variant: "destructive",
      });
      return;
    }

    // Prevent workspace_admin from assigning platform_admin role
    if (userRole === "workspace_admin" && newRole === "platform_admin") {
      toast({
        title: "Permission denied",
        description: "Workspace admins cannot assign platform admin role.",
        variant: "destructive",
      });
      return;
    }

    // Only platform_admin can change the role of a member who is currently platform_admin
    const targetMember = members.find((m) => m.id === memberId);
    const targetCurrentRole = targetMember ? getMemberRoleValue(targetMember) : null;
    if (userRole === "workspace_admin" && targetCurrentRole === "platform_admin") {
      toast({
        title: "Permission denied",
        description: "Only platform admins can change a platform admin's role.",
        variant: "destructive",
      });
      return;
    }

    setUpdatingRoles((prev) => new Set(prev).add(memberId));

    try {
      await updateUserRole(memberId, newRole);

      // Clear auth cache to ensure fresh role data on next API call
      clearAuthCache();

      // Update local state
      setMembers((prevMembers) =>
        prevMembers.map((member) =>
          member.id === memberId ? { ...member, role: newRole } : member
        )
      );

      toast({
        title: "Role updated",
        description: `User role has been updated to ${getRoleDisplayName(newRole, undefined)}.`,
      });

      // Refresh members list to get latest data
      await fetchMembers();
    } catch (err: any) {
      console.error("[CompanyMembers] Error updating role:", err);
      toast({
        title: "Error updating role",
        description: err.message || "Failed to update user role. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingRoles((prev) => {
        const next = new Set(prev);
        next.delete(memberId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading company members...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Company Members</h2>
          <p className="text-muted-foreground mt-1">
            View all members of your company and their details.
          </p>
        </div>
        {canInviteUsers && (
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            onClick={handleAddUser}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        )}
      </div>

      {members.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No members found in this company.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4 font-semibold">Name</th>
                <th className="text-left p-4 font-semibold">Phone</th>
                <th className="text-left p-4 font-semibold">Email</th>
                <th className="text-left p-4 font-semibold">Role</th>
                <th className="text-left p-4 font-semibold">Login access</th>
                <th className="text-left p-4 font-semibold">Joined</th>
                {canManageAccess && <th className="text-left p-4 font-semibold">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const currentRole = getMemberRoleValue(member);
                const isUpdating = updatingRoles.has(member.id);
                const isTogglingActive = updatingActive.has(member.id);
                const active = member.is_active !== false;
                const showToggleDelete = canActOnMember(member);

                return (
                  <tr key={member.id} className="border-b hover:bg-muted/50">
                    <td className="p-4 font-medium">{member.name || "No name"}</td>
                    <td className="p-4">{member.phone || "Not provided"}</td>
                    <td className="p-4 text-muted-foreground">{member.email}</td>
                    <td className="p-4">
                      {canAssignRoles &&
                      !(userRole === "workspace_admin" && currentRole === "platform_admin") ? (
                        <div className="flex items-center gap-2">
                          <Select
                            value={currentRole}
                            onValueChange={(value) =>
                              handleRoleChange(member.id, value as UserRole)
                            }
                            disabled={isUpdating}
                          >
                            <SelectTrigger className="w-[180px] h-8 text-xs">
                              <SelectValue>
                                {isUpdating ? (
                                  <span className="flex items-center gap-2">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Updating...
                                  </span>
                                ) : (
                                  getRoleDisplayName(member.role, member.email)
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {/* Only platform_admin can assign platform_admin role */}
                              {userRole === "platform_admin" && (
                                <SelectItem value="platform_admin">
                                  Platform Admin
                                </SelectItem>
                              )}
                              <SelectItem value="workspace_admin">
                                Workspace Admin
                              </SelectItem>
                              <SelectItem value="ml_engineer">ML Engineer</SelectItem>
                              <SelectItem value="operator">Operator</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : canAssignRoles &&
                        userRole === "workspace_admin" &&
                        currentRole === "platform_admin" ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary" title="Only platform admins can change this role">
                          {getRoleDisplayName(member.role, member.email)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary">
                          {getRoleDisplayName(member.role, member.email)}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {canManageAccess ? (
                        showToggleDelete ? (
                          <div className="flex items-center gap-2">
                            {isTogglingActive ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (
                              <Switch
                                checked={active}
                                onCheckedChange={(checked) => handleToggleActive(member, checked)}
                                disabled={isTogglingActive}
                                aria-label={active ? "Revoke login access" : "Enable login access"}
                              />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {active ? "On" : "Off"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {active ? "On" : "Off"}
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {active ? "On" : "Off"}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground text-sm">
                      {formatDate(member.created_at)}
                    </td>
                    {canManageAccess && (
                      <td className="p-4">
                        {showToggleDelete ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setMemberToDelete(member)}
                            aria-label="Remove member"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToDelete
                ? `Remove ${memberToDelete.name || memberToDelete.email} from the workspace? They will lose access to this workspace. This action cannot be undone.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite user dialog (only opens for workspace/platform admins) */}
      <Dialog open={inviteOpen} onOpenChange={handleInviteDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite user to company</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <InviteUserDialog companyId={companyId} accessToken={inviteAccessToken} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyMembers;

