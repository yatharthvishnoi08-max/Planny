import type { FocusSession, Routine, Task } from "../types/database";
import { isPending, localDate, routineOccursOn } from "./dates";

export type PlanBlock = {
  id: string;
  type: "task" | "break" | "routine";
  title: string;
  start: string;
  end: string;
  taskId?: string;
  reason?: string;
};

const priorityScore = { urgent: 90, high: 60, medium: 30, low: 10 };
const minutesOfDay = (date: Date) => date.getHours() * 60 + date.getMinutes();
const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export function availableMinutesToday(endOfDay = "21:00", now = new Date()) {
  const [hour, minute] = endOfDay.split(":").map(Number);
  return Math.max(0, hour * 60 + minute - minutesOfDay(now));
}

export function taskScore(
  task: Task,
  now = new Date(),
  availableMinutes = Infinity,
  recentProjectId?: string | null,
) {
  let score = priorityScore[task.priority];
  if (task.deadline) {
    const deadline = new Date(task.deadline);
    const dueDay = localDate(deadline);
    const today = localDate(now);
    if (deadline.getTime() < now.getTime()) score += 120;
    else if (dueDay === today) score += 85;
    else {
      const days = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
      score += Math.max(0, 42 - days * 7);
    }
  } else if (task.start_date === localDate(now)) score += 25;
  if (task.estimated_duration_minutes <= availableMinutes) score += 18;
  else score -= 25;
  if (recentProjectId && task.project_id === recentProjectId) score += 12;
  score -= Math.min(15, task.estimated_duration_minutes / 30);
  return score;
}

export function recommendNextTask(
  tasks: Task[],
  sessions: FocusSession[] = [],
  availableMinutes = Infinity,
  now = new Date(),
) {
  const recentTaskId = [...sessions].sort(
    (a, b) =>
      new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime(),
  )[0]?.task_id;
  const recentProjectId = tasks.find(
    (task) => task.id === recentTaskId,
  )?.project_id;
  return tasks
    .filter(isPending)
    .map((task) => ({
      task,
      score: taskScore(task, now, availableMinutes, recentProjectId),
    }))
    .sort((a, b) => b.score - a.score)[0]?.task;
}

export function nextTaskReason(
  task: Task,
  availableMinutes: number,
  now = new Date(),
) {
  const reasons: string[] = [];
  if (task.priority === "urgent" || task.priority === "high")
    reasons.push(`${task.priority === "urgent" ? "Urgent" : "High priority"}`);
  if (task.deadline) {
    const deadline = new Date(task.deadline);
    if (deadline.getTime() < now.getTime()) reasons.push("Overdue");
    else if (localDate(deadline) === localDate(now)) reasons.push("Due today");
  }
  if (task.estimated_duration_minutes <= availableMinutes)
    reasons.push("Fits the time left today");
  return reasons.slice(0, 3);
}

export function buildDayPlan({
  tasks,
  routines,
  sessions = [],
  endOfDay = "21:00",
  now = new Date(),
  variant = 0,
}: {
  tasks: Task[];
  routines: Routine[];
  sessions?: FocusSession[];
  endOfDay?: string;
  now?: Date;
  variant?: number;
}) {
  let cursor = Math.ceil(minutesOfDay(now) / 5) * 5;
  const [endHour, endMinute] = endOfDay.split(":").map(Number);
  const end = endHour * 60 + endMinute;
  const candidates = tasks.filter(isPending);
  const ranked = [...candidates].sort((a, b) => {
    const score =
      taskScore(b, now, end - cursor) - taskScore(a, now, end - cursor);
    if (variant % 2) {
      const durationBias =
        a.estimated_duration_minutes - b.estimated_duration_minutes;
      return score || durationBias;
    }
    return score;
  });
  const routineBlocks = routines
    .filter((routine) => routineOccursOn(routine, now))
    .map((routine) => ({
      routine,
      start:
        Number(routine.time_of_day.slice(0, 2)) * 60 +
        Number(routine.time_of_day.slice(3)),
    }))
    .filter(({ start }) => start >= cursor && start < end)
    .sort((a, b) => a.start - b.start);
  const blocks: PlanBlock[] = [];
  let workSinceBreak = 0;

  for (const task of ranked) {
    if (cursor >= end) break;
    const nextRoutine = routineBlocks.find(({ start }) => start >= cursor);
    const availableUntilBusy =
      Math.min(nextRoutine?.start ?? end, end) - cursor;
    const duration = Math.max(5, task.estimated_duration_minutes || 30);
    if (duration > availableUntilBusy) {
      if (nextRoutine && nextRoutine.start < end) {
        blocks.push({
          id: `routine-${nextRoutine.routine.id}`,
          type: "routine",
          title: nextRoutine.routine.title,
          start: clock(nextRoutine.start),
          end: clock(Math.min(end, nextRoutine.start + 30)),
        });
        cursor = nextRoutine.start + 30;
        routineBlocks.splice(routineBlocks.indexOf(nextRoutine), 1);
      }
      if (duration > end - cursor) continue;
    }
    const start = cursor;
    cursor += duration;
    blocks.push({
      id: `task-${task.id}`,
      type: "task",
      title: task.title,
      start: clock(start),
      end: clock(cursor),
      taskId: task.id,
      reason:
        nextTaskReason(task, end - start, now)[0] || "Keeps your day moving",
    });
    workSinceBreak += duration;
    if (workSinceBreak >= 75 && cursor + 10 < end) {
      blocks.push({
        id: `break-${cursor}`,
        type: "break",
        title: "Reset break",
        start: clock(cursor),
        end: clock(cursor + 10),
      });
      cursor += 10;
      workSinceBreak = 0;
    }
  }
  return blocks;
}
