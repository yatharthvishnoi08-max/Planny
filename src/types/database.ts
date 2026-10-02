export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "completed" | "cancelled";
export type RoutineFrequency =
  | "daily"
  | "weekdays"
  | "weekends"
  | "weekly"
  | "monthly"
  | "specific_days"
  | "every_x_days";
export type NoteType = "note" | "fact" | "idea" | "study";
export type ResourceType = "link" | "youtube" | "document" | "article";
export type BrainDumpStatus = "inbox" | "converted" | "archived";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  start_of_day: string;
  end_of_day: string;
  reminder_preference: string;
  theme: "dark" | "light" | "system";
  managed_areas: string[];
  onboarding_completed: boolean;
  onboarding_data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  color: string;
  icon: string;
  status: "active" | "completed" | "archived";
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  user_id: string;
  title: string;
  is_completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  priority: Priority;
  status: TaskStatus;
  start_date: string | null;
  deadline: string | null;
  estimated_duration_minutes: number;
  recurrence_rule: string | null;
  is_routine: boolean;
  is_brain_dump: boolean;
  position: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined or populated fields
  subtasks?: Subtask[];
  project?: Project;
  tags?: Tag[];
  dependencies?: string[];
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Routine {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  frequency: RoutineFrequency;
  days_of_week: number[]; // 1=Mon, 7=Sun
  interval_days: number;
  time_of_day: string; // HH:mm
  end_date: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoutineInstance {
  id: string;
  routine_id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  status: "pending" | "completed" | "skipped";
  completed_at: string | null;
  created_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  task_id: string | null;
  routine_id: string | null;
  remind_at: string;
  reminder_type: "specific_time" | "deadline_relative" | "recurring";
  is_sent: boolean;
  created_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  content: string;
  note_type: NoteType;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  user_id: string;
  project_id: string | null;
  task_id: string | null;
  title: string;
  url: string | null;
  resource_type: ResourceType;
  duration_minutes: number | null;
  notes: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface BrainDump {
  id: string;
  user_id: string;
  raw_text: string;
  status: BrainDumpStatus;
  converted_type: string | null;
  converted_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyPlan {
  id: string;
  user_id: string;
  date: string;
  briefing_shown: boolean;
  day_review_completed: boolean;
  planned_task_ids: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FocusSession {
  id: string;
  user_id: string;
  task_id: string | null;
  duration_seconds: number;
  started_at: string;
  completed_at: string;
  notes: string | null;
  completed_subtasks_count: number;
  created_at: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  actions?: AIStructuredAction[];
  created_at: string;
}

export interface AIStructuredAction {
  id: string;
  type:
    | "create_task"
    | "reschedule_tasks"
    | "create_routine"
    | "create_note"
    | "breakdown_task"
    | "suggest_priority";
  title: string;
  status: "proposed" | "approved" | "rejected" | "executed";
  payload: any;
}
