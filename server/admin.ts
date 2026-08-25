import { and, count, desc, eq, gte, isNull, like, or, sql } from "drizzle-orm";
import { adminAuditLogs, aiRequestLogs, brainDumps, documents, followups, goals, knowledge, notes, people, profiles, systemErrors, tasks, timelineEvents, users } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { deleteDocument, getDb } from "./db";
import { storageDelete } from "./storage";

export const contentResources = ["tasks", "goals", "notes", "knowledge", "people", "followups", "brainDumps", "timeline", "documents"] as const;
export type ContentResource = (typeof contentResources)[number];
export type AccountStatus = "active" | "suspended" | "deactivated";

async function database() { const db = await getDb(); if (!db) throw new Error("Dexus data service is temporarily unavailable."); return db; }
const numberValue = (value: unknown) => Number(value ?? 0);

export async function writeAdminAudit(input: { adminUserId: number; targetUserId?: number | null; resource: string; action: string; reason: string; requestId?: string; metadata?: Record<string, unknown> }) {
  const db = await database();
  const result = await db.insert(adminAuditLogs).values({ adminUserId: input.adminUserId, targetUserId: input.targetUserId ?? null, resource: input.resource, action: input.action, reason: input.reason, requestId: input.requestId ?? null, metadata: input.metadata ?? {} });
  return Number(result[0].insertId);
}

export async function recordAiRequest(input: { userId?: number; requestType: string; status: "success" | "failure"; durationMs: number; promptTokens?: number; completionTokens?: number; errorCategory?: string }) {
  const db = await database();
  await db.insert(aiRequestLogs).values({ userId: input.userId ?? null, requestType: input.requestType, status: input.status, durationMs: Math.max(0, Math.round(input.durationMs)), promptTokens: input.promptTokens ?? null, completionTokens: input.completionTokens ?? null, errorCategory: input.errorCategory ?? null });
}

export async function recordSafeError(input: { userId?: number; feature: string; severity?: "info" | "warning" | "error" | "critical"; safeMessage: string; requestId?: string }) {
  const db = await database();
  await db.insert(systemErrors).values({ userId: input.userId ?? null, feature: input.feature, severity: input.severity ?? "error", safeMessage: input.safeMessage.slice(0, 1000), requestId: input.requestId ?? null });
}

async function targetUser(targetUserId: number) { const db = await database(); const target = (await db.select().from(users).where(eq(users.id, targetUserId)).limit(1))[0]; if (!target) throw new Error("User not found."); return target; }

export async function overview() {
  const db = await database();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [allUsers, activeUsers, suspendedUsers, deactivatedUsers, newUsers, brainDumpCount, taskCount, goalCount, knowledgeCount, documentCount, aiSuccess, aiFailure, storage, recentErrors] = await Promise.all([
    db.select({ total: count() }).from(users), db.select({ total: count() }).from(users).where(eq(users.accountStatus, "active")), db.select({ total: count() }).from(users).where(eq(users.accountStatus, "suspended")), db.select({ total: count() }).from(users).where(eq(users.accountStatus, "deactivated")), db.select({ total: count() }).from(users).where(gte(users.createdAt, since)), db.select({ total: count() }).from(brainDumps).where(isNull(brainDumps.deletedAt)), db.select({ total: count() }).from(tasks), db.select({ total: count() }).from(goals), db.select({ total: count() }).from(knowledge), db.select({ total: count() }).from(documents).where(isNull(documents.deletedAt)), db.select({ total: count() }).from(aiRequestLogs).where(eq(aiRequestLogs.status, "success")), db.select({ total: count() }).from(aiRequestLogs).where(eq(aiRequestLogs.status, "failure")), db.select({ bytes: sql<number>`coalesce(sum(${documents.fileSize}), 0)`, files: count() }).from(documents).where(isNull(documents.deletedAt)), db.select({ id: systemErrors.id, feature: systemErrors.feature, severity: systemErrors.severity, safeMessage: systemErrors.safeMessage, createdAt: systemErrors.createdAt }).from(systemErrors).where(eq(systemErrors.status, "open")).orderBy(desc(systemErrors.createdAt)).limit(8),
  ]);
  return { users: { total: numberValue(allUsers[0]?.total), active: numberValue(activeUsers[0]?.total), suspended: numberValue(suspendedUsers[0]?.total), deactivated: numberValue(deactivatedUsers[0]?.total), newLast7Days: numberValue(newUsers[0]?.total) }, activity: { brainDumps: numberValue(brainDumpCount[0]?.total), tasks: numberValue(taskCount[0]?.total), goals: numberValue(goalCount[0]?.total), knowledge: numberValue(knowledgeCount[0]?.total), documents: numberValue(documentCount[0]?.total), aiSuccessful: numberValue(aiSuccess[0]?.total), aiFailed: numberValue(aiFailure[0]?.total) }, storage: { bytes: numberValue(storage[0]?.bytes), files: numberValue(storage[0]?.files) }, health: { database: "healthy", authentication: "configured", ai: ENV.geminiApiKey ? "configured" : "unavailable", storage: ENV.supabaseSecretKey ? "configured" : "unavailable", api: "healthy" }, recentErrors };
}

