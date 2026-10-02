import React, { useState, useEffect } from "react";
import {
  CheckSquare,
  CalendarDays,
  Calendar,
  Folder,
  Repeat2,
  Inbox,
  BookOpen,
  Sparkles,
  Settings,
  Plus,
  Search,
  X,
  RefreshCw,
  MoreHorizontal,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { createPortal } from "react-dom";
import { SyncState, syncEngine } from "../../lib/sync";
import { useAuth } from "../../context/AuthContext";
export type NavigationTab =
  | "today"
  | "upcoming"
  | "calendar"
  | "projects"
  | "routines"
  | "brain-dump"
  | "knowledge"
  | "ai-assistant"
  | "settings";
interface AppLayoutProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  syncState: SyncState;
  onOpenSearch: () => void;
  onOpenQuickAdd: () => void;
  onOpenAITask: () => void;
  children: React.ReactNode;
}
const navigation = [
  { id: "today", label: "Today", icon: CheckSquare },
  { id: "upcoming", label: "Upcoming", icon: CalendarDays },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "projects", label: "Projects", icon: Folder },
  { id: "routines", label: "Routines", icon: Repeat2 },
  { id: "brain-dump", label: "Brain dump", icon: Inbox },
  { id: "knowledge", label: "Notes & links", icon: BookOpen },
  { id: "ai-assistant", label: "Assistant", icon: Sparkles },
] as const;
export function AppLayout({
  currentTab,
  onSelectTab,
  syncState,
  onOpenSearch,
  onOpenQuickAdd,
  onOpenAITask,
  children,
}: AppLayoutProps) {
  const { profile } = useAuth();
  const [guide, setGuide] = useState(false);
  const [more, setMore] = useState(false);
  const [style, setStyle] = useState(
    () => localStorage.getItem("orbit_interface_style") || "clear",
  );
  useEffect(() => {
    document.documentElement.dataset.style = style;
    localStorage.setItem("orbit_interface_style", style);
  }, [style]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setGuide(false);
        setMore(false);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  useEffect(() => {
    if (!guide) return;
    const previous = document.activeElement as HTMLElement | null;
    document.querySelector<HTMLButtonElement>(".guide-dialog button")?.focus();
    return () => previous?.focus();
  }, [guide]);
  const navigate = (tab: NavigationTab) => {
    onSelectTab(tab);
    setMore(false);
  };
  const syncLabel = syncState.isSyncing
    ? "Syncing"
    : syncState.error
      ? "Sync needs attention"
      : syncState.mode === "local"
        ? "Local workspace"
        : syncState.mode === "signed-out"
          ? "Signed out"
          : syncState.pendingChangesCount
            ? `${syncState.pendingChangesCount} changes pending`
            : syncState.isOnline
              ? "All changes saved"
              : "Working offline";
  const renderNav = (item: (typeof navigation)[number]) => (
    <button
      key={item.id}
      data-nav={item.id}
      aria-current={currentTab === item.id ? "page" : undefined}
      onClick={() => navigate(item.id)}
      className={`shell-nav ${currentTab === item.id ? "selected" : ""}`}
    >
      <span className="nav-icon">
        <item.icon size={18} strokeWidth={1.8} />
      </span>
      <span>{item.label}</span>
      <span className="nav-arrow" aria-hidden="true">
        ↗
      </span>
    </button>
  );
  return (
    <div className="app-shell">
      <aside className="shell-sidebar">
        <button
          className="shell-brand"
          onClick={() => navigate("today")}
          aria-label="Planny home"
        >
          <img src="/planny-icon.svg" alt="" />
          <span>
            Planny
            <span className="brand-spark" aria-hidden="true">
              ✳
            </span>
          </span>
        </button>
        <button className="shell-capture" onClick={onOpenQuickAdd}>
          <Plus size={16} />
          <span>New task</span>
        </button>
        <span className="nav-section-title">MAKE IT HAPPEN</span>
        <nav aria-label="Workspace" className="shell-nav-group">
          {navigation.slice(0, 4).map(renderNav)}
        </nav>
        <div className="shell-divider" />
        <span className="nav-section-title">KEEP IT TOGETHER</span>
        <nav aria-label="Personal" className="shell-nav-group">
          {navigation.slice(4, 7).map(renderNav)}
        </nav>
        <div className="shell-divider" />
        <nav aria-label="Tools" className="shell-nav-group">
          {navigation.slice(7).map(renderNav)}
        </nav>
        <div className="shell-bottom">
          <button
            onClick={() => navigate("settings")}
            className={`shell-nav ${currentTab === "settings" ? "selected" : ""}`}
          >
            <Settings size={17} strokeWidth={1.65} />
            <span>Settings</span>
          </button>
          <div className="shell-sync">
            {syncState.isSyncing ? (
              <RefreshCw size={11} className="animate-spin" />
            ) : (
              <span
                className={`status-dot ${syncState.error ? "error" : ""}`}
              />
            )}
            <span>{syncLabel}</span>
          </div>
        </div>
      </aside>
      <div className="shell-body">
        <header className="shell-header">
          <div className="shell-breadcrumb">
            <button
              className="mobile-brand-lockup"
              aria-label="Planny home"
              onClick={() => navigate("today")}
            >
              <img src="/planny-icon.svg" alt="" />
              <span>Planny</span>
            </button>
            <span className="desktop-label">Workspace</span>
            <ChevronRight size={13} className="desktop-label" />
            <span className="desktop-label">
              {currentTab === "settings"
                ? "Settings"
                : navigation.find((n) => n.id === currentTab)?.label}
            </span>
          </div>
          <div className="shell-header-actions">
            <button
              className="guide-button"
              onClick={() => setGuide(true)}
              aria-label="How Planny works"
            >
              <HelpCircle size={16} />
              <span>Start here</span>
            </button>
            <label className="style-selector">
              <span>Accent</span>
              <select
                aria-label="Interface style"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              >
                <option value="clear">Electric</option>
                <option value="sky">Ice</option>
                <option value="sand">Candy</option>
              </select>
            </label>
            <button
              className="shell-search"
              onClick={onOpenSearch}
              aria-label="Search everything"
            >
              <Search size={16} />
              <span>Search</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="shell-avatar"
              aria-label="Account settings"
              onClick={() => navigate("settings")}
            >
              {profile?.full_name?.charAt(0).toUpperCase() || "P"}
            </button>
          </div>
        </header>
        {syncState.error && (
          <div role="alert" className="sync-notice">
            <span>
              {syncState.error} Pending edits are kept on this device.
            </span>
            <button onClick={() => void syncEngine.fetchRemoteData()}>
              Retry
            </button>
          </div>
        )}
        <main key={currentTab} className="shell-content">
          {children}
        </main>
      </div>
      {guide &&
        createPortal(
          <div
            className="modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) setGuide(false);
            }}
          >
            <section
              className="composer guide-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="guide-title"
            >
              <div className="composer-heading">
                <div>
                  <span className="page-eyebrow">A LITTLE LESS CHAOS</span>
                  <h2 id="guide-title">Your Planny playbook.</h2>
                </div>
                <button
                  className="icon-button"
                  aria-label="Close guide"
                  onClick={() => setGuide(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <p className="guide-intro">
                Start with one task. The rest is here when you need it.
              </p>
              <div className="guide-steps">
                {[
                  {
                    n: "01",
                    title: "Capture it",
                    text: "New task saves something you want to do. Brain dump holds loose thoughts until you’re ready to organise them.",
                    label: "Add a task",
                    action: () => onOpenQuickAdd(),
                  },
                  {
                    n: "02",
                    title: "Make a plan",
                    text: "Today shows current and overdue work. Upcoming and Calendar show deadlines. Projects group related tasks.",
                    label: "See upcoming tasks",
                    action: () => navigate("upcoming"),
                  },
                  {
                    n: "03",
                    title: "Lock in",
                    text: "Open any task to add steps, a deadline or a project. Hit its play button to start a focus timer.",
                    label: "Go to Today",
                    action: () => navigate("today"),
                  },
                  {
                    n: "04",
                    title: "Keep the momentum",
                    text: "Check off completed tasks, review your day, and use Routines for repeat habits. Notes & links keeps reference material nearby.",
                    label: "Explore routines",
                    action: () => navigate("routines"),
                  },
                ].map((step) => (
                  <div key={step.n} className="guide-step">
                    <span>{step.n}</span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.text}</p>
                      <button
                        onClick={() => {
                          setGuide(false);
                          step.action();
                        }}
                      >
                        {step.label}
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="composer-hint">
                You can use tasks, routines and notes locally in this development
                build. Deployed builds include account sync and Planny AI.
              </p>
            </section>
          </div>,
          document.body,
        )}
      <nav className="mobile-navigation" aria-label="Mobile navigation">
        <button
          onClick={() => navigate("today")}
          aria-current={currentTab === "today" ? "page" : undefined}
        >
          <CheckSquare size={20} />
          <span>Today</span>
        </button>
        <button
          onClick={() => navigate("calendar")}
          aria-current={currentTab === "calendar" ? "page" : undefined}
        >
          <Calendar size={20} />
          <span>Calendar</span>
        </button>
        <button
          onClick={onOpenAITask}
          aria-label="Create a task"
          className="mobile-add"
        >
          <Plus size={23} />
        </button>
        <button
          aria-current={currentTab === "ai-assistant" ? "page" : undefined}
          onClick={() => navigate("ai-assistant")}
        >
          <Sparkles size={20} />
          <span>Assistant</span>
        </button>
        <button onClick={() => setMore(true)}>
          <MoreHorizontal size={20} />
          <span>More</span>
        </button>
      </nav>
      {more && (
        <div className="mobile-sheet-backdrop" onClick={() => setMore(false)}>
          <div
            className="mobile-sheet"
            role="dialog"
            aria-label="Navigation"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <strong>Workspace</strong>
              <button
                aria-label="Close navigation"
                onClick={() => setMore(false)}
              >
                <X size={20} />
              </button>
            </div>
            <label className="mobile-accent-selector">
              Color mood
              <select
                aria-label="Mobile accent color"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              >
                <option value="clear">Green rainbow</option>
                <option value="sky">Ice</option>
                <option value="sand">Candy</option>
              </select>
            </label>
            {navigation.map(renderNav)}
            <button className="shell-nav" onClick={() => navigate("settings")}>
              <Settings size={17} />
              Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
