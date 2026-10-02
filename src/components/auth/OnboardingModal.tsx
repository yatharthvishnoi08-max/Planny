import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Plus,
  Repeat2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { syncEngine } from "../../lib/sync";
import { localDate } from "../../lib/dates";
import {
  loadAssistantMemory,
  saveAssistantMemory,
} from "../../lib/assistantMemory";
import { PlanEditor } from "./PlanEditor";
import {
  readPlanDraft,
  clearPlanDraft,
  validDraft,
  type DraftTask,
} from "../../lib/planDraft";
import {
  readOnboardingProgress,
  saveOnboardingProgress,
  clearOnboardingProgress,
  type RoutineDraft,
} from "../../lib/onboardingProgress";
import type { AIMessage } from "../../types/database";

const PERSONAS = [
  "Student",
  "Working professional",
  "Founder / freelancer",
  "Something else",
];
const SYSTEMS = [
  "Notes or paper",
  "Calendar",
  "Another task app",
  "Mostly in my head",
];
const BLOCKERS = [
  "I forget tasks",
  "I procrastinate",
  "I don’t know what to prioritize",
  "I make too many plans",
  "I underestimate time",
  "I get distracted",
  "I start but don’t finish",
  "I don’t have a consistent routine",
];
const STYLES = [
  "🧘 Keep it flexible",
  "📋 Clear task list",
  "⏰ Time-block everything",
  "🤖 Let AI organize it",
  "🔄 A mix of everything",
];
const BEHAVIORS = [
  "Just add it",
  "Ask for a deadline",
  "Break it into steps",
  "Estimate the time",
  "Find the best time",
  "Do all of the above",
];

