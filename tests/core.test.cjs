const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { randomUUID } = require("node:crypto");
process.env.TZ = "Asia/Kolkata";
function environment({
  configured = false,
  online = true,
  storage = new Map(),
} = {}) {
  const events = {};
  const calls = [];
  const remote = {};
  let failure = null;
  let pausedFetch = null;
  const context = vm.createContext({
    console,
    Date,
    Intl,
    Set,
    Map,
    Promise,
    JSON,
    Math,
    Number,
    String,
    Array,
    Error,
    RegExp,
    structuredClone,
    crypto: { randomUUID },
    navigator: { onLine: online },
    setTimeout: () => 1,
    clearTimeout: () => {},
    localStorage: {
      getItem: (k) => storage.get(k) || null,
      setItem: (k, v) => storage.set(k, v),
    },
    window: {
      addEventListener: (k, f) => (events[k] = f),
      setInterval: () => 1,
    },
  });
  const supabase = {
    channel: () => ({
      on() {
        return this;
      },
      subscribe() {
        return this;
      },
    }),
    removeChannel: async () => {},
    rpc: async (name, payload) => {
      calls.push({ name, payload });
      if (failure) return { error: { message: failure } };
      remote.tasks ||= [];
      remote.tasks = remote.tasks.filter((t) => t.id !== payload.task_data.id);
      remote.tasks.push({
        ...payload.task_data,
        subtasks: payload.subtask_data,
      });
      return { error: null };
    },
    from(table) {
      const op = { table, type: "select", payload: null };
      return {
        select() {
          op.type = "select";
          return this;
        },
        eq() {
          return this;
        },
        delete() {
          op.type = "delete";
          return this;
        },
        upsert(payload) {
          op.type = "upsert";
          op.payload = payload;
          return this;
        },
        async then(resolve, reject) {
          calls.push({ ...op });
          if (op.type === "select" && pausedFetch) await pausedFetch;
          if (failure) return resolve({ error: { message: failure } });
          if (op.type === "upsert") {
            remote[table] ||= [];
            remote[table] = remote[table].filter((r) => r.id !== op.payload.id);
            remote[table].push(op.payload);
          }
          return resolve({
            error: null,
            data: structuredClone(remote[table] || []),
          });
        },
      };
    },
  };
  const modules = {};
  function load(name) {
    if (modules[name]) return modules[name];
    if (name === "supabase")
      return { supabase, isRealSupabaseConfigured: () => configured };
    if (name === "notifications") return { reconcileNotifications: () => {} };
    const file = path.join(__dirname, "../src/lib", name + ".ts");
    const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText;
    const exports = {};
    modules[name] = exports;
    const fn = vm.runInContext(
      "(function(require,exports){" + compiled + "\n})",
      context,
    );
    fn((spec) => load(spec.replace("./", "")), exports);
    return exports;
  }
  return {
    load,
    storage,
    calls,
    events,
    remote,
    fail: (message) => (failure = message),
    pause: (promise) => (pausedFetch = promise),
  };
}
const task = (extra = {}) => ({
  id: randomUUID(),
  user_id: "wrong-owner",
  project_id: null,
  title: "Test task",
  description: null,
  priority: "medium",
  status: "todo",
  start_date: "2026-10-01",
  deadline: null,
  estimated_duration_minutes: 30,
  recurrence_rule: null,
  is_routine: false,
  is_brain_dump: false,
  position: 0,
  completed_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...extra,
});
const settle = async () => {
  for (let i = 0; i < 8; i++)
    await new Promise((resolve) => setImmediate(resolve));
};

