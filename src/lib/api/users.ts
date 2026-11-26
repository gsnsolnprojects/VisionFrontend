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
 * Update user role. The backend checks the permission (admin of the same organisation)
 * and saves it. Backend: PUT /api/users/:userId/role, body: { role }.
 * @param userId - The user ID whose role should be updated
 * @param role - The new role to assign
 */
export const updateUserRole = async (
  userId: string,
  role: UserRole
): Promise<{ success: boolean; message: string }> => {
  try {
    await apiRequest(`/users/${encodeURIComponent(userId)}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
  } catch (backendError: any) {
    throw new Error(backendError.message || "Could not update the role");
  }

  return {
    success: true,
    message: "User role updated successfully",
  };
};
