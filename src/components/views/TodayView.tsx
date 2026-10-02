import confetti from "canvas-confetti";
import { triggerHaptic } from "../../lib/platform";
import React, { useState } from "react";
import { Task, Routine, RoutineInstance, Priority } from "../../types/database";
import {
  Check,
  Plus,
  Play,
  Sun,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  MoreHorizontal,
  Zap,
} from "lucide-react";
import { syncEngine } from "../../lib/sync";
import { formatMinutes } from "../../lib/utils";
import {
  localDate,
  isPending,
  isTodayTask,
  routineOccursOn,
} from "../../lib/dates";
interface TodayViewProps {
  tasks: Task[];
  routines: Routine[];
  routineInstances: RoutineInstance[];
  onSelectTask: (t: Task) => void;
  onStartFocus: (t: Task) => void;
  onOpenAITaskModal: () => void;
  onOpenBriefing: () => void;
  onOpenDayReview: () => void;
  onPlan: () => void;
}
const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
export function TodayView({
  tasks,
  routines,
  routineInstances,
  onSelectTask,
  onStartFocus,
  onOpenAITaskModal,
  onOpenBriefing,
  onOpenDayReview,
}: TodayViewProps) {
  const [filter, setFilter] = useState<"all" | "open" | "completed">("all");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const pending = tasks
    .filter((t) => isPending(t) && isTodayTask(t))
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  const completed = tasks.filter(
    (t) => t.status === "completed" && isTodayTask(t),
  );
  const daily = routines
    .filter((r) => routineOccursOn(r))
    .sort((a, b) => a.time_of_day.localeCompare(b.time_of_day));
  const minutes = pending.reduce(
    (sum, t) => sum + t.estimated_duration_minutes,
    0,
  );
  const add = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    const now = new Date().toISOString();
    syncEngine.saveTask({
      id: crypto.randomUUID(),
      user_id: syncEngine.getUserId(),
      project_id: null,
      title: title.trim(),
      description: null,
      priority,
      status: "todo",
      start_date: localDate(),
      deadline: null,
      estimated_duration_minutes: 30,
      recurrence_rule: null,
      is_routine: false,
      is_brain_dump: false,
      position: tasks.length,
      completed_at: null,
      created_at: now,
      updated_at: now,
    });
    setTitle("");
  };
  const toggle = (task: Task) => {
    syncEngine.toggleTaskCompletion(task.id);
    triggerHaptic("success");
    if (
      task.status !== "completed" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      try {
        confetti({ particleCount: 24, spread: 35, origin: { y: 0.7 } });
      } catch {}
    }
  };
  const taskRow = (task: Task, done = false) => (
    <div className={`task-row ${done ? "is-done" : ""}`} key={task.id}>
      <button
        className="task-check"
        aria-label={`${done ? "Reopen" : "Complete"} ${task.title}`}
        onClick={() => toggle(task)}
      >
        {done && <Check size={12} />}
      </button>
      <button className="task-main" onClick={() => onSelectTask(task)}>
        <span className="task-title">{task.title}</span>
        {(task.project || task.subtasks?.length) && (
          <span className="task-subtitle">
            {task.project?.title}
            {task.project && task.subtasks?.length ? " · " : ""}
            {task.subtasks?.length
              ? `${task.subtasks.filter((s) => s.is_completed).length}/${task.subtasks.length} subtasks`
              : ""}
          </span>
        )}
      </button>
      {!done && (
        <span
          className={`task-priority ${task.priority}`}
          title={`${task.priority} priority`}
        >
          <span />
          {task.priority === "urgent"
            ? "Urgent"
            : task.priority === "high"
              ? "High"
              : ""}
        </span>
      )}
      <span className="task-duration">
        {formatMinutes(task.estimated_duration_minutes)}
      </span>
      {!done && (
        <button
          className="task-focus"
          aria-label={`Focus on ${task.title}`}
          onClick={() => onStartFocus(task)}
        >
          <Play size={14} />
        </button>
      )}
    </div>
  );
  return (
    <div className="today-page">
      <header className="page-heading">
        <div>
          <span className="page-eyebrow">GOOD PLANS. REAL PROGRESS.</span>
          <h1>
            Today<span className="accent-period">.</span>
          </h1>
          <p>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <button className="primary-button" onClick={onOpenAITaskModal}>
          <Plus size={16} />
          New task
        </button>
      </header>
      <div className="today-toolbar">
        <div className="task-tabs" aria-label="Task filter">
          {(
            [
              ["all", "Today", pending.length + completed.length],
              ["open", "To do", pending.length],
              ["completed", "Completed", completed.length],
            ] as const
          ).map(([value, label, count]) => (
            <button
              key={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
              <span>{count}</span>
            </button>
          ))}
        </div>
        <span className="planned-time">
          <Clock size={14} />
          {formatMinutes(minutes)} planned
        </span>
      </div>
      <div className="today-columns">
        <section className="today-tasks" aria-label="Today's tasks">
          <div className="task-column-labels">
            <span>Task</span>
            <span>Estimate</span>
          </div>
          {filter !== "completed" && (
            <div className="task-list">
              {pending.length ? (
                pending.map((t) => taskRow(t))
              ) : (
                <div className="task-empty">
                  <CheckCircle2 size={23} />
                  <p>Nothing left for today.</p>
                  <span>Add a task below or plan your next few days.</span>
                </div>
              )}
            </div>
          )}
          {filter !== "completed" && (
            <form className="inline-task-form" onSubmit={add}>
              <Plus size={16} />
              <input
                aria-label="New task title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Add a task…"
              />
              <select
                aria-label="Task priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
              >
                <option value="low">Low priority</option>
                <option value="medium">Normal</option>
                <option value="high">High priority</option>
                <option value="urgent">Urgent</option>
              </select>
              {title && (
                <button type="submit" aria-label="Add task">
                  <ArrowUpRight size={17} />
                </button>
              )}
            </form>
          )}
          {filter !== "open" && completed.length > 0 && (
            <section className="completed-section">
              <div className="list-heading">
                <h2>
                  Completed <span>{completed.length}</span>
                </h2>
              </div>
              {completed.map((t) => taskRow(t, true))}
            </section>
          )}
          {filter === "completed" && completed.length === 0 && (
            <p className="task-empty">No completed tasks today yet.</p>
          )}
          <div className="day-review-link">
            <span>
              {completed.length} of {completed.length + pending.length} tasks
              completed
            </span>
            <button onClick={onOpenDayReview}>
              Review day <ArrowUpRight size={13} />
            </button>
          </div>
        </section>
        <aside className="today-agenda">
          <div className="list-heading">
            <h2>Daily routine</h2>
            <RepeatLabel count={daily.length} />
          </div>
          {daily.length === 0 && (
            <p className="agenda-empty">No routines scheduled today.</p>
          )}
          <div className="routine-list">
            {daily.map((r) => {
              const done = routineInstances.some(
                (i) => i.routine_id === r.id && i.status === "completed",
              );
              return (
                <button
                  key={r.id}
                  title={r.description || r.title}
                  className={`routine-row ${done ? "is-done" : ""}`}
                  onClick={() => syncEngine.toggleRoutineCompletion(r.id)}
                  aria-label={`${done ? "Reopen" : "Complete"} routine ${r.title}`}
                >
                  <span className="routine-time">{r.time_of_day}</span>
                  <span className="routine-name">{r.title}</span>
                  <span className="routine-check">
                    {done && <Check size={11} />}
                  </span>
                </button>
              );
            })}
          </div>
          <section className="focus-section">
            <div className="list-heading">
              <h2>Time to lock in</h2>
              <Zap size={20} />
            </div>
            <p>{pending[0]?.title || "A quiet place to work."}</p>
            <span>
              {pending[0]
                ? `${formatMinutes(pending[0].estimated_duration_minutes)} · ${pending[0].project?.title || "Personal task"}`
                : "Choose a task to begin a focused session."}
            </span>
            <button
              className="secondary-button"
              onClick={() =>
                pending[0] ? onStartFocus(pending[0]) : onOpenAITaskModal()
              }
            >
              <Play size={16} />
              {pending[0] ? "Start session" : "Add a task"}
            </button>
          </section>
          <button className="briefing-link" onClick={onOpenBriefing}>
            <Sun size={15} />
            <span>Daily briefing</span>
            <ArrowUpRight size={14} />
          </button>
        </aside>
      </div>
    </div>
  );
}
function RepeatLabel({ count }: { count: number }) {
  return <span>{count} scheduled</span>;
}
