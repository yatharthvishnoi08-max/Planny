import { isPending, isTodayTask, localDate } from "./lib/dates";
import React, { useState, useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import { syncEngine, SyncState } from "./lib/sync";
import {
  Task,
  Project,
  Routine,
  RoutineInstance,
  Note,
  Resource,
  BrainDump,
  FocusSession,
  DailyPlan,
} from "./types/database";
import { AppLayout, NavigationTab } from "./components/layout/AppLayout";
import { TodayView } from "./components/views/TodayView";
import { UpcomingView } from "./components/views/UpcomingView";
import { CalendarView } from "./components/views/CalendarView";
import { ProjectsView } from "./components/views/ProjectsView";
import { RoutinesView } from "./components/views/RoutinesView";
import { BrainDumpView } from "./components/views/BrainDumpView";
import { KnowledgeView } from "./components/views/KnowledgeView";
import { AIAssistantView } from "./components/views/AIAssistantView";
import { SettingsView } from "./components/views/SettingsView";
import { FocusInsightsView } from "./components/views/FocusInsightsView";
import { TaskDetailPanel } from "./components/tasks/TaskDetailPanel";
import { AITaskModal } from "./components/tasks/AITaskModal";
import { FocusMode } from "./components/focus/FocusMode";
import { DailyBriefingModal } from "./components/daily/DailyBriefingModal";
import { DayReviewModal } from "./components/daily/DayReviewModal";
import { GlobalSearchModal } from "./components/search/GlobalSearchModal";
import { OnboardingModal } from "./components/auth/OnboardingModal";
import { LandingPage } from "./components/auth/LandingPage";

export const App: React.FC = () => {
  const { user, profile, isLoading, isOnboarded } = useAuth();

  // Navigation State
  const [currentTab, setCurrentTab] = useState<NavigationTab>("today");

  const [searchTarget, setSearchTarget] = useState<string | undefined>();

  // Sync Engine State
  const [syncState, setSyncState] = useState<SyncState>(syncEngine.getState());
  const [tasks, setTasks] = useState<Task[]>(syncEngine.getTasks());
  const [projects, setProjects] = useState<Project[]>(syncEngine.getProjects());
  const [routines, setRoutines] = useState<Routine[]>(syncEngine.getRoutines());
  const [routineInstances, setRoutineInstances] = useState<RoutineInstance[]>(
    syncEngine.getTodayRoutineInstances(),
  );
  const [notes, setNotes] = useState<Note[]>(syncEngine.getNotes());
  const [resources, setResources] = useState<Resource[]>(
    syncEngine.getResources(),
  );
  const [brainDumps, setBrainDumps] = useState<BrainDump[]>(
    syncEngine.getBrainDumps(),
  );
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>(
    syncEngine.getFocusSessions(),
  );
  const [dailyPlans, setDailyPlans] = useState<DailyPlan[]>(
    syncEngine.getDailyPlans(),
  );

  // Modals & Panels
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [focusTask, setFocusTask] = useState<Task | null>(null);
  const [taskProjectId, setTaskProjectId] = useState<string | null>(null);
  const [isAITaskModalOpen, setIsAITaskModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);
  const [isDayReviewOpen, setIsDayReviewOpen] = useState(false);
  const [planDayRequest, setPlanDayRequest] = useState(0);

  // Subscribe to Sync Engine changes
  useEffect(() => {
    const unsubscribe = syncEngine.subscribe(() => {
      setSyncState(syncEngine.getState());
      setTasks(syncEngine.getTasks());
      setProjects(syncEngine.getProjects());
      setRoutines(syncEngine.getRoutines());
      setRoutineInstances(syncEngine.getTodayRoutineInstances());
      setNotes(syncEngine.getNotes());
      setResources(syncEngine.getResources());
      setBrainDumps(syncEngine.getBrainDumps());
      setFocusSessions(syncEngine.getFocusSessions());
      setDailyPlans(syncEngine.getDailyPlans());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    setSelectedTask(null);
    setFocusTask(null);
    setIsAITaskModalOpen(false);
    setIsSearchOpen(false);
    setIsBriefingOpen(false);
    setIsDayReviewOpen(false);
    setSearchTarget(undefined);
  }, [user?.id]);

  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () =>
      document.documentElement.style.setProperty(
        "--visual-height",
        `${viewport?.height || window.innerHeight}px`,
      );
    resize();
    viewport?.addEventListener("resize", resize);
    return () => viewport?.removeEventListener("resize", resize);
  }, []);

  // Global Keyboard Shortcuts (Cmd/Ctrl + K for search, ESC to close modals)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (e.key === "Tab") {
        const dialog = Array.from(
          document.querySelectorAll<HTMLElement>('[role="dialog"]'),
        ).at(-1);
        const controls = dialog
          ? Array.from(
              dialog.querySelectorAll<HTMLElement>(
                'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
              ),
            ).filter((el) => el.getClientRects().length > 0)
          : [];
        if (controls.length) {
          const first = controls[0],
            last = controls[controls.length - 1];
          if (
            e.shiftKey &&
            (document.activeElement === first ||
              !dialog?.contains(document.activeElement))
          ) {
            e.preventDefault();
            last.focus();
          } else if (
            !e.shiftKey &&
            (document.activeElement === last ||
              !dialog?.contains(document.activeElement))
          ) {
            e.preventDefault();
            first.focus();
          }
        }
      }
      if (e.key === "Escape") {
        setSelectedTask(null);
        setIsSearchOpen(false);
        setIsAITaskModalOpen(false);
        setIsBriefingOpen(false);
        setIsDayReviewOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCreateAITask = (parsed: any) => {
    const taskId = crypto.randomUUID();
    syncEngine.saveTask({
      id: taskId,
      user_id: user?.id || "user-default",
      project_id: parsed.project_id || taskProjectId,
      title: parsed.title,
      description: parsed.description,
      priority: parsed.priority,
      status: "todo",
      start_date: localDate(),
      deadline: parsed.deadline,
      estimated_duration_minutes: parsed.estimated_duration_minutes || 60,
      recurrence_rule: null,
      is_routine: false,
      is_brain_dump: false,
      position: 0,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      subtasks: parsed.subtasks.map((st: string, idx: number) => ({
        id: crypto.randomUUID(),
        task_id: taskId,
        user_id: user?.id || "user-default",
        title: st,
        is_completed: false,
        position: idx,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
    });
  };

  const handleStartFocusById = (taskId: string) => {
    const t = tasks.find((item) => item.id === taskId);
    if (t) setFocusTask(t);
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background text-foreground font-mono text-xs">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
          <span>Loading Planny…</span>
        </div>
      </div>
    );
  }

  if (!user) return <LandingPage />;

  if (!isOnboarded)
    return (
      <OnboardingModal
        key={user.id}
        isOpen
        onComplete={() => setCurrentTab("ai-assistant")}
      />
    );

  return (
    <AppLayout
      key={user?.id || "signed-out"}
      currentTab={currentTab}
      onSelectTab={(tab) => {
        setSearchTarget(undefined);
        setCurrentTab(tab);
      }}
      syncState={syncState}
      onOpenSearch={() => setIsSearchOpen(true)}
      onOpenQuickAdd={() => {
        setTaskProjectId(null);
        setIsAITaskModalOpen(true);
      }}
      onOpenAITask={() => {
        setTaskProjectId(null);
        setIsAITaskModalOpen(true);
      }}
    >
      {/* Tab Router */}
      {currentTab === "today" && (
        <TodayView
          tasks={tasks}
          routines={routines}
          routineInstances={routineInstances}
          focusSessions={focusSessions}
          dailyPlans={dailyPlans}
          endOfDay={profile?.end_of_day}
          onSelectTask={setSelectedTask}
          onStartFocus={setFocusTask}
          onOpenAITaskModal={() => {
            setTaskProjectId(null);
            setIsAITaskModalOpen(true);
          }}
          onOpenDayReview={() => setIsDayReviewOpen(true)}
          onOpenAssistant={() => setCurrentTab("ai-assistant")}
          onOpenRoutines={() => setCurrentTab("routines")}
          planRequest={planDayRequest}
        />
      )}

      {currentTab === "upcoming" && (
        <UpcomingView tasks={tasks} onSelectTask={setSelectedTask} />
      )}

      {currentTab === "calendar" && (
        <CalendarView
          tasks={tasks}
          routines={routines}
          onSelectTask={setSelectedTask}
        />
      )}

      {currentTab === "focus-insights" && (
        <FocusInsightsView sessions={focusSessions} tasks={tasks} />
      )}

      {currentTab === "projects" && (
        <ProjectsView
          projects={projects}
          initialProjectId={searchTarget}
          onAddTask={(id) => {
            setTaskProjectId(id);
            setIsAITaskModalOpen(true);
          }}
          tasks={tasks}
          onSelectTask={setSelectedTask}
        />
      )}

      {currentTab === "routines" && (
        <RoutinesView routines={routines} instances={routineInstances} />
      )}

      {currentTab === "brain-dump" && <BrainDumpView items={brainDumps} />}

      {currentTab === "knowledge" && (
        <KnowledgeView
          notes={notes}
          resources={resources}
          initialItemId={searchTarget}
        />
      )}

      {currentTab === "ai-assistant" && (
        <AIAssistantView onStartFocus={handleStartFocusById} />
      )}

      {currentTab === "settings" && <SettingsView />}

      {/* Task Detail Inspector Panel */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onStartFocus={(t) => {
            setSelectedTask(null);
            setFocusTask(t);
          }}
          projects={projects}
        />
      )}

      {/* AI Task Creation Modal */}
      <AITaskModal
        isOpen={isAITaskModalOpen}
        onClose={() => setIsAITaskModalOpen(false)}
        onConfirmTask={handleCreateAITask}
        projects={projects}
      />

      {/* Full-Screen Distraction-Free Focus Mode */}
      {focusTask && (
        <FocusMode
          key={focusTask.id}
          task={focusTask}
          onClose={() => setFocusTask(null)}
          todayTasks={tasks.filter((task) => isTodayTask(task))}
          nextTask={tasks.find(
            (task) =>
              task.id !== focusTask.id && isPending(task) && isTodayTask(task),
          )}
          onStartNext={setFocusTask}
        />
      )}

      {/* Daily Briefing Modal */}
      <DailyBriefingModal
        isOpen={isBriefingOpen}
        onClose={() => setIsBriefingOpen(false)}
        tasks={tasks}
        routines={routines}
      />

      {/* Day Review Modal */}
      <DayReviewModal
        isOpen={isDayReviewOpen}
        onClose={() => setIsDayReviewOpen(false)}
        tasks={tasks}
        focusSessions={focusSessions}
        dailyPlans={dailyPlans}
      />

      {/* Global Search Command Palette (Cmd + K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectTask={setSelectedTask}
        onCreateTask={() => setIsAITaskModalOpen(true)}
        onPlanDay={() => {
          setCurrentTab("today");
          setPlanDayRequest((value) => value + 1);
        }}
        onStartFocus={setFocusTask}
        onNavigateTab={(tab, id) => {
          setSearchTarget(id);
          setCurrentTab(tab);
        }}
      />
    </AppLayout>
  );
};
