import type { Project } from "../types/database";

const priorityMarker = /\|priority:(\d+)/;

/** Read a numeric project rank while remaining compatible with the live schema. */
export function projectPriority(project: Project, fallback = 99): number {
  const match = project.icon?.match(priorityMarker);
  const value = match ? Number(match[1]) : fallback;
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export function withProjectPriority(project: Project, value: number): Project {
  const priority = Math.max(1, Math.min(99, Math.round(value) || 1));
  const icon = (project.icon || "folder").replace(priorityMarker, "");
  return { ...project, icon: `${icon}|priority:${priority}` };
}
