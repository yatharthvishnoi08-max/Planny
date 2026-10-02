import React, { useState, useEffect } from "react";
import { Project, Task, Priority } from "../../types/database";
import {
  Folder,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { syncEngine } from "../../lib/sync";
import { formatMinutes } from "../../lib/utils";
import { isPending, localDate } from "../../lib/dates";

interface ProjectsViewProps {
  projects: Project[];
  initialProjectId?: string;
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onAddTask: (projectId: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  initialProjectId,
  tasks,
  onSelectTask,
  onAddTask,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjectId || projects[0]?.id || "",
  );
  useEffect(() => {
    if (initialProjectId) setSelectedProjectId(initialProjectId);
  }, [initialProjectId]);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const currentProject =
    projects.find((p) => p.id === selectedProjectId) || projects[0];
  const projectTasks = tasks.filter((t) => t.project_id === currentProject?.id);

  const completedCount = projectTasks.filter(
    (t) => t.status === "completed",
  ).length;
  const progressPercent =
    projectTasks.length > 0
      ? Math.round((completedCount / projectTasks.length) * 100)
      : 0;
  const remainingMinutes = projectTasks
    .filter((t) => t.status !== "completed")
    .reduce((acc, t) => acc + (t.estimated_duration_minutes || 30), 0);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const created: Project = {
      id: crypto.randomUUID(),
      user_id: syncEngine.getUserId(),
      title: newTitle.trim(),
      description: newDesc.trim() || null,
      color: "#6366f1",
      icon: "folder",
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    syncEngine.saveProject(created);
    setSelectedProjectId(created.id);
    setNewTitle("");
    setNewDesc("");
    setShowNewProjectModal(false);
  };

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowNewProjectModal(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  return (
    <div className="content-page max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-10 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-surface-border">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            Projects
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Keep your tasks together. Move the big things forward.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewProjectModal(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Project</span>
        </button>
      </div>

      {/* Project Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {projects.map((proj) => {
          const isSelected = proj.id === currentProject?.id;
          const pTasks = tasks.filter((t) => t.project_id === proj.id);
          const pDone = pTasks.filter((t) => t.status === "completed").length;
          const pPct =
            pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0;
          const pOverdue = pTasks.filter(
            (task) =>
              isPending(task) &&
              task.deadline &&
              localDate(new Date(task.deadline)) < localDate(),
          ).length;
          const pUpcoming = pTasks.filter(
            (task) =>
              isPending(task) &&
              task.deadline &&
              localDate(new Date(task.deadline)) >= localDate(),
          ).length;

          return (
            <div
              key={proj.id}
              onClick={() => setSelectedProjectId(proj.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? "bg-surface-100 border-indigo-500/50 shadow-md ring-1 ring-indigo-500/20"
                  : "bg-surface-100/60 hover:bg-surface-100 border-surface-border"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: proj.color || "#6366f1" }}
                  />
                  <h3 className="text-sm font-medium text-foreground">
                    {proj.title}
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {pPct}%
                </span>
              </div>

              {proj.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mb-3">
                  {proj.description}
                </p>
              )}

              {/* Progress Bar */}
              <div className="h-1 bg-surface-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${pPct}%` }}
                />
              </div>

              <div className="flex items-center justify-between mt-2.5 text-[10px] text-muted-foreground font-mono">
                <span>
                  {pDone} of {pTasks.length} tasks
                </span>
                <span>{pTasks.length - pDone} remaining</span>
              </div>
              <div className="project-card-signals">
                <span>{pUpcoming} upcoming</span>
                {pOverdue > 0 && (
                  <span className="overdue">{pOverdue} overdue</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Project Details */}
      {currentProject && (
        <div className="bg-surface-100 border border-surface-border rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-surface-border gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-medium text-foreground">
                  {currentProject.title}
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-200 text-muted-foreground border border-surface-border">
                  {progressPercent}% Complete
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {currentProject.description || "No description provided"} ·{" "}
                {formatMinutes(remainingMinutes)} remaining
              </p>
            </div>
          </div>

          <button
            className="secondary-button mb-5"
            onClick={() => onAddTask(currentProject.id)}
          >
            <Plus size={16} /> Add task to project
          </button>

          {/* Task list in project */}
          <div className="space-y-2">
            {projectTasks.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No tasks yet. Add your first task above.
              </div>
            ) : (
              projectTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onSelectTask(t)}
                  className="p-3.5 rounded-xl bg-surface-200/60 hover:bg-surface-200 border border-surface-border flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        syncEngine.toggleTaskCompletion(t.id);
                      }}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        t.status === "completed"
                          ? "bg-emerald-600 border-emerald-500 text-white"
                          : "border-zinc-700 bg-surface-100"
                      }`}
                    >
                      {t.status === "completed" && "✓"}
                    </button>
                    <span
                      className={`text-xs font-medium ${t.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}
                    >
                      {t.title}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-xs font-mono text-muted-foreground">
                    <span>{formatMinutes(t.estimated_duration_minutes)}</span>
                    <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-surface-100 border border-surface-border">
                      {t.priority}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-surface-100 border border-surface-border p-6 shadow-2xl">
            <h3 className="text-base font-medium text-foreground mb-3">
              Create New Project
            </h3>
            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. AKTU Semester 2 or Hackathon 2026"
                  className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Goals, links, notes..."
                  className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
