import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  X,
  CheckSquare,
  Folder,
  FileText,
  Bookmark,
  Lightbulb,
  ArrowRight,
  Plus,
  Sparkles,
  CalendarDays,
  Timer,
  Play,
  LayoutDashboard,
  Brain,
} from "lucide-react";
import { syncEngine } from "../../lib/sync";
import { Task, Project, Note, Resource, BrainDump } from "../../types/database";
import { recommendNextTask } from "../../lib/dayPlanner";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTask?: (task: Task) => void;
  onNavigateTab?: (tab: any, itemId?: string) => void;
  onCreateTask?: () => void;
  onPlanDay?: () => void;
  onStartFocus?: (task: Task) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectTask,
  onNavigateTab,
  onCreateTask,
  onPlanDay,
  onStartFocus,
}) => {
  const resultsRef = useRef<HTMLDivElement>(null);
  const moveResult = (e: React.KeyboardEvent) => {
    if (!["ArrowDown", "ArrowUp", "Enter"].includes(e.key)) return;
    const buttons = Array.from(
      resultsRef.current?.querySelectorAll<HTMLButtonElement>("button") || [],
    );
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Enter") {
      if (index === -1 && buttons.length) {
        e.preventDefault();
        buttons[0].click();
      }
      return;
    }
    e.preventDefault();
    buttons[
      (index + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) %
        buttons.length
    ]?.focus();
  };
  const [query, setQuery] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [brainDumps, setBrainDumps] = useState<BrainDump[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTasks(syncEngine.getTasks());
      setProjects(syncEngine.getProjects());
      setNotes(syncEngine.getNotes());
      setResources(syncEngine.getResources());
      setBrainDumps(syncEngine.getBrainDumps());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const filteredTasks = q
    ? tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q),
      )
    : tasks.slice(0, 3);
  const filteredProjects = q
    ? projects.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q),
      )
    : projects.slice(0, 2);
  const filteredNotes = q
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q),
      )
    : notes.slice(0, 2);
  const filteredResources = q
    ? resources.filter(
        (r) =>
          r.title.toLowerCase().includes(q) || r.url?.toLowerCase().includes(q),
      )
    : [];
  const filteredBrainDumps = q
    ? brainDumps.filter((b) => b.raw_text.toLowerCase().includes(q))
    : [];

  const totalResults =
    filteredTasks.length +
    filteredProjects.length +
    filteredNotes.length +
    filteredResources.length +
    filteredBrainDumps.length;
  const recommendedTask = recommendNextTask(
    tasks,
    syncEngine.getFocusSessions(),
  );

  return (
    <div
      onKeyDown={moveResult}
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 bg-black/80 backdrop-blur-md p-4 animate-fade-in"
    >
      <div className="w-full max-w-xl rounded-2xl bg-surface-100 border border-surface-border shadow-2xl overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-surface-border">
          <Search className="w-4 h-4 text-muted-foreground mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, projects, notes, resources, and brain dump..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            aria-label="Close search"
            onClick={onClose}
            className="icon-button"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div
          ref={resultsRef}
          className="max-h-96 overflow-y-auto p-3 space-y-4"
        >
          {!q && (
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1.5 block">
                Quick actions
              </span>
              <div className="command-actions">
                <button
                  onClick={() => {
                    onCreateTask?.();
                    onClose();
                  }}
                >
                  <Plus size={15} />
                  <span>
                    <strong>Create task</strong>
                    <small>Capture something quickly</small>
                  </span>
                </button>
                <button
                  onClick={() => {
                    onPlanDay?.();
                    onClose();
                  }}
                >
                  <Sparkles size={15} />
                  <span>
                    <strong>Plan my day</strong>
                    <small>Build focus blocks from real tasks</small>
                  </span>
                </button>
                <button
                  disabled={!recommendedTask}
                  onClick={() => {
                    if (recommendedTask) onStartFocus?.(recommendedTask);
                    onClose();
                  }}
                >
                  <Play size={15} />
                  <span>
                    <strong>Start focus</strong>
                    <small>
                      {recommendedTask
                        ? recommendedTask.title
                        : "No pending task to start"}
                    </small>
                  </span>
                </button>
                <button
                  onClick={() => {
                    onNavigateTab?.("calendar");
                    onClose();
                  }}
                >
                  <CalendarDays size={15} />
                  <span>
                    <strong>Open calendar</strong>
                    <small>See deadlines and routines</small>
                  </span>
                </button>
                <button
                  onClick={() => {
                    onNavigateTab?.("focus-insights");
                    onClose();
                  }}
                >
                  <Timer size={15} />
                  <span>
                    <strong>Focus insights</strong>
                    <small>Review your focused time</small>
                  </span>
                </button>
                <button
                  onClick={() => {
                    onNavigateTab?.("today");
                    onClose();
                  }}
                >
                  <LayoutDashboard size={15} />
                  <span>
                    <strong>Open Today</strong>
                    <small>Return to your command center</small>
                  </span>
                </button>
                <button
                  onClick={() => {
                    onNavigateTab?.("brain-dump");
                    onClose();
                  }}
                >
                  <Brain size={15} />
                  <span>
                    <strong>Brain dump</strong>
                    <small>Capture everything on your mind</small>
                  </span>
                </button>
              </div>
            </div>
          )}
          {totalResults === 0 && q && (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No results found for "{query}".
            </div>
          )}

          {/* Tasks */}
          {filteredTasks.length > 0 && (
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1.5 block">
                Tasks
              </span>
              <div className="space-y-1">
                {filteredTasks.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      if (onSelectTask) onSelectTask(t);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-surface-200 text-left text-xs transition-colors group"
                  >
                    <div className="flex items-center space-x-2.5">
                      <CheckSquare className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="text-foreground group-hover:text-indigo-300 transition-colors font-medium">
                        {t.title}
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-mono text-muted-foreground">
                      {t.priority}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {filteredProjects.length > 0 && (
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1.5 block">
                Projects
              </span>
              <div className="space-y-1">
                {filteredProjects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (onNavigateTab) onNavigateTab("projects", p.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-surface-200 text-left text-xs transition-colors group"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Folder className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-foreground group-hover:text-emerald-300 transition-colors font-medium">
                        {p.title}
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {filteredNotes.length > 0 && (
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1.5 block">
                Notes & Knowledge
              </span>
              <div className="space-y-1">
                {filteredNotes.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      if (onNavigateTab) onNavigateTab("knowledge", n.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-surface-200 text-left text-xs transition-colors group"
                  >
                    <div className="flex items-center space-x-2.5">
                      <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-foreground font-medium">
                        {n.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground uppercase">
                      {n.note_type}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Resources */}
          {filteredResources.length > 0 && (
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1.5 block">
                Resources
              </span>
              <div className="space-y-1">
                {filteredResources.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      if (onNavigateTab) onNavigateTab("knowledge", r.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-surface-200 text-left text-xs transition-colors group"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Bookmark className="w-4 h-4 text-sky-400 shrink-0" />
                      <span className="text-foreground font-medium">
                        {r.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground uppercase">
                      {r.resource_type}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Brain Dump */}
          {filteredBrainDumps.length > 0 && (
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1.5 block">
                Brain Dump
              </span>
              <div className="space-y-1">
                {filteredBrainDumps.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      if (onNavigateTab) onNavigateTab("brain-dump");
                      onClose();
                    }}
                    className="w-full flex items-center space-x-2.5 p-2 rounded-lg hover:bg-surface-200 text-left text-xs text-foreground transition-colors"
                  >
                    <Lightbulb className="w-4 h-4 text-yellow-400 shrink-0" />
                    <span className="truncate">{b.raw_text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-surface-200/50 border-t border-surface-border text-[11px] text-muted-foreground flex items-center justify-between">
          <span>Navigate with arrows, Enter to view</span>
          <span className="font-mono">Cmd / Ctrl + K</span>
        </div>
      </div>
    </div>
  );
};
