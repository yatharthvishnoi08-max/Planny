import { currentPlatform } from "./platform";
import { localDate, routineOccursOn, isPending } from "./dates";
import type { Task, Routine, RoutineInstance } from "../types/database";

let isPermissionGrantedCache: boolean | null = null;

// Track active scheduled timeouts in memory for active timers
const activeNotificationTimers = new Map<string, number>();

/**
 * Request notification permission from the system (Desktop, Mobile, or Browser)
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (currentPlatform.isTauri) {
    try {
      const { isPermissionGranted, requestPermission } =
        await import("@tauri-apps/plugin-notification");
      let granted = await isPermissionGranted();
      if (!granted) {
        const permission = await requestPermission();
        granted = permission === "granted";
      }
      isPermissionGrantedCache = granted;
      return granted;
    } catch (err) {
      console.warn("Tauri notification plugin fallback:", err);
    }
  }

  // Web / PWA fallback
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "granted") {
      isPermissionGrantedCache = true;
      return true;
    }
    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      const granted = permission === "granted";
      isPermissionGrantedCache = granted;
      return granted;
    }
  }

  return false;
}

/**
 * Dispatch an immediate notification to the user
 */
export async function sendNotification(
  title: string,
  body: string,
  id?: string,
) {
  // If permission hasn't been checked yet, try requesting it
  if (isPermissionGrantedCache === null) {
    await requestNotificationPermission();
  }

  if (currentPlatform.isTauri) {
    try {
      const { sendNotification: tauriSendNotification } =
        await import("@tauri-apps/plugin-notification");
      tauriSendNotification({
        title,
        body,
        id: id
          ? parseInt(id.replace(/\D/g, "").slice(0, 8), 10) || 1
          : undefined,
      });
      return;
    } catch (err) {
      console.warn("Failed to send Tauri notification:", err);
    }
  }

  // Fallback to browser Notification
  if (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    new Notification(title, {
      body,
      icon: "/planny-icon.svg",
      tag: id,
    });
  }
}

// Desktop/web timers are rebuilt from persisted tasks whenever the app opens.
// Mobile uses the OS scheduler so alerts can survive app closure.
const schedules = new Map<string, { title: string; at: number }>();
let mobileRevision = 0;
let mobileWork: Promise<void> = Promise.resolve();
let mobileSignature = "";
const numberId = (key: string) => {
  let h = 2166136261;
  for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 1;
};
export function scheduleTaskNotification(
  id: string,
  title: string,
  remindAt: Date,
) {
  const at = remindAt.getTime();
  if (!Number.isFinite(at) || at <= Date.now()) {
    cancelTaskNotification(id);
    return;
  }
  const old = schedules.get(id);
  if (old?.at === at && old.title === title) return;
  cancelTaskNotification(id);
  schedules.set(id, { title, at });
  const arm = () => {
    const remaining = at - Date.now();
    if (remaining > 0) {
      activeNotificationTimers.set(
        id,
        window.setTimeout(arm, Math.min(remaining, 2147483647)),
      );
    } else {
      activeNotificationTimers.delete(id);
      schedules.delete(id);
      void sendNotification("Planny reminder", `Time for: ${title}`, id);
    }
  };
  arm();
}
export function cancelTaskNotification(id: string) {
  const timer = activeNotificationTimers.get(id);
  if (timer !== undefined) clearTimeout(timer);
  activeNotificationTimers.delete(id);
  schedules.delete(id);
}
export function reconcileNotifications(
  tasks: Task[],
  routines: Routine[],
  instances: RoutineInstance[],
  userId: string | null,
) {
  const desired = new Map<string, { title: string; at: number }>();
  if (userId) {
    let preference = "at_time";
    let startOfDay = "08:00";
    try {
      const profile = JSON.parse(
        localStorage.getItem(`orbit_profile:${userId}`) || "{}",
      );
      preference = profile.reminder_preference || preference;
      startOfDay = profile.start_of_day || startOfDay;
    } catch {}
    const offsetMs =
      preference === "15m_before"
        ? 900000
        : preference === "1h_before"
          ? 3600000
          : 0;
    if (preference === "morning_briefing") {
      const at = new Date(`${localDate()}T${startOfDay}:00`).getTime();
      if (at > Date.now())
        desired.set(`briefing:${userId}:${localDate()}`, {
          title: "Your daily briefing is ready in Planny",
          at,
        });
    }
    for (const task of tasks)
      if (
        preference !== "morning_briefing" &&
        isPending(task) &&
        task.deadline
      ) {
        const at = new Date(task.deadline).getTime() - offsetMs;
        if (at > Date.now()) desired.set(task.id, { title: task.title, at });
      }
    // Queue the next week; refreshed whenever the workspace is active.
    for (
      let offset = 0;
      preference !== "morning_briefing" && offset < 7;
      offset++
    ) {
      const day = new Date();
      day.setDate(day.getDate() + offset);
      for (const routine of routines)
        if (routineOccursOn(routine, day)) {
          const date = localDate(day);
          if (
            instances.some(
              (i) =>
                i.routine_id === routine.id &&
                i.date === date &&
                i.status !== "pending",
            )
          )
            continue;
          const at =
            new Date(`${date}T${routine.time_of_day}:00`).getTime() - offsetMs;
          if (at > Date.now())
            desired.set(`${routine.id}:${date}`, { title: routine.title, at });
        }
    }
  }
  if (currentPlatform.isTauri && currentPlatform.isMobile) {
    const signature = JSON.stringify([userId, [...desired]]);
    if (signature === mobileSignature) return;
    mobileSignature = signature;
    const revision = ++mobileRevision;
    mobileWork = mobileWork
      .then(async () => {
        if (revision !== mobileRevision) return;
        const plugin = await import("@tauri-apps/plugin-notification");
        await plugin.cancelAll();
        if (!(await plugin.isPermissionGranted())) {
          mobileSignature = "";
          return;
        }
        for (const [key, item] of [...desired]
          .sort((a, b) => a[1].at - b[1].at)
          .slice(0, 60)) {
          plugin.sendNotification({
            id: numberId(key),
            title: "Planny reminder",
            body: `Time for: ${item.title}`,
            schedule: plugin.Schedule.at(new Date(item.at)),
          });
        }
      })
      .catch((error) => {
        mobileSignature = "";
        console.warn("Unable to schedule reminders", error);
      });
    return;
  }
  for (const key of schedules.keys())
    if (!desired.has(key)) cancelTaskNotification(key);
  for (const [key, item] of desired)
    scheduleTaskNotification(key, item.title, new Date(item.at));
}
