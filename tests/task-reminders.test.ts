import { describe, expect, it } from "vitest";
import { planTaskDeadlineReminders } from "../lib/task-reminder-plan";

describe("task deadline reminder planning", () => {
  const now = new Date(2026, 7, 26, 8, 0, 0);

  it("plans due and overdue device reminders for an open future task", () => {
    const reminders = planTaskDeadlineReminders({ id: 7, title: "Send proposal", dueDate: new Date(2026, 7, 27, 12), status: "open" }, now);
    expect(reminders.map((item) => item.kind)).toEqual(["due", "overdue"]);
    expect(reminders[0]?.title).toBe("Task due today");
    expect(reminders[1]?.title).toBe("Task overdue");
  });

  it("does not schedule alerts for completed, archived, missing, or elapsed deadlines", () => {
    expect(planTaskDeadlineReminders({ id: 1, title: "Done", dueDate: new Date(2026, 7, 27), status: "completed" }, now)).toEqual([]);
    expect(planTaskDeadlineReminders({ id: 2, title: "No date", dueDate: null, status: "open" }, now)).toEqual([]);
    expect(planTaskDeadlineReminders({ id: 3, title: "Old", dueDate: new Date(2026, 7, 25), status: "open" }, now)).toEqual([]);
  });
});
