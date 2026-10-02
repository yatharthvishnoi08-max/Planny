import { Plus, X } from "lucide-react";
import type { DraftTask } from "../../lib/planDraft";
import "./plan-editor.css";
export function PlanEditor({
  tasks,
  onChange,
}: {
  tasks: DraftTask[];
  onChange: (tasks: DraftTask[]) => void;
}) {
  const update = (id: string, change: Partial<DraftTask>) =>
    onChange(tasks.map((t) => (t.id === id ? { ...t, ...change } : t)));
  return (
    <div className="plan-editor">
      <div className="plan-editor-label">
        <span>
          {tasks.length} tasks ·{" "}
          {tasks.reduce(
            (sum, t) => sum + (Number.isFinite(t.minutes) ? t.minutes : 0),
            0,
          )}{" "}
          min
        </span>
        <small>Adjust before saving</small>
      </div>
      {tasks.map((task, i) => (
        <div className="plan-editor-row" key={task.id}>
          <span className="plan-editor-number">{i + 1}</span>
          <label>
            <span className="sr-only">Task {i + 1} title</span>
            <input
              value={task.title}
              maxLength={200}
              onChange={(e) => update(task.id, { title: e.target.value })}
              placeholder="What needs doing?"
            />
          </label>
          <label className="plan-editor-duration">
            <span className="sr-only">Task {i + 1} minutes</span>
            <input
              type="number"
              min={5}
              max={480}
              step={5}
              value={task.minutes || ""}
              onChange={(e) =>
                update(task.id, { minutes: Number(e.target.value) })
              }
            />
            <span>min</span>
          </label>
          <button
            type="button"
            aria-label={`Remove task ${i + 1}`}
            onClick={() => onChange(tasks.filter((t) => t.id !== task.id))}
          >
            <X size={15} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="plan-editor-add"
        disabled={tasks.length >= 8}
        onClick={() =>
          onChange([
            ...tasks,
            { id: crypto.randomUUID(), title: "", minutes: 30 },
          ])
        }
      >
        <Plus size={15} /> Add a task
      </button>
      <small className="plan-editor-hint">
        Estimates are yours to adjust. Set 5–480 minutes per task.
      </small>
    </div>
  );
}
