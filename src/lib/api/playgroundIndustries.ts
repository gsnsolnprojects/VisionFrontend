import { apiRequest } from "./config";

export type Difficulty = "easy" | "medium" | "hard";

/** Superadmin settings per Playground industry id ("food", "electronics", ...) */
export type IndustrySettings = Record<string, { difficulty: Difficulty | null }>;

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

/** For the Playground cards (any signed-in user) */
export const getIndustrySettings = () =>
  apiRequest<{ industries: IndustrySettings }>("/playground/industries", { maxRetries: 1 });

/** Superadmin: the same settings, and changing one */
export const getAdminIndustrySettings = () =>
  apiRequest<{ industries: IndustrySettings }>("/admin/playground/industries", { maxRetries: 1 });

export const setIndustryDifficulty = (industryId: string, difficulty: Difficulty | null) =>
  apiRequest<{ industryId: string; difficulty: Difficulty | null }>(`/admin/playground/industries/${encodeURIComponent(industryId)}`, {
    method: "PUT",
    body: JSON.stringify({ difficulty }),
    maxRetries: 1,
  });
