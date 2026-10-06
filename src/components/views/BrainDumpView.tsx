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
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { syncEngine } from "../../lib/sync";
import { classifyBrainDump } from "../../lib/ai";

interface BrainDumpViewProps {
  items: BrainDump[];
}

export const BrainDumpView: React.FC<BrainDumpViewProps> = ({ items }) => {
  const [newText, setNewText] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedItems((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    newText
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 30)
      .forEach((line) => syncEngine.addBrainDump(line));
    setNewText("");
  };

  const handleOrganize = (item: BrainDump) => {
    const result = classifyBrainDump(item);
    setSuggestions([{ item, ...result }]);
  };

  const convertSuggestion = (suggestion: any) => {
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
  };

  const handleConfirmConvert = () => {
    suggestions.forEach(convertSuggestion);
    setSuggestions([]);
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
            Get everything out of your head. Review before Planny creates
            anything.
          </p>
        </div>

        <span className="text-xs font-mono bg-surface-100 border border-surface-border px-2.5 py-1 rounded-lg text-muted-foreground">
          {inboxItems.length} unorganized
        </span>
      </div>

      {/* Quick capture form */}
      <form onSubmit={handleAdd} className="brain-capture mb-6">
        <div className="relative">
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            rows={6}
            placeholder={
              "What’s on your mind?\n\nStudy physics\nFinish website\nCall uncle\nBuy headphones"
            }
            className="w-full bg-surface-100 border border-surface-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500 shadow-sm resize-none"
          />
          <button
            type="submit"
            className="absolute right-3 bottom-3 flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs"
          >
            <Plus className="w-4 h-4" />
            Capture
          </button>
        </div>
        <div className="brain-capture-help">
          <span>One thought per line works best.</span>
          {inboxItems.length > 1 && (
            <button
              type="button"
              onClick={() =>
                setSuggestions(
                  inboxItems.map((item) => ({
                    item,
                    ...classifyBrainDump(item),
                  })),
                )
              }
            >
              <Sparkles size={13} /> Organize all {inboxItems.length}
            </button>
          )}
        </div>
      </form>

      {/* Suggestion confirmation card */}
      {suggestions.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/40 animate-fade-in">
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            <span>
              {suggestions.length}{" "}
              {suggestions.length === 1 ? "thing" : "things"} ready to review
            </span>
          </div>
          <div className="brain-review-list">
            {suggestions.map((suggestion) => (
              <div key={suggestion.item.id}>
                <Check size={14} />
                <span>
                  <strong>{suggestion.title}</strong>
                  <small>
                    {suggestion.suggestedType} ·{" "}
                    {suggestion.actionPayload.estimated_duration_minutes || 30}{" "}
                    min · {suggestion.actionPayload.priority || "normal"}
                  </small>
                </span>
                <button
                  aria-label={`Remove ${suggestion.title}`}
                  onClick={() =>
                    setSuggestions((items) =>
                      items.filter(
                        (item) => item.item.id !== suggestion.item.id,
                      ),
                    )
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center space-x-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setSuggestions([]);
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
              <span>Add all</span>
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
              className="brain-dump-item p-3.5 rounded-xl bg-surface-100 hover:bg-surface-200/70 border border-surface-border transition-colors group"
            >
              <div className="brain-dump-copy">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <div>
                  <p className={expandedItems.has(item.id) || item.raw_text.length <= 120 ? "expanded" : ""}>
                    {item.raw_text}
                  </p>
                  {item.raw_text.length > 120 && (
                    <button
                      type="button"
                      className="brain-dump-expand"
                      onClick={() => toggleExpanded(item.id)}
                      aria-expanded={expandedItems.has(item.id)}
                    >
                      {expandedItems.has(item.id) ? (
                        <><span>Show less</span><ChevronUp size={13} /></>
                      ) : (
                        <><span>Read full note</span><ChevronDown size={13} /></>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="brain-dump-actions flex items-center space-x-2 shrink-0">
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
