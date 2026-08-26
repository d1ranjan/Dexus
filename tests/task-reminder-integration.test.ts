import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("task reminder integration", () => {
  it("configures native notifications and routes a notification tap to the task screen", () => {
    const config = readFileSync("/home/ubuntu/dexus-mobile-v2/app.config.ts", "utf8");
    const layout = readFileSync("/home/ubuntu/dexus-mobile-v2/app/_layout.tsx", "utf8");
    expect(config).toContain('"expo-notifications"');
    expect(config).toContain('defaultChannel: "dexus-deadlines"');
    expect(layout).toContain("addNotificationResponseReceivedListener");
    expect(layout).toContain('router.push("/tasks")');
  });

  it("requests device permission from Settings and schedules, reschedules, or cancels reminders with task changes", () => {
    const settings = readFileSync("/home/ubuntu/dexus-mobile-v2/app/settings.tsx", "utf8");
    const tasks = readFileSync("/home/ubuntu/dexus-mobile-v2/app/(tabs)/tasks.tsx", "utf8");
    expect(settings).toContain("requestTaskReminderPermission()");
    expect(settings).toContain("clearAllTaskDeadlineReminders()");
    expect(settings).toContain("syncTaskDeadlineReminders(openTasks.data ?? [])");
    expect(tasks).toContain("scheduleTaskDeadlineReminders");
    expect(tasks).toContain("cancelTaskDeadlineReminders(task.id)");
    expect(tasks).toContain("cancelTaskDeadlineReminders(selected.id)");
  });
});
