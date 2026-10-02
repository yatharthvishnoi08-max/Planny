import type { DraftTask } from "./planDraft";
export type OnboardingProgress = {
  step: number;
  name: string;
  persona: string;
  wastedHours: string;
  taskSystem: string;
  blockers: string[];
  planningStyle: string;
  taskBehavior: string;
  planTasks: DraftTask[];
  welcomeId: string;
};
const key = (userId: string) => `planny_setup:${userId}`;
export function readOnboardingProgress(
  userId: string,
): Partial<OnboardingProgress> {
  try {
    const v = JSON.parse(localStorage.getItem(key(userId)) || "null");
    if (!v || v.version !== 1) return {};
    const result: Partial<OnboardingProgress> = {};
    for (const field of [
      "name",
      "persona",
      "wastedHours",
      "taskSystem",
      "planningStyle",
      "taskBehavior",
      "welcomeId",
    ] as const)
      if (typeof v[field] === "string") result[field] = v[field];
    if (Number.isInteger(v.step) && v.step >= 0 && v.step <= 3)
      result.step = v.step;
    if (Array.isArray(v.blockers))
      result.blockers = v.blockers
        .filter((b: unknown) => typeof b === "string")
        .slice(0, 3);
    if (Array.isArray(v.planTasks))
      result.planTasks = v.planTasks
        .filter(
          (t: DraftTask) =>
            t &&
            typeof t.id === "string" &&
            typeof t.title === "string" &&
            Number.isFinite(t.minutes),
        )
        .slice(0, 8);
    return result;
  } catch {
    return {};
  }
}
export function saveOnboardingProgress(
  userId: string,
  value: OnboardingProgress,
) {
  try {
    localStorage.setItem(key(userId), JSON.stringify({ version: 1, ...value }));
    return true;
  } catch {
    return false;
  }
}
export function clearOnboardingProgress(userId: string) {
  try {
    localStorage.removeItem(key(userId));
  } catch {}
}
