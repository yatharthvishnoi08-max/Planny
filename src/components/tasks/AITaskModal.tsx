import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Sparkles, Plus, ArrowRight } from "lucide-react";
import {
  parseNaturalLanguageTask,
  ParsedTaskResult,
  isHostedAIAvailable,
} from "../../lib/ai";
import { localDate, dateAtTime } from "../../lib/dates";
import { Priority } from "../../types/database";
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirmTask: (task: ParsedTaskResult) => void;
}
export const AITaskModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirmTask,
}) => {
  const [mode, setMode] = useState<"manual" | "assist">("manual");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [deadline, setDeadline] = useState("");
  const [time, setTime] = useState("18:00");
  const [duration, setDuration] = useState(30);
  const [subtasks, setSubtasks] = useState("");
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
      setPrompt("");
      setBusy(false);
      setError("");
    }
    return () => {
      request.current++;
    };
  }, [isOpen]);
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
        deadline: deadline ? dateAtTime(deadline, time) : null,
        estimated_duration_minutes: duration,
        subtasks: subtasks
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your task.");
    }
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
          <form className="composer-form" onSubmit={save}>
            <label>
              Task title
              <input
                autoFocus
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs doing?"
              />
            </label>
            <div className="duration-shortcuts" aria-label="Quick duration">
              <span>How long?</span>
              {[15, 30, 60, 90].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  aria-pressed={duration === minutes}
                  onClick={() => setDuration(minutes)}
                >
                  {minutes}m
                </button>
              ))}
            </div>
            <div className="form-grid">
              <label>
                Priority
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
              <label>
                Estimate · minutes
                <input
                  type="number"
                  min={1}
                  max={10080}
                  required
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                />
              </label>
              <label>
                Deadline
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </label>
              <label>
                Time
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required={!!deadline}
                />
              </label>
            </div>
            <details className="composer-extras">
              <summary>
                Notes & steps <Plus size={15} />
              </summary>
              <label>
                Notes
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Details, links, whatever helps."
                />
              </label>
              <label>
                Steps <span className="composer-hint">one per line</span>
                <textarea
                  value={subtasks}
                  onChange={(e) => setSubtasks(e.target.value)}
                  rows={2}
                  placeholder="Break it into smaller wins"
                />
              </label>
            </details>
            <div className="composer-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={onClose}
              >
                Cancel
              </button>
              <button className="primary-button" type="submit">
                Create task
                <Plus size={16} />
              </button>
            </div>
          </form>
        )}
      </section>
    </div>,
    document.body,
  );
};
