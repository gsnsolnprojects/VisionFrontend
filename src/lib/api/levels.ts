import { apiRequest } from "./config";

/** A student's progress through one Playground level, saved on the server so it resumes anywhere */
export interface LevelProgress {
  level: number;
  mission: string;
  industry: string | null;
  /** the GSN sample's project name in the library (Level 1) */
  sample: string | null;
  projectId: string | null;
  steps: string[];
  completedSteps: string[];
  /** the first step not done yet; null once the level is finished */
  nextStep: string | null;
  /** best label practice score, 0-1 */
  practiceScore: number | null;
  trainingJobId: string | null;
  training: { status: string } | null;
  finishedAt: string | null;
  startedAt?: string;
  updatedAt: string;
}

/** GET /api/playground/levels - the student's levels, the one they touched last first */
export const getLevels = () => apiRequest<{ levels: LevelProgress[] }>("/playground/levels", { maxRetries: 1 });

/**
 * When the student first started a level. What a browser remembers about a student's progress is
 * saved under this, so an account reset to fresh doesn't get its earlier progress back.
 */
export const firstLevelStart = (levels: LevelProgress[]) => levels.map((l) => l.startedAt ?? "").filter(Boolean).sort()[0] ?? "";

/** POST /api/playground/levels/start - starts a level, or re-opens it; a changed projectId (null: none now) starts it over */
export const startLevel = (body: { level: number; mission: string; industry?: string; sample?: string; projectId?: string | null }) =>
  apiRequest<{ level: LevelProgress }>("/playground/levels/start", { method: "POST", body: JSON.stringify(body), maxRetries: 1 });

/** POST /api/playground/levels/progress - a convenience for the student, so a failed save never interrupts them */
/** Saves steps one after another and resolves when they're saved, so the last one can finish the level */
export const saveLevelSteps = async (mission: string, steps: string[]) => {
  for (const step of steps) {
    await apiRequest("/playground/levels/progress", { method: "POST", body: JSON.stringify({ mission, step }), maxRetries: 1 }).catch(() => undefined);
  }
};

export const saveLevelProgress = (body: { mission: string; step?: string; practiceScore?: number; trainingJobId?: string }) => {
  apiRequest("/playground/levels/progress", { method: "POST", body: JSON.stringify(body), maxRetries: 1 }).catch(() => undefined);
};
