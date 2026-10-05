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

/** Return every project with one unique, contiguous rank. */
export function normalizeProjectPriorities(projects: Project[]): Project[] {
  return projects
    .map((project, index) => ({
      project,
      rank: projectPriority(project, index + 1),
      index,
    }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ project }, index) => withProjectPriority(project, index + 1));
}

/** Move one project to a rank and shift the rest around it. */
export function moveProjectPriority(
  projects: Project[],
  projectId: string,
  requestedRank: number,
): Project[] {
  const ordered = normalizeProjectPriorities(projects);
  const movingIndex = ordered.findIndex((project) => project.id === projectId);
  if (movingIndex < 0) return ordered;
  const [moving] = ordered.splice(movingIndex, 1);
  const destination = Math.max(
    0,
    Math.min(ordered.length, Math.round(requestedRank || 1) - 1),
  );
  ordered.splice(destination, 0, moving);
  return ordered.map((project, index) =>
    withProjectPriority(project, index + 1),
  );
}
