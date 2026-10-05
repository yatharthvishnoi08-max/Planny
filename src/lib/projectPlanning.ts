import type { Project } from "../types/database";

export type ProjectMilestone = {
  id: string;
  title: string;
  done: boolean;
};

export type ProjectPlanning = {
  targetDate: string;
  weeklyMinutes: number;
  milestones: ProjectMilestone[];
};

const targetPattern = /\|target:([^|]*)/;
const weeklyPattern = /\|weekly:(\d+)/;
const milestonesPattern = /\|milestones:([^|]*)/;

const safeMilestones = (value: string | undefined): ProjectMilestone[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(value));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.title === "string")
      .slice(0, 8)
      .map((item) => ({
        id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
        title: item.title.trim().slice(0, 80),
        done: Boolean(item.done),
      }));
  } catch {
    return [];
  }
};

export function projectPlanning(project: Project): ProjectPlanning {
  const icon = project.icon || "folder";
  const weekly = Number(icon.match(weeklyPattern)?.[1] || 0);
  return {
    targetDate: icon.match(targetPattern)?.[1] || "",
    weeklyMinutes: Number.isFinite(weekly) ? weekly : 0,
    milestones: safeMilestones(icon.match(milestonesPattern)?.[1]),
  };
}

export function withProjectPlanning(
  project: Project,
  planning: Partial<ProjectPlanning>,
): Project {
  const current = projectPlanning(project);
  const next = { ...current, ...planning };
  const cleanIcon = (project.icon || "folder")
    .replace(targetPattern, "")
    .replace(weeklyPattern, "")
    .replace(milestonesPattern, "");
  const target = next.targetDate ? `|target:${next.targetDate}` : "";
  const weekly = next.weeklyMinutes
    ? `|weekly:${Math.max(0, Math.round(next.weeklyMinutes))}`
    : "";
  const milestones = next.milestones.length
    ? `|milestones:${encodeURIComponent(JSON.stringify(next.milestones))}`
    : "";
  return {
    ...project,
    icon: `${cleanIcon}${target}${weekly}${milestones}`,
    updated_at: new Date().toISOString(),
  };
}