export async function listUsers(input: { query?: string; status?: AccountStatus; limit: number }) {
  const db = await database();
  const queryCondition = input.query ? or(like(users.name, `%${input.query}%`), like(users.email, `%${input.query}%`), like(users.openId, `%${input.query}%`)) : undefined;
  const condition = input.status && queryCondition ? and(eq(users.accountStatus, input.status), queryCondition) : input.status ? eq(users.accountStatus, input.status) : queryCondition;
  const rows = condition ? await db.select().from(users).where(condition).orderBy(desc(users.lastSignedIn)).limit(input.limit) : await db.select().from(users).orderBy(desc(users.lastSignedIn)).limit(input.limit);
  return Promise.all(rows.map(async (user) => {
    const [taskRows, documentRows, storageRows] = await Promise.all([db.select({ total: count() }).from(tasks).where(eq(tasks.userId, user.id)), db.select({ total: count() }).from(documents).where(and(eq(documents.userId, user.id), isNull(documents.deletedAt))), db.select({ bytes: sql<number>`coalesce(sum(${documents.fileSize}), 0)` }).from(documents).where(and(eq(documents.userId, user.id), isNull(documents.deletedAt)))]);
    return { id: user.id, openId: user.openId, name: user.name, email: user.email, role: user.role, accountStatus: user.accountStatus, createdAt: user.createdAt, lastSignedIn: user.lastSignedIn, taskCount: numberValue(taskRows[0]?.total), documentCount: numberValue(documentRows[0]?.total), storageBytes: numberValue(storageRows[0]?.bytes) };
  }));
}

export async function userDetail(targetUserId: number) {
  const db = await database(); const user = await targetUser(targetUserId); const profile = (await db.select().from(profiles).where(eq(profiles.userId, targetUserId)).limit(1))[0] ?? null;
  const [taskRows, goalRows, noteRows, knowledgeRows, peopleRows, followupRows, dumpRows, documentRows, aiRows, storageRows, activity] = await Promise.all([
    db.select({ total: count() }).from(tasks).where(eq(tasks.userId, targetUserId)), db.select({ total: count() }).from(goals).where(eq(goals.userId, targetUserId)), db.select({ total: count() }).from(notes).where(eq(notes.userId, targetUserId)), db.select({ total: count() }).from(knowledge).where(eq(knowledge.userId, targetUserId)), db.select({ total: count() }).from(people).where(eq(people.userId, targetUserId)), db.select({ total: count() }).from(followups).where(eq(followups.userId, targetUserId)), db.select({ total: count() }).from(brainDumps).where(and(eq(brainDumps.userId, targetUserId), isNull(brainDumps.deletedAt))), db.select({ total: count() }).from(documents).where(and(eq(documents.userId, targetUserId), isNull(documents.deletedAt))), db.select({ total: count() }).from(aiRequestLogs).where(eq(aiRequestLogs.userId, targetUserId)), db.select({ bytes: sql<number>`coalesce(sum(${documents.fileSize}), 0)` }).from(documents).where(and(eq(documents.userId, targetUserId), isNull(documents.deletedAt))), db.select({ eventType: timelineEvents.eventType, relatedEntityType: timelineEvents.relatedEntityType, occurredAt: timelineEvents.occurredAt }).from(timelineEvents).where(eq(timelineEvents.userId, targetUserId)).orderBy(desc(timelineEvents.occurredAt)).limit(25),
  ]);
  return { user: { id: user.id, name: user.name, email: user.email, role: user.role, accountStatus: user.accountStatus, createdAt: user.createdAt, lastSignedIn: user.lastSignedIn }, profile: profile ? { displayName: profile.displayName, timezone: profile.timezone, appearance: profile.appearance, notificationsEnabled: profile.notificationsEnabled } : null, usage: { tasks: numberValue(taskRows[0]?.total), goals: numberValue(goalRows[0]?.total), notes: numberValue(noteRows[0]?.total), knowledge: numberValue(knowledgeRows[0]?.total), people: numberValue(peopleRows[0]?.total), followups: numberValue(followupRows[0]?.total), brainDumps: numberValue(dumpRows[0]?.total), documents: numberValue(documentRows[0]?.total), aiRequests: numberValue(aiRows[0]?.total), storageBytes: numberValue(storageRows[0]?.bytes) }, activity };
}

