import { useState } from "react";
import {
  ArrowRight,
  Calendar,
  Check,
  Clock3,
  Moon,
  Sparkles,
  X,
} from "lucide-react";
import type { DailyPlan, FocusSession, Task } from "../../types/database";
import { focusSecondsForDay, formatFocusTime } from "../../lib/focusAnalytics";
import { isPending, isTodayTask, localDate } from "../../lib/dates";
import { syncEngine } from "../../lib/sync";

export function DayReviewModal({
  isOpen,
  onClose,
  tasks,
  focusSessions,
  dailyPlans,
}: {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  focusSessions: FocusSession[];
  dailyPlans: DailyPlan[];
}) {
  const [wentWell, setWentWell] = useState("");
  const [gotInWay, setGotInWay] = useState("");
  const [saved, setSaved] = useState(false);
  const [tomorrowPlanned, setTomorrowPlanned] = useState(false);
  if (!isOpen) return null;
  const completed = tasks.filter(
    (task) => task.status === "completed" && isTodayTask(task),
  );
  const incomplete = tasks.filter(
    (task) => isPending(task) && isTodayTask(task),
  );
  const total = completed.length + incomplete.length;
  const percent = total ? Math.round((completed.length / total) * 100) : 0;
  const focused = focusSecondsForDay(focusSessions, new Date());
  const today = localDate();
  const currentPlan = dailyPlans.find((plan) => plan.date === today);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = localDate(tomorrow);
  const tomorrowCount = tasks.filter(
    (task) =>
      isPending(task) &&
      (task.start_date === tomorrowDate ||
        (task.deadline && localDate(new Date(task.deadline)) === tomorrowDate)),
  ).length;

  const saveReview = () => {
    let existingNotes: Record<string, unknown> = {};
    try {
      existingNotes = currentPlan?.notes ? JSON.parse(currentPlan.notes) : {};
    } catch {}
    const now = new Date().toISOString();
    syncEngine.saveDailyPlan({
      id: currentPlan?.id || crypto.randomUUID(),
      user_id: syncEngine.getUserId(),
      date: today,
      briefing_shown: currentPlan?.briefing_shown || false,
      day_review_completed: true,
      planned_task_ids:
        currentPlan?.planned_task_ids ||
        tasks.filter((task) => isTodayTask(task)).map((task) => task.id),
      notes: JSON.stringify({
        ...existingNotes,
        review: {
          wentWell: wentWell.trim(),
          gotInWay: gotInWay.trim(),
          completedAt: now,
        },
      }),
      created_at: currentPlan?.created_at || now,
      updated_at: now,
    });
    setSaved(true);
  };
  const planTomorrow = () => {
    for (const task of incomplete)
      syncEngine.saveTask({ ...task, start_date: tomorrowDate });
    setTomorrowPlanned(true);
  };

  return (
    <div
      className="modal-backdrop review-backdrop"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="composer daily-review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-title"
      >
        <div className="composer-heading">
          <div>
            <span className="page-eyebrow">
              <Moon size={13} /> CLOSE THE LOOP
            </span>
            <h2 id="review-title">
              Daily review<span className="accent-period">.</span>
            </h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close daily review"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>
        <p className="review-intro">
          Look at what actually happened, then make tomorrow lighter.
        </p>
        <div className="review-stats">
          <div>
            <Check size={16} />
            <strong>{completed.length}</strong>
            <span>completed</span>
          </div>
          <div>
            <Calendar size={16} />
            <strong>{incomplete.length}</strong>
            <span>unfinished</span>
          </div>
          <div>
            <Clock3 size={16} />
            <strong>{formatFocusTime(focused, true)}</strong>
            <span>focused</span>
          </div>
        </div>
        <div className="review-progress">
          <div>
            <span>Planned work completed</span>
            <strong>{percent}%</strong>
          </div>
          <i>
            <b style={{ width: `${percent}%` }} />
          </i>
        </div>
        <div className="review-task-columns">
          <div>
            <span>FINISHED</span>
            {completed.slice(0, 5).map((task) => (
              <p key={task.id}>
                <Check size={12} />
                {task.title}
              </p>
            ))}
            {!completed.length && (
              <small>Completed tasks will show here.</small>
            )}
          </div>
          <div>
            <span>STILL OPEN</span>
            {incomplete.slice(0, 5).map((task) => (
              <p key={task.id}>
                <i />
                {task.title}
              </p>
            ))}
            {!incomplete.length && (
              <small>Everything planned is finished.</small>
            )}
          </div>
        </div>
        <div className="review-reflection">
          <label>
            What went well?
            <textarea
              value={wentWell}
              onChange={(event) => {
                setSaved(false);
                setWentWell(event.target.value);
              }}
              rows={2}
              placeholder="A small win, a good decision, anything useful…"
            />
          </label>
          <label>
            What got in the way?
            <textarea
              value={gotInWay}
              onChange={(event) => {
                setSaved(false);
                setGotInWay(event.target.value);
              }}
              rows={2}
              placeholder="Be honest, not judgmental."
            />
          </label>
        </div>
        <div className="review-tomorrow">
          <div>
            <span>TOMORROW</span>
            <strong>{tomorrowCount} tasks planned</strong>
          </div>
          <button
            onClick={planTomorrow}
            disabled={!incomplete.length || tomorrowPlanned}
          >
            {tomorrowPlanned
              ? "Unfinished tasks moved"
              : "Plan unfinished for tomorrow"}
            <ArrowRight size={13} />
          </button>
        </div>
        <div className="review-footer">
          <button className="secondary-button" onClick={onClose}>
            Close
          </button>
          <button
            className="primary-button"
            onClick={saveReview}
            disabled={saved}
          >
            {saved ? "Review saved" : "Save review"}
            <Sparkles size={14} />
          </button>
        </div>
      </section>
    </div>
  );
}
