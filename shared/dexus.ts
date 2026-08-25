export const priorities = ["low", "medium", "high"] as const;
export const taskStatuses = ["open", "completed", "archived"] as const;
export const goalStatuses = ["active", "paused", "completed", "abandoned"] as const;
export const followupStatuses = ["open", "completed", "snoozed"] as const;

export type Priority = (typeof priorities)[number];
export type TaskStatus = (typeof taskStatuses)[number];
export type GoalStatus = (typeof goalStatuses)[number];
export type FollowupStatus = (typeof followupStatuses)[number];

export type SearchResult = {
  id: number;
  type: "task" | "knowledge" | "note" | "goal" | "person" | "timeline" | "brainDump" | "document";
  title: string;
  subtitle: string;
  createdAt: Date;
};

export type BrainDumpAnalysis = {
  tasks: Array<{
    title: string;
    description?: string;
    dueDate?: string | null;
    dueTime?: string | null;
    dateNote?: string | null;
    priority: Priority;
    category?: string;
    tags: string[];
  }>;
  goals: Array<{
    title: string;
    description?: string;
    category?: string;
    targetDate?: string | null;
    dateNote?: string | null;
  }>;
  people: Array<{
    name: string;
    context?: string;
    notes?: string;
  }>;
  followups: Array<{
    personName: string;
    action: string;
    dueDate?: string | null;
    dateNote?: string | null;
  }>;
  knowledge: Array<{
    title: string;
    content: string;
    category?: string;
    tags: string[];
  }>;
  notes: Array<{
    title: string;
    content: string;
    category?: string;
    tags: string[];
  }>;
  events: Array<{
    title: string;
    description?: string;
    eventAt?: string | null;
    dateNote?: string | null;
  }>;
};
