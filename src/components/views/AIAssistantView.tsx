import { localDate, dateAtTime, isPending } from "../../lib/dates";
import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  Check,
  X,
  ArrowRight,
  Play,
  Calendar,
  Flame,
  AlertCircle,
} from "lucide-react";
import { AIMessage, AIStructuredAction, Priority } from "../../types/database";
import { processAssistantMessage, isHostedAIAvailable } from "../../lib/ai";
import { syncEngine } from "../../lib/sync";
import { useAuth } from "../../context/AuthContext";
import {
  AssistantMemory,
  contextForAI,
  loadAssistantMemory,
  saveAssistantMemory,
} from "../../lib/assistantMemory";

const QUICK_SUGGESTIONS = [
  "What should I do now?",
  "I have two hours free.",
  "Plan tomorrow.",
  "Move unfinished tasks to Saturday.",
  "Break this project into tasks.",
  "Remind me every day at 7 PM to practice DSA.",
];

function MessageText({ content }: { content: string }) {
  const renderInline = (line: string) =>
    line.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={index}>{part.slice(2, -2)}</strong>
      ) : (
        <React.Fragment key={index}>{part}</React.Fragment>
      ),
    );

  return (
    <div className="assistant-message-text">
      {content.split("\n").map((line, index) => {
        const bullet = line.match(/^\s*[•*-]\s+(.*)$/);
        if (bullet)
          return (
            <div className="assistant-message-bullet" key={index}>
              <span aria-hidden="true">•</span>
              <span>{renderInline(bullet[1])}</span>
            </div>
          );
        return line ? (
          <p key={index}>{renderInline(line)}</p>
        ) : (
          <span className="assistant-message-gap" key={index} aria-hidden="true" />
        );
      })}
    </div>
  );
}

