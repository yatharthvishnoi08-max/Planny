import {
  localDate,
  dateAtTime,
  routineOccursOn,
  taskScheduleDate,
} from "../../lib/dates";
import React, { useState } from "react";
import { Task, Routine } from "../../types/database";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { formatMinutes } from "../../lib/utils";
import { syncEngine } from "../../lib/sync";

type CalendarMode = "day" | "week" | "month" | "year";

interface CalendarViewProps {
  tasks: Task[];
  routines: Routine[];
  onSelectTask: (task: Task) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  routines,
  onSelectTask,
}) => {
  const [mode, setMode] = useState<CalendarMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (mode === "day") d.setDate(d.getDate() - 1);
    else if (mode === "week") d.setDate(d.getDate() - 7);
    else if (mode === "month") {
      d.setDate(1);
      d.setMonth(d.getMonth() - 1);
    } else if (mode === "year") d.setFullYear(d.getFullYear() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (mode === "day") d.setDate(d.getDate() + 1);
    else if (mode === "week") d.setDate(d.getDate() + 7);
    else if (mode === "month") {
      d.setDate(1);
      d.setMonth(d.getMonth() + 1);
    } else if (mode === "year") d.setFullYear(d.getFullYear() + 1);
    setCurrentDate(d);
  };

  // Month days calculation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const leadingBlanks = Array.from(
    { length: (firstDayOfMonth + 6) % 7 },
    (_, i) => i,
  ); // Monday start

  // Group tasks by date
  const getTasksForDate = (dateStr: string) => {
    return tasks.filter((t) => {
      if (t.status === "cancelled") return false;
      return taskScheduleDate(t) === dateStr;
    });
  };

  const rangeStart = new Date(currentDate);
  rangeStart.setHours(0, 0, 0, 0);
  if (mode === "week")
    rangeStart.setDate(rangeStart.getDate() - ((rangeStart.getDay() + 6) % 7));
  const rangeDates = Array.from(
    { length: mode === "week" ? 7 : 1 },
    (_, index) => {
      const d = new Date(rangeStart);
      d.setDate(d.getDate() + index);
      return localDate(d);
    },
  );
  const rangeTasks = tasks.filter((t) =>
    rangeDates.some((date) =>
      getTasksForDate(date).some((item) => item.id === t.id),
    ),
  );
  const handleDrop = (event: React.DragEvent, date: string) => {
    event.preventDefault();
    const task = tasks.find(
      (t) => t.id === event.dataTransfer.getData("text/orbit-task"),
    );
    if (task)
      syncEngine.saveTask({
        ...task,
        start_date: date,
        deadline: dateAtTime(
          date,
          task.deadline
            ? new Date(task.deadline).toTimeString().slice(0, 5)
            : "18:00",
        ),
      });
  };
  return (
    <div className="content-page max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-10 animate-fade-in">
      {/* Calendar Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-surface-border gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            Your week, mapped.
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Open a task to edit it. Drag tasks between days to reschedule.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-surface-100 p-1 rounded-xl border border-surface-border">
            {(["day", "week", "month", "year"] as CalendarMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-3 py-1 text-xs font-medium rounded-lg capitalize transition-colors ${
                  mode === m
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-1">
            <button
              aria-label="Previous period"
              onClick={handlePrev}
              className="p-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 border border-surface-border text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-surface-100 hover:bg-surface-200 border border-surface-border text-foreground transition-colors"
            >
              Today
            </button>
            <button
              aria-label="Next period"
              onClick={handleNext}
              className="p-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 border border-surface-border text-foreground transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Month Title */}
      <div className="mb-4 text-base font-medium text-foreground">
        {mode === "year"
          ? currentDate.getFullYear()
          : currentDate.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
      </div>

      {/* Month View Grid */}
      {mode === "month" && (
        <div className="bg-surface-100 border border-surface-border rounded-2xl overflow-hidden shadow-sm">
          {/* Day of week header */}
          <div className="grid grid-cols-7 border-b border-surface-border bg-surface-200/50 text-center py-2.5 text-xs font-mono font-medium text-muted-foreground uppercase">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 auto-rows-fr">
            {leadingBlanks.map((_, i) => (
              <div
                key={`blank-${i}`}
                className="min-h-[90px] sm:min-h-[110px] p-2 border-r border-b border-surface-border/40 bg-surface-200/10"
              />
            ))}

            {daysArray.map((day) => {
              const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayTasks = getTasksForDate(dayStr);
              const isToday = localDate() === dayStr;

              return (
                <div
                  key={day}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(event, dayStr)}
                  className={`min-h-[90px] sm:min-h-[110px] p-2 border-r border-b border-surface-border/60 transition-colors flex flex-col justify-between hover:bg-surface-200/50 ${
                    isToday ? "bg-indigo-600/5 font-semibold" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${isToday ? "bg-indigo-600 text-white font-mono" : "text-muted-foreground font-mono"}`}
                    >
                      {day}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {dayTasks.length}
                      </span>
                    )}
                  </div>

                  {/* Task list for day */}
                  <div className="space-y-1 overflow-y-auto max-h-16">
                    {dayTasks.slice(0, 2).map((t) => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(event) =>
                          event.dataTransfer.setData("text/orbit-task", t.id)
                        }
                        onClick={() => onSelectTask(t)}
                        className={`text-[11px] truncate px-1.5 py-0.5 rounded border cursor-pointer ${
                          t.priority === "urgent" || t.priority === "high"
                            ? "bg-orange-500/10 border-orange-500/20 text-orange-300"
                            : "bg-surface-200 border-surface-border text-foreground/90"
                        }`}
                      >
                        {t.title}
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <span className="text-[10px] text-muted-foreground block pl-1">
                        +{dayTasks.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === "week" && (
        <div className="week-board" aria-label="Weekly task schedule">
          {rangeDates.map((date) => {
            const day = new Date(`${date}T12:00:00`);
            const dayTasks = getTasksForDate(date);
            const dayRoutines = routines.filter((r) => routineOccursOn(r, day));
            return (
              <section
                key={date}
                className={`week-column ${date === localDate() ? "is-today" : ""}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, date)}
              >
                <header>
                  <span>
                    {day.toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                  <strong>{day.getDate()}</strong>
                  {date === localDate() && <small>Today</small>}
                </header>
                <div className="week-items">
                  {dayTasks.map((t) => (
                    <button
                      key={t.id}
                      className={`week-task priority-${t.priority} ${t.status === "completed" ? "done" : ""}`}
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/orbit-task", t.id)
                      }
                      onClick={() => onSelectTask(t)}
                    >
                      <span className="week-task-meta">
                        {t.deadline
                          ? new Date(t.deadline).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Any time"}{" "}
                        · {formatMinutes(t.estimated_duration_minutes)}
                      </span>
                      <strong>{t.title}</strong>
                      <span className="week-task-footer">
                        {t.status === "completed"
                          ? "✓ Done"
                          : t.priority === "medium"
                            ? "To do"
                            : t.priority}
                      </span>
                    </button>
                  ))}
                  {dayRoutines.map((r) => (
                    <div className="week-routine" key={r.id}>
                      <span>{r.time_of_day} · Routine</span>
                      <strong>{r.title}</strong>
                    </div>
                  ))}
                  {!dayTasks.length && !dayRoutines.length && (
                    <p className="week-empty">Room to breathe.</p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Day / Week List View */}
      {mode === "day" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-surface-100 border border-surface-border">
            <h3 className="text-sm font-medium text-foreground mb-3">
              {mode === "day"
                ? currentDate.toDateString()
                : `Week of ${rangeStart.toLocaleDateString()}`}
            </h3>
            {rangeTasks.length === 0 && (
              <p className="text-sm text-muted-foreground py-6">
                No tasks in this period.
              </p>
            )}
            <div className="space-y-2">
              {rangeTasks.map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(event) =>
                    event.dataTransfer.setData("text/orbit-task", t.id)
                  }
                  onClick={() => onSelectTask(t)}
                  className="p-3 bg-surface-200 border border-surface-border rounded-xl flex items-center justify-between cursor-pointer hover:bg-surface-hover transition-colors"
                >
                  <div>
                    <div className="text-xs font-medium text-foreground">
                      {t.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Deadline:{" "}
                      {t.deadline
                        ? new Date(t.deadline).toLocaleDateString()
                        : "Unscheduled"}
                    </div>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {formatMinutes(t.estimated_duration_minutes)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 1-Year Planning Timeline */}
      {mode === "year" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 12 }, (_, mIdx) => {
            const monthName = new Date(year, mIdx, 1).toLocaleDateString(
              "en-US",
              { month: "short" },
            );
            const monthStr = `${year}-${String(mIdx + 1).padStart(2, "0")}`;
            const count = tasks.filter(
              (t) =>
                (t.deadline &&
                  localDate(new Date(t.deadline)).startsWith(monthStr)) ||
                (t.start_date && t.start_date.startsWith(monthStr)),
            ).length;

            return (
              <div
                key={mIdx}
                className="p-4 rounded-xl bg-surface-100 border border-surface-border hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                    {monthName}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {count} tasks
                  </span>
                </div>
                <div className="h-1 bg-surface-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${Math.min(100, count * 15)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
