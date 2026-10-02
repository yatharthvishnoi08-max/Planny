const test = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const vm = require("node:vm");

const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
function load() {
  const exports = {};
  const code = ts.transpileModule(
    fs.readFileSync("src/lib/dayPlanner.ts", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const dates = {
    localDate,
    isPending: (task) => ["todo", "in_progress"].includes(task.status),
    routineOccursOn: (routine) => routine.active,
  };
  vm.runInNewContext(code, {
    exports,
    require: () => dates,
    Date,
    Math,
    Number,
    Array,
    Map,
  });
  return exports;
}
const task = (id, priority, minutes, deadline = null, project_id = null) => ({
  id,
  user_id: "u",
  project_id,
  title: id,
  description: null,
  priority,
  status: "todo",
  start_date: null,
  deadline,
  estimated_duration_minutes: minutes,
  recurrence_rule: null,
  is_routine: false,
  is_brain_dump: false,
  position: 0,
  completed_at: null,
  created_at: "",
  updated_at: "",
});

test("next task recommendation weighs urgency, fit and project context", () => {
  const api = load();
  const now = new Date(2026, 9, 3, 10);
  const first = task("first", "low", 30);
  const due = task("due", "high", 45, new Date(2026, 9, 3, 15).toISOString());
  const huge = task("huge", "urgent", 400);
  assert.equal(
    api.recommendNextTask([first, due, huge], [], 60, now).id,
    "due",
  );
  const reasons = Array.from(api.nextTaskReason(due, 60, now));
  assert.ok(reasons.includes("High priority"));
  assert.ok(reasons.includes("Due today"));
  assert.ok(reasons.includes("Fits the time left today"));
});

test("day planning uses actual tasks, inserts breaks and respects day end", () => {
  const api = load();
  const now = new Date(2026, 9, 3, 9, 0);
  const blocks = Array.from(
    api.buildDayPlan({
      tasks: [task("deep work", "high", 90), task("email", "medium", 30)],
      routines: [],
      sessions: [],
      endOfDay: "12:00",
      now,
    }),
  );
  assert.equal(blocks[0].title, "deep work");
  assert.equal(blocks[0].start, "09:00");
  assert.ok(blocks.some((block) => block.type === "break"));
  assert.ok(blocks.every((block) => block.end <= "12:00"));
});

test("available time never becomes negative after the workday", () => {
  const api = load();
  assert.equal(api.availableMinutesToday("18:00", new Date(2026, 9, 3, 19)), 0);
  assert.equal(
    api.availableMinutesToday("18:00", new Date(2026, 9, 3, 17, 15)),
    45,
  );
});
