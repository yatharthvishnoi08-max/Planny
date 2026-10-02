import { dateAtTime, localDate } from "../../lib/dates";
import React, { useState } from "react";
import { BrainDump, Priority } from "../../types/database";
import {
  Lightbulb,
  Sparkles,
  Plus,
  ArrowRight,
  Check,
  Trash2,
  Tag,
  Calendar,
} from "lucide-react";
import { syncEngine } from "../../lib/sync";
import { classifyBrainDump } from "../../lib/ai";

interface BrainDumpViewProps {
  items: BrainDump[];
}

export const BrainDumpView: React.FC<BrainDumpViewProps> = ({ items }) => {
  const [newText, setNewText] = useState("");
  const [organizingItemId, setOrganizingItemId] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<any>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    syncEngine.addBrainDump(newText.trim());
    setNewText("");
  };

  const handleOrganize = (item: BrainDump) => {
    setOrganizingItemId(item.id);
    const result = classifyBrainDump(item);
    setSuggestion({ item, ...result });
  };

  const handleConfirmConvert = () => {
    if (!suggestion) return;
    const { item, suggestedType, actionPayload } = suggestion;

    const convertedId = crypto.randomUUID();
    if (suggestedType === "task" || suggestedType === "reminder") {
      syncEngine.saveTask({
        id: convertedId,
        user_id: item.user_id,
        project_id: null,
        title: actionPayload.title,
        description: item.raw_text,
        priority: (actionPayload.priority as Priority) || "medium",
        status: "todo",
        start_date: localDate(),
        deadline:
          suggestedType === "reminder"
            ? dateAtTime(
                localDate(new Date(Date.now() + 86400000)),
                actionPayload.time || "19:00",
              )
            : null,
        estimated_duration_minutes:
          actionPayload.estimated_duration_minutes || 30,
        recurrence_rule: null,
        is_routine: false,
        is_brain_dump: true,
        position: 0,
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } else if (suggestedType === "note" || suggestedType === "idea") {
      syncEngine.saveNote({
        id: convertedId,
        user_id: item.user_id,
        project_id: null,
        title: actionPayload.title,
        content: actionPayload.content || item.raw_text,
        note_type: suggestedType === "idea" ? "idea" : "note",
        is_pinned: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } else if (suggestedType === "resource") {
      syncEngine.saveResource({
        id: convertedId,
        user_id: item.user_id,
        project_id: null,
        task_id: null,
        title: actionPayload.title,
        url: actionPayload.url,
        resource_type: actionPayload.resource_type || "link",
        duration_minutes: actionPayload.duration_minutes || null,
        notes: item.raw_text,
        is_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    syncEngine.updateBrainDump(item.id, {
      status: "converted",
      converted_type: suggestedType,
      converted_id: convertedId,
    });
    setOrganizingItemId(null);
    setSuggestion(null);
  };

  const inboxItems = items.filter((i) => i.status === "inbox");

  return (
    <div className="content-page max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-surface-border">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            Brain Dump
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Friction-free scratchpad. Capture thoughts now, categorize later
            with AI
          </p>
        </div>

        <span className="text-xs font-mono bg-surface-100 border border-surface-border px-2.5 py-1 rounded-lg text-muted-foreground">
          {inboxItems.length} unorganized
        </span>
      </div>

      {/* Quick capture form */}
      <form onSubmit={handleAdd} className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Type anything: 'Need to learn Docker', 'Hackathon idea', 'Buy keyboard'..."
            className="w-full bg-surface-100 border border-surface-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500 shadow-sm"
          />
          <button
            type="submit"
            className="absolute right-2.5 top-2.5 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Suggestion confirmation card */}
      {suggestion && (
        <div className="mb-6 p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/40 animate-fade-in">
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            <span>AI Organization Suggestion</span>
          </div>

          <div className="text-xs text-muted-foreground mb-1">
            Original thought: "{suggestion.item.raw_text}"
          </div>
          <div className="text-sm font-medium text-foreground mb-2">
            Convert to{" "}
            <span className="uppercase text-indigo-300 font-mono">
              [{suggestion.suggestedType}]
            </span>
            : {suggestion.title}
          </div>
          <p className="text-xs text-indigo-200/70 mb-4">{suggestion.reason}</p>

          <div className="flex items-center space-x-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setOrganizingItemId(null);
                setSuggestion(null);
              }}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={handleConfirmConvert}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center space-x-1.5 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirm & Create</span>
            </button>
          </div>
        </div>
      )}

      {/* Items list */}
      <div className="space-y-2">
        {inboxItems.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-surface-100/50 border border-surface-border p-6">
            <Lightbulb className="w-8 h-8 text-amber-400/80 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">
              Brain dump is clear.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Capture raw thoughts, research links, or reminders above anytime.
            </p>
          </div>
        ) : (
          inboxItems.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-xl bg-surface-100 hover:bg-surface-200/70 border border-surface-border flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0 pr-3">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span className="text-xs font-medium text-foreground truncate">
                  {item.raw_text}
                </span>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOrganize(item)}
                  className="flex items-center space-x-1.5 px-3 py-1 bg-surface-200 hover:bg-indigo-600 text-muted-foreground hover:text-white border border-surface-border rounded-lg text-xs font-medium transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-indigo-400 group-hover:text-white" />
                  <span>ORGANIZE WITH AI</span>
                </button>

                <button
                  type="button"
                  onClick={() => syncEngine.deleteBrainDump(item.id)}
                  className="p-1.5 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
