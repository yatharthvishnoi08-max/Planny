import { supabase, isRealSupabaseConfigured } from "./supabase";
import {
  Task,
  TaskStatus,
  Subtask,
  Project,
  Routine,
  RoutineInstance,
  Note,
  Resource,
  BrainDump,
  FocusSession,
  DailyPlan,
} from "../types/database";
import { localDate, routineOccursOn } from "./dates";
import { reconcileNotifications } from "./notifications";

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  pendingChangesCount: number;
  error: string | null;
  mode: "local" | "cloud" | "signed-out";
}
// Initial demo seed data matching user prompt
const SEED_PROJECTS: Project[] = [
  {
    id: "proj-1",
    user_id: "user-default",
    title: "AKTU Semester 1",
    description: "Engineering coursework, physics, and core CS",
    color: "#6366f1",
    icon: "book",
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "proj-2",
    user_id: "user-default",
    title: "Hackathon 2026",
    description: "Building AI product prototype",
    color: "#10b981",
    icon: "code",
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const SEED_ROUTINES: Routine[] = [
  {
    id: "rout-1",
    user_id: "user-default",
    title: "Morning workout",
    description: "30 mins cardio and stretching",
    frequency: "daily",
    days_of_week: [1, 2, 3, 4, 5, 6, 7],
    interval_days: 1,
    time_of_day: "07:00",
    end_date: null,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "rout-2",
    user_id: "user-default",
    title: "DSA practice",
    description: "Solve 2 problems on LeetCode/Striver",
    frequency: "daily",
    days_of_week: [1, 2, 3, 4, 5, 6, 7],
    interval_days: 1,
    time_of_day: "19:00",
    end_date: null,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "rout-3",
    user_id: "user-default",
    title: "Review lectures",
    description: "Consolidate daily college notes",
    frequency: "weekdays",
    days_of_week: [1, 2, 3, 4, 5],
    interval_days: 1,
    time_of_day: "21:00",
    end_date: null,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const SEED_TASKS: Task[] = [
  {
    id: "task-1",
    user_id: "user-default",
    project_id: "proj-1",
    title: "Complete C Unit 2",
    description: "Pointers, structures, and dynamic memory allocation",
    priority: "high",
    status: "todo",
    start_date: new Date().toISOString().split("T")[0],
    deadline: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    estimated_duration_minutes: 80,
    recurrence_rule: null,
    is_routine: false,
    is_brain_dump: false,
    position: 0,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    subtasks: [
      {
        id: "sub-1",
        task_id: "task-1",
        user_id: "user-default",
        title: "Watch pointer arithmetic lecture",
        is_completed: true,
        position: 0,
        created_at: "",
        updated_at: "",
      },
      {
        id: "sub-2",
        task_id: "task-1",
        user_id: "user-default",
        title: "Code memory allocation malloc/free test",
        is_completed: false,
        position: 1,
        created_at: "",
        updated_at: "",
      },
      {
        id: "sub-3",
        task_id: "task-1",
        user_id: "user-default",
        title: "Solve 5 practice question exercises",
        is_completed: false,
        position: 2,
        created_at: "",
        updated_at: "",
      },
    ],
  },
  {
    id: "task-2",
    user_id: "user-default",
    project_id: "proj-1",
    title: "Watch Physics lecture",
    description: "Quantum Mechanics and de Broglie wavelength",
    priority: "medium",
    status: "todo",
    start_date: new Date().toISOString().split("T")[0],
    deadline: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    estimated_duration_minutes: 45,
    recurrence_rule: null,
    is_routine: false,
    is_brain_dump: false,
    position: 1,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "task-3",
    user_id: "user-default",
    project_id: "proj-2",
    title: "Practice 10 DSA problems",
    description: "Sliding window and two-pointer patterns",
    priority: "high",
    status: "todo",
    start_date: new Date().toISOString().split("T")[0],
    deadline: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    estimated_duration_minutes: 30,
    recurrence_rule: null,
    is_routine: false,
    is_brain_dump: false,
    position: 2,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "task-4",
    user_id: "user-default",
    project_id: "proj-1",
    title: "Review IKS notes",
    description: "Indian Knowledge Systems Unit 1 summary",
    priority: "low",
    status: "todo",
    start_date: new Date().toISOString().split("T")[0],
    deadline: new Date(Date.now() + 10 * 3600 * 1000).toISOString(),
    estimated_duration_minutes: 20,
    recurrence_rule: null,
    is_routine: false,
    is_brain_dump: false,
    position: 3,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

type Tables = {
  tasks: Task;
  projects: Project;
  routines: Routine;
  routine_instances: RoutineInstance;
  notes: Note;
  resources: Resource;
  brain_dumps: BrainDump;
  focus_sessions: FocusSession;
  daily_plans: DailyPlan;
};
type Data = { [K in keyof Tables]: Tables[K][] };
type Mutation = {
  id: string;
  table: keyof Tables;
  action: "upsert" | "delete";
  payload: any;
};
const emptyData = (): Data => ({
  tasks: [],
  projects: [],
  routines: [],
  routine_instances: [],
  notes: [],
  resources: [],
  brain_dumps: [],
  focus_sessions: [],
  daily_plans: [],
});
const uuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export class SyncEngine {
  private listeners = new Set<() => void>();
  private state: SyncState = {
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncedAt: null,
    pendingChangesCount: 0,
    error: null,
    mode: "signed-out",
  };
  private data = emptyData();
  private queue: Mutation[] = [];
  private userId: string | null = null;
  private epoch = 0;
  private channel: ReturnType<typeof supabase.channel> | null = null;
  private running: Promise<void> | null = null;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private retryAttempt = 0;
  constructor() {
    window.addEventListener("online", () => {
      this.state.isOnline = true;
      this.notify();
      void this.fetchRemoteData();
    });
    window.addEventListener("offline", () => {
      this.state.isOnline = false;
      this.notify();
    });
    // Refresh the local calendar day, carry unfinished work forward, and
    // reconcile reminders after sleep or when the date changes at midnight.
    window.setInterval(() => {
      const moved = this.rollOverUnfinishedTasks();
      if (!moved) this.notify();
      this.refreshReminders();
    }, 60000);
  }
  getUserId() {
    return this.userId || "user-default";
  }
  private get key() {
    return `orbit_workspace_v2:${this.userId}`;
  }
  private get cloud() {
    return !!this.userId && uuid(this.userId) && isRealSupabaseConfigured();
  }
  setUser(id: string | null) {
    if (this.userId === id) return;
    this.epoch++;
    if (this.channel) {
      void supabase.removeChannel(this.channel);
      this.channel = null;
    }
    if (this.retry) clearTimeout(this.retry);
    this.running = null;
    this.userId = id;
    this.data = emptyData();
    this.queue = [];
    this.state = {
      ...this.state,
      error: null,
      isSyncing: false,
      lastSyncedAt: null,
      mode: id ? (this.cloud ? "cloud" : "local") : "signed-out",
      pendingChangesCount: 0,
    };
    if (id) {
      try {
        const raw = localStorage.getItem(this.key);
        if (raw) {
          const saved = JSON.parse(raw);
          this.data = { ...emptyData(), ...saved.data };
          this.queue = saved.queue || [];
        } else if (!this.cloud) {
          this.loadLegacyLocal();
        }
      } catch {
        this.state.error =
          "Could not read saved data. The original cache has been retained.";
      }
    }
    this.state.pendingChangesCount = this.queue.length;
    this.rollOverUnfinishedTasks();
    this.refreshReminders();
    this.notify();
    if (this.cloud) {
      const epoch = this.epoch;
      this.channel = supabase
        .channel(`orbit:${id}:${epoch}`)
        .on("postgres_changes", { event: "*", schema: "public" }, () => {
          if (epoch === this.epoch) void this.fetchRemoteData();
        })
        .subscribe();
      void this.fetchRemoteData();
    }
  }
  private loadLegacyLocal() {
    // Old unscoped data belongs only to the first local workspace, never to a cloud account.
    const owner = localStorage.getItem("orbit_legacy_owner");
    if (owner && owner !== this.userId) return;
    const defaults: Partial<Data> = {
      tasks: SEED_TASKS,
      projects: SEED_PROJECTS,
      routines: SEED_ROUTINES,
    };
    for (const table of Object.keys(this.data) as (keyof Tables)[]) {
      const raw = localStorage.getItem(`orbit_${table}`);
      (this.data as any)[table] = raw
        ? JSON.parse(raw)
        : structuredClone(defaults[table] || []);
    }
    const ids = new Map<string, string>();
    const mapId = (id: string) => {
      if (!ids.has(id)) ids.set(id, uuid(id) ? id : crypto.randomUUID());
      return ids.get(id)!;
    };
    for (const rows of Object.values(this.data))
      for (const row of rows) mapId(row.id);
    for (const rows of Object.values(this.data))
      for (const row of rows as any[]) {
        row.id = mapId(row.id);
        row.user_id = this.userId;
        for (const field of [
          "project_id",
          "task_id",
          "routine_id",
          "converted_id",
        ])
          if (row[field]) row[field] = mapId(row[field]);
        if (row.subtasks)
          row.subtasks = row.subtasks.map((sub: Subtask) => ({
            ...sub,
            id: mapId(sub.id),
            task_id: row.id,
            user_id: this.userId,
          }));
      }
    this.persist();
    localStorage.setItem("orbit_legacy_owner", this.userId!);
  }
  private persist() {
    if (!this.userId) return;
    try {
      localStorage.setItem(
        this.key,
        JSON.stringify({ data: this.data, queue: this.queue }),
      );
    } catch {
      this.state.error =
        "Device storage is full or unavailable. Export your data before closing Planny.";
    }
  }
  private notify() {
    this.listeners.forEach((fn) => fn());
  }
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  getState() {
    return { ...this.state };
  }
  private refreshReminders() {
    reconcileNotifications(
      this.data.tasks,
      this.data.routines,
      this.data.routine_instances,
      this.userId,
    );
  }
  private queueChange(
    table: keyof Tables,
    action: Mutation["action"],
    payload: any,
  ) {
    if (this.cloud)
      this.queue.push({
        id: crypto.randomUUID(),
        table,
        action,
        payload: structuredClone(payload),
      });
    this.state.pendingChangesCount = this.queue.length;
    this.persist();
    this.refreshReminders();
    this.notify();
    if (this.cloud) void this.fetchRemoteData();
  }
  async fetchRemoteData(): Promise<void> {
    if (!this.cloud || !this.state.isOnline) return;
    if (this.running) return this.running;
    const epoch = this.epoch;
    this.running = this.sync(epoch).finally(() => {
      if (epoch !== this.epoch) return;
      this.running = null;
      if (this.queue.length || this.state.error) {
        const delay = Math.min(60_000, 3_000 * 2 ** this.retryAttempt++);
        this.retry = setTimeout(() => {
          void this.fetchRemoteData();
        }, delay);
      } else {
        this.retryAttempt = 0;
      }
    });
    return this.running;
  }
  private async sync(epoch: number) {
    this.state.isSyncing = true;
    this.state.error = null;
    this.notify();
    try {
      // A mutation stays durable until acknowledged. Preserve ordering, including FK dependencies.
      while (this.queue.length && epoch === this.epoch) {
        const item = this.queue[0];
        let result;
        if (item.action === "delete")
          result = await supabase
            .from(item.table)
            .delete()
            .eq("id", item.payload.id)
            .eq("user_id", this.userId!);
        else if (item.table === "tasks") {
          const {
            subtasks = [],
            project,
            tags,
            dependencies,
            ...task
          } = item.payload;
          result = await supabase.rpc("save_task_with_subtasks", {
            task_data: task,
            subtask_data: subtasks,
          });
        } else
          result = await supabase
            .from(item.table)
            .upsert(
              item.payload,
              item.table === "routine_instances"
                ? { onConflict: "routine_id,date" }
                : undefined,
            );
        if (result.error) {
          const raw = result.error.message;
          if (/save_task_with_subtasks|schema cache/i.test(raw))
            throw new Error(
              "Cloud sync is being repaired. Pending edits are safe on this device and will upload automatically.",
            );
          throw new Error(raw);
        }
        if (epoch !== this.epoch) return;
        this.queue.shift();
        this.state.pendingChangesCount = this.queue.length;
        this.persist();
      }
      if (epoch !== this.epoch) return;
      const tables = Object.keys(this.data) as (keyof Tables)[];
      const results = await Promise.all(
        tables.map((table) =>
          supabase
            .from(table)
            .select(table === "tasks" ? "*, subtasks(*)" : "*")
            .eq("user_id", this.userId!),
        ),
      );
      if (epoch !== this.epoch) return;
      for (const res of results)
        if (res.error) throw new Error(res.error.message);
      // Overlay edits made while fetching; a remote response must never erase a local mutation.
      const remote = emptyData();
      tables.forEach((table, index) => {
        (remote as any)[table] = results[index].data || [];
      });
      for (const mutation of this.queue) {
        const rows = (remote as any)[mutation.table];
        (remote as any)[mutation.table] = rows.filter(
          (row: any) => row.id !== mutation.payload.id,
        );
        if (mutation.action === "upsert")
          (remote as any)[mutation.table].push(mutation.payload);
      }
      this.data = remote;
      this.rollOverUnfinishedTasks();
      this.state.lastSyncedAt = new Date();
      this.persist();
      this.refreshReminders();
    } catch (error) {
      if (epoch === this.epoch)
        this.state.error =
          error instanceof Error
            ? error.message
            : "Sync failed. Changes remain saved on this device.";
    } finally {
      if (epoch === this.epoch) {
        this.state.isSyncing = false;
        this.notify();
      }
    }
  }
  private save<K extends keyof Tables>(table: K, input: Tables[K]): Tables[K] {
    if (!this.userId)
      throw new Error(
        "Sign in or use a local workspace before making changes.",
      );
    const row = {
      ...input,
      id: uuid(input.id) ? input.id : crypto.randomUUID(),
      user_id: this.userId,
    };
    if ("updated_at" in row) row.updated_at = new Date().toISOString();
    (this.data as any)[table] = [
      ...this.data[table].filter((r) => r.id !== row.id),
      row,
    ];
    this.queueChange(table, "upsert", row);
    return row;
  }
  private remove(table: keyof Tables, id: string) {
    (this.data as any)[table] = this.data[table].filter((row) => row.id !== id);
    this.queueChange(table, "delete", { id });
  }
  getTasks() {
    return this.data.tasks
      .map((t) => ({
        ...t,
        project: this.data.projects.find((p) => p.id === t.project_id),
      }))
      .sort((a, b) => a.position - b.position);
  }
  saveTask(task: Task): Task {
    const id = uuid(task.id) ? task.id : crypto.randomUUID();
    const current = this.data.tasks.find((t) => t.id === id);
    const { project, tags, dependencies, ...fields } = task;
    const today = localDate();
    const shouldCarryNow =
      (task.status === "todo" || task.status === "in_progress") &&
      !task.is_routine &&
      !task.recurrence_rule &&
      !!task.start_date &&
      task.start_date < today;
    return this.save("tasks", {
      ...fields,
      id,
      start_date: shouldCarryNow ? today : task.start_date,
      completed_at:
        task.status === "completed"
          ? task.completed_at || new Date().toISOString()
          : null,
      subtasks: (task.subtasks || current?.subtasks || []).map((s) => ({
        ...s,
        id: uuid(s.id) ? s.id : crypto.randomUUID(),
        task_id: id,
        user_id: this.getUserId(),
        created_at: s.created_at || new Date().toISOString(),
        updated_at: s.updated_at || new Date().toISOString(),
      })),
    });
  }
  toggleTaskCompletion(id: string) {
    const task = this.data.tasks.find((t) => t.id === id);
    return task
      ? this.saveTask({
          ...task,
          status: task.status === "completed" ? "todo" : "completed",
        })
      : null;
  }
  /**
   * Move unfinished, previously planned work onto the current day.
   * Deadlines are promises, so they remain untouched. Routines are daily
   * check-ins and must never roll over into another date.
   */
  rollOverUnfinishedTasks(date = new Date()): number {
    if (!this.userId) return 0;
    const today = localDate(date);
    const candidates = this.data.tasks.filter(
      (task) =>
        (task.status === "todo" || task.status === "in_progress") &&
        !task.is_routine &&
        !task.recurrence_rule &&
        !!task.start_date &&
        task.start_date < today,
    );
    for (const task of candidates)
      this.saveTask({ ...task, start_date: today });
    return candidates.length;
  }
  carryTaskTo(id: string, date: string): Task | null {
    const task = this.data.tasks.find((item) => item.id === id);
    if (
      !task ||
      task.is_routine ||
      !!task.recurrence_rule ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    )
      return null;
    return this.saveTask({ ...task, start_date: date });
  }
  deleteTask(id: string) {
    this.data.resources = this.data.resources.map((r) =>
      r.task_id === id ? { ...r, task_id: null } : r,
    );
    this.data.focus_sessions = this.data.focus_sessions.map((s) =>
      s.task_id === id ? { ...s, task_id: null } : s,
    );
    this.remove("tasks", id);
  }
  toggleSubtask(taskId: string, id: string) {
    const task = this.data.tasks.find((t) => t.id === taskId);
    return task
      ? this.saveTask({
          ...task,
          subtasks: task.subtasks?.map((s) =>
            s.id === id
              ? {
                  ...s,
                  is_completed: !s.is_completed,
                  updated_at: new Date().toISOString(),
                }
              : s,
          ),
        })
      : null;
  }
  addSubtask(taskId: string, title: string) {
    const task = this.data.tasks.find((t) => t.id === taskId);
    if (!task) return null;
    const now = new Date().toISOString();
    return this.saveTask({
      ...task,
      subtasks: [
        ...(task.subtasks || []),
        {
          id: crypto.randomUUID(),
          task_id: taskId,
          user_id: this.getUserId(),
          title,
          is_completed: false,
          position: task.subtasks?.length || 0,
          created_at: now,
          updated_at: now,
        },
      ],
    });
  }
  getRoutines() {
    return [...this.data.routines];
  }
  saveRoutine(row: Routine) {
    return this.save("routines", row);
  }
  getTodayRoutineInstances() {
    return this.data.routine_instances.filter((r) => r.date === localDate());
  }
  getRoutineInstances() {
    return [...this.data.routine_instances];
  }
  toggleRoutineCompletion(id: string) {
    const routine = this.data.routines.find((r) => r.id === id);
    if (!routine || !routineOccursOn(routine)) return null;
    const today = localDate();
    const now = new Date().toISOString();
    const current = this.data.routine_instances.find(
      (r) => r.routine_id === id && r.date === today,
    );
    const completed = current?.status !== "completed";
    return this.save("routine_instances", {
      id: current?.id || crypto.randomUUID(),
      routine_id: id,
      user_id: this.getUserId(),
      date: today,
      status: completed ? "completed" : "pending",
      completed_at: completed ? now : null,
      created_at: current?.created_at || now,
    });
  }
  getProjects() {
    return [...this.data.projects];
  }
  saveProject(row: Project) {
    return this.save("projects", row);
  }
  getBrainDumps() {
    return [...this.data.brain_dumps];
  }
  addBrainDump(raw_text: string) {
    const now = new Date().toISOString();
    return this.save("brain_dumps", {
      id: crypto.randomUUID(),
      user_id: this.getUserId(),
      raw_text,
      status: "inbox",
      converted_type: null,
      converted_id: null,
      created_at: now,
      updated_at: now,
    });
  }
  updateBrainDump(id: string, updates: Partial<BrainDump>) {
    const row = this.data.brain_dumps.find((r) => r.id === id);
    if (row) this.save("brain_dumps", { ...row, ...updates });
  }
  deleteBrainDump(id: string) {
    this.remove("brain_dumps", id);
  }
  getNotes() {
    return [...this.data.notes];
  }
  saveNote(row: Note) {
    return this.save("notes", row);
  }
  deleteNote(id: string) {
    this.remove("notes", id);
  }
  getResources() {
    return [...this.data.resources];
  }
  saveResource(row: Resource) {
    return this.save("resources", row);
  }
  deleteResource(id: string) {
    this.remove("resources", id);
  }
  getFocusSessions() {
    return [...this.data.focus_sessions];
  }
  logFocusSession(row: FocusSession) {
    return this.save("focus_sessions", row);
  }
  getDailyPlans() {
    return [...this.data.daily_plans];
  }
  saveDailyPlan(row: DailyPlan) {
    return this.save("daily_plans", row);
  }
}
export const syncEngine = new SyncEngine();
