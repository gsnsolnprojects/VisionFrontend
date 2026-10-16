/**
 * Learning-path steps the database can't tell (opening a dataset, reading the results
 * lesson), remembered per user in this browser. A convenience only: if storage is
 * unavailable the steps just stay unticked.
 */
export type LearningMark = "explored-dataset" | "read-results";

const key = (userId: string, mark: LearningMark) => `visionm.learning.${userId}.${mark}`;

export function markLearningStep(userId: string | null | undefined, mark: LearningMark): void {
  if (!userId) return;
  try {
    localStorage.setItem(key(userId, mark), new Date().toISOString());
  } catch {
    // storage blocked: the step simply isn't remembered
  }
}

export function hasLearningStep(userId: string | null | undefined, mark: LearningMark): boolean {
  if (!userId) return false;
  try {
    return localStorage.getItem(key(userId, mark)) !== null;
  } catch {
    return false;
  }
}
