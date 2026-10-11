import {
  localDate,
  dateAtTime,
  isPending,
  routineOccursOn,
} from "../../lib/dates";
import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
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
  CheckCircle2,
  ListTodo,
  Repeat2,
  Timer,
  ImagePlus,
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
import { prepareAIImage, validateAIImage } from "../../lib/aiImage";

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
  const imageInputRef = useRef<HTMLInputElement>(null);
  const memoryRef = useRef<AssistantMemory | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [thinkingStep, setThinkingStep] = useState(0);
  const firstName =
    profile?.full_name?.trim().split(/\s+/)[0] ||
    user?.email?.split("@")[0] ||
    "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const openTasks = syncEngine.getTasks().filter(isPending).length;
  const todayRoutines = syncEngine
    .getRoutines()
    .filter((routine) => routineOccursOn(routine));
  const completedRoutineIds = new Set(
    syncEngine
      .getTodayRoutineInstances()
      .filter((instance) => instance.status === "completed")
      .map((instance) => instance.routine_id),
  );
  const routinesLeft = todayRoutines.filter(
    (routine) => !completedRoutineIds.has(routine.id),
  ).length;
  const focusMinutesToday = Math.round(
    syncEngine
      .getFocusSessions()
      .filter(
        (session) =>
          localDate(new Date(session.completed_at)) === localDate(),
      )
      .reduce((total, session) => total + session.duration_seconds, 0) / 60,
  );
  const planningStyle =
    typeof profile?.onboarding_data?.planningStyle === "string"
      ? profile.onboarding_data.planningStyle
      : null;
  const thinkingLabels = isAnalyzingImage
    ? ["Reading the image", "Finding tasks and useful details", "Preparing a reviewable plan"]
    : ["Reading the conversation", "Checking your tasks and schedule", "Preparing a useful answer"];
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

  useEffect(() => {
    if (!selectedImage) {
      setImagePreviewUrl(null);
      return;
    }
    const previewUrl = URL.createObjectURL(selectedImage);
    setImagePreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [selectedImage]);

  const handleSend = async (textToSend?: string) => {
    const attachedImage = selectedImage;
    const text = (textToSend || inputText).trim();
    if ((!text && !attachedImage) || isProcessing) return;

    const prompt = text || "Find every actionable task in this image and organize them for me. Only use details that are clearly visible.";

    setError(null);
    setInputText("");
    setIsProcessing(true);
    setIsAnalyzingImage(Boolean(attachedImage));

    let image;
    try {
      image = attachedImage ? await prepareAIImage(attachedImage) : undefined;
    } catch (imageError) {
      setError(imageError instanceof Error ? imageError.message : "Could not read this image.");
      setIsProcessing(false);
      setIsAnalyzingImage(false);
      return;
    }

    const userMsg: AIMessage = {
      id: crypto.randomUUID(),
      conversation_id: memoryRef.current?.conversationId || crypto.randomUUID(),
      user_id: syncEngine.getUserId(),
      role: "user",
      content: `${attachedImage ? `📷 ${attachedImage.name}\n` : ""}${prompt}`,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setSelectedImage(null);
    if (imageInputRef.current) imageInputRef.current.value = "";

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
      const response = await processAssistantMessage(prompt, {
        name: profile?.full_name,
        ...contextForAI(withUser),
      }, image);
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
      setIsAnalyzingImage(false);
    }
  };

  const handleImageSelection = (file: File | null) => {
    setError(null);
    if (!file) return;
    const validation = validateAIImage(file);
    if (validation) {
      setError(validation);
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }
    setSelectedImage(file);
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
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
    } else if (action.type === "create_note") {
      syncEngine.saveNote({
        id: crypto.randomUUID(),
        user_id: syncEngine.getUserId(),
        project_id: null,
        title: action.payload.title,
        content: action.payload.content,
        note_type: action.payload.note_type || "note",
        is_pinned: false,
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
      <motion.section
        className="personal-assistant-hero shrink-0"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="assistant-identity">
          <motion.div
            className="assistant-orb"
            initial={{ scale: 0.75, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
          >
            <img src="/planny-icon.svg" alt="Planny" />
            <i aria-hidden="true" />
          </motion.div>
          <div>
            <span>PLANNY · YOUR PERSONAL ASSISTANT</span>
            <h1>
              {greeting}, {firstName}<em>.</em>
            </h1>
            <p>
              I know your workspace and can help you choose, plan, and finish
              what matters today.
            </p>
          </div>
        </div>
        <div className="assistant-context-strip">
          <div>
            <ListTodo size={14} />
            <span>Open tasks</span>
            <strong>{openTasks}</strong>
          </div>
          <div>
            <Repeat2 size={14} />
            <span>Routines left</span>
            <strong>{routinesLeft}</strong>
          </div>
          <div>
            <Timer size={14} />
            <span>Focused today</span>
            <strong>{focusMinutesToday}m</strong>
          </div>
        </div>
        <div className="assistant-personal-note">
          {isHostedAIAvailable() ? (
            <CheckCircle2 size={13} />
          ) : (
            <Sparkles size={13} />
          )}
          <span>
            {planningStyle
              ? `Planning around your preference: ${planningStyle}`
              : "Your tasks, routines, plans, and recent conversation are in context"}
          </span>
        </div>
      </motion.section>

      <section className="assistant-chat-surface">
        <div className="assistant-chat-heading">
          <div><Sparkles size={15} /><span>Conversation</span></div>
          <small>Workspace context is on</small>
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
      <div className="assistant-conversation flex-1 overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`assistant-message-row ${msg.role === "user" ? "is-user" : "is-assistant"} flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} animate-fade-in`}
          >
            <div
              className={`assistant-message-bubble ${msg.role === "user" ? "is-user" : "is-assistant"} max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
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
                    {act.type === "create_task" && Array.isArray(act.payload.tasks) && (
                      <div className="assistant-task-proposal-list">
                        {act.payload.tasks.map((task: any, index: number) => (
                          <div key={`${task.title}-${index}`}>
                            <span>{index + 1}</span>
                            <div>
                              <strong>{task.title}</strong>
                              <small>
                                {task.estimated_duration_minutes || 30} min · {task.priority || "medium"}
                                {task.deadline ? ` · due ${new Date(task.deadline).toLocaleDateString()}` : ""}
                              </small>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
                          <span>{act.type === "create_task" && act.payload.tasks?.length > 1 ? `Add ${act.payload.tasks.length} tasks` : "Confirm Action"}</span>
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
      <div className="assistant-quick-prompts flex items-center space-x-1.5 overflow-x-auto shrink-0">
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
      <div className="assistant-composer shrink-0">
        {selectedImage && imagePreviewUrl && (
          <div className="assistant-image-attachment">
            <img src={imagePreviewUrl} alt="Image ready for analysis" />
            <div>
              <strong>{selectedImage.name}</strong>
              <span>Ready to analyze · maximum 15 MB</span>
            </div>
            <button type="button" onClick={clearSelectedImage} aria-label="Remove image">
              <X size={15} />
            </button>
          </div>
        )}
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
            placeholder={selectedImage ? "Ask about this image, or send it to extract tasks…" : "Ask AI, or attach an image to find tasks…"}
            className="w-full bg-surface-100 border border-surface-border rounded-xl pl-12 pr-12 py-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500 transition-colors shadow-sm"
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            className="sr-only"
            onChange={(event) => handleImageSelection(event.target.files?.[0] || null)}
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={isProcessing}
            className="assistant-image-button absolute left-2 p-2 rounded-lg transition-colors"
            aria-label="Attach an image"
            title="Analyze an image"
          >
            <ImagePlus className="w-4 h-4" />
          </button>
          <button
            type="submit"
            disabled={(!inputText.trim() && !selectedImage) || isProcessing}
            className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
      </section>
    </div>
  );
};