export async function setAccountStatus(input: { adminUserId: number; targetUserId: number; status: AccountStatus; reason: string; requestId?: string }) {
  if (input.adminUserId === input.targetUserId) throw new Error("Administrators cannot change their own account status.");
  const db = await database(); await targetUser(input.targetUserId); await db.update(users).set({ accountStatus: input.status }).where(eq(users.id, input.targetUserId)); await writeAdminAudit({ adminUserId: input.adminUserId, targetUserId: input.targetUserId, resource: "user_account", action: input.status.toUpperCase(), reason: input.reason, requestId: input.requestId, metadata: { accountStatus: input.status } }); return { success: true };
}

export async function accessUserContent(input: { adminUserId: number; targetUserId: number; resources: ContentResource[]; reason: string; requestId?: string }) {
  const db = await database(); await targetUser(input.targetUserId); await writeAdminAudit({ adminUserId: input.adminUserId, targetUserId: input.targetUserId, resource: input.resources.join(","), action: "VIEW_PRIVATE_CONTENT", reason: input.reason, requestId: input.requestId, metadata: { resources: input.resources } });
  const requested = new Set(input.resources); const content: Record<string, unknown> = {};
  if (requested.has("tasks")) content.tasks = await db.select().from(tasks).where(eq(tasks.userId, input.targetUserId));
  if (requested.has("goals")) content.goals = await db.select().from(goals).where(eq(goals.userId, input.targetUserId));
  if (requested.has("notes")) content.notes = await db.select().from(notes).where(eq(notes.userId, input.targetUserId));
  if (requested.has("knowledge")) content.knowledge = await db.select().from(knowledge).where(eq(knowledge.userId, input.targetUserId));
  if (requested.has("people")) content.people = await db.select().from(people).where(eq(people.userId, input.targetUserId));
  if (requested.has("followups")) content.followups = await db.select().from(followups).where(eq(followups.userId, input.targetUserId));
  if (requested.has("brainDumps")) content.brainDumps = await db.select().from(brainDumps).where(and(eq(brainDumps.userId, input.targetUserId), isNull(brainDumps.deletedAt)));
  if (requested.has("timeline")) content.timeline = await db.select().from(timelineEvents).where(eq(timelineEvents.userId, input.targetUserId)).orderBy(desc(timelineEvents.occurredAt)).limit(200);
  if (requested.has("documents")) content.documents = await db.select({ id: documents.id, filename: documents.filename, fileType: documents.fileType, fileSize: documents.fileSize, createdAt: documents.createdAt, deletedAt: documents.deletedAt }).from(documents).where(eq(documents.userId, input.targetUserId));
  return content;
}

export async function exportUserData(input: { adminUserId: number; targetUserId: number; resources: ContentResource[]; reason: string; requestId?: string }) { const content = await accessUserContent(input); await writeAdminAudit({ adminUserId: input.adminUserId, targetUserId: input.targetUserId, resource: input.resources.join(","), action: "EXPORT_JSON", reason: input.reason, requestId: input.requestId, metadata: { format: "json", resources: input.resources } }); return { exportedAt: new Date(), format: "json" as const, content }; }

export async function softDeleteUserContent(input: { adminUserId: number; targetUserId: number; resource: "task" | "brainDump" | "document"; resourceId: number; reason: string; requestId?: string }) {
  const db = await database(); let changed = false;
  if (input.resource === "task") { await db.update(tasks).set({ status: "archived" }).where(and(eq(tasks.id, input.resourceId), eq(tasks.userId, input.targetUserId))); changed = true; }
  if (input.resource === "brainDump") { await db.update(brainDumps).set({ deletedAt: new Date(), deletedReason: input.reason }).where(and(eq(brainDumps.id, input.resourceId), eq(brainDumps.userId, input.targetUserId))); changed = true; }
  if (input.resource === "document") { await db.update(documents).set({ deletedAt: new Date(), deletedReason: input.reason }).where(and(eq(documents.id, input.resourceId), eq(documents.userId, input.targetUserId))); changed = true; }
  if (!changed) throw new Error("Unsupported administrative content action."); await writeAdminAudit({ adminUserId: input.adminUserId, targetUserId: input.targetUserId, resource: input.resource, action: "SOFT_DELETE", reason: input.reason, requestId: input.requestId, metadata: { resourceId: input.resourceId } }); return { success: true };
}

export async function listAuditLogs(input: { query?: string; limit: number }) { const db = await database(); const condition = input.query ? or(like(adminAuditLogs.action, `%${input.query}%`), like(adminAuditLogs.resource, `%${input.query}%`), like(adminAuditLogs.reason, `%${input.query}%`)) : undefined; return condition ? db.select().from(adminAuditLogs).where(condition).orderBy(desc(adminAuditLogs.createdAt)).limit(input.limit) : db.select().from(adminAuditLogs).orderBy(desc(adminAuditLogs.createdAt)).limit(input.limit); }

