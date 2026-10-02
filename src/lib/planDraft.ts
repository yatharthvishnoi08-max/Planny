export type DraftTask = { id: string; title: string; minutes: number };
export type PlanDraft = { version: 1; problem: string; tasks: DraftTask[] };
const key = "planny_landing_draft";
export function draftTasks(text: string): DraftTask[] {
  return text
    .split(/[,;\n]+|\band\b/i)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((title) => ({
      id: crypto.randomUUID(),
      title: title.charAt(0).toUpperCase() + title.slice(1),
      minutes: 30,
    }));
}
export function validDraft(tasks: DraftTask[]) {
  return (
    tasks.length > 0 &&
    tasks.every(
      (t) =>
        t.title.trim().length > 0 &&
        Number.isInteger(t.minutes) &&
        t.minutes >= 5 &&
        t.minutes <= 480,
    )
  );
}
export function readPlanDraft(): PlanDraft | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    let value;
    try {
      value = JSON.parse(raw);
    } catch {
      return { version: 1, problem: "", tasks: draftTasks(raw) };
    }
    if (value?.version !== 1 || !Array.isArray(value.tasks)) return null;
    const tasks = value.tasks
      .filter(
        (t: DraftTask) =>
          t &&
          typeof t.id === "string" &&
          typeof t.title === "string" &&
          Number.isInteger(t.minutes) &&
          t.minutes >= 5 &&
          t.minutes <= 480,
      )
      .slice(0, 8);
    return tasks.length
      ? {
          version: 1,
          problem: typeof value.problem === "string" ? value.problem : "",
          tasks,
        }
      : null;
  } catch {
    return null;
  }
}
export function savePlanDraft(draft: PlanDraft) {
  localStorage.setItem(key, JSON.stringify(draft));
}
export function clearPlanDraft() {
  try {
    localStorage.removeItem(key);
  } catch {}
}
