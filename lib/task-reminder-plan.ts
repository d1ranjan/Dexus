export type ReminderTask = {
  id: number;
  title: string;
  dueDate: Date | string | null;
  status: "open" | "completed" | "archived";
};

export type ReminderPlan = {
  title: string;
  body: string;
  date: Date;
  kind: "due" | "overdue";
};

function deadlineDay(dateInput: Date | string) {
  const source = new Date(dateInput);
  if (Number.isNaN(source.getTime())) return null;
  return new Date(source.getFullYear(), source.getMonth(), source.getDate());
}

export function planTaskDeadlineReminders(task: ReminderTask, now = new Date()): ReminderPlan[] {
  if (task.status !== "open" || !task.dueDate) return [];
  const day = deadlineDay(task.dueDate);
  if (!day) return [];
  const due = new Date(day);
  due.setHours(9, 0, 0, 0);
  const overdue = new Date(day);
  overdue.setHours(18, 0, 0, 0);
  return [
    { title: "Task due today", body: task.title, date: due, kind: "due" as const },
    { title: "Task overdue", body: `Still open: ${task.title}`, date: overdue, kind: "overdue" as const },
  ].filter((reminder) => reminder.date.getTime() > now.getTime());
}
