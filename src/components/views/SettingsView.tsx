import { localDate } from "../../lib/dates";
import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  User,
  Bell,
  Moon,
  Sun,
  Monitor,
  Sparkles,
  Database,
  Download,
  LogOut,
  Check,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { syncEngine } from "../../lib/sync";
import { isRealSupabaseConfigured } from "../../lib/supabase";
import {
  requestNotificationPermission,
  sendNotification,
} from "../../lib/notifications";

export const SettingsView: React.FC = () => {
  const { user, profile, signOut, updateTheme } = useAuth();

  const [activeTheme, setActiveTheme] = useState<"dark" | "light" | "system">(
    profile?.theme || "dark",
  );
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const handleTestNotification = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      await sendNotification(
        "Planny OS Test",
        "This device can show Planny notifications.",
      );
      setSaveSuccess("Test notification dispatched!");
      setTimeout(() => setSaveSuccess(null), 3000);
    } else {
      alert("Notification permission was not granted by the operating system.");
    }
  };

  const handleExportData = () => {
    const exportBundle = {
      exported_at: new Date().toISOString(),
      tasks: syncEngine.getTasks(),
      projects: syncEngine.getProjects(),
      routines: syncEngine.getRoutines(),
      routine_instances: syncEngine.getRoutineInstances(),
      notes: syncEngine.getNotes(),
      resources: syncEngine.getResources(),
      brain_dumps: syncEngine.getBrainDumps(),
      focus_sessions: syncEngine.getFocusSessions(),
    };

    const blob = new Blob([JSON.stringify(exportBundle, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planny-backup-${localDate()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="content-page max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10 animate-fade-in space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-surface-border">
        <h1 className="text-2xl font-medium tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Make Planny yours. Your account, sync, and AI are managed for you.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="p-3 text-sm text-red-400 bg-red-500/10 rounded-xl"
        >
          {error}
        </p>
      )}
      {saveSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-center space-x-2 animate-fade-in">
          <Check className="w-4 h-4 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Account & Profile */}
      <div className="bg-surface-100 border border-surface-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          <User className="w-4 h-4 text-indigo-400" />
          <span>Account & Profile</span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between py-2 border-b border-surface-border">
            <span className="text-muted-foreground">Full Name</span>
            <span className="font-medium text-foreground">
              {profile?.full_name || "My workspace"}
            </span>
          </div>

          <div className="flex justify-between py-2 border-b border-surface-border">
            <span className="text-muted-foreground">Email Address</span>
            <span className="font-mono text-foreground">
              {user?.email || "Local workspace"}
            </span>
          </div>

          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Active Daily Hours</span>
            <span className="font-mono text-foreground">
              {profile?.start_of_day} – {profile?.end_of_day}
            </span>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-surface-100 border border-surface-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          <Moon className="w-4 h-4 text-indigo-400" />
          <span>Appearance</span>
        </div>

        <div className="flex items-center gap-6">
          {[
            { id: "dark", label: "Dark Mode", icon: Moon },
            { id: "light", label: "Light Mode", icon: Sun },
            { id: "system", label: "System", icon: Monitor },
          ].map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => {
                setActiveTheme(theme.id as any);
                updateTheme(theme.id as any);
              }}
              className={`py-2 border-b-2 flex items-center justify-center space-x-2 transition-colors ${
                activeTheme === theme.id
                  ? "border-indigo-500 text-indigo-300"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <theme.icon className="w-4 h-4" />
              <span className="text-xs font-medium">{theme.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-surface-100 border border-surface-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Bell className="w-4 h-4 text-indigo-400" />
            <span>Reminders & Notifications</span>
          </div>

          <button
            type="button"
            onClick={handleTestNotification}
            className="px-3 py-1 bg-surface-200 hover:bg-surface-hover border border-surface-border rounded-lg text-xs font-medium text-foreground transition-colors"
          >
            Send Test Alert
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Task and routine reminders are restored whenever you open Planny. Keep
          Planny open for desktop/web reminders. Mobile schedules the next seven
          days with the operating system; delivery depends on notification
          permissions.
        </p>
      </div>

      {/* Managed AI */}
      <div className="bg-surface-100 border border-surface-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Planny AI</span>
        </div>

        <p className="text-xs text-muted-foreground">
          Natural-language planning is included with your account. Planny sends
          only the prompt and relevant task details when you choose an AI action;
          provider credentials stay on the server and never reach this device.
        </p>
        <div className="mt-4 flex items-center gap-2 text-[11px] text-emerald-400">
          <Check className="h-3.5 w-3.5" />
          <span>{isRealSupabaseConfigured() ? "Available after sign-in" : "Offline planner active in this build"}</span>
        </div>
      </div>

      {/* Managed cloud sync */}
      <div className="bg-surface-100 border border-surface-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Database className="w-4 h-4 text-indigo-400" />
            <span>Cloud sync</span>
          </div>

          <span
            className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${
              isRealSupabaseConfigured()
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-300 border-amber-500/20"
            }`}
          >
            {isRealSupabaseConfigured() ? "Connected" : "Development mode"}
          </span>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          Sign in once and Planny syncs your workspace across devices. Every row
          is tied to your account and protected by database row-level security.
          There are no project keys to enter or manage here.
        </p>
      </div>

      {/* Data Export & Account Actions */}
      <div className="bg-surface-100 border border-surface-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Shield className="w-4 h-4 text-indigo-400" />
          <span>Backup & account</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 gap-3">
          <div>
            <div className="text-xs font-medium text-foreground">
              Export All Data (JSON)
            </div>
            <div className="text-[11px] text-muted-foreground">
              Download backup of all tasks, routines, and notes
            </div>
          </div>
          <button
            type="button"
            onClick={handleExportData}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-surface-200 hover:bg-surface-hover border border-surface-border rounded-lg text-xs font-medium text-foreground transition-colors self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Backup</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 border-t border-surface-border gap-3">
          <div>
            <div className="text-xs font-medium text-foreground">
              Sign Out of Planny
            </div>
            <div className="text-[11px] text-muted-foreground">
              Local credentials will be cleared on this device
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              void signOut().catch((e) =>
                setError(
                  e instanceof Error ? e.message : "Could not sign out.",
                ),
              )
            }
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-medium transition-colors self-start sm:self-auto"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
