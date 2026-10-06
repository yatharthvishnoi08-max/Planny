import React, { useEffect, useMemo, useState } from "react";
import type { Project, Task } from "../../types/database";
import { AlertTriangle, ArrowRight, Check, ChevronRight, Plus, Sparkles, Target, Trash2, Wand2, X } from "lucide-react";
import { syncEngine } from "../../lib/sync";
import { formatMinutes } from "../../lib/utils";
import { isPending, localDate } from "../../lib/dates";
import { moveProjectPriority, normalizeProjectPriorities, projectPriority } from "../../lib/projectPriority";
import { projectPlanning, withProjectPlanning } from "../../lib/projectPlanning";

interface ProjectsViewProps {
  projects: Project[];
  initialProjectId?: string;
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onAddTask: (projectId: string) => void;
}

type Starter = { id: string; label: string; description: string; tasks: { title: string; minutes: number }[] };

const STARTERS: Starter[] = [
  { id: "launch", label: "Launch something", description: "Go from an idea to a real, shipped result.", tasks: [{ title: "Write the one-sentence outcome", minutes: 20 }, { title: "List the first version requirements", minutes: 35 }, { title: "Schedule a review", minutes: 15 }] },
  { id: "study", label: "Study a subject", description: "Turn a large syllabus into a calm weekly plan.", tasks: [{ title: "Map chapters and exam weight", minutes: 30 }, { title: "Create the first study block", minutes: 45 }, { title: "Plan a practice test", minutes: 20 }] },
  { id: "personal", label: "Personal goal", description: "Build momentum without overplanning it.", tasks: [{ title: "Define what done looks like", minutes: 20 }, { title: "Choose the smallest next step", minutes: 20 }, { title: "Book a weekly check-in", minutes: 10 }] },
];

const nextDeadline = (tasks: Task[]) => tasks.filter((task) => isPending(task) && task.deadline).sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())[0];

