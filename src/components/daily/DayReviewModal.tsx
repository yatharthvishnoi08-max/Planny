import {
  localDate,
  isTodayTask,
  isPending,
  routineOccursOn,
} from "../../lib/dates";
import React from "react";
import { Task } from "../../types/database";
import { Check, X, Moon, ArrowRight, Calendar, Trash2 } from "lucide-react";
import { syncEngine } from "../../lib/sync";

interface DayReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
}

export const DayReviewModal: React.FC<DayReviewModalProps> = ({
  isOpen,
  onClose,
  tasks,
}) => {
  if (!isOpen) return null;

  const completedTasks = tasks.filter(
    (t) => t.status === "completed" && isTodayTask(t),
  );
  const incompleteTasks = tasks.filter((t) => isPending(t) && isTodayTask(t));

  const handleMoveToTomorrow = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    syncEngine.saveTask({
      ...task,
      start_date: localDate(tomorrow),
      deadline: tomorrow.toISOString(),
    });
  };

  const handleDelete = (taskId: string) => {
    syncEngine.deleteTask(taskId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-surface-100 border border-surface-border p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Moon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-medium text-foreground">
              Day Review
            </h3>
            <p className="text-xs text-muted-foreground">
              Consolidate achievements and organize unfinished work
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-200 border border-surface-border mb-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Overall Completion
          </span>
          <span className="text-sm font-semibold font-mono text-emerald-400">
            {completedTasks.length} /{" "}
            {completedTasks.length + incompleteTasks.length} completed
          </span>
        </div>

        {/* Completed list */}
        {completedTasks.length > 0 && (
          <div className="mb-4">
            <span className="text-xs font-medium text-muted-foreground block mb-2">
              Completed Today
            </span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {completedTasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center space-x-2 text-xs text-foreground/80 py-1"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="line-through">{t.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Incomplete list with action triggers */}
        <div>
          <span className="text-xs font-medium text-muted-foreground block mb-2">
            Incomplete ({incompleteTasks.length})
          </span>
          {incompleteTasks.length === 0 ? (
            <p className="text-xs text-emerald-400 py-2">
              All tasks completed for today! 🎉
            </p>
          ) : (
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {incompleteTasks.map((t) => (
                <div
                  key={t.id}
                  className="p-3 bg-surface-200 border border-surface-border rounded-xl"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-foreground">
                      {t.title}
                    </span>
                    <span className="text-[10px] text-orange-400 font-mono uppercase">
                      {t.priority}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-surface-border/50">
                    <span className="text-[11px] text-muted-foreground">
                      Move this to tomorrow?
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleMoveToTomorrow(t.id)}
                        className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded text-[11px] font-medium transition-colors flex items-center space-x-1"
                      >
                        <Calendar className="w-3 h-3" />
                        <span>MOVE</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(t.id)}
                        className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-surface-200 hover:bg-surface-hover border border-surface-border rounded-xl text-xs font-medium text-foreground transition-colors"
          >
            Done Reviewing
          </button>
        </div>
      </div>
    </div>
  );
};