export const AIAssistantView: React.FC<{
  onStartFocus?: (taskId: string) => void;
}> = ({ onStartFocus }) => {
  const { user, profile } = useAuth();
  const messagesEnd = useRef<HTMLDivElement>(null);
  const memoryRef = useRef<AssistantMemory | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const thinkingLabels = ["Reading the conversation", "Checking your tasks and schedule", "Preparing a useful answer"];
  useEffect(() => {
    if (!isProcessing) { setThinkingStep(0); return; }
    const timer = window.setInterval(() => setThinkingStep((value) => Math.min(value + 1, thinkingLabels.length - 1)), 1400);
    return () => window.clearInterval(timer);
  }, [isProcessing]);
  useEffect(() => {
    let alive = true;
    const userId = user?.id || syncEngine.getUserId();
    void loadAssistantMemory(userId).then(async (memory) => {
      if (!alive) return;
      let next = memory;
      if (!memory.messages.length) {
        const greeting: AIMessage = {
          id: crypto.randomUUID(),
          conversation_id: memory.conversationId,
          user_id: userId,
          role: "assistant",
          content: `Hi${profile?.full_name ? ` ${profile.full_name.split(" ")[0]}` : ""}. I remember our conversations and your preferences now. Ask me to plan your day, find your next task, organize a project, or explain any part of Planny.`,
          created_at: new Date().toISOString(),
        };
        next = await saveAssistantMemory(userId, { ...memory, messages: [greeting] });
      }
      if (!alive) return;
      memoryRef.current = next;
      setMessages(next.messages);
    });
    return () => { alive = false; };
  }, [profile?.full_name, user?.id]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ block: "nearest" });
  }, [messages, isProcessing]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isProcessing) return;

    setError(null);
    setInputText("");
    const userMsg: AIMessage = {
      id: crypto.randomUUID(),
      conversation_id: memoryRef.current?.conversationId || crypto.randomUUID(),
      user_id: syncEngine.getUserId(),
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const userId = user?.id || syncEngine.getUserId();
      const base = memoryRef.current || {
        conversationId: userMsg.conversation_id,
        messages: [],
        summary: "",
        facts: [],
      };
      const withUser = await saveAssistantMemory(userId, {
        ...base,
        messages: [...base.messages, userMsg],
      });
      memoryRef.current = withUser;
      const response = await processAssistantMessage(text, {
        name: profile?.full_name,
        ...contextForAI(withUser),
      });
      const assistantMsg: AIMessage = {
        id: crypto.randomUUID(),
        conversation_id: withUser.conversationId,
        user_id: syncEngine.getUserId(),
        role: "assistant",
        content: response.reply,
        actions: response.action ? [response.action] : undefined,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      memoryRef.current = await saveAssistantMemory(userId, {
        ...withUser,
        messages: [...withUser.messages, assistantMsg],
      });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to reach AI. Try again.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteAction = (action: AIStructuredAction, msgId: string) => {
    if (action.status !== "proposed") return;
    if (action.type === "create_task") {
      const items = action.payload.tasks || [action.payload];
      for (const t of items) {
        syncEngine.saveTask({
          id: crypto.randomUUID(),
          user_id: syncEngine.getUserId(),
          project_id: null,
          title: t.title,
          description: t.description || null,
          priority: (t.priority as Priority) || "medium",
          status: "todo",
          start_date: localDate(),
          deadline: t.deadline || null,
          estimated_duration_minutes:
            t.estimated_duration_minutes || t.duration || 45,
          subtasks: (t.subtasks || []).map(
            (title: string, position: number) => ({
              id: crypto.randomUUID(),
              task_id: "",
              user_id: syncEngine.getUserId(),
              title,
              is_completed: false,
              position,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }),
          ),
          recurrence_rule: null,
          is_routine: false,
          is_brain_dump: false,
          position: 0,
          completed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } else if (action.type === "create_routine") {
      syncEngine.saveRoutine({
        id: crypto.randomUUID(),
        user_id: syncEngine.getUserId(),
        title: action.payload.title,
        description: "Created by AI Assistant",
        frequency: action.payload.frequency || "daily",
        days_of_week: [1, 2, 3, 4, 5, 6, 7],
        interval_days: 1,
        time_of_day: action.payload.time_of_day || "19:00",
        end_date: null,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } else if (action.type === "reschedule_tasks") {
      const tasks = syncEngine
        .getTasks()
        .filter((t) => isPending(t) && action.payload.taskIds?.includes(t.id));
      const targetDate = action.payload.targetDate;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
        setError("The proposed date is invalid.");
        return;
      }
      for (const t of tasks) {
        syncEngine.saveTask({
          ...t,
          start_date: targetDate,
          deadline: t.deadline
            ? dateAtTime(
                targetDate,
                new Date(t.deadline).toTimeString().slice(0, 5),
              )
            : null,
        });
      }
    } else if (action.type === "suggest_priority") {
      if (onStartFocus && action.payload.taskId) {
        onStartFocus(action.payload.taskId);
      }
    }

    // Update message action status
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.actions) {
          return {
            ...m,
            actions: m.actions.map((a) =>
              a.id === action.id ? { ...a, status: "executed" } : a,
            ),
          };
        }
        return m;
      }),
    );
  };

  const handleDismissAction = (actionId: string, msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.actions) {
          return {
            ...m,
            actions: m.actions.map((a) =>
              a.id === actionId ? { ...a, status: "rejected" } : a,
            ),
          };
        }
        return m;
      }),
    );
  };

  return (
    <div className="assistant-page content-page max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center space-x-3 pb-4 mb-4 border-b border-surface-border shrink-0">
        <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-medium text-foreground">Assistant</h1>
          <p className="text-xs text-muted-foreground">
            {isHostedAIAvailable()
              ? "Planny AI ready · every change needs your confirmation"
              : "Offline planner active in this development build"}
          </p>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-3 p-3 rounded-xl bg-red-500/10 text-red-400 text-sm"
        >
          {error}
        </p>
      )}
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} animate-fade-in`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-surface-100 border border-surface-border text-foreground shadow-sm"
              }`}
            >
              <MessageText content={msg.content} />

              {/* Proposed change Preview Box */}
              {msg.actions &&
                msg.actions.map((act) => (
                  <div
                    key={act.id}
                    className="mt-3.5 p-3 rounded-xl bg-surface-200/80 border border-surface-border text-xs"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-indigo-300 uppercase tracking-wider text-[11px]">
                        Proposed change
                      </span>
                      <span
                        className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                          act.status === "executed"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-surface-100 text-muted-foreground"
                        }`}
                      >
                        {act.status}
                      </span>
                    </div>

                    <p className="font-medium text-foreground mb-3">
                      {act.title}
                    </p>
                    {act.type === "reschedule_tasks" && (
                      <p className="mb-3 text-muted-foreground">
                        {act.payload.taskIds?.length || 0} tasks →{" "}
                        {act.payload.targetDate}. Deadline times are preserved.
                      </p>
                    )}

                    {act.status === "proposed" && (
                      <div className="flex items-center space-x-2 justify-end pt-2 border-t border-surface-border">
                        <button
                          type="button"
                          onClick={() => handleDismissAction(act.id, msg.id)}
                          className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          Dismiss
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExecuteAction(act, msg.id)}
                          className="flex items-center space-x-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Confirm Action</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>

            <span className="text-[10px] text-muted-foreground mt-1 px-1 font-mono">
              {new Date(msg.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))}

        <div ref={messagesEnd} />
        {isProcessing && (
          <div className="ai-thinking-card">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
            <div><strong>Planny is thinking</strong><span>{thinkingLabels[thinkingStep]}</span></div>
            <i /><i /><i />
          </div>
        )}
      </div>

      {/* Quick Suggestions Carousel */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 shrink-0">
        {QUICK_SUGGESTIONS.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(s)}
            className="px-2.5 py-1 bg-surface-100 hover:bg-surface-200 border border-surface-border text-muted-foreground hover:text-foreground rounded-lg text-xs whitespace-nowrap transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input box */}
      <div className="pt-2 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask AI: 'What should I do now?', 'Plan tomorrow', 'Break this project into tasks'..."
            className="w-full bg-surface-100 border border-surface-border rounded-xl pl-4 pr-12 py-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500 transition-colors shadow-sm"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isProcessing}
            className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
