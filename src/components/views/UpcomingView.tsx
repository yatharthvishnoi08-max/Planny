import { localDate, isPending, taskScheduleBucket } from "../../lib/dates";
import React from "react";
import { Task } from "../../types/database";
import { Calendar, AlertCircle, Clock, Check, CheckCircle2 } from "lucide-react";
import { formatMinutes } from "../../lib/utils";
import { formatProjectName } from "../../lib/projectName";
import { syncEngine } from "../../lib/sync";

interface UpcomingViewProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
}

export const UpcomingView: React.FC<UpcomingViewProps> = ({
  tasks,
  onSelectTask,
}) => {
  const pendingTasks = tasks.filter(isPending);
  const inBucket = (bucket: ReturnType<typeof taskScheduleBucket>) =>
    pendingTasks.filter((t) => taskScheduleBucket(t) === bucket);

  const renderSection = (title: string, items: Task[]) => (
    <section className="upcoming-group mb-6">
      <div className="flex items-center justify-between mb-3 pb-1 border-b border-surface-border">
        <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
          {title} ({items.length})
        </h3>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground/60 py-2">
          No tasks scheduled for this period.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((t) => (
            <div
              key={t.id}
              className="upcoming-task p-3.5 rounded-xl bg-surface-100 hover:bg-surface-200 border border-surface-border flex items-center justify-between cursor-pointer transition-colors"
            >
              <button className="upcoming-task-main" onClick={() => onSelectTask(t)}>
              <div className="upcoming-task-copy">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-foreground">
                    {t.title}
                  </span>
                  {t.project && (
                    <span className="text-[10px] text-muted-foreground bg-surface-200 px-1.5 py-0.5 rounded border border-surface-border">
                      {formatProjectName(t.project.title)}
                    </span>
                  )}
                </div>
                {t.deadline && (
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    Due:{" "}
                    {new Date(t.deadline).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>

              <div className="upcoming-task-meta flex items-center space-x-2 text-xs font-mono text-muted-foreground">
                <span>{formatMinutes(t.estimated_duration_minutes)}</span>
                <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-surface-200 border border-surface-border">
                  {t.priority}
                </span>
              </div>
              </button>
              <button className="upcoming-mark-done" aria-label={`Mark ${t.title} done`} onClick={() => syncEngine.toggleTaskCompletion(t.id)}><Check size={13} /> Mark done</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="upcoming-page content-page max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10 animate-fade-in">
      <div className="pb-6 mb-6 border-b border-surface-border">
        <h1 className="text-2xl font-medium tracking-tight text-foreground">
          Upcoming
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          See what’s due, what’s next, and what still needs a date.
        </p>
      </div>

      {inBucket("overdue").length > 0 &&
        renderSection("Overdue", inBucket("overdue"))}
      {renderSection("Today", inBucket("today"))}
      {renderSection("Tomorrow", inBucket("tomorrow"))}
      {renderSection("Next 7 days", inBucket("week"))}
      {renderSection("Later", inBucket("later"))}
      {renderSection("No date yet", inBucket("unscheduled"))}
    </div>
  );
};