test("local calendar dates retain the intended day in Asia/Kolkata", () => {
  const { localDate } = environment().load("dates");
  assert.equal(localDate(new Date("2026-10-01T00:15:00+05:30")), "2026-10-01");
});
test("Today excludes future and cancelled tasks, includes overdue and today completions", () => {
  const { isTodayTask } = environment().load("dates");
  const now = new Date("2026-10-01T12:00:00+05:30");
  assert.equal(isTodayTask(task({ start_date: "2026-10-03" }), now), false);
  assert.equal(isTodayTask(task({ status: "cancelled" }), now), false);
  assert.equal(isTodayTask(task({ start_date: "2026-09-29" }), now), true);
  assert.equal(
    isTodayTask(
      task({ status: "completed", completed_at: "2026-10-01T00:10:00+05:30" }),
      now,
    ),
    true,
  );
});
test("routine recurrence handles weekdays, expiry, monthly end and interval days", () => {
  const { routineOccursOn } = environment().load("dates");
  const r = {
    active: true,
    created_at: "2026-01-31T08:00:00+05:30",
    frequency: "weekdays",
    days_of_week: [1, 3],
    interval_days: 2,
    end_date: null,
  };
  assert.equal(
    routineOccursOn(r, new Date("2026-10-03T12:00:00+05:30")),
    false,
  );
  assert.equal(
    routineOccursOn(
      { ...r, frequency: "monthly" },
      new Date("2026-02-28T12:00:00+05:30"),
    ),
    true,
  );
  assert.equal(
    routineOccursOn(
      { ...r, end_date: "2026-09-30" },
      new Date("2026-10-01T12:00:00+05:30"),
    ),
    false,
  );
  assert.equal(
    routineOccursOn(
      { ...r, frequency: "every_x_days" },
      new Date("2026-02-02T12:00:00+05:30"),
    ),
    true,
  );
});
test("account switch clears visible data and restores only its own workspace", () => {
  const { SyncEngine } = environment().load("sync");
  const engine = new SyncEngine();
  engine.setUser("local:a");
  const a = engine.saveTask(task());
  engine.setUser("local:b");
  assert.equal(engine.getTasks().length, 0);
  engine.setUser(null);
  assert.equal(engine.getTasks().length, 0);
  engine.setUser("local:a");
  assert.ok(engine.getTasks().some((t) => t.id === a.id));
});
test("legacy local migration preserves relationships and never imports data into cloud account", async () => {
  const storage = new Map([
    [
      "orbit_tasks",
      JSON.stringify([
        task({
          id: "task-old",
          project_id: "proj-old",
          subtasks: [
            {
              id: "sub-old",
              task_id: "task-old",
              user_id: "old",
              title: "Child",
            },
          ],
        }),
      ]),
    ],
    [
      "orbit_projects",
      JSON.stringify([
        { id: "proj-old", user_id: "old", title: "Old project" },
      ]),
    ],
  ]);
  const env = environment({ storage, configured: true });
  const { SyncEngine } = env.load("sync");
  const engine = new SyncEngine();
  engine.setUser("local:a");
  const item = engine.getTasks()[0];
  assert.equal(item.project_id, engine.getProjects()[0].id);
  assert.equal(item.subtasks[0].task_id, item.id);
  assert.match(item.id, /^[0-9a-f-]{36}$/);
  engine.setUser(randomUUID());
  await engine.fetchRemoteData();
  assert.equal(engine.getTasks().length, 0);
  assert.ok(storage.has("orbit_tasks"));
});
test("server failures keep the offline queue durable and visible", async () => {
  const env = environment({ configured: true, online: false });
  const { SyncEngine } = env.load("sync");
  const e = new SyncEngine();
  e.setUser(randomUUID());
  e.saveTask(task());
  env.fail("Server rejected write");
  env.events.online();
  await e.fetchRemoteData();
  assert.equal(e.getState().pendingChangesCount, 1);
  assert.match(e.getState().error, /Server rejected/);
  assert.equal(
    JSON.parse(env.storage.get(`orbit_workspace_v2:${e.getUserId()}`)).queue
      .length,
    1,
  );
  env.fail(null);
  await e.fetchRemoteData();
  assert.equal(e.getState().pendingChangesCount, 0);
  assert.equal(e.getState().error, null);
});
test("cloud task save uses atomic RPC with stripped joins and correct subtask ownership", async () => {
  const env = environment({ configured: true });
  const e = new (env.load("sync").SyncEngine)();
  const owner = randomUUID();
  e.setUser(owner);
  await e.fetchRemoteData();
  e.saveTask(
    task({
      id: "old-id",
      project: { title: "join" },
      subtasks: [
        {
          id: "old-sub",
          task_id: "wrong",
          user_id: "wrong",
          title: "Child",
          is_completed: false,
          position: 0,
        },
      ],
    }),
  );
  await e.fetchRemoteData();
  const call = env.calls.find((c) => c.name === "save_task_with_subtasks");
  assert.ok(call);
  assert.equal(call.payload.task_data.user_id, owner);
  assert.equal(call.payload.task_data.project, undefined);
  assert.equal(call.payload.task_data.subtasks, undefined);
  assert.equal(call.payload.subtask_data[0].task_id, call.payload.task_data.id);
  assert.equal(call.payload.subtask_data[0].user_id, owner);
});
test("online deletion executes an awaited request", async () => {
  const env = environment({ configured: true });
  const e = new (env.load("sync").SyncEngine)();
  e.setUser(randomUUID());
  await e.fetchRemoteData();
  e.deleteTask(randomUUID());
  await e.fetchRemoteData();
  assert.ok(env.calls.some((c) => c.table === "tasks" && c.type === "delete"));
});
test("persisted offline mutations replay when reopening already online", async () => {
  const env = environment({ configured: true, online: false });
  const e = new (env.load("sync").SyncEngine)();
  const id = randomUUID();
  e.setUser(id);
  e.saveTask(task());
  const next = environment({ configured: true, storage: env.storage });
  const restored = new (next.load("sync").SyncEngine)();
  restored.setUser(id);
  await restored.fetchRemoteData();
  assert.equal(restored.getState().pendingChangesCount, 0);
  assert.ok(next.calls.some((c) => c.name === "save_task_with_subtasks"));
});
test("a fetch response cannot overwrite an edit created during that fetch", async () => {
  const env = environment({ configured: true });
  const e = new (env.load("sync").SyncEngine)();
  e.setUser(randomUUID());
  await e.fetchRemoteData();
  let release;
  env.pause(new Promise((r) => (release = r)));
  const fetching = e.fetchRemoteData();
  const item = e.saveTask(task({ title: "New local edit" }));
  release();
  await fetching;
  assert.equal(
    e.getTasks().find((t) => t.id === item.id)?.title,
    "New local edit",
  );
  assert.equal(e.getState().pendingChangesCount, 1);
});
test("all previously local-only entities queue cloud writes", async () => {
  const env = environment({ configured: true, online: false });
  const e = new (env.load("sync").SyncEngine)();
  e.setUser(randomUUID());
  e.saveProject({ id: randomUUID(), title: "Project" });
  e.saveNote({ id: randomUUID(), title: "Note" });
  e.saveResource({ id: randomUUID(), title: "Link" });
  e.addBrainDump("Thought");
  e.logFocusSession({ id: randomUUID() });
  e.saveRoutine({
    id: randomUUID(),
    title: "Routine",
    active: true,
    frequency: "daily",
    created_at: new Date().toISOString(),
  });
  assert.equal(e.getState().pendingChangesCount, 6);
});
test("local parser does not invent a deadline; assistant respects the available time budget", async () => {
  const env = environment();
  const { syncEngine: e } = env.load("sync");
  e.setUser("local:testing");
  for (const t of e.getTasks()) e.deleteTask(t.id);
  const ai = env.load("ai");
  const parsed = await ai.parseNaturalLanguageTask("Read a book");
  assert.equal(parsed.deadline, null);
  e.saveTask(task({ title: "First", estimated_duration_minutes: 90 }));
  e.saveTask(task({ title: "Second", estimated_duration_minutes: 90 }));
  const result = await ai.processAssistantMessage("I have two hours free");
  assert.equal((result.reply.match(/90m/g) || []).length, 1);
  const saturday = await ai.processAssistantMessage(
    "Move unfinished tasks to Saturday",
  );
  assert.equal(
    new Date(saturday.action.payload.targetDate + "T12:00:00").getDay(),
    6,
  );
  assert.equal(saturday.action.payload.taskIds.length, 2);
});
test("AI validation rejects invalid durations and unknown priority", () => {
  const ai = environment().load("ai");
  assert.throws(() =>
    ai.validateParsedTask({
      title: "T",
      priority: "critical",
      deadline: null,
      estimated_duration_minutes: 30,
      subtasks: [],
    }),
  );
  assert.throws(() =>
    ai.validateParsedTask({
      title: "T",
      priority: "high",
      deadline: null,
      estimated_duration_minutes: -1,
      subtasks: [],
    }),
  );
});

