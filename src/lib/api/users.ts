import { supabase } from "@/integrations/supabase/client";
import { apiRequest } from "./config";
import type { UserRole } from "@/types/roles";

/**
 * Set user login access (active = can log in, !active = revoked).
 * Backend: PATCH /api/users/:userId/active, body: { active: boolean }.
 */
export const setUserActive = async (
  userId: string,
  active: boolean
): Promise<void> => {
  await apiRequest(`/users/${encodeURIComponent(userId)}/active`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });
};

/**
 * Delete a member (remove from workspace).
 * Backend: DELETE /api/users/:userId.
 */
export const deleteUser = async (userId: string): Promise<void> => {
  await apiRequest(`/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
};

/**
 * Update user role
 * Updates both backend (for validation/audit) and Supabase (source of truth)
 * @param userId - The user ID whose role should be updated
 * @param role - The new role to assign
 */
export const updateUserRole = async (
  userId: string,
  role: UserRole
): Promise<{ success: boolean; message: string }> => {
  // Step 1: Call backend API for validation/authorization
  try {
    await apiRequest(`/users/${encodeURIComponent(userId)}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
  } catch (backendError: any) {
    // Backend validation failed - don't update Supabase
    throw new Error(backendError.message || "Backend validation failed");
  }

  // Step 2: Update Supabase directly (backend has no Supabase dependency)
  const { error: supabaseError } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (supabaseError) {
    // Supabase update failed - log error
    console.error("[updateUserRole] Supabase update failed:", supabaseError);
    throw new Error(
      `Role update validated but failed to save: ${supabaseError.message}`
    );
  }

  return {
    success: true,
    message: "User role updated successfully",
  };
};
