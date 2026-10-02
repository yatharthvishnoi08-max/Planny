import { isTodayTask, isPending, routineOccursOn } from "../../lib/dates";
import React from "react";
import { Task, Routine } from "../../types/database";
import { formatMinutes } from "../../lib/utils";
import { Sun, ArrowRight, X } from "lucide-react";

interface DailyBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  routines: Routine[];
}

export const DailyBriefingModal: React.FC<DailyBriefingModalProps> = ({
  isOpen,
  onClose,
  tasks,
  routines,
}) => {
  if (!isOpen) return null;

  const todayTasks = tasks.filter((t) => isPending(t) && isTodayTask(t));
  const highPriorityCount = todayTasks.filter(
    (t) => t.priority === "high" || t.priority === "urgent",
  ).length;
  const normalPriorityCount = todayTasks.filter(
    (t) => t.priority === "medium" || t.priority === "low",
  ).length;
  const totalMinutes = todayTasks.reduce(
    (acc, t) => acc + (t.estimated_duration_minutes || 30),
    0,
  );

  // Extract focus topics
  const focusTopics =
    Array.from(
      new Set(
        todayTasks
          .map((t) => {
            if (t.title.toLowerCase().includes("physics")) return "Physics";
            if (
              t.title.toLowerCase().includes(" c ") ||
              t.title.toLowerCase().includes("c unit")
            )
              return "C Programming";
            if (t.title.toLowerCase().includes("dsa")) return "DSA";
            return t.project?.title || null;
          })
          .filter(Boolean),
      ),
    )
      .slice(0, 2)
      .join(" + ") || "Core Priorities";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-surface-100 border border-surface-border p-6 shadow-2xl relative text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-4">
          <Sun className="w-6 h-6" />
        </div>

        <span className="text-[11px] font-mono tracking-widest uppercase text-amber-400/90 font-medium">
          MORNING BRIEFING
        </span>

        <h2 className="text-2xl font-medium text-foreground mt-1 mb-2 tracking-tight">
          Good morning
        </h2>

        <p className="text-xs text-muted-foreground mb-6">
          Here is your personalized AI workload summary for today.
        </p>

        {/* Stats card */}
        <div className="bg-surface-200 border border-surface-border rounded-xl p-4 text-left mb-6 space-y-3">
          <div className="flex justify-between items-center pb-2.5 border-b border-surface-border">
            <span className="text-xs text-muted-foreground">
              Scheduled tasks
            </span>
            <span className="text-sm font-medium text-foreground">
              {todayTasks.length} tasks today
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 py-1 text-center">
            <div className="p-2 rounded-lg bg-surface-100 border border-surface-border">
              <span className="text-base font-semibold text-orange-400 block">
                {highPriorityCount}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase">
                High / Urgent
              </span>
            </div>
            <div className="p-2 rounded-lg bg-surface-100 border border-surface-border">
              <span className="text-base font-semibold text-foreground block">
                {normalPriorityCount}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase">
                Normal
              </span>
            </div>
            <div className="p-2 rounded-lg bg-surface-100 border border-surface-border">
              <span className="text-base font-semibold text-indigo-400 block">
                {routines.filter((r) => routineOccursOn(r)).length}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase">
                Routines
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-surface-border">
            <span className="text-xs text-muted-foreground">
              Estimated workload:
            </span>
            <span className="text-xs font-mono font-medium text-foreground">
              {formatMinutes(totalMinutes)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Today's focus:
            </span>
            <span className="text-xs font-medium text-indigo-300">
              {focusTopics}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center space-x-2 shadow-sm"
        >
          <span>START DAY</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-[11px] text-muted-foreground/60 mt-3">
          You can toggle automatic morning briefings in Settings.
        </p>
      </div>
    </div>
  );
};
