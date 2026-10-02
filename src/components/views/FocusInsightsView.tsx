import { useMemo, useState, type CSSProperties } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Flame,
  Sparkles,
  TimerReset,
} from "lucide-react";
import type { FocusSession, Task } from "../../types/database";
import {
  buildFocusBuckets,
  focusSummary,
  formatFocusTime,
  type FocusRange,
} from "../../lib/focusAnalytics";

const ranges: { value: FocusRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "7 days" },
  { value: "month", label: "30 days" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
];

export function FocusInsightsView({
  sessions,
  tasks,
}: {
  sessions: FocusSession[];
  tasks: Task[];
}) {
  const [range, setRange] = useState<FocusRange>("week");
  const summary = useMemo(() => focusSummary(sessions), [sessions]);
  const buckets = useMemo(
    () => buildFocusBuckets(sessions, range),
    [sessions, range],
  );
  const rangeTotal = buckets.reduce((sum, bucket) => sum + bucket.seconds, 0);
  const max = Math.max(...buckets.map((bucket) => bucket.seconds), 1);
  const comparison = summary.todaySeconds - summary.yesterdaySeconds;
  const recent = [...sessions]
    .sort(
      (a, b) =>
        new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime(),
    )
    .slice(0, 6);
  const taskTitle = (id: string | null) =>
    tasks.find((task) => task.id === id)?.title || "Focus session";

  return (
    <div className="focus-insights-page">
      <header className="focus-insights-heading">
        <div>
          <span className="page-eyebrow">YOUR ATTENTION, MADE VISIBLE</span>
          <h1>
            Focus insights<span className="accent-period">.</span>
          </h1>
          <p>
            See where your focused time went and how your rhythm is changing.
          </p>
        </div>
        <div
          className="focus-today-orb"
          aria-label={`${formatFocusTime(summary.todaySeconds)} focused today`}
        >
          <span>Today</span>
          <strong>{formatFocusTime(summary.todaySeconds, true)}</strong>
        </div>
      </header>

      <section className="focus-stat-grid" aria-label="Focus summary">
        <article className="focus-stat primary">
          <Clock3 size={18} />
          <span>Today</span>
          <strong>{formatFocusTime(summary.todaySeconds)}</strong>
          <small>
            {comparison === 0 ? (
              "Same as yesterday"
            ) : comparison > 0 ? (
              <>
                <ArrowUpRight size={13} /> {formatFocusTime(comparison)} more
              </>
            ) : (
              <>
                <ArrowDownRight size={13} />{" "}
                {formatFocusTime(Math.abs(comparison))} less
              </>
            )}
          </small>
        </article>
        <article className="focus-stat">
          <CalendarDays size={18} />
          <span>Yesterday</span>
          <strong>{formatFocusTime(summary.yesterdaySeconds)}</strong>
          <small>A clean daily comparison</small>
        </article>
        <article className="focus-stat">
          <Flame size={18} />
          <span>Current streak</span>
          <strong>
            {summary.streak} {summary.streak === 1 ? "day" : "days"}
          </strong>
          <small>{summary.activeDayCount} active days overall</small>
        </article>
        <article className="focus-stat">
          <TimerReset size={18} />
          <span>All-time focus</span>
          <strong>{formatFocusTime(summary.totalSeconds)}</strong>
          <small>{summary.sessionCount} completed sessions</small>
        </article>
      </section>

      <section className="focus-chart-card">
        <div className="focus-chart-head">
          <div>
            <span>FOCUS HISTORY</span>
            <strong>{formatFocusTime(rangeTotal)}</strong>
          </div>
          <div
            className="focus-range-tabs"
            role="tablist"
            aria-label="Focus chart period"
          >
            {ranges.map((item) => (
              <button
                key={item.value}
                role="tab"
                aria-selected={range === item.value}
                onClick={() => setRange(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div
          className={`focus-chart bars-${buckets.length}`}
          role="img"
          aria-label={`${ranges.find((item) => item.value === range)?.label} focus chart. Total ${formatFocusTime(rangeTotal)}.`}
          style={{ "--chart-columns": buckets.length } as CSSProperties}
        >
          {buckets.map((bucket) => (
            <div
              className="focus-bar-column"
              key={bucket.key}
              title={`${bucket.label}: ${formatFocusTime(bucket.seconds)}`}
              aria-label={`${bucket.label}: ${formatFocusTime(bucket.seconds)}`}
            >
              <span className="focus-bar-value">
                {bucket.seconds ? formatFocusTime(bucket.seconds, true) : ""}
              </span>
              <div className="focus-bar-track">
                <i
                  style={{
                    height: `${Math.max(bucket.seconds ? 5 : 0, (bucket.seconds / max) * 100)}%`,
                  }}
                />
              </div>
              <span className="focus-bar-label">{bucket.shortLabel}</span>
            </div>
          ))}
        </div>
        {!rangeTotal && (
          <div className="focus-chart-empty">
            <Sparkles size={18} /> Finish a focus session to start this view.
          </div>
        )}
      </section>

      <div className="focus-detail-grid">
        <section className="focus-detail-card">
          <div className="focus-card-heading">
            <div>
              <span>YOUR RHYTHM</span>
              <h2>Small patterns, useful signals.</h2>
            </div>
          </div>
          <div className="focus-rhythm-list">
            <div>
              <span>Average session</span>
              <strong>{formatFocusTime(summary.averageSeconds)}</strong>
            </div>
            <div>
              <span>Best focus day</span>
              <strong>
                {summary.bestDay
                  ? summary.bestDay.date.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  : "—"}
              </strong>
              <small>
                {summary.bestDay
                  ? formatFocusTime(summary.bestDay.seconds)
                  : "No sessions yet"}
              </small>
            </div>
            <div>
              <span>Sessions completed</span>
              <strong>{summary.sessionCount}</strong>
            </div>
          </div>
        </section>

        <section className="focus-detail-card">
          <div className="focus-card-heading">
            <div>
              <span>RECENT SESSIONS</span>
              <h2>Your latest focused work.</h2>
            </div>
          </div>
          <div className="focus-session-list">
            {recent.length ? (
              recent.map((session) => (
                <div key={session.id}>
                  <span className="focus-session-dot" />
                  <span>
                    <strong>{taskTitle(session.task_id)}</strong>
                    <small>
                      {new Date(session.completed_at).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric" },
                      )}{" "}
                      ·{" "}
                      {new Date(session.completed_at).toLocaleTimeString(
                        undefined,
                        { hour: "numeric", minute: "2-digit" },
                      )}
                    </small>
                  </span>
                  <b>{formatFocusTime(session.duration_seconds, true)}</b>
                </div>
              ))
            ) : (
              <p className="focus-empty-copy">
                Your finished sessions will appear here.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
