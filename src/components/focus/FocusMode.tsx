import React, { useState, useEffect, useRef } from "react";
import { Task, Subtask } from "../../types/database";
import { Play, Pause, CheckCircle2, X, Sparkles, Check } from "lucide-react";
import { syncEngine } from "../../lib/sync";
import { formatMinutes } from "../../lib/utils";

interface FocusModeProps {
  task: Task;
  onClose: () => void;
  nextTask?: Task;
  todayTasks?: Task[];
  onStartNext?: (task: Task) => void;
}

export const FocusMode: React.FC<FocusModeProps> = ({
  task,
  onClose,
  nextTask,
  todayTasks = [],
  onStartNext,
}) => {
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks || []);
  const [isCompletedSummary, setIsCompletedSummary] = useState(false);
  const [targetMinutes, setTargetMinutes] = useState(
    task.estimated_duration_minutes || 25,
  );

  const startedAt = useRef(new Date().toISOString());
  const elapsed = useRef(0);
  useEffect(() => {
    let interval: number;
    let last = Date.now();
    if (isActive && !isCompletedSummary) {
      interval = window.setInterval(() => {
        const now = Date.now();
        elapsed.current += (now - last) / 1000;
        last = now;
        setSecondsElapsed(Math.floor(elapsed.current));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, isCompletedSummary]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleToggleSubtask = (subId: string) => {
    const updated = subtasks.map((s) =>
      s.id === subId ? { ...s, is_completed: !s.is_completed } : s,
    );
    setSubtasks(updated);
    syncEngine.toggleSubtask(task.id, subId);
  };

  const handleFinishFocus = () => {
    setIsActive(false);
    setIsCompletedSummary(true);

    const completedSubs = subtasks.filter((s) => s.is_completed).length;
    syncEngine.logFocusSession({
      id: crypto.randomUUID(),
      user_id: task.user_id,
      task_id: task.id,
      duration_seconds: secondsElapsed,
      started_at: startedAt.current,
      completed_at: new Date().toISOString(),
      notes: `Focus on ${task.title}`,
      completed_subtasks_count: completedSubs,
      created_at: new Date().toISOString(),
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-background text-foreground flex flex-col items-center justify-between p-6 sm:p-12 animate-fade-in select-none">
      {/* Top Header */}
      <div className="w-full max-w-xl flex items-center justify-between pt-safe">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs uppercase tracking-widest text-muted-foreground font-mono">
            {isCompletedSummary ? "SESSION COMPLETED" : "FOCUS MODE"}
          </span>
        </div>
        <button
          aria-label="Exit focus session"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg border border-surface-border bg-surface-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Focus Body */}
      <div className="w-full max-w-md text-center my-auto">
        {!isCompletedSummary ? (
          <>
            <span className="text-xs uppercase tracking-widest text-indigo-400 font-semibold mb-2 block">
              {task.project?.title || "DEEP FOCUS"}
            </span>

            <h1 className="text-2xl sm:text-3xl font-medium tracking-tight mb-6 text-foreground">
              {task.title}
            </h1>
            <p className="focus-goal-copy">
              Estimated {formatMinutes(task.estimated_duration_minutes)} · Goal{" "}
              {formatMinutes(targetMinutes)}
            </p>

            {/* Timer readout */}
            <div className="font-mono text-6xl sm:text-7xl font-light tracking-tight my-8 text-foreground/90">
              {formatTimer(secondsElapsed)}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center space-x-3 mb-10">
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-surface-200 hover:bg-surface-hover border border-surface-border text-sm font-medium transition-colors"
              >
                {isActive ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span>{isActive ? "PAUSE" : "RESUME"}</span>
              </button>

              <button
                type="button"
                onClick={handleFinishFocus}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finish session</span>
              </button>
            </div>
            <button
              type="button"
              className="focus-extend"
              onClick={() => setTargetMinutes((minutes) => minutes + 5)}
            >
              + Extend goal by 5 minutes
            </button>

            {/* Subtasks checklist */}
            {subtasks.length > 0 && (
              <div className="text-left bg-surface-100 border border-surface-border rounded-2xl p-4 shadow-lg">
                <div className="text-xs text-muted-foreground mb-3 font-medium">
                  Subtasks in session:
                </div>
                <div className="space-y-2">
                  {subtasks.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleToggleSubtask(st.id)}
                      className="w-full flex items-center space-x-2.5 text-xs text-left py-1 hover:text-foreground transition-colors"
                    >
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                          st.is_completed
                            ? "bg-emerald-600 border-emerald-500 text-white"
                            : "border-zinc-700 bg-surface-200"
                        }`}
                      >
                        {st.is_completed && <Check className="w-3 h-3" />}
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
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="animate-fade-in py-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-5">
              <Sparkles className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-medium text-foreground mb-2">Nice.</h2>
            <p className="text-4xl font-mono font-light text-emerald-400 my-4">
              {Math.max(1, Math.round(secondsElapsed / 60))} minutes focused.
            </p>
            <p className="text-xs text-muted-foreground mb-8">
              Session saved. You estimated{" "}
              {formatMinutes(task.estimated_duration_minutes)} for this task;
              this session tracked the actual time above.
            </p>

            <div className="focus-summary-progress">
              <span>Today’s progress</span>
              <strong>
                {
                  todayTasks.filter((item) => item.status === "completed")
                    .length
                }{" "}
                / {todayTasks.length} tasks
              </strong>
              <i>
                <b
                  style={{
                    width: `${todayTasks.length ? (todayTasks.filter((item) => item.status === "completed").length / todayTasks.length) * 100 : 0}%`,
                  }}
                />
              </i>
            </div>

            <button
              type="button"
              className="primary-button mb-4"
              onClick={() => {
                const latest = syncEngine
                  .getTasks()
                  .find((t) => t.id === task.id);
                if (latest && latest.status !== "completed")
                  syncEngine.toggleTaskCompletion(task.id);
                if (nextTask && onStartNext) onStartNext(nextTask);
                else onClose();
              }}
            >
              {nextTask ? "Complete & start next" : "Mark task done"}
            </button>
            {nextTask && (
              <p className="focus-next-copy">
                Next: {nextTask.title} ·{" "}
                {formatMinutes(nextTask.estimated_duration_minutes)}
              </p>
            )}
            <br />
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-surface-200 hover:bg-surface-hover border border-surface-border rounded-xl text-sm font-medium text-foreground transition-colors"
            >
              Back to Today
            </button>
          </div>
        )}
      </div>

      <div className="w-full max-w-xl text-center pb-safe">
        <span className="text-[11px] text-muted-foreground/60">
          Press ESC or close button to exit Focus Mode
        </span>
      </div>
    </div>
  );
};
