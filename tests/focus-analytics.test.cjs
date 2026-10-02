const test = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const vm = require("node:vm");

function load() {
  const exports = {};
  const code = ts.transpileModule(
    fs.readFileSync("src/lib/focusAnalytics.ts", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(code, { exports, Date, Map, Math, Number, Array });
  return exports;
}

const session = (id, completedAt, durationSeconds) => ({
  id,
  user_id: "user-1",
  task_id: null,
  duration_seconds: durationSeconds,
  started_at: completedAt,
  completed_at: completedAt,
  notes: null,
  completed_subtasks_count: 0,
  created_at: completedAt,
});

test("focus summary compares local today and yesterday and finds streaks", () => {
  const api = load();
  const now = new Date(2026, 9, 3, 12);
  const sessions = [
    session("a", new Date(2026, 9, 3, 9).toISOString(), 1800),
    session("b", new Date(2026, 9, 3, 11).toISOString(), 900),
    session("c", new Date(2026, 9, 2, 18).toISOString(), 3600),
    session("d", new Date(2026, 9, 1, 18).toISOString(), 1200),
  ];
  const result = api.focusSummary(sessions, now);
  assert.equal(result.todaySeconds, 2700);
  assert.equal(result.yesterdaySeconds, 3600);
  assert.equal(result.totalSeconds, 7500);
  assert.equal(result.streak, 3);
  assert.equal(result.bestDay.seconds, 3600);
});

test("focus charts aggregate daily, monthly and yearly history", () => {
  const api = load();
  const now = new Date(2026, 9, 3, 12);
  const sessions = [
    session("a", new Date(2026, 9, 3, 9).toISOString(), 1800),
    session("b", new Date(2026, 8, 3, 9).toISOString(), 3600),
    session("c", new Date(2025, 5, 3, 9).toISOString(), 7200),
  ];
  const week = api.buildFocusBuckets(sessions, "week", now);
  assert.equal(week.length, 7);
  assert.equal(week.at(-1).seconds, 1800);
  const year = api.buildFocusBuckets(sessions, "year", now);
  assert.equal(year.length, 12);
  assert.equal(year[8].seconds, 3600);
  assert.equal(year[9].seconds, 1800);
  const all = api.buildFocusBuckets(sessions, "all", now);
  assert.deepEqual(
    Array.from(all, (bucket) => [bucket.key, bucket.seconds]),
    [
      ["2025", 7200],
      ["2026", 5400],
    ],
  );
});

test("focus time formatting stays readable for minutes and hours", () => {
  const api = load();
  assert.equal(api.formatFocusTime(0), "0 min");
  assert.equal(api.formatFocusTime(2700), "45 min");
  assert.equal(api.formatFocusTime(5400), "1 hr 30 min");
  assert.equal(api.formatFocusTime(5400, true), "1h 30m");
});
