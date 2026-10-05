import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type {
  DailyPlan,
  FocusSession,
  Priority,
  Routine,
  RoutineInstance,
  Task,
} from "../../types/database";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Folder,
  Inbox,
  MoreHorizontal,
  Play,
  Plus,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { syncEngine } from "../../lib/sync";
import { formatMinutes } from "../../lib/utils";
import {
  dateAtTime,
  isPending,
  isTodayTask,
  localDate,
} from "../../lib/dates";
import { availableMinutesToday } from "../../lib/dayPlanner";
import { focusSecondsForDay, formatFocusTime } from "../../lib/focusAnalytics";
import { PlanMyDayModal } from "../daily/PlanMyDayModal";
import { triggerHaptic } from "../../lib/platform";

interface TodayViewProps {
  tasks: Task[];
  routines: Routine[];
  routineInstances: RoutineInstance[];
  focusSessions: FocusSession[];
  dailyPlans: DailyPlan[];
  endOfDay?: string;
  onSelectTask: (task: Task) => void;
  onStartFocus: (task: Task) => void;
  onOpenAITaskModal: () => void;
  onOpenDayReview: () => void;
  onOpenAssistant: () => void;
  onOpenRoutines: () => void;
  planRequest?: number;
}
const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
const greeting = () =>
  new Date().getHours() < 12
    ? "Good morning"
    : new Date().getHours() < 18
      ? "Good afternoon"
      : "Good evening";

