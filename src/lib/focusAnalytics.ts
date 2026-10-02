import type { FocusSession } from "../types/database";

export type FocusRange =
  | "today"
  | "yesterday"
  | "week"
  | "month"
  | "year"
  | "all";

export type FocusBucket = {
  key: string;
  label: string;
  shortLabel: string;
  seconds: number;
};

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const safeSeconds = (session: FocusSession) =>
  Number.isFinite(session.duration_seconds)
    ? Math.max(0, session.duration_seconds)
    : 0;

export const focusSecondsForDay = (sessions: FocusSession[], date: Date) => {
  const key = dayKey(date);
  return sessions.reduce(
    (total, session) =>
      dayKey(new Date(session.completed_at)) === key
        ? total + safeSeconds(session)
        : total,
    0,
  );
};

export const formatFocusTime = (seconds: number, compact = false) => {
  const minutes = Math.round(Math.max(0, seconds) / 60);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return compact ? `${minutes}m` : `${minutes} min`;
  if (!remainder) return compact ? `${hours}h` : `${hours} hr`;
  return compact ? `${hours}h ${remainder}m` : `${hours} hr ${remainder} min`;
};

export function buildFocusBuckets(
  sessions: FocusSession[],
  range: FocusRange,
  now = new Date(),
): FocusBucket[] {
  const today = startOfDay(now);
  const byDay = new Map<string, number>();
  for (const session of sessions) {
    const date = new Date(session.completed_at);
    if (Number.isNaN(date.getTime())) continue;
    const key = dayKey(date);
    byDay.set(key, (byDay.get(key) || 0) + safeSeconds(session));
  }

  if (range === "today" || range === "yesterday") {
    const target = addDays(today, range === "yesterday" ? -1 : 0);
    const hourly = Array.from({ length: 8 }, (_, index) => ({
      key: `${dayKey(target)}-${index}`,
      label: `${String(index * 3).padStart(2, "0")}:00–${String(index * 3 + 3).padStart(2, "0")}:00`,
      shortLabel: index % 2 === 0 ? `${index * 3}:00` : "",
      seconds: 0,
    }));
    for (const session of sessions) {
      const date = new Date(session.completed_at);
      if (dayKey(date) === dayKey(target))
        hourly[Math.min(7, Math.floor(date.getHours() / 3))].seconds +=
          safeSeconds(session);
    }
    return hourly;
  }

  if (range === "week" || range === "month") {
    const count = range === "week" ? 7 : 30;
    return Array.from({ length: count }, (_, index) => {
      const date = addDays(today, index - count + 1);
      return {
        key: dayKey(date),
        label: date.toLocaleDateString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric",
        }),
        shortLabel:
          range === "week"
            ? date.toLocaleDateString(undefined, { weekday: "short" })
            : index % 5 === 0 || index === count - 1
              ? date.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })
              : "",
        seconds: byDay.get(dayKey(date)) || 0,
      };
    });
  }

  if (range === "year") {
    return Array.from({ length: 12 }, (_, month) => {
      const seconds = sessions.reduce((total, session) => {
        const date = new Date(session.completed_at);
        return date.getFullYear() === now.getFullYear() &&
          date.getMonth() === month
          ? total + safeSeconds(session)
          : total;
      }, 0);
      const date = new Date(now.getFullYear(), month, 1);
      return {
        key: `${now.getFullYear()}-${month}`,
        label: date.toLocaleDateString(undefined, { month: "long" }),
        shortLabel: date.toLocaleDateString(undefined, { month: "short" }),
        seconds,
      };
    });
  }

  const years = sessions
    .map((session) => new Date(session.completed_at).getFullYear())
    .filter(Number.isFinite);
  const first = years.length ? Math.min(...years) : now.getFullYear();
  return Array.from(
    { length: Math.max(1, now.getFullYear() - first + 1) },
    (_, index) => {
      const year = first + index;
      return {
        key: String(year),
        label: String(year),
        shortLabel: String(year),
        seconds: sessions.reduce((total, session) => {
          const date = new Date(session.completed_at);
          return date.getFullYear() === year
            ? total + safeSeconds(session)
            : total;
        }, 0),
      };
    },
  );
}

export function focusSummary(sessions: FocusSession[], now = new Date()) {
  const today = startOfDay(now);
  const todaySeconds = focusSecondsForDay(sessions, today);
  const yesterdaySeconds = focusSecondsForDay(sessions, addDays(today, -1));
  const activeDays = new Map<string, number>();
  for (const session of sessions) {
    const date = new Date(session.completed_at);
    if (Number.isNaN(date.getTime())) continue;
    const key = dayKey(date);
    activeDays.set(key, (activeDays.get(key) || 0) + safeSeconds(session));
  }
  let streak = 0;
  let cursor = todaySeconds > 0 ? today : addDays(today, -1);
  while ((activeDays.get(dayKey(cursor)) || 0) > 0) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  const best = [...activeDays.entries()].sort((a, b) => b[1] - a[1])[0];
  const totalSeconds = sessions.reduce(
    (sum, session) => sum + safeSeconds(session),
    0,
  );
  return {
    todaySeconds,
    yesterdaySeconds,
    totalSeconds,
    sessionCount: sessions.length,
    streak,
    activeDayCount: activeDays.size,
    averageSeconds: sessions.length ? totalSeconds / sessions.length : 0,
    bestDay: best
      ? { date: new Date(`${best[0]}T12:00:00`), seconds: best[1] }
      : null,
  };
}
