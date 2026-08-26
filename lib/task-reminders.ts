import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { planTaskDeadlineReminders, type ReminderTask } from "./task-reminder-plan";

export { planTaskDeadlineReminders, type ReminderTask, type ReminderPlan } from "./task-reminder-plan";

const REMINDER_STORE_KEY = "dexus-task-reminder-identifiers";
const REMINDER_CHANNEL = "dexus-deadlines";

type StoredReminderIds = Record<string, string[]>;


async function getStoredIds(): Promise<StoredReminderIds> {
  const raw = await AsyncStorage.getItem(REMINDER_STORE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? parsed as StoredReminderIds : {};
  } catch {
    return {};
  }
}

async function setStoredIds(value: StoredReminderIds) {
  await AsyncStorage.setItem(REMINDER_STORE_KEY, JSON.stringify(value));
}

async function configureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
    name: "Task deadlines",
    description: "Dexus reminders for upcoming and overdue tasks.",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 180, 120, 180],
    lightColor: "#000000",
  });
}

export async function requestTaskReminderPermission(): Promise<"granted" | "denied" | "unsupported"> {
  if (Platform.OS === "web") return "unsupported";
  await configureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === "granted" ? current : await Notifications.requestPermissionsAsync();
  return permission.status === "granted" ? "granted" : "denied";
}

export async function hasTaskReminderPermission() {
  if (Platform.OS === "web") return false;
  const current = await Notifications.getPermissionsAsync();
  return current.status === "granted";
}

export async function cancelTaskDeadlineReminders(taskId: number) {
  const allIds = await getStoredIds();
  const ids = allIds[String(taskId)] ?? [];
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
  delete allIds[String(taskId)];
  await setStoredIds(allIds);
}

export async function scheduleTaskDeadlineReminders(task: ReminderTask) {
  if (Platform.OS === "web" || !(await hasTaskReminderPermission())) return;
  await configureAndroidChannel();
  await cancelTaskDeadlineReminders(task.id);
  const plans = planTaskDeadlineReminders(task);
  if (!plans.length) return;
  const ids = await Promise.all(plans.map((plan) => Notifications.scheduleNotificationAsync({
    content: {
      title: plan.title,
      body: plan.body,
      data: { url: "/tasks", taskId: task.id, reminder: plan.kind },
      sound: true,
      ...(Platform.OS === "android" ? { channelId: REMINDER_CHANNEL } : {}),
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: plan.date },
  })));
  const allIds = await getStoredIds();
  allIds[String(task.id)] = ids;
  await setStoredIds(allIds);
}

export async function syncTaskDeadlineReminders(tasks: ReminderTask[]) {
  if (Platform.OS === "web" || !(await hasTaskReminderPermission())) return;
  await Promise.all(tasks.map((task) => scheduleTaskDeadlineReminders(task)));
}

export async function clearAllTaskDeadlineReminders() {
  const allIds = await getStoredIds();
  await Promise.all(Object.values(allIds).flat().map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
  await AsyncStorage.removeItem(REMINDER_STORE_KEY);
}
