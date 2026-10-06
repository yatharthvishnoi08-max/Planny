import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Sparkles,
  Plus,
  ArrowRight,
  ArrowLeft,
  Clock3,
  Gauge,
  CalendarPlus,
  FolderOpen,
  Check,
} from "lucide-react";
import {
  parseNaturalLanguageTask,
  ParsedTaskResult,
  isHostedAIAvailable,
} from "../../lib/ai";
import { localDate, dateAtTime } from "../../lib/dates";
import { Priority, Project } from "../../types/database";
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirmTask: (task: ParsedTaskResult) => void;
  projects?: Project[];
  initialProjectId?: string;
}
export const AITaskModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirmTask,
  projects = [],
  initialProjectId = "",
}) => {
  const [mode, setMode] = useState<"manual" | "assist">("manual");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [deadline, setDeadline] = useState("");
  const [time, setTime] = useState("18:00");
  const [duration, setDuration] = useState(30);
  const [subtasks, setSubtasks] = useState("");
  const [projectId, setProjectId] = useState("");
  const [step, setStep] = useState(0);
  const [addDeadline, setAddDeadline] = useState(false);
  const [addProject, setAddProject] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  useEffect(() => {
    if (isOpen) {
      setMode("manual");
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDeadline("");
      setTime("18:00");
      setDuration(30);
      setSubtasks("");
      setProjectId(initialProjectId);
      setStep(0);
      setAddDeadline(false);
      setAddProject(Boolean(initialProjectId));
      setPrompt("");
      setBusy(false);
      setError("");
    }
    return () => {
      request.current++;
    };
  }, [isOpen, initialProjectId]);
  if (!isOpen) return null;
  const parse = async () => {
    const id = ++request.current;
    setBusy(true);
    setError("");
    try {
      const t = await parseNaturalLanguageTask(prompt);
      if (id !== request.current) return;
      setTitle(t.title);
      setDescription(t.description);
      setPriority(t.priority);
      setDeadline(t.deadline ? localDate(new Date(t.deadline)) : "");
      setTime(
        t.deadline ? new Date(t.deadline).toTimeString().slice(0, 5) : "18:00",
      );
      setDuration(t.estimated_duration_minutes);
      setSubtasks(t.subtasks.join("\n"));
      setAddDeadline(Boolean(t.deadline));
      setAddProject(Boolean(t.project_id));
      setProjectId(t.project_id || initialProjectId);
      setStep(3);
      setMode("manual");
    } catch (e) {
      if (id === request.current)
        setError(
          e instanceof Error
            ? e.message
            : "Could not prepare this task. You can add it manually.",
        );
    } finally {
      if (id === request.current) setBusy(false);
    }
  };
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !Number.isFinite(duration) || duration < 1) {
      setError("Add a title and a duration of at least one minute.");
      return;
    }
    try {
      onConfirmTask({
        title: title.trim(),
        description,
        priority,
        deadline: addDeadline && deadline ? dateAtTime(deadline, time) : null,
        estimated_duration_minutes: duration,
        subtasks: subtasks
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        project_id: addProject && projectId ? projectId : null,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your task.");
    }
  };
  const priorityOptions: { value: Priority; label: string; hint: string }[] = [
    { value: "low", label: "Low", hint: "Can wait" },
    { value: "medium", label: "Normal", hint: "Regular work" },
    { value: "high", label: "High", hint: "Needs attention" },
    { value: "urgent", label: "Urgent", hint: "Do it first" },
  ];
  const priorityIndex = Math.max(
    0,
    priorityOptions.findIndex((option) => option.value === priority),
  );
  const nextStep = () => {
    setError("");
    if (step === 0 && !title.trim()) {
      setError("Give this task a short name first.");
      return;
    }
    setStep((value) => Math.min(3, value + 1));
  };
  const setQuickDeadline = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setDeadline(localDate(date));
    setAddDeadline(true);
  };
  return createPortal(
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="composer task-composer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="composer-title"
      >
        <div className="composer-heading">
          <span className="composer-sticker" aria-hidden="true">
            LET’S GO ↗
          </span>
          <div>
            <span className="page-eyebrow">FROM BRAIN TO DONE</span>
            <h2 id="composer-title">
              New task<span className="accent-period">.</span>
            </h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close new task"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <div className="composer-tabs">
          <button
            aria-pressed={mode === "manual"}
            onClick={() => setMode("manual")}
          >
            <Plus size={15} />
            Write it down
          </button>
          <button
            aria-pressed={mode === "assist"}
            onClick={() => setMode("assist")}
          >
            <Sparkles size={15} />
            Help me plan
          </button>
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {mode === "assist" ? (
          <div className="composer-form">
            <label>
              What’s on your mind?
              <textarea
                autoFocus
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                placeholder="Prepare for Friday’s exam. Read chapter 4, then solve practice questions."
              />
            </label>
            <p className="composer-hint">
              {isHostedAIAvailable()
                ? "Planny AI will prepare a draft for you to review."
                : "Smart task parsing is available offline in this development build."}
            </p>
            <button
              className="primary-button"
              disabled={busy || !prompt.trim()}
              onClick={() => void parse()}
            >
              {busy ? "Preparing your draft…" : "Prepare draft"}
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <form
            className="composer-form quick-task-flow"
            onSubmit={save}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                step < 3 &&
                event.target instanceof HTMLInputElement
              ) {
                event.preventDefault();
                nextStep();
              }
            }}
          >
            <div className="task-flow-progress" aria-label={`Step ${step + 1} of 4`}>
              {["Name", "Duration", "Priority", "Details"].map((label, index) => (
                <button
                  key={label}
                  type="button"
                  className={index === step ? "active" : index < step ? "done" : ""}
                  onClick={() => index <= step && setStep(index)}
                >
                  <i>{index < step ? <Check size={10} /> : index + 1}</i>
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {step > 0 && (
              <button type="button" className="task-flow-summary" onClick={() => setStep(0)}>
                <span>Task</span>
                <strong>{title}</strong>
                <small>Edit</small>
              </button>
            )}

            <div className="task-flow-stage" key={step}>
              {step === 0 && (
                <div className="task-flow-question">
                  <span className="task-flow-icon"><Plus size={19} /></span>
                  <div><small>FIRST THING FIRST</small><h3>What needs doing?</h3><p>Keep it short. You can add the details later.</p></div>
                  <input
                    autoFocus
                    required
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="e.g. Finish the physics assignment"
                    aria-label="Task name"
                  />
                </div>
              )}

              {step === 1 && (
                <div className="task-flow-question duration-step">
                  <span className="task-flow-icon"><Clock3 size={19} /></span>
                  <div><small>MAKE IT REALISTIC</small><h3>How long will it take?</h3><p>A rough guess is enough. Planny uses this to fit the task into your day.</p></div>
                  <output>{duration < 60 ? `${duration} min` : `${Math.floor(duration / 60)}h${duration % 60 ? ` ${duration % 60}m` : ""}`}</output>
                  <input
                    autoFocus
                    className="task-range duration-range"
                    type="range"
                    min="5"
                    max="240"
                    step="5"
                    value={duration}
                    aria-label="Estimated duration in minutes"
                    style={{ "--range-progress": `${((duration - 5) / 235) * 100}%` } as React.CSSProperties}
                    onChange={(event) => setDuration(Number(event.target.value))}
                  />
                  <div className="range-labels"><span>5m</span><span>1h</span><span>2h</span><span>4h</span></div>
                  <div className="task-quick-picks">
                    {[15, 30, 60, 120].map((minutes) => <button key={minutes} type="button" aria-pressed={duration === minutes} onClick={() => setDuration(minutes)}>{minutes < 60 ? `${minutes}m` : `${minutes / 60}h`}</button>)}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className={`task-flow-question priority-step priority-${priority}`}>
                  <span className="task-flow-icon"><Gauge size={19} /></span>
                  <div><small>CHOOSE THE PRESSURE</small><h3>How important is it?</h3><p>Start with Normal. Raise it only when this truly needs to win your attention.</p></div>
                  <output><strong>{priorityOptions[priorityIndex].label}</strong><small>{priorityOptions[priorityIndex].hint}</small></output>
                  <input
                    autoFocus
                    className="task-range priority-range"
                    type="range"
                    min="0"
                    max="3"
                    step="1"
                    value={priorityIndex}
                    aria-label="Task priority"
                    style={{ "--range-progress": `${(priorityIndex / 3) * 100}%` } as React.CSSProperties}
                    onChange={(event) => setPriority(priorityOptions[Number(event.target.value)].value)}
                  />
                  <div className="priority-labels">{priorityOptions.map((option, index) => <button type="button" key={option.value} className={priority === option.value ? "active" : ""} onClick={() => setPriority(option.value)}><i />{index === 1 ? "Normal" : option.label}</button>)}</div>
                  <p className="task-flow-next-hint">Next: optional deadline, project, notes and smaller steps.</p>
                </div>
              )}

              {step === 3 && (
                <div className="task-flow-question optional-step">
                  <div><small>OPTIONAL · LEAVE ANYTHING EMPTY</small><h3>Add useful details</h3><p>Everything is visible here. Fill only what saves you effort later.</p></div>
                  <section className="visible-optional-section">
                    <header><span><CalendarPlus size={16} /></span><div><strong>Deadline & time</strong><small>Leave empty if there is no deadline</small></div>{deadline && <button type="button" onClick={() => { setDeadline(""); setAddDeadline(false); }}>Clear</button>}</header>
                    <div className="deadline-quick-picks"><button type="button" onClick={() => setQuickDeadline(0)}>Today</button><button type="button" onClick={() => setQuickDeadline(1)}>Tomorrow</button><button type="button" onClick={() => setQuickDeadline(7)}>Next week</button></div>
                    <div className="optional-fields-row"><label><span>Date</span><input type="date" value={deadline} onChange={(event) => { setDeadline(event.target.value); setAddDeadline(Boolean(event.target.value)); }} /></label><label><span>Time</span><input type="time" value={time} disabled={!deadline} onChange={(event) => setTime(event.target.value)} /></label></div>
                  </section>
                  <section className="visible-optional-section">
                    <header><span><FolderOpen size={16} /></span><div><strong>Project</strong><small>Keep it unassigned or choose its home</small></div></header>
                    <label><span>Project</span><select value={projectId} onChange={(event) => { setProjectId(event.target.value); setAddProject(Boolean(event.target.value)); }}><option value="">No project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
                  </section>
                  <section className="visible-optional-section notes-steps-section">
                    <header><span><Plus size={16} /></span><div><strong>Notes & smaller steps</strong><small>Add context only if this task needs it</small></div></header>
                    <label><span>Notes</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} placeholder="Details, links, anything useful" /></label>
                    <label><span>Smaller steps · one per line</span><textarea value={subtasks} onChange={(event) => setSubtasks(event.target.value)} rows={2} placeholder={'Research the topic\nWrite the first draft'} /></label>
                  </section>
                </div>
              )}
            </div>

            <div className="composer-footer task-flow-footer">
              <button type="button" className="secondary-button" onClick={() => step ? setStep((value) => value - 1) : onClose()}>{step ? <><ArrowLeft size={15} /> Back</> : "Cancel"}</button>
              {step < 3 ? (
                <button
                  key={`continue-${step}`}
                  className="primary-button"
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    nextStep();
                  }}
                >
                  {step === 2 ? "Optional details" : "Continue"}
                  <ArrowRight size={15} />
                </button>
              ) : (
                <button key="create-task" className="primary-button" type="submit">
                  Create task
                  <Plus size={16} />
                </button>
              )}
            </div>
          </form>
        )}
      </section>
    </div>,
    document.body,
  );
};
