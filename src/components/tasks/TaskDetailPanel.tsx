import React, { useState, useEffect } from "react";
import {
  Task,
  Subtask,
  Priority,
  TaskStatus,
  Project,
} from "../../types/database";
import {
  X,
  Calendar,
  Clock,
  AlertCircle,
  Folder,
  CheckSquare,
  Plus,
  Trash2,
  Play,
  Sparkles,
  CalendarClock,
  ArrowRight,
} from "lucide-react";
import { syncEngine } from "../../lib/sync";
import { formatMinutes } from "../../lib/utils";
import { localDate, dateAtTime } from "../../lib/dates";

interface TaskDetailPanelProps {
  task: Task;
  onClose: () => void;
  onStartFocus: (task: Task) => void;
  projects: Project[];
}

export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({
  task,
  onClose,
  onStartFocus,
  projects,
}) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [deadline, setDeadline] = useState(
    task.deadline ? localDate(new Date(task.deadline)) : "",
  );
  const [plannedDay, setPlannedDay] = useState(
    task.start_date || localDate(),
  );
  const [duration, setDuration] = useState(
    task.estimated_duration_minutes || 30,
  );
  const [projectId, setProjectId] = useState(task.project_id || "");
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || "");
    setPriority(task.priority);
    setStatus(task.status);
    setDeadline(task.deadline ? localDate(new Date(task.deadline)) : "");
    setPlannedDay(task.start_date || localDate());
    setDuration(task.estimated_duration_minutes || 30);
    setProjectId(task.project_id || "");
    setSubtasks(task.subtasks || []);
  }, [task]);

  const handleSave = () => {
    const updated: Task = {
      ...(syncEngine.getTasks().find((t) => t.id === task.id) || task),
      title,
      description,
      priority,
      status,
      start_date: plannedDay || null,
      deadline: deadline
        ? dateAtTime(
            deadline,
            task.deadline
              ? new Date(task.deadline).toTimeString().slice(0, 5)
              : "18:00",
          )
        : null,
      estimated_duration_minutes: duration,
      project_id: projectId || null,
      subtasks,
    };
    if (!title.trim() || duration < 1) return;
    syncEngine.saveTask(updated);
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    const newSub: Subtask = {
      id: crypto.randomUUID(),
      task_id: task.id,
      user_id: task.user_id,
      title: newSubtaskTitle.trim(),
      is_completed: false,
      position: subtasks.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updated = [...subtasks, newSub];
    setSubtasks(updated);
    setNewSubtaskTitle("");
    syncEngine.saveTask({
      ...(syncEngine.getTasks().find((t) => t.id === task.id) || task),
      subtasks: updated,
    });
  };

  const handleToggleSubtask = (subId: string) => {
    const updated = subtasks.map((s) =>
      s.id === subId ? { ...s, is_completed: !s.is_completed } : s,
    );
    setSubtasks(updated);
    syncEngine.saveTask({
      ...(syncEngine.getTasks().find((t) => t.id === task.id) || task),
      subtasks: updated,
    });
  };

  const handleDeleteSubtask = (subId: string) => {
    const updated = subtasks.filter((s) => s.id !== subId);
    setSubtasks(updated);
    syncEngine.saveTask({
      ...(syncEngine.getTasks().find((t) => t.id === task.id) || task),
      subtasks: updated,
    });
  };

  const handleDeleteTask = () => {
    syncEngine.deleteTask(task.id);
    onClose();
  };

  return (
    <div className="task-inspector fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-surface-100 border-l border-surface-border p-6 shadow-2xl flex flex-col justify-between animate-slide-in-right">
      {/* Top action bar */}
      <div className="flex items-center justify-between pb-4 border-b border-surface-border">
        <div className="flex items-center space-x-2">
          <select
            aria-label="Task status"
            value={status}
            onChange={(e) => {
              const newStatus = e.target.value as TaskStatus;
              setStatus(newStatus);
              syncEngine.saveTask({
                ...(syncEngine.getTasks().find((t) => t.id === task.id) ||
                  task),
                status: newStatus,
                completed_at:
                  newStatus === "completed" ? new Date().toISOString() : null,
              });
            }}
            className="text-xs font-medium bg-surface-200 border border-surface-border text-foreground rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button
            type="button"
            onClick={() => {
              handleSave();
              onStartFocus(
                syncEngine.getTasks().find((t) => t.id === task.id) || task,
              );
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-medium transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Focus</span>
          </button>
        </div>

        <button
          aria-label="Close task details"
          onClick={onClose}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main editable body */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {/* Title */}
        <div>
          <input
            type="text"
            aria-label="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            placeholder="Task title"
            className="w-full text-base font-medium bg-transparent border-0 border-b border-transparent hover:border-surface-border focus:border-indigo-500 text-foreground px-0 py-1 focus:outline-none transition-colors"
          />
        </div>

        {/* Metadata Grid */}
        <div className="space-y-2.5 text-xs bg-surface-200/50 p-3 rounded-xl border border-surface-border">
          {/* Priority */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center space-x-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span>Priority</span>
            </span>
            <select
              aria-label="Task priority"
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value as Priority);
                syncEngine.saveTask({
                  ...(syncEngine.getTasks().find((t) => t.id === task.id) ||
                    task),
                  priority: e.target.value as Priority,
                });
              }}
              className="bg-surface-100 border border-surface-border rounded px-2 py-1 text-foreground uppercase text-[11px] font-mono"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Project */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center space-x-1.5">
              <Folder className="w-3.5 h-3.5 text-emerald-400" />
              <span>Project</span>
            </span>
            <select
              aria-label="Task project"
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                syncEngine.saveTask({
                  ...(syncEngine.getTasks().find((t) => t.id === task.id) ||
                    task),
                  project_id: e.target.value || null,
                });
              }}
              className="bg-surface-100 border border-surface-border rounded px-2 py-1 text-foreground text-[11px]"
            >
              <option value="">No Project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          {/* Planned day */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center space-x-1.5">
              <CalendarClock className="w-3.5 h-3.5 text-lime-400" />
              <span>Planned day</span>
            </span>
            <input
              type="date"
              aria-label="Task planned day"
              value={plannedDay}
              onChange={(e) => {
                const moved = syncEngine.carryTaskTo(task.id, e.target.value);
                setPlannedDay(moved?.start_date || e.target.value);
              }}
              className="bg-surface-100 border border-surface-border rounded px-2 py-0.5 text-foreground text-[11px]"
            />
          </div>

          {/* Deadline */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span>Deadline</span>
            </span>
            <input
              type="date"
              aria-label="Task deadline"
              value={deadline}
              onChange={(e) => {
                setDeadline(e.target.value);
                syncEngine.saveTask({
                  ...(syncEngine.getTasks().find((t) => t.id === task.id) ||
                    task),
                  deadline: e.target.value
                    ? dateAtTime(
                        e.target.value,
                        task.deadline
                          ? new Date(task.deadline).toTimeString().slice(0, 5)
                          : "18:00",
                      )
                    : null,
                });
              }}
              className="bg-surface-100 border border-surface-border rounded px-2 py-0.5 text-foreground text-[11px]"
            />
          </div>

          {/* Estimated Duration */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Estimated Duration</span>
            </span>
            <div className="flex items-center space-x-1">
              <input
                type="number"
                min="5"
                max="1440"
                step="5"
                aria-label="Task duration in minutes"
                value={duration}
                onChange={(e) =>
                  setDuration(
                    Math.min(1440, Math.max(5, parseInt(e.target.value, 10) || 30)),
                  )
                }
                onBlur={handleSave}
                className="w-14 bg-surface-100 border border-surface-border rounded px-1.5 py-0.5 text-foreground text-[11px] text-right font-mono"
              />
              <span className="text-[11px] text-muted-foreground">min</span>
            </div>
          </div>
        </div>

        {!task.is_routine && !task.recurrence_rule && (
          <div className="task-rollover-card">
            <span className="task-rollover-icon">
              <CalendarClock size={17} />
            </span>
            <div>
              <strong>Automatic carry-over is on</strong>
              <p>
                If this is unfinished, Planny brings it into the next day. Its
                deadline stays unchanged.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const nextDay = localDate(tomorrow);
                const moved = syncEngine.carryTaskTo(task.id, nextDay);
                setPlannedDay(moved?.start_date || nextDay);
              }}
            >
              Move to tomorrow <ArrowRight size={13} />
            </button>
          </div>
        )}

        {/* Description / Notes */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleSave}
            placeholder="Add details, notes, or links..."
            className="w-full bg-surface-200 border border-surface-border rounded-xl p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500 transition-colors resize-none"
          />
        </div>

        {/* Subtasks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-muted-foreground">
              Subtasks ({subtasks.filter((s) => s.is_completed).length}/
              {subtasks.length})
            </label>
          </div>

          <div className="space-y-1.5 mb-2.5">
            {subtasks.map((st) => (
              <div
                key={st.id}
                className="flex items-center justify-between group p-1.5 rounded-lg hover:bg-surface-200 text-xs"
              >
                <button
                  type="button"
                  onClick={() => handleToggleSubtask(st.id)}
                  className="flex items-center space-x-2 text-left flex-1"
                >
                  <div
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${st.is_completed ? "bg-indigo-600 border-indigo-500 text-white" : "border-zinc-700 bg-surface-100"}`}
                  >
                    {st.is_completed && <CheckSquare className="w-2.5 h-2.5" />}
                  </div>
                  <span
                    className={
                      st.is_completed
                        ? "line-through text-muted-foreground"
                        : "text-foreground"
                    }
                  >
                    {st.title}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSubtask(st.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 p-1 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Subtask input */}
          <form
            onSubmit={handleAddSubtask}
            className="flex items-center space-x-1.5"
          >
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              placeholder="Add a subtask..."
              className="flex-1 bg-surface-200 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="p-1.5 bg-surface-200 hover:bg-surface-hover border border-surface-border text-foreground rounded-lg text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Footer delete */}
      <div className="pt-3 border-t border-surface-border flex items-center justify-between">
        <button
          type="button"
          onClick={handleDeleteTask}
          className="text-xs text-red-400/80 hover:text-red-400 flex items-center space-x-1.5 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Task</span>
        </button>

        <button
          type="button"
          onClick={() => {
            handleSave();
            onClose();
          }}
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};