export function TodayView({
  tasks,
  routines,
  focusSessions,
  dailyPlans,
  endOfDay = "21:00",
  onSelectTask,
  onStartFocus,
  onOpenAITaskModal,
  onOpenDayReview,
  onOpenAssistant,
  planRequest = 0,
}: TodayViewProps) {
  const [filter, setFilter] = useState<"all" | "open" | "completed">("all");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [openProjects, setOpenProjects] = useState<Set<string> | null>(null);
  const [rescheduling, setRescheduling] = useState<string | null>(null);
  const [plannerOpen, setPlannerOpen] = useState(false);
  useEffect(() => {
    if (planRequest) setPlannerOpen(true);
  }, [planRequest]);
  const today = localDate();
  const pending = useMemo(
    () =>
      tasks
        .filter((task) => isPending(task) && isTodayTask(task))
        .sort((a, b) => {
          const deadline =
            (a.deadline ? new Date(a.deadline).getTime() : Infinity) -
            (b.deadline ? new Date(b.deadline).getTime() : Infinity);
          return (
            priorityOrder[a.priority] - priorityOrder[b.priority] || deadline
          );
        }),
    [tasks],
  );
  const completed = tasks.filter(
    (task) => task.status === "completed" && isTodayTask(task),
  );
  const totalTasks = pending.length + completed.length;
  const completion = totalTasks
    ? Math.round((completed.length / totalTasks) * 100)
    : 0;
  const remainingMinutes = pending.reduce(
    (sum, task) => sum + task.estimated_duration_minutes,
    0,
  );
  const availableMinutes = availableMinutesToday(endOfDay);
  const focusedToday = focusSecondsForDay(focusSessions, new Date());
  const currentPlan = dailyPlans.find((plan) => plan.date === today);

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
      start_date: today,
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
  const moveTask = (task: Task, target: "today" | "tomorrow" | "smart") => {
    const date = new Date();
    if (
      target === "tomorrow" ||
      (target === "smart" && remainingMinutes > availableMinutes)
    )
      date.setDate(date.getDate() + 1);
    const targetDate = localDate(date);
    const deadlineTime = task.deadline
      ? new Date(task.deadline).toTimeString().slice(0, 5)
      : "18:00";
    syncEngine.saveTask({
      ...task,
      start_date: targetDate,
      deadline: task.deadline ? dateAtTime(targetDate, deadlineTime) : null,
    });
    setRescheduling(null);
  };
  const toggle = (task: Task) => {
    syncEngine.toggleTaskCompletion(task.id);
    triggerHaptic("success");
  };
  const dueText = (task: Task) => {
    if (!task.deadline)
      return task.start_date === today ? "Today" : "No deadline";
    const due = new Date(task.deadline);
    const day = localDate(due);
    const label =
      day < today
        ? "Overdue"
        : day === today
          ? "Today"
          : due.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            });
    return `${label} · ${due.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  };
  const taskCard = (task: Task, done = false) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.22 }}
      className={`smart-task-card ${done ? "is-done" : ""} ${rescheduling === task.id ? "menu-open" : ""}`}
      key={task.id}
    >
      <button
        className="smart-task-check"
        aria-label={`${done ? "Reopen" : "Complete"} ${task.title}`}
        onClick={() => toggle(task)}
      >
        <Check size={13} />
      </button>
      <button className="smart-task-main" onClick={() => onSelectTask(task)}>
        <strong>{task.title}</strong>
        <span
          className={
            task.deadline && new Date(task.deadline) < new Date() && !done
              ? "overdue"
              : ""
          }
        >
          {dueText(task)}
        </span>
        <small>
          {formatMinutes(task.estimated_duration_minutes)}
          <i>·</i>
          <b className={`priority-${task.priority}`}>
            {task.priority === "medium" ? "Normal" : task.priority}
          </b>
          {task.project && (
            <>
              <i>·</i>
              {task.project.title}
            </>
          )}
        </small>
      </button>
      {!done && (
        <div className="smart-task-actions">
          <button
            onClick={() => toggle(task)}
            aria-label={`Complete ${task.title}`}
          >
            <Check size={14} />
            <span>Done</span>
          </button>
          <button
            onClick={() => onStartFocus(task)}
            aria-label={`Focus on ${task.title}`}
          >
            <Play size={14} />
            <span>Start</span>
          </button>
          <button
            onClick={() =>
              setRescheduling(rescheduling === task.id ? null : task.id)
            }
            aria-label={`Reschedule ${task.title}`}
            aria-expanded={rescheduling === task.id}
            aria-haspopup="menu"
          >
            <CalendarClock size={14} />
            <span>Move</span>
          </button>
          <button
            onClick={onOpenAssistant}
            aria-label={`Ask Planny about ${task.title}`}
          >
            <WandSparkles size={14} />
            <span>AI</span>
          </button>
          <button
            onClick={() => onSelectTask(task)}
            aria-label={`More actions for ${task.title}`}
          >
            <MoreHorizontal size={15} />
          </button>
        </div>
      )}
      {rescheduling === task.id && (
        <div className="reschedule-popover" role="menu">
          <span>Move to</span>
          <button onClick={() => moveTask(task, "today")}>Today</button>
          <button onClick={() => moveTask(task, "tomorrow")}>Tomorrow</button>
          <button onClick={() => moveTask(task, "smart")}>
            <Sparkles size={12} /> Let Planny decide
          </button>
        </div>
      )}
    </motion.div>
  );
  const filteredTasks = useMemo(() => {
    if (filter === "open") return pending;
    if (filter === "completed") return completed;
    return [...pending, ...completed];
  }, [completed, filter, pending]);
  const projectGroups = useMemo(() => {
    const groups = new Map<
      string,
      { id: string; title: string; color: string; tasks: Task[] }
    >();
    filteredTasks.forEach((task) => {
      if (!task.project_id) return;
      const existing = groups.get(task.project_id);
      if (existing) {
        existing.tasks.push(task);
        return;
      }
      groups.set(task.project_id, {
        id: task.project_id,
        title: task.project?.title || "Project",
        color: task.project?.color || "#9cf177",
        tasks: [task],
      });
    });
    return [...groups.values()];
  }, [filteredTasks]);
  const unassignedTasks = filteredTasks.filter((task) => !task.project_id);
  const toggleProject = (projectId: string, defaultOpen: boolean) => {
    setOpenProjects((current) => {
      const next = new Set(
        current ?? (defaultOpen && projectGroups[0] ? [projectGroups[0].id] : []),
      );
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };
  return (
    <div className="today-page smart-today-page">
      <header className="smart-today-header">
        <div>
          <span className="page-eyebrow">{greeting()}</span>
          <h1>
            Today<span className="accent-period">.</span>
          </h1>
          <p>
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="today-header-actions">
          <button
            className="plan-day-button"
            onClick={() => setPlannerOpen(true)}
          >
            <Sparkles size={16} /> Plan my day
          </button>
          <button className="primary-button" onClick={onOpenAITaskModal}>
            <Plus size={16} /> New task
          </button>
        </div>
      </header>
      <section className="today-progress-card" aria-label="Today's progress">
        <div className="today-progress-copy">
          <span>TODAY’S PROGRESS</span>
          <strong>{completion}%</strong>
        </div>
        <div className="today-progress-metrics">
          <div>
            <strong>
              {completed.length} / {totalTasks}
            </strong>
            <span>tasks completed</span>
          </div>
          <div>
            <strong>{formatFocusTime(focusedToday)}</strong>
            <span>focused</span>
          </div>
          <div>
            <strong>{formatMinutes(remainingMinutes)}</strong>
            <span>estimated remaining</span>
          </div>
        </div>
        <div className="today-progress-track">
          <motion.i
            initial={{ width: 0 }}
            animate={{ width: `${completion}%` }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          />
        </div>
      </section>
      <div className="smart-today-grid">
        <main className="smart-task-column">
          <div className="smart-section-heading">
            <div>
              <span>DO THE NEXT RIGHT THING</span>
              <h2>Today’s tasks</h2>
            </div>
            <div className="task-tabs today-task-filter" aria-label="Task filter">
              {(
                [
                  ["all", "All tasks", totalTasks],
                  ["open", "Open", pending.length],
                  ["completed", "Finished", completed.length],
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
          </div>
          <div className="today-task-organizer">
            <section className="project-task-folders" aria-label="Tasks by project">
              <div className="organizer-column-heading">
                <div>
                  <Folder size={15} />
                  <strong>Projects</strong>
                </div>
                <span>{projectGroups.length} folders</span>
              </div>
              {projectGroups.map((group, index) => {
                const isOpen = openProjects === null ? index === 0 : openProjects.has(group.id);
                const completedCount = group.tasks.filter(
                  (task) => task.status === "completed",
                ).length;
                const minutes = group.tasks.reduce(
                  (sum, task) => sum + task.estimated_duration_minutes,
                  0,
                );
                return (
                  <section className="project-task-folder" key={group.id}>
                    <button
                      className="project-folder-trigger"
                      onClick={() => toggleProject(group.id, index === 0)}
                      aria-expanded={isOpen}
                    >
                      <span
                        className="project-folder-icon"
                        style={{ borderColor: group.color, color: group.color }}
                      >
                        <Folder size={16} />
                      </span>
                      <span className="project-folder-title">
                        <small>PROJECT</small>
                        <strong>{group.title}</strong>
                      </span>
                      <span className="project-folder-summary">
                        {completedCount}/{group.tasks.length} done · {formatMinutes(minutes)}
                      </span>
                      <ChevronDown size={16} className={isOpen ? "is-open" : ""} />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          className="project-folder-tasks"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                        >
                          {group.tasks.map((task) =>
                            taskCard(task, task.status === "completed"),
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>
                );
              })}
              {!projectGroups.length && (
                <div className="organizer-empty">No project tasks in this view.</div>
              )}
            </section>
            <aside className="unassigned-task-rail" aria-label="Tasks without a project">
              <div className="organizer-column-heading">
                <div>
                  <Inbox size={15} />
                  <strong>No project</strong>
                </div>
                <span>{unassignedTasks.length} tasks</span>
              </div>
              <AnimatePresence mode="popLayout">
                {unassignedTasks.map((task) =>
                  taskCard(task, task.status === "completed"),
                )}
              </AnimatePresence>
              {!unassignedTasks.length && (
                <div className="organizer-empty">Everything is neatly filed.</div>
              )}
            </aside>
          </div>
          {!filteredTasks.length && filter !== "completed" && (
            <div className="compact-empty-state">
              <CheckCircle2 size={20} />
              <div>
                <strong>Nothing planned yet.</strong>
                <span>Capture something you’re working toward.</span>
              </div>
              <button onClick={onOpenAITaskModal}>Add task</button>
            </div>
          )}
          <form className="smart-inline-add" onSubmit={add}>
            <Plus size={16} />
            <input
              aria-label="New task title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Quick add a task…"
            />
            <select
              aria-label="Task priority"
              value={priority}
              onChange={(event) => setPriority(event.target.value as Priority)}
            >
              <option value="low">Low</option>
              <option value="medium">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <button
              type="submit"
              disabled={!title.trim()}
              aria-label="Add task"
            >
              <ArrowUpRight size={16} />
            </button>
          </form>
          <button className="review-day-button" onClick={onOpenDayReview}>
            <span>
              <CheckCircle2 size={15} /> Wrap up your day
            </span>
            <span>
              Review progress <ArrowRight size={13} />
            </span>
          </button>
        </main>
      </div>
      <PlanMyDayModal
        isOpen={plannerOpen}
        onClose={() => setPlannerOpen(false)}
        tasks={tasks}
        routines={routines}
        sessions={focusSessions}
        endOfDay={endOfDay}
        existingPlan={currentPlan}
        onAddTask={onOpenAITaskModal}
      />
    </div>
  );
}