export async function storageMetrics() { const db = await database(); const [summary, types, largest] = await Promise.all([db.select({ bytes: sql<number>`coalesce(sum(${documents.fileSize}), 0)`, files: count() }).from(documents).where(isNull(documents.deletedAt)), db.select({ fileType: documents.fileType, files: count(), bytes: sql<number>`coalesce(sum(${documents.fileSize}), 0)` }).from(documents).where(isNull(documents.deletedAt)).groupBy(documents.fileType), db.select({ id: documents.id, userId: documents.userId, filename: documents.filename, fileType: documents.fileType, fileSize: documents.fileSize, createdAt: documents.createdAt }).from(documents).where(isNull(documents.deletedAt)).orderBy(desc(documents.fileSize)).limit(20)]); return { totalBytes: numberValue(summary[0]?.bytes), totalFiles: numberValue(summary[0]?.files), byType: types.map((item) => ({ ...item, files: numberValue(item.files), bytes: numberValue(item.bytes) })), largest, orphanDetection: "unavailable_without_storage_inventory" as const }; }

export async function aiMetrics() { const db = await database(); const [total, success, failed, averages, failures] = await Promise.all([db.select({ total: count() }).from(aiRequestLogs), db.select({ total: count() }).from(aiRequestLogs).where(eq(aiRequestLogs.status, "success")), db.select({ total: count() }).from(aiRequestLogs).where(eq(aiRequestLogs.status, "failure")), db.select({ duration: sql<number>`coalesce(avg(${aiRequestLogs.durationMs}), 0)` }).from(aiRequestLogs), db.select({ id: aiRequestLogs.id, userId: aiRequestLogs.userId, requestType: aiRequestLogs.requestType, errorCategory: aiRequestLogs.errorCategory, createdAt: aiRequestLogs.createdAt }).from(aiRequestLogs).where(eq(aiRequestLogs.status, "failure")).orderBy(desc(aiRequestLogs.createdAt)).limit(30)]); return { total: numberValue(total[0]?.total), successful: numberValue(success[0]?.total), failed: numberValue(failed[0]?.total), averageDurationMs: numberValue(averages[0]?.duration), recentFailures: failures }; }

export async function listSystemErrors(limit: number) { const db = await database(); return db.select().from(systemErrors).orderBy(desc(systemErrors.createdAt)).limit(limit); }
export async function resolveSystemError(input: { adminUserId: number; errorId: number; reason: string; requestId?: string }) { const db = await database(); await db.update(systemErrors).set({ status: "resolved", resolvedAt: new Date() }).where(eq(systemErrors.id, input.errorId)); await writeAdminAudit({ adminUserId: input.adminUserId, resource: "system_error", action: "RESOLVE", reason: input.reason, requestId: input.requestId, metadata: { errorId: input.errorId } }); return { success: true }; }
export async function listDocumentMetadata(limit: number) { const db = await database(); return db.select({ id: documents.id, userId: documents.userId, filename: documents.filename, fileType: documents.fileType, fileSize: documents.fileSize, createdAt: documents.createdAt, userName: users.name, userEmail: users.email }).from(documents).innerJoin(users, eq(users.id, documents.userId)).where(isNull(documents.deletedAt)).orderBy(desc(documents.createdAt)).limit(limit); }
export async function deletePrivateDocument(input: { adminUserId: number; targetUserId: number; documentId: number; reason: string; requestId?: string }) { const db = await database(); await targetUser(input.targetUserId); const document = (await db.select().from(documents).where(and(eq(documents.id, input.documentId), eq(documents.userId, input.targetUserId), isNull(documents.deletedAt))).limit(1))[0]; if (!document) throw new Error("The document was not found for this user."); await writeAdminAudit({ adminUserId: input.adminUserId, targetUserId: input.targetUserId, resource: "document", action: "DELETE_PRIVATE_DOCUMENT_REQUEST", reason: input.reason, requestId: input.requestId, metadata: { documentId: document.id, fileType: document.fileType, fileSize: document.fileSize } }); await storageDelete(document.storageKey); await deleteDocument(input.targetUserId, document.id, document.filename); await writeAdminAudit({ adminUserId: input.adminUserId, targetUserId: input.targetUserId, resource: "document", action: "DELETE_PRIVATE_DOCUMENT", reason: input.reason, requestId: input.requestId, metadata: { documentId: document.id, fileType: document.fileType, fileSize: document.fileSize } }); return { success: true, id: document.id }; }
