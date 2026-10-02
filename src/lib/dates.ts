import type { Task, Routine } from "../types/database";
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function dateAtTime(date: string, time = "18:00"): string {
  return new Date(`${date}T${time}:00`).toISOString();
}
export function isPending(task: Task) {
  return task.status === "todo" || task.status === "in_progress";
}
export function isTodayTask(task: Task, date = new Date()) {
  const today = localDate(date);
  if (task.status === "completed")
    return (
      !!task.completed_at && localDate(new Date(task.completed_at)) === today
    );
  if (!isPending(task)) return false;
  const due = task.deadline ? localDate(new Date(task.deadline)) : null;
  return (
    (!task.start_date && !due) ||
    (!!task.start_date && task.start_date <= today) ||
    (!!due && due <= today)
  );
}
export function routineOccursOn(r: Routine, date = new Date()) {
  const day = localDate(date);
  const created = new Date(r.created_at);
  const start = localDate(created);
  if (!r.active || (r.end_date && day > r.end_date) || day < start)
    return false;
  const weekday = date.getDay() || 7;
  switch (r.frequency) {
    case "daily":
      return true;
    case "weekdays":
      return weekday <= 5;
    case "weekends":
      return weekday >= 6;
    case "specific_days":
      return r.days_of_week.includes(weekday);
    case "weekly":
      return weekday === (created.getDay() || 7);
    case "monthly":
      return (
        date.getDate() ===
        Math.min(
          created.getDate(),
          new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(),
        )
      );
    case "every_x_days": {
      const delta = Math.round(
        (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
          Date.UTC(
            created.getFullYear(),
            created.getMonth(),
            created.getDate(),
          )) /
          86400000,
      );
      return delta % Math.max(1, r.interval_days) === 0;
    }
  }
}
export function nextWeekday(day: number, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + ((day - d.getDay() + 7) % 7 || 7));
  return localDate(d);
}

/** One timeline position per task: its deadline, or its planned start day. */
export function taskScheduleDate(task: Task): string | null {
  return task.deadline
    ? localDate(new Date(task.deadline))
    : task.start_date || null;
}
export function taskScheduleBucket(
  task: Task,
  today = new Date(),
): "overdue" | "today" | "tomorrow" | "week" | "later" | "unscheduled" {
  const date = taskScheduleDate(task);
  if (!date) return "unscheduled";
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  if (date < localDate(today)) return "overdue";
  if (date === localDate(today)) return "today";
  if (date === localDate(tomorrow)) return "tomorrow";
  return date <= localDate(nextWeek) ? "week" : "later";
}