export const ProjectsView: React.FC<ProjectsViewProps> = ({ projects, initialProjectId, tasks, onSelectTask, onAddTask }) => {
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || projects[0]?.id || "");
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState(1);
  const [newTarget, setNewTarget] = useState("");
  const [newWeeklyMinutes, setNewWeeklyMinutes] = useState(180);
  const [starterId, setStarterId] = useState(STARTERS[0].id);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  useEffect(() => { if (initialProjectId) setSelectedProjectId(initialProjectId); }, [initialProjectId]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setShowNewProjectModal(false); setProjectToDelete(null); } };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  useEffect(() => {
    const normalized = normalizeProjectPriorities(projects);
    normalized.forEach((project) => {
      const original = projects.find((item) => item.id === project.id);
      if (original && original.icon !== project.icon) syncEngine.saveProject(project);
    });
  }, [projects]);

  const rankedProjects = useMemo(() => projects.map((project, index) => ({ project, priority: projectPriority(project, index + 1), originalIndex: index })).sort((a, b) => a.priority - b.priority || a.originalIndex - b.originalIndex), [projects]);
  const currentProject = projects.find((project) => project.id === selectedProjectId) || rankedProjects[0]?.project;
  const projectTasks = tasks.filter((task) => task.project_id === currentProject?.id);
  const completedCount = projectTasks.filter((task) => task.status === "completed").length;
  const pendingTasks = projectTasks.filter(isPending);
  const progressPercent = projectTasks.length ? Math.round((completedCount / projectTasks.length) * 100) : 0;

  const handleCreateProject = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newTitle.trim()) return;
    const now = new Date().toISOString();
    const starter = STARTERS.find((item) => item.id === starterId) || STARTERS[0];
    let created: Project = { id: crypto.randomUUID(), user_id: syncEngine.getUserId(), title: newTitle.trim(), description: newDesc.trim() || starter.description, color: "#9ef263", icon: `folder|priority:${newPriority}`, status: "active", created_at: now, updated_at: now };
    created = withProjectPlanning(created, { targetDate: newTarget, weeklyMinutes: newWeeklyMinutes, milestones: [] });
    moveProjectPriority([...projects, created], created.id, newPriority).forEach(
      (project) => syncEngine.saveProject(project),
    );
    starter.tasks.forEach((item, index) => syncEngine.saveTask({ id: crypto.randomUUID(), user_id: syncEngine.getUserId(), project_id: created.id, title: item.title, description: null, priority: index === 0 ? "high" : "medium", status: "todo", start_date: localDate(), deadline: null, estimated_duration_minutes: item.minutes, recurrence_rule: null, is_routine: false, is_brain_dump: false, position: index, completed_at: null, created_at: now, updated_at: now }));
    setSelectedProjectId(created.id); setNewTitle(""); setNewDesc(""); setNewTarget(""); setNewWeeklyMinutes(180); setShowNewProjectModal(false);
  };

  const openNewProject = () => {
    setNewPriority(Math.min(99, Math.max(0, ...projects.map((project, index) => projectPriority(project, index + 1))) + 1));
    setShowNewProjectModal(true);
  };

  return (
    <div className="projects-page content-page max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-10 animate-fade-in">
      <header className="projects-hero">
        <div><span className="page-eyebrow">YOUR ACTIVE WORK</span><h1>Projects, with a pulse.</h1><p>See what is moving, what is stuck, and exactly what to do next.</p></div>
        <button className="project-new-button" onClick={openNewProject}><Plus size={17} /> New project</button>
      </header>

      {rankedProjects.length === 0 ? (
        <button className="project-empty" onClick={openNewProject}><span><Sparkles size={22} /></span><strong>Start your first real project</strong><small>Planny will create the first three tasks so you have a clear place to begin.</small></button>
      ) : (
        <div className="project-switcher" aria-label="Choose a project">
          {rankedProjects.map(({ project, priority }) => {
            const itemTasks = tasks.filter((task) => task.project_id === project.id);
            const done = itemTasks.filter((task) => task.status === "completed").length;
            const percent = itemTasks.length ? Math.round((done / itemTasks.length) * 100) : 0;
            const itemPlanning = projectPlanning(project);
            const itemOverdue = itemTasks.filter((task) => isPending(task) && task.deadline && localDate(new Date(task.deadline)) < localDate()).length;
            return <button key={project.id} className={project.id === currentProject?.id ? "active" : ""} onClick={() => setSelectedProjectId(project.id)}>
              <span className="project-switcher-rank">{priority}</span><span className="project-switcher-copy"><strong>{project.title}</strong><small>{itemOverdue ? `${itemOverdue} overdue` : `${itemTasks.length - done} tasks left`}</small></span><span className="project-switcher-progress"><i style={{ width: `${percent}%` }} /></span>
              {itemPlanning.targetDate && <time>{new Date(`${itemPlanning.targetDate}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time>}
              <span role="button" tabIndex={0} aria-label={`Delete ${project.title}`} className="project-switcher-delete" onClick={(event) => { event.stopPropagation(); setProjectToDelete(project); }} onKeyDown={(event) => { if (event.key === "Enter") setProjectToDelete(project); }}><Trash2 size={13} /></span>
            </button>;
          })}
        </div>
      )}

      {currentProject && <main className="project-workspace">
        <section className="project-title-row">
          <div><div className="project-title-line"><h2>{currentProject.title}</h2></div><p>{currentProject.description || "Give this project a clear outcome."}</p></div>
          <div className="project-title-actions"><label>Rank <input type="number" min="1" max={Math.max(1, projects.length)} value={projectPriority(currentProject, 1)} onChange={(event) => moveProjectPriority(projects, currentProject.id, Number(event.target.value)).forEach((project) => syncEngine.saveProject(project))} /></label><button onClick={() => onAddTask(currentProject.id)}><Plus size={15} /> Add task</button><button className="icon-only" aria-label="Delete project" onClick={() => setProjectToDelete(currentProject)}><Trash2 size={15} /></button></div>
        </section>

        <section className="project-pulse-grid progress-only">
          <article className="project-pulse-card"><span><Target size={16} /> Progress</span><strong>{progressPercent}% <small>complete</small></strong><div className="project-big-progress"><i style={{ width: `${progressPercent}%` }} /></div><p>{completedCount} finished · {pendingTasks.length} remaining</p></article>
        </section>

        <section className="project-columns roadmap-only">
          <article className="project-panel roadmap-panel">
            <header><div><span className="page-eyebrow">LIVE ROADMAP</span><h3>What happens next</h3></div><span>{pendingTasks.length} open</span></header>
            <div className="project-roadmap">{pendingTasks.length ? pendingTasks.slice().sort((a, b) => (a.deadline ? new Date(a.deadline).getTime() : Infinity) - (b.deadline ? new Date(b.deadline).getTime() : Infinity)).map((task, index) => <div className="project-roadmap-task" key={task.id}><button className="project-roadmap-main" onClick={() => onSelectTask(task)}><i className={task.priority} /><span><small>{index === 0 ? "NEXT" : task.deadline ? new Date(task.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "UNSCHEDULED"}</small><strong>{task.title}</strong></span><em>{formatMinutes(task.estimated_duration_minutes)}</em><ChevronRight size={14} /></button><button className="project-roadmap-done" aria-label={`Mark ${task.title} done`} onClick={() => syncEngine.toggleTaskCompletion(task.id)}><Check size={13} /> Mark done</button></div>) : <div className="roadmap-clear"><Sparkles size={20} /><strong>Clear runway.</strong><small>Add a task when you know the next move.</small></div>}</div>
            {nextDeadline(projectTasks) && <footer>Next deadline: <b>{nextDeadline(projectTasks)?.title}</b></footer>}
          </article>
        </section>
      </main>}

      {showNewProjectModal && <div className="project-modal-backdrop" onClick={(event) => event.target === event.currentTarget && setShowNewProjectModal(false)}><section className="project-create-modal" role="dialog" aria-modal="true" aria-labelledby="new-project-title"><button className="project-modal-close" onClick={() => setShowNewProjectModal(false)}><X size={18} /></button><span className="page-eyebrow"><Sparkles size={13} /> SMART PROJECT STARTER</span><h2 id="new-project-title">What are we making happen?</h2><p>Choose a shape. Planny will create the first roadmap so you never face an empty project.</p><form onSubmit={handleCreateProject}>
        <div className="project-starters">{STARTERS.map((starter) => <button type="button" key={starter.id} className={starterId === starter.id ? "active" : ""} onClick={() => setStarterId(starter.id)}><strong>{starter.label}</strong><small>{starter.description}</small></button>)}</div>
        <label><span>Project name</span><input autoFocus required value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="e.g. Launch Planny 2.0" /></label><label><span>What does success look like?</span><textarea rows={2} value={newDesc} onChange={(event) => setNewDesc(event.target.value)} placeholder="A simple, concrete finish line…" /></label>
        <div className="project-form-row"><label><span>Target date</span><input type="date" value={newTarget} onChange={(event) => setNewTarget(event.target.value)} /></label><label><span>Minutes per week</span><input type="number" min="30" step="30" value={newWeeklyMinutes} onChange={(event) => setNewWeeklyMinutes(Number(event.target.value))} /></label><label><span>Rank</span><input type="number" min="1" max={projects.length + 1} value={newPriority} onChange={(event) => setNewPriority(Math.max(1, Math.min(projects.length + 1, Number(event.target.value) || 1)))} /></label></div>
        <div className="project-create-preview"><Wand2 size={17} /><span><strong>Planny will make:</strong><small>3 starter tasks · a weekly workload check</small></span></div><button className="project-create-submit" type="submit">Create my project <ArrowRight size={16} /></button>
      </form></section></div>}

      {projectToDelete && <div className="project-modal-backdrop" onClick={(event) => event.target === event.currentTarget && setProjectToDelete(null)}><section className="project-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-project-title"><button className="project-delete-close" aria-label="Cancel project deletion" onClick={() => setProjectToDelete(null)}><X size={17} /></button><span className="project-delete-icon"><AlertTriangle size={21} /></span><div><span className="page-eyebrow">DELETE PROJECT</span><h3 id="delete-project-title">Delete “{projectToDelete.title}”?</h3><p>The project will be removed. Its {tasks.filter((task) => task.project_id === projectToDelete.id).length} tasks will stay in Planny under No Project.</p></div><div className="project-delete-actions"><button onClick={() => setProjectToDelete(null)}>Keep project</button><button className="danger" onClick={() => { const next = rankedProjects.find(({ project }) => project.id !== projectToDelete.id)?.project; syncEngine.deleteProject(projectToDelete.id); setSelectedProjectId(next?.id || ""); setProjectToDelete(null); }}><Trash2 size={14} /> Delete project</button></div></section></div>}
    </div>
  );
};
