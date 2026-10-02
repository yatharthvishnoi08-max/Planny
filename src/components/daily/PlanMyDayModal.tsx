import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarCheck,
  Plus,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import type {
  DailyPlan,
  FocusSession,
  Routine,
  Task,
} from "../../types/database";
import { buildDayPlan, type PlanBlock } from "../../lib/dayPlanner";
import { isPending, localDate } from "../../lib/dates";
import { syncEngine } from "../../lib/sync";

export function readPlanBlocks(plan?: DailyPlan): PlanBlock[] {
  if (!plan?.notes) return [];
  try {
    const value = JSON.parse(plan.notes);
    return Array.isArray(value?.blocks) ? value.blocks : [];
  } catch {
    return [];
  }
}

export function PlanMyDayModal({
  isOpen,
  onClose,
  tasks,
  routines,
  sessions,
  endOfDay,
  existingPlan,
  onAddTask,
}: {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  routines: Routine[];
  sessions: FocusSession[];
  endOfDay: string;
  existingPlan?: DailyPlan;
  onAddTask: () => void;
}) {
  const [variant, setVariant] = useState(0);
  const [startTime, setStartTime] = useState(() =>
    new Date().toTimeString().slice(0, 5),
  );
  const [accepted, setAccepted] = useState(false);
  const now = useMemo(() => {
    const [hour, minute] = startTime.split(":").map(Number);
    const value = new Date();
    value.setHours(hour, minute, 0, 0);
    return value;
  }, [startTime]);
  const blocks = useMemo(
    () =>
      buildDayPlan({
        tasks,
        routines,
        sessions,
        endOfDay,
        now,
        variant,
      }),
    [tasks, routines, sessions, endOfDay, now, variant],
  );
  if (!isOpen) return null;

  const pendingCount = tasks.filter(isPending).length;
  const emptyTitle = pendingCount
    ? "No task fits this window."
    : "Nothing needs planning yet.";
  const emptyCopy = pendingCount
    ? `Your unfinished tasks do not fit between ${startTime} and ${endOfDay}. Choose an earlier start time or shorten a task estimate.`
    : "Add your first task, then Planny can turn it into a realistic schedule.";

  const accept = () => {
    if (!blocks.length) return;
    const current = existingPlan;
    const timestamp = new Date().toISOString();
    syncEngine.saveDailyPlan({
      id: current?.id || crypto.randomUUID(),
      user_id: syncEngine.getUserId(),
      date: localDate(),
      briefing_shown: current?.briefing_shown || false,
      day_review_completed: current?.day_review_completed || false,
      planned_task_ids: blocks
        .filter((block) => block.taskId)
        .map((block) => block.taskId!),
      notes: JSON.stringify({ blocks, acceptedAt: timestamp }),
      created_at: current?.created_at || timestamp,
      updated_at: timestamp,
    });
    setAccepted(true);
  };

  return createPortal(
    <div
      className="modal-backdrop plan-day-backdrop"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="composer plan-day-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-day-title"
      >
        <div className="composer-heading">
          <div>
            <span className="page-eyebrow">
              <Sparkles size={13} /> PLAN WITH REAL DATA
            </span>
            <h2 id="plan-day-title">
              Plan my day<span className="accent-period">.</span>
            </h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close day planner"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>
        <p className="plan-day-intro">
          Planny ranked your unfinished work using deadlines, priority,
          duration, routines and the time left today. Nothing changes until you
          accept.
        </p>
        <div className="plan-day-controls">
          <label>
            Start planning from
            <input
              type="time"
              value={startTime}
              onChange={(event) => {
                setAccepted(false);
                setStartTime(event.target.value);
              }}
            />
          </label>
          <span>Day ends at {endOfDay}</span>
        </div>
        <div className="plan-day-timeline">
          {blocks.length ? (
            blocks.map((block) => (
              <div key={block.id} className={`plan-block ${block.type}`}>
                <span>
                  {block.start}
                  <i />
                  {block.end}
                </span>
                <div>
                  <strong>{block.title}</strong>
                  <small>
                    {block.type === "task"
                      ? block.reason
                      : block.type === "break"
                        ? "A short reset between focus blocks"
                        : "Scheduled routine"}
                  </small>
                </div>
              </div>
            ))
          ) : (
            <div className="plan-day-empty">
              <CalendarCheck size={24} />
              <strong>{emptyTitle}</strong>
              <span>{emptyCopy}</span>
              {!pendingCount && (
                <button
                  className="secondary-button"
                  onClick={() => {
                    onClose();
                    onAddTask();
                  }}
                >
                  <Plus size={14} /> Add a task
                </button>
              )}
            </div>
          )}
        </div>
        <div className="plan-day-footer">
          <button
            className="secondary-button"
            onClick={() => {
              setAccepted(false);
              setVariant((value) => value + 1);
            }}
            disabled={!blocks.length}
          >
            <RefreshCw size={14} /> Regenerate
          </button>
          <button
            className="secondary-button"
            onClick={() =>
              document
                .querySelector<HTMLInputElement>(".plan-day-controls input")
                ?.focus()
            }
          >
            Adjust
          </button>
          <button
            className="primary-button"
            onClick={accept}
            disabled={!blocks.length || accepted}
            title={
              !blocks.length
                ? "Add at least one task to create a plan"
                : undefined
            }
          >
            {accepted ? "Plan accepted" : "Accept plan"}
            <ArrowRight size={15} />
          </button>
        </div>
        {accepted && (
          <p className="plan-day-success" role="status">
            Your plan is saved. You can start the first block from Today.
          </p>
        )}
      </section>
    </div>,
    document.body,
  );
}