test("offline task drafts honor explicit duration and deadline time", async () => {
  const ai = environment().load("ai");
  const short = await ai.parseNaturalLanguageTask(
    "Read chapter 4 tomorrow for 30 minutes",
  );
  assert.equal(short.estimated_duration_minutes, 30);
  const mixed = await ai.parseNaturalLanguageTask(
    "Review tomorrow at 7:15 PM for 1 hour 20 minutes",
  );
  assert.equal(mixed.estimated_duration_minutes, 80);
  assert.equal(new Date(mixed.deadline).getHours(), 19);
  assert.equal(new Date(mixed.deadline).getMinutes(), 15);
  const decimal = await ai.parseNaturalLanguageTask("Write for 1.5 hours");
  assert.equal(decimal.estimated_duration_minutes, 90);
  assert.equal(decimal.deadline, null);
});

test("timeline uses a single deadline bucket and separates overdue from later work", () => {
  const d = environment().load("dates");
  const today = new Date("2026-10-01T12:00:00");
  const scheduled = task({
    start_date: "2026-10-01",
    deadline: "2026-10-02T18:00:00+05:30",
  });
  assert.equal(d.taskScheduleBucket(scheduled, today), "tomorrow");
  assert.equal(d.taskScheduleDate(scheduled), "2026-10-02");
  assert.equal(
    d.taskScheduleBucket(
      task({ start_date: "2026-09-30", deadline: null }),
      today,
    ),
    "overdue",
  );
  assert.equal(
    d.taskScheduleBucket(task({ start_date: null, deadline: null }), today),
    "unscheduled",
  );
});
