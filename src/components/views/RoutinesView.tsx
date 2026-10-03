import { localDate, routineOccursOn } from "../../lib/dates";
import React, { useState, useEffect } from "react";
import {
  Routine,
  RoutineFrequency,
  RoutineInstance,
} from "../../types/database";
import { Plus, Flame, Clock, Calendar, Check, X, Bell } from "lucide-react";
import { syncEngine } from "../../lib/sync";

interface RoutinesViewProps {
  routines: Routine[];
  instances: RoutineInstance[];
}

export const RoutinesView: React.FC<RoutinesViewProps> = ({
  routines,
  instances,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [frequency, setFrequency] = useState<RoutineFrequency>("daily");
  const [timeOfDay, setTimeOfDay] = useState("19:00");
  const [intervalDays, setIntervalDays] = useState(2);
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]);
  const [endDate, setEndDate] = useState("");

  const todayStr = localDate();

  const handleCreateRoutine = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !title.trim() ||
      (frequency === "specific_days" && selectedDays.length === 0)
    )
      return;

    const newRoutine: Routine = {
      id: editingRoutine?.id || crypto.randomUUID(),
      user_id: syncEngine.getUserId(),
      title: title.trim(),
      description: desc.trim() || null,
      frequency,
      days_of_week:
        frequency === "specific_days"
          ? selectedDays
          : frequency === "weekdays"
            ? [1, 2, 3, 4, 5]
            : frequency === "weekends"
              ? [6, 7]
              : [1, 2, 3, 4, 5, 6, 7],
      interval_days: Math.max(1, intervalDays),
      time_of_day: timeOfDay,
      end_date: endDate || null,
      active: editingRoutine?.active ?? true,
      created_at: editingRoutine?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    syncEngine.saveRoutine(newRoutine);
    setTitle("");
    setDesc("");
    setShowAddModal(false);
  };

  const handleToggleToday = (routineId: string) => {
    syncEngine.toggleRoutineCompletion(routineId);
  };

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowAddModal(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  return (
    <div className="content-page max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-surface-border">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            Routines
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Each routine is a fresh daily check-in. Missed routines expire at
            day’s end and never move into tomorrow.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingRoutine(null);
            setTitle("");
            setDesc("");
            setFrequency("daily");
            setTimeOfDay("19:00");
            setEndDate("");
            setShowAddModal(true);
          }}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Routine</span>
        </button>
      </div>

      {/* Routine Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {routines.map((r) => {
          const isDoneToday = instances.some(
            (inst) =>
              inst.routine_id === r.id &&
              inst.date === todayStr &&
              inst.status === "completed",
          );

          return (
            <div
              key={r.id}
              className="p-4 rounded-xl bg-surface-100 border border-surface-border hover:border-zinc-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <h3 className="text-sm font-medium text-foreground">
                      {r.title}
                    </h3>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-surface-200 text-indigo-300 border border-surface-border">
                    {r.frequency}
                  </span>
                </div>

                {r.description && (
                  <p className="text-xs text-muted-foreground mb-3">
                    {r.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4 my-3 text-xs text-indigo-400">
                <button
                  onClick={() => {
                    setEditingRoutine(r);
                    setTitle(r.title);
                    setDesc(r.description || "");
                    setFrequency(r.frequency);
                    setTimeOfDay(r.time_of_day.slice(0, 5));
                    setIntervalDays(r.interval_days);
                    setSelectedDays(r.days_of_week);
                    setEndDate(r.end_date || "");
                    setShowAddModal(true);
                  }}
                >
                  Edit routine
                </button>
                <button
                  onClick={() =>
                    syncEngine.saveRoutine({ ...r, active: !r.active })
                  }
                >
                  {r.active ? "Pause routine" : "Resume routine"}
                </button>
              </div>
              <div className="pt-3 border-t border-surface-border flex items-center justify-between mt-2">
                <div className="flex items-center space-x-2 text-xs font-mono text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{r.time_of_day}</span>
                  {r.end_date && <span>· until {r.end_date}</span>}
                </div>

                <button
                  type="button"
                  disabled={!routineOccursOn(r)}
                  title={
                    routineOccursOn(r)
                      ? "Marks this routine for today only. It resets tomorrow."
                      : "Not scheduled today"
                  }
                  onClick={() => handleToggleToday(r.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border flex items-center space-x-1.5 transition-colors ${
                    isDoneToday
                      ? "bg-emerald-600/10 border-emerald-500/30 text-emerald-400"
                      : "bg-surface-200 border-surface-border text-foreground hover:bg-surface-hover"
                  }`}
                >
                  {isDoneToday && <Check className="w-3 h-3" />}
                  <span>
                    {!r.active
                      ? "Paused"
                      : !routineOccursOn(r)
                        ? "Not today"
                        : isDoneToday
                          ? "Done Today"
                          : "Mark Done"}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Routine Creation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-surface-100 border border-surface-border p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-medium text-foreground mb-3">
              {editingRoutine ? "Edit routine" : "New routine"}
            </h3>

            <form onSubmit={handleCreateRoutine} className="space-y-3.5">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Routine Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Practice DSA or Read Research Papers"
                  className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Details, targets, links..."
                  className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) =>
                      setFrequency(e.target.value as RoutineFrequency)
                    }
                    className="w-full bg-surface-200 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekdays">Weekdays</option>
                    <option value="weekends">Weekends</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="specific_days">Specific days</option>
                    <option value="every_x_days">Every X Days</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">
                    Time of Day
                  </label>
                  <input
                    type="time"
                    value={timeOfDay}
                    onChange={(e) => setTimeOfDay(e.target.value)}
                    className="w-full bg-surface-200 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                  />
                </div>
              </div>

              {frequency === "every_x_days" && (
                <label className="block text-xs text-muted-foreground">
                  Repeat every (days)
                  <input
                    aria-label="Repeat interval"
                    type="number"
                    min="1"
                    max="365"
                    value={intervalDays}
                    onChange={(e) => setIntervalDays(Number(e.target.value))}
                    className="w-full mt-1 bg-surface-200 border border-surface-border rounded-lg px-3 py-2"
                  />
                </label>
              )}
              {frequency === "specific_days" && (
                <div className="flex flex-wrap gap-2">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (day, index) => (
                      <button
                        type="button"
                        key={day}
                        aria-pressed={selectedDays.includes(index + 1)}
                        onClick={() =>
                          setSelectedDays(
                            selectedDays.includes(index + 1)
                              ? selectedDays.filter((d) => d !== index + 1)
                              : [...selectedDays, index + 1],
                          )
                        }
                        className={`px-2 py-2 rounded-lg border text-xs ${selectedDays.includes(index + 1) ? "bg-indigo-600 text-white border-indigo-500" : "border-surface-border"}`}
                      >
                        {day}
                      </button>
                    ),
                  )}
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="Until..."
                  className="w-full bg-surface-200 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium"
                >
                  Save Routine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