export const OnboardingModal: React.FC<{
  isOpen: boolean;
  onComplete: () => void;
}> = ({ isOpen, onComplete }) => {
  const { user, profile, completeOnboarding } = useAuth();
  const [saved] = useState(() => readOnboardingProgress(user?.id || ""));
  const [welcomeId] = useState(() => saved.welcomeId || crypto.randomUUID());
  const screen = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [progressSaved, setProgressSaved] = useState(true);
  const [step, setStep] = useState(saved.step || 0),
    [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(saved.name ?? profile?.full_name ?? ""),
    [persona, setPersona] = useState(saved.persona || "Student");
  const [wastedHours, setWastedHours] = useState(
      saved.wastedHours || "1–2 hours",
    ),
    [taskSystem, setTaskSystem] = useState(
      saved.taskSystem || "Mostly in my head",
    );
  const [blockers, setBlockers] = useState<string[]>(saved.blockers || []),
    [planningStyle, setPlanningStyle] = useState(
      saved.planningStyle || "🔄 A mix of everything",
    );
  const [taskBehavior, setTaskBehavior] = useState(
    saved.taskBehavior || "Do all of the above",
  );
  const [routineDrafts, setRoutineDrafts] = useState<RoutineDraft[]>(
    () =>
      saved.routineDrafts || [
        { id: crypto.randomUUID(), title: "", time: "08:00" },
      ],
  );
  const [draft] = useState(readPlanDraft);
  const [planTasks, setPlanTasks] = useState<DraftTask[]>(
    () =>
      saved.planTasks ||
      draft?.tasks || [{ id: crypto.randomUUID(), title: "", minutes: 30 }],
  );
  const finishing = useRef(false);
  useEffect(() => {
    if (!user || !isOpen || saving) return;
    setProgressSaved(
      saveOnboardingProgress(user.id, {
        step,
        name,
        persona,
        wastedHours,
        taskSystem,
        blockers,
        planningStyle,
        taskBehavior,
        routineDrafts,
        planTasks,
        welcomeId,
      }),
    );
  }, [
    user?.id,
    isOpen,
    saving,
    step,
    name,
    persona,
    wastedHours,
    taskSystem,
    blockers,
    planningStyle,
    taskBehavior,
    routineDrafts,
    planTasks,
    welcomeId,
  ]);
  useEffect(() => {
    screen.current?.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, [step]);
  if (!isOpen || !user) return null;

  const choice = (
    value: string,
    selected: string,
    setter: (value: string) => void,
  ) => (
    <button
      type="button"
      aria-pressed={selected === value}
      key={value}
      onClick={() => setter(value)}
      className={`onboarding-choice ${selected === value ? "selected" : ""}`}
    >
      <span>{value}</span>
      {selected === value && <Check size={16} />}
    </button>
  );
  const finish = async () => {
    if (finishing.current) return;
    finishing.current = true;
    setSaving(true);
    setError(null);
    try {
      const areas =
        persona === "Student"
          ? ["Study", "Personal", "Projects"]
          : ["Work", "Personal", "Projects"];
      // Stable draft IDs make retries update the same tasks instead of duplicating them.
      for (const task of planTasks.filter((t) => t.title.trim())) {
        if (!validDraft([task]))
          throw new Error(
            "Give each task a title and an estimate between 5 and 480 minutes.",
          );
        const existing = syncEngine.getTasks().find((t) => t.id === task.id);
        syncEngine.saveTask({
          id: task.id,
          user_id: user.id,
          project_id: null,
          title: task.title.trim(),
          description: "From your Planny starting plan",
          priority: "medium",
          status: "todo",
          start_date: localDate(),
          deadline: null,
          estimated_duration_minutes: task.minutes,
          recurrence_rule: null,
          is_routine: false,
          is_brain_dump: false,
          position: planTasks.indexOf(task),
          completed_at: null,
          created_at: existing?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      for (const routine of routineDrafts.filter((item) => item.title.trim())) {
        const existing = syncEngine
          .getRoutines()
          .find((item) => item.id === routine.id);
        syncEngine.saveRoutine({
          id: routine.id,
          user_id: user.id,
          title: routine.title.trim(),
          description: "Added during Planny setup",
          frequency: "daily",
          days_of_week: [1, 2, 3, 4, 5, 6, 7],
          interval_days: 1,
          time_of_day: routine.time,
          end_date: null,
          active: true,
          created_at: existing?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      const memory = await loadAssistantMemory(user.id);
      const welcome: AIMessage = {
        id: welcomeId,
        conversation_id: memory.conversationId,
        user_id: user.id,
        role: "assistant",
        content: `You’re set, ${name.split(" ")[0] || "friend"}. Here’s your quick tour:\n\n• **Today** is your daily command center.\n• **Upcoming** and **Calendar** show what’s ahead.\n• **Projects** group bigger goals.\n• **Routines** keep repeat work consistent.\n• **Brain dump** catches messy thoughts fast.\n• **Notes & links** keeps useful knowledge nearby.\n• **Focus** helps you finish one thing at a time.\n\nI’ll remember your preferences and our conversations. Tell me what you want to accomplish next—or ask me what to do now.`,
        created_at: new Date().toISOString(),
      };
      await saveAssistantMemory(user.id, {
        ...memory,
        facts: [
          ...memory.facts,
          `${name} is a ${persona}`,
          `Main challenge: ${draft?.problem || blockers.join(", ") || "not specified"}`,
          `Productivity blockers: ${blockers.join(", ") || "not specified"}`,
          `Planning preference: ${planningStyle}`,
          `Default task behavior: ${taskBehavior}`,
          `Daily routines: ${routineDrafts
            .filter((item) => item.title.trim())
            .map((item) => `${item.title.trim()} at ${item.time}`)
            .join(", ") || "none yet"}`,
        ].slice(-12),
        messages: [
          ...memory.messages.filter((m) => m.id !== welcomeId),
          welcome,
        ],
      });
      // Mark setup complete only after the tasks and walkthrough are prepared.
      await completeOnboarding({
        fullName: name.trim(),
        areas,
        persona,
        wastedHours,
        taskSystem,
        blockers,
        planningStyle,
        taskBehavior,
        routines: routineDrafts
          .filter((item) => item.title.trim())
          .map(({ title, time }) => ({ title: title.trim(), time })),
      });
      clearPlanDraft();
      clearOnboardingProgress(user.id);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish setup.");
    } finally {
      finishing.current = false;
      setSaving(false);
    }
  };
  const titles = [
    "Let’s make Planny yours",
    "What gets in your way?",
    "How should your day feel?",
    "What repeats every day?",
    "Let’s make your first win",
  ];
  return (
    <div className="onboarding-screen" ref={screen}>
      <header>
        <div className="landing-logo">
          <img src="/planny-icon.svg" alt="" />
          <span>Planny</span>
        </div>
        <span>
          {
            [
              "About you",
              "Your challenges",
              "Your preferences",
              "Your routines",
              "Your first plan",
            ][step]
          }{" "}
          · {step + 1} / 5
        </span>
      </header>
      <div className="onboarding-progress">
        <i style={{ width: `${(step + 1) * 20}%` }} />
      </div>
      <section className="onboarding-panel">
        <span className="onboarding-kicker">
          <Sparkles size={14} /> A little about you
        </span>
        <h1 ref={heading} tabIndex={-1}>
          {titles[step]}
        </h1>
        <p className="onboarding-save-note">
          {progressSaved
            ? "Your progress is saved on this device. Pick up where you left off."
            : "This browser can’t save progress. Keep this tab open until you finish."}
        </p>
        <fieldset disabled={saving} className="onboarding-fields">
          {step === 0 && (
            <div className="onboarding-stack">
              <label>
                What should we call you?
                <input
                  autoComplete="given-name"
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </label>
              <p>Which sounds most like you?</p>
              <div className="onboarding-grid">
                {PERSONAS.map((v) => choice(v, persona, setPersona))}
              </div>
              <label>
                Roughly how much time slips away each day?
                <select
                  value={wastedHours}
                  onChange={(e) => setWastedHours(e.target.value)}
                >
                  <option>Less than 1 hour</option>
                  <option>1–2 hours</option>
                  <option>2–4 hours</option>
                  <option>More than 4 hours</option>
                </select>
              </label>
            </div>
          )}
          {step === 1 && (
            <div className="onboarding-stack">
              <p>How do you currently manage tasks?</p>
              <div className="onboarding-grid">
                {SYSTEMS.map((v) => choice(v, taskSystem, setTaskSystem))}
              </div>
              <p>
                What usually stops you? <small>Choose up to three</small>
              </p>
              <div className="onboarding-grid blockers">
                {BLOCKERS.map((v) => (
                  <button
                    type="button"
                    key={v}
                    aria-pressed={blockers.includes(v)}
                    disabled={!blockers.includes(v) && blockers.length >= 3}
                    className={`onboarding-choice ${blockers.includes(v) ? "selected" : ""}`}
                    onClick={() =>
                      setBlockers(
                        blockers.includes(v)
                          ? blockers.filter((b) => b !== v)
                          : blockers.length < 3
                            ? [...blockers, v]
                            : blockers,
                      )
                    }
                  >
                    {v}
                    {blockers.includes(v) && <Check size={15} />}
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="onboarding-stack">
              <p>How do you like to plan your day?</p>
              {STYLES.map((v) => choice(v, planningStyle, setPlanningStyle))}
              <p>When you give Planny a task, what should it do?</p>
              <div className="onboarding-grid">
                {BEHAVIORS.map((v) => choice(v, taskBehavior, setTaskBehavior))}
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="onboarding-stack routine-setup">
              <div className="routine-explainer">
                <span>
                  <Repeat2 size={15} /> WHAT IS A ROUTINE?
                </span>
                <strong>A task you repeat regularly.</strong>
                <p>
                  A routine is something like working out, studying, planning
                  tomorrow, taking medicine, or reading every night. Planny
                  brings it back automatically, so you don’t recreate it each
                  day.
                </p>
              </div>
              <div className="routine-question">
                <strong>What are some tasks you do every day?</strong>
                <span>Add as many as you need, or skip this for now.</span>
              </div>
              <div className="routine-draft-list">
                {routineDrafts.map((routine, index) => (
                  <div className="routine-draft-row" key={routine.id}>
                    <label>
                      Everyday task
                      <input
                        value={routine.title}
                        maxLength={100}
                        placeholder={
                          index === 0 ? "e.g. Study for 30 minutes" : "Another routine"
                        }
                        onChange={(event) =>
                          setRoutineDrafts((items) =>
                            items.map((item) =>
                              item.id === routine.id
                                ? { ...item, title: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      <span className="routine-time-label">
                        <Clock3 size={12} /> Around
                      </span>
                      <input
                        type="time"
                        value={routine.time}
                        onChange={(event) =>
                          setRoutineDrafts((items) =>
                            items.map((item) =>
                              item.id === routine.id
                                ? { ...item, time: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                    <button
                      type="button"
                      aria-label={`Remove ${routine.title || "routine"}`}
                      onClick={() =>
                        setRoutineDrafts((items) =>
                          items.length === 1
                            ? [{ ...items[0], title: "" }]
                            : items.filter((item) => item.id !== routine.id),
                        )
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
              {routineDrafts.length < 8 && (
                <button
                  type="button"
                  className="routine-add-button"
                  onClick={() =>
                    setRoutineDrafts((items) => [
                      ...items,
                      { id: crypto.randomUUID(), title: "", time: "08:00" },
                    ])
                  }
                >
                  <Plus size={15} /> Add another everyday task
                </button>
              )}
            </div>
          )}
          {step === 4 && (
            <div className="onboarding-stack first-task">
              <div className="first-task-demo">
                <span>YOUR STARTING PLAN</span>
                <strong>
                  {draft
                    ? "Your plan came with you."
                    : "Start with one small win."}
                </strong>
                <p>
                  Review the titles and estimates. These become individual tasks
                  in Today when you enter your workspace.
                </p>
              </div>
              <PlanEditor tasks={planTasks} onChange={setPlanTasks} />
              {planTasks.length > 0 && (
                <button
                  type="button"
                  className="onboarding-back"
                  onClick={() => setPlanTasks([])}
                >
                  Skip tasks for now — start with an empty workspace
                </button>
              )}
              {planTasks.some((t) => !validDraft([t])) && (
                <p role="status" className="onboarding-hint">
                  Add a title and a 5–480 minute estimate for each task, or skip
                  for now.
                </p>
              )}
              <p className="onboarding-hint">
                Next, meet your assistant for a quick tour. Your tasks will be
                in Today.
              </p>
            </div>
          )}
        </fieldset>
        {error && (
          <p className="landing-status" role="alert">
            {error}
          </p>
        )}
        <footer>
          {step > 0 ? (
            <button
              disabled={saving}
              className="onboarding-back"
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <span />
          )}
          <button
            className="landing-submit"
            disabled={
              saving ||
              (step === 0 && !name.trim()) ||
              (step === 4 && planTasks.some((t) => !validDraft([t])))
            }
            onClick={() => (step < 4 ? setStep(step + 1) : void finish())}
          >
            {saving
              ? "Building your Planny…"
              : step < 4
                ? "Continue"
                : "Enter my workspace"}
            <ArrowRight size={16} />
          </button>
        </footer>
      </section>
    </div>
  );
};
