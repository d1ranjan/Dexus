import { and, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import type { BrainDumpAnalysis, SearchResult } from "../shared/dexus";
import { adminAuditLogs, aiRequestLogs, authIdentities, brainDumps, documents, followups, goals, knowledge, notes, people, profiles, systemErrors, tasks, timelineEvents, type InsertUser, type User, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) _db = drizzle(process.env.DATABASE_URL);
  return _db;
}
async function dbOrThrow() { const db = await getDb(); if (!db) throw new Error("Dexus data service is temporarily unavailable."); return db; }

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb(); if (!db) return;
  const values: InsertUser = { openId: user.openId, name: user.name ?? null, email: user.email ?? null, loginMethod: user.loginMethod ?? null, lastSignedIn: user.lastSignedIn ?? new Date(), role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user") };
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: { name: values.name, email: values.email, loginMethod: values.loginMethod, lastSignedIn: values.lastSignedIn } });
}
export async function getUserByOpenId(openId: string) { const db = await getDb(); if (!db) return undefined; return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0]; }
export async function getUserById(id: number) { const db = await getDb(); if (!db) return undefined; return (await db.select().from(users).where(eq(users.id, id)).limit(1))[0]; }

export type VerifiedSupabaseIdentity = {
  subject: string;
  email: string;
  name: string | null;
};

function isDuplicateEntry(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ER_DUP_ENTRY";
}

/**
 * Resolve a Supabase identity to a stable Dexus user record. This is additive:
 * the numeric users.id remains unchanged, so every existing task, note, goal,
 * document, audit record, and profile keeps its relationship intact.
 */
export async function resolveSupabaseIdentity(identity: VerifiedSupabaseIdentity): Promise<User> {
  const db = await dbOrThrow();
  const now = new Date();
  const provider = "supabase";

  const existingIdentity = (await db.select().from(authIdentities).where(and(eq(authIdentities.provider, provider), eq(authIdentities.providerUserId, identity.subject))).limit(1))[0];
  if (existingIdentity) {
    await db.update(authIdentities).set({ providerEmail: identity.email, lastAuthenticatedAt: now }).where(eq(authIdentities.id, existingIdentity.id));
    await db.update(users).set({ name: identity.name, email: identity.email, loginMethod: "supabase_email", lastSignedIn: now }).where(eq(users.id, existingIdentity.userId));
    const mapped = await getUserById(existingIdentity.userId);
    if (!mapped) throw new Error("Dexus identity mapping references a missing user.");
    return mapped;
  }

  const providerOpenId = `supabase:${identity.subject}`;
  let target = await getUserByOpenId(providerOpenId);

  // Legacy Dexus accounts used the platform identity in openId. A verified
  // Supabase email can be linked to exactly one such record; ambiguity stops
  // authentication instead of risking a cross-account data merge.
  if (!target) {
    const emailMatches = await db.select().from(users).where(sql`lower(${users.email}) = lower(${identity.email})`).limit(2);
    if (emailMatches.length > 1) throw new Error("This email matches multiple Dexus accounts. Contact an administrator for a safe account migration.");
    target = emailMatches[0];
  }

  if (!target) {
    try {
      const role = ENV.ownerSupabaseUserId && identity.subject === ENV.ownerSupabaseUserId ? "admin" : "user";
      const created = await db.insert(users).values({ openId: providerOpenId, name: identity.name, email: identity.email, loginMethod: "supabase_email", role, lastSignedIn: now });
      target = await getUserById(Number(created[0].insertId));
    } catch (error) {
      if (!isDuplicateEntry(error)) throw error;
      target = await getUserByOpenId(providerOpenId);
    }
  }
  if (!target) throw new Error("Dexus could not create or resolve this account.");

  try {
    await db.insert(authIdentities).values({ userId: target.id, provider, providerUserId: identity.subject, providerEmail: identity.email, lastAuthenticatedAt: now });
  } catch (error) {
    if (!isDuplicateEntry(error)) throw error;
    const concurrent = (await db.select().from(authIdentities).where(and(eq(authIdentities.provider, provider), eq(authIdentities.providerUserId, identity.subject))).limit(1))[0];
    if (!concurrent) throw error;
    target = await getUserById(concurrent.userId);
    if (!target) throw new Error("Dexus identity mapping references a missing user.");
  }

  await db.update(users).set({ name: identity.name, email: identity.email, loginMethod: "supabase_email", lastSignedIn: now }).where(eq(users.id, target.id));
  return (await getUserById(target.id)) ?? target;
}

export async function ensureProfile(userId: number, name?: string | null) {
  const db = await dbOrThrow();
  const existing = (await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1))[0];
  if (existing) return existing;
  await db.insert(profiles).values({ userId, displayName: name ?? null });
  return (await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1))[0];
}
export async function updateProfile(userId: number, data: { displayName?: string; timezone?: string; defaultPriority?: "low" | "medium" | "high"; appearance?: "system" | "light" | "dark"; aiSuggestionsEnabled?: boolean; notificationsEnabled?: boolean }) { const db = await dbOrThrow(); await ensureProfile(userId); await db.update(profiles).set(data).where(eq(profiles.userId, userId)); return ensureProfile(userId); }

export async function createTimeline(userId: number, eventType: string, title: string, options?: { description?: string | null; relatedEntityType?: string; relatedEntityId?: number; occurredAt?: Date }) { const db = await dbOrThrow(); const result = await db.insert(timelineEvents).values({ userId, eventType, title, description: options?.description ?? null, relatedEntityType: options?.relatedEntityType ?? null, relatedEntityId: options?.relatedEntityId ?? null, occurredAt: options?.occurredAt ?? new Date() }); return Number(result[0].insertId); }

export async function listTasks(userId: number, options?: { status?: "open" | "completed" | "archived"; query?: string }) { const db = await dbOrThrow(); const clauses = [eq(tasks.userId, userId)]; if (options?.status) clauses.push(eq(tasks.status, options.status)); if (options?.query) clauses.push(or(like(tasks.title, `%${options.query}%`), like(tasks.description, `%${options.query}%`))!); return db.select().from(tasks).where(and(...clauses)).orderBy(desc(tasks.createdAt)); }
export async function createTask(userId: number, data: { title: string; description?: string; priority?: "low" | "medium" | "high"; category?: string; dueDate?: Date | null; dueTime?: string | null; tags?: string[]; goalId?: number | null; source?: string }) { const db = await dbOrThrow(); const result = await db.insert(tasks).values({ userId, title: data.title, description: data.description ?? null, priority: data.priority ?? "medium", category: data.category ?? null, dueDate: data.dueDate ?? null, dueTime: data.dueTime ?? null, tags: data.tags ?? [], goalId: data.goalId ?? null, source: data.source ?? "manual" }); const id = Number(result[0].insertId); await createTimeline(userId, "task_created", data.title, { description: data.description, relatedEntityType: "task", relatedEntityId: id }); return id; }
export async function updateTask(userId: number, id: number, data: { title?: string; description?: string | null; priority?: "low" | "medium" | "high"; category?: string | null; dueDate?: Date | null; dueTime?: string | null; tags?: string[]; status?: "open" | "completed" | "archived" }) { const db = await dbOrThrow(); const next = { ...data, completedAt: data.status === "completed" ? new Date() : data.status === "open" ? null : undefined }; await db.update(tasks).set(next).where(and(eq(tasks.id, id), eq(tasks.userId, userId))); return id; }
export async function deleteTask(userId: number, id: number) { const db = await dbOrThrow(); await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId))); }

export async function listGoals(userId: number) { const db = await dbOrThrow(); return db.select().from(goals).where(eq(goals.userId, userId)).orderBy(desc(goals.createdAt)); }
export async function createGoal(userId: number, data: { title: string; description?: string; category?: string; targetDate?: Date | null; progress?: number; status?: "active" | "paused" | "completed" | "abandoned"; source?: string }) { const db = await dbOrThrow(); const result = await db.insert(goals).values({ userId, title: data.title, description: data.description ?? null, category: data.category ?? null, targetDate: data.targetDate ?? null, progress: data.progress ?? 0, status: data.status ?? "active" }); const id = Number(result[0].insertId); await createTimeline(userId, "goal_created", data.title, { description: data.description, relatedEntityType: "goal", relatedEntityId: id }); return id; }
export async function updateGoal(userId: number, id: number, data: { title?: string; description?: string | null; category?: string | null; targetDate?: Date | null; progress?: number; status?: "active" | "paused" | "completed" | "abandoned" }) { const db = await dbOrThrow(); await db.update(goals).set(data).where(and(eq(goals.id, id), eq(goals.userId, userId))); return id; }
export async function deleteGoal(userId: number, id: number) { const db = await dbOrThrow(); await db.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, userId))); }

export async function listKnowledge(userId: number, query?: string) { const db = await dbOrThrow(); const where = query ? and(eq(knowledge.userId, userId), or(like(knowledge.title, `%${query}%`), like(knowledge.content, `%${query}%`))) : eq(knowledge.userId, userId); return db.select().from(knowledge).where(where).orderBy(desc(knowledge.createdAt)); }
export async function createKnowledge(userId: number, data: { title: string; content: string; category?: string; tags?: string[]; source?: string }) { const db = await dbOrThrow(); const result = await db.insert(knowledge).values({ userId, title: data.title, content: data.content, category: data.category ?? null, tags: data.tags ?? [], source: data.source ?? "manual" }); const id = Number(result[0].insertId); await createTimeline(userId, "knowledge_saved", data.title, { relatedEntityType: "knowledge", relatedEntityId: id }); return id; }
export async function updateKnowledge(userId: number, id: number, data: { title?: string; content?: string; category?: string | null; tags?: string[] }) { const db = await dbOrThrow(); await db.update(knowledge).set(data).where(and(eq(knowledge.id, id), eq(knowledge.userId, userId))); return id; }
export async function deleteKnowledge(userId: number, id: number) { const db = await dbOrThrow(); await db.delete(knowledge).where(and(eq(knowledge.id, id), eq(knowledge.userId, userId))); }

export async function listNotes(userId: number) { const db = await dbOrThrow(); return db.select().from(notes).where(eq(notes.userId, userId)).orderBy(desc(notes.createdAt)); }
export async function createNote(userId: number, data: { title: string; content: string; category?: string; tags?: string[]; source?: string }) { const db = await dbOrThrow(); const result = await db.insert(notes).values({ userId, title: data.title, content: data.content, category: data.category ?? null, tags: data.tags ?? [], source: data.source ?? "manual" }); const id = Number(result[0].insertId); await createTimeline(userId, "note_saved", data.title, { relatedEntityType: "note", relatedEntityId: id }); return id; }
export async function updateNote(userId: number, id: number, data: { title?: string; content?: string; category?: string | null; tags?: string[] }) { const db = await dbOrThrow(); await db.update(notes).set(data).where(and(eq(notes.id, id), eq(notes.userId, userId))); return id; }
export async function deleteNote(userId: number, id: number) { const db = await dbOrThrow(); await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, userId))); }

export async function listPeople(userId: number) { const db = await dbOrThrow(); return db.select().from(people).where(eq(people.userId, userId)).orderBy(desc(people.updatedAt)); }
export async function createPerson(userId: number, data: { name: string; context?: string; notes?: string }) { const db = await dbOrThrow(); const result = await db.insert(people).values({ userId, name: data.name, context: data.context ?? null, notes: data.notes ?? null }); const id = Number(result[0].insertId); await createTimeline(userId, "person_saved", data.name, { relatedEntityType: "person", relatedEntityId: id }); return id; }
export async function updatePerson(userId: number, id: number, data: { name?: string; context?: string | null; notes?: string | null }) { const db = await dbOrThrow(); await db.update(people).set(data).where(and(eq(people.id, id), eq(people.userId, userId))); return id; }
export async function deletePerson(userId: number, id: number) { const db = await dbOrThrow(); await db.delete(people).where(and(eq(people.id, id), eq(people.userId, userId))); }
export async function findOrCreatePerson(userId: number, name: string) { const db = await dbOrThrow(); const existing = (await db.select().from(people).where(and(eq(people.userId, userId), eq(people.name, name))).limit(1))[0]; return existing?.id ?? createPerson(userId, { name }); }

export async function listFollowups(userId: number) { const db = await dbOrThrow(); return db.select({ followup: followups, person: people }).from(followups).innerJoin(people, eq(followups.personId, people.id)).where(eq(followups.userId, userId)).orderBy(desc(followups.createdAt)); }
export async function createFollowup(userId: number, data: { personId: number; action: string; dueDate?: Date | null }) { const db = await dbOrThrow(); const result = await db.insert(followups).values({ userId, personId: data.personId, action: data.action, dueDate: data.dueDate ?? null }); const id = Number(result[0].insertId); await createTimeline(userId, "followup_created", data.action, { relatedEntityType: "followup", relatedEntityId: id }); return id; }
export async function updateFollowup(userId: number, id: number, data: { action?: string; dueDate?: Date | null; status?: "open" | "completed" | "snoozed" }) { const db = await dbOrThrow(); const next = { ...data, completedAt: data.status === "completed" ? new Date() : data.status === "open" ? null : undefined }; await db.update(followups).set(next).where(and(eq(followups.id, id), eq(followups.userId, userId))); return id; }
export async function deleteFollowup(userId: number, id: number) { const db = await dbOrThrow(); await db.delete(followups).where(and(eq(followups.id, id), eq(followups.userId, userId))); }

export async function listTimeline(userId: number, limit = 120) { const db = await dbOrThrow(); return db.select().from(timelineEvents).where(eq(timelineEvents.userId, userId)).orderBy(desc(timelineEvents.occurredAt)).limit(limit); }
export async function listBrainDumps(userId: number) { const db = await dbOrThrow(); return db.select().from(brainDumps).where(and(eq(brainDumps.userId, userId), isNull(brainDumps.deletedAt))).orderBy(desc(brainDumps.createdAt)); }
export async function createBrainDump(userId: number, originalText: string, analysis: BrainDumpAnalysis) { const db = await dbOrThrow(); const result = await db.insert(brainDumps).values({ userId, originalText, processedText: "Processed with Dexus AI", aiResponse: JSON.stringify(analysis) }); const id = Number(result[0].insertId); await createTimeline(userId, "brain_dump_saved", "Captured a thought", { description: originalText.slice(0, 240), relatedEntityType: "brainDump", relatedEntityId: id }); return id; }

export async function createDocument(userId: number, data: { filename: string; fileType: string; storageKey: string; storageUrl: string; extractedText: string; summary?: string; fileSize?: number }) { const db = await dbOrThrow(); const result = await db.insert(documents).values({ userId, ...data, summary: data.summary ?? null, fileSize: data.fileSize ?? 0 }); const id = Number(result[0].insertId); await createTimeline(userId, "document_saved", data.filename, { relatedEntityType: "document", relatedEntityId: id }); return id; }
export async function listDocuments(userId: number) { const db = await dbOrThrow(); return db.select().from(documents).where(and(eq(documents.userId, userId), isNull(documents.deletedAt))).orderBy(desc(documents.createdAt)); }
export async function getDocument(userId: number, id: number) { const db = await dbOrThrow(); const rows = await db.select().from(documents).where(and(eq(documents.id, id), eq(documents.userId, userId), isNull(documents.deletedAt))).limit(1); return rows[0]; }
export async function updateDocumentSummary(userId: number, id: number, summary: string) { const db = await dbOrThrow(); await db.update(documents).set({ summary }).where(and(eq(documents.id, id), eq(documents.userId, userId))); }
export async function deleteDocument(userId: number, id: number, filename: string) { const db = await dbOrThrow(); await db.delete(documents).where(and(eq(documents.id, id), eq(documents.userId, userId))); await createTimeline(userId, "document_deleted", filename, { relatedEntityType: "document", relatedEntityId: id }); }
export async function getOwnAccountDeletionPlan(userId: number) { const db = await dbOrThrow(); const [identity, userDocuments] = await Promise.all([db.select().from(authIdentities).where(and(eq(authIdentities.userId, userId), eq(authIdentities.provider, "supabase"))).limit(1), db.select({ storageKey: documents.storageKey }).from(documents).where(eq(documents.userId, userId))]); if (!identity[0]) throw new Error("Dexus could not verify the authentication identity for this account."); return { providerUserId: identity[0].providerUserId, storageKeys: userDocuments.map((document) => document.storageKey) }; }
export async function deleteOwnAccountData(userId: number) { const db = await dbOrThrow(); await db.transaction(async (tx) => { await tx.insert(adminAuditLogs).values({ adminUserId: userId, targetUserId: userId, resource: "account", action: "SELF_DELETE_ACCOUNT", reason: "User initiated permanent self-service account deletion.", metadata: { userId } }); await tx.delete(aiRequestLogs).where(eq(aiRequestLogs.userId, userId)); await tx.delete(systemErrors).where(eq(systemErrors.userId, userId)); await tx.delete(followups).where(eq(followups.userId, userId)); await tx.delete(tasks).where(eq(tasks.userId, userId)); await tx.delete(goals).where(eq(goals.userId, userId)); await tx.delete(knowledge).where(eq(knowledge.userId, userId)); await tx.delete(notes).where(eq(notes.userId, userId)); await tx.delete(people).where(eq(people.userId, userId)); await tx.delete(timelineEvents).where(eq(timelineEvents.userId, userId)); await tx.delete(documents).where(eq(documents.userId, userId)); await tx.delete(brainDumps).where(eq(brainDumps.userId, userId)); await tx.delete(authIdentities).where(eq(authIdentities.userId, userId)); await tx.delete(profiles).where(eq(profiles.userId, userId)); await tx.delete(users).where(eq(users.id, userId)); }); }

export async function dashboard(userId: number) { const [profile, allTasks, allGoals, allKnowledge, allFollowups, recentTimeline] = await Promise.all([ensureProfile(userId), listTasks(userId), listGoals(userId), listKnowledge(userId), listFollowups(userId), listTimeline(userId, 8)]); const openTasks = allTasks.filter((task) => task.status === "open"); return { profile, focusTasks: openTasks.slice(0, 5), upcomingTasks: openTasks.filter((task) => task.dueDate).slice(0, 5), goals: allGoals.filter((goal) => goal.status === "active").slice(0, 4), followups: allFollowups.filter((item) => item.followup.status === "open").slice(0, 4), recentTimeline, stats: { completedTasks: allTasks.filter((task) => task.status === "completed").length, pendingTasks: openTasks.length, activeGoals: allGoals.filter((goal) => goal.status === "active").length, knowledgeItems: allKnowledge.length, openFollowups: allFollowups.filter((item) => item.followup.status === "open").length } }; }

export async function searchUserData(userId: number, query: string): Promise<SearchResult[]> { const normalized = query.trim().toLowerCase(); const [userTasks, userKnowledge, userNotes, userGoals, userPeople, userTimeline, userBrainDumps, userDocuments] = await Promise.all([listTasks(userId), listKnowledge(userId), listNotes(userId), listGoals(userId), listPeople(userId), listTimeline(userId, 150), listBrainDumps(userId), listDocuments(userId)]); const matches = (value: string) => !normalized || value.toLowerCase().includes(normalized) || normalized.split(/\s+/).some((term) => term.length > 2 && value.toLowerCase().includes(term)); const results: SearchResult[] = []; userTasks.filter((item) => matches(`${item.title} ${item.description ?? ""}`)).forEach((item) => results.push({ id: item.id, type: "task", title: item.title, subtitle: item.description ?? "Task", createdAt: item.createdAt })); userKnowledge.filter((item) => matches(`${item.title} ${item.content}`)).forEach((item) => results.push({ id: item.id, type: "knowledge", title: item.title, subtitle: item.content.slice(0, 140), createdAt: item.createdAt })); userNotes.filter((item) => matches(`${item.title} ${item.content}`)).forEach((item) => results.push({ id: item.id, type: "note", title: item.title, subtitle: item.content.slice(0, 140), createdAt: item.createdAt })); userGoals.filter((item) => matches(`${item.title} ${item.description ?? ""}`)).forEach((item) => results.push({ id: item.id, type: "goal", title: item.title, subtitle: item.description ?? "Goal", createdAt: item.createdAt })); userPeople.filter((item) => matches(`${item.name} ${item.context ?? ""} ${item.notes ?? ""}`)).forEach((item) => results.push({ id: item.id, type: "person", title: item.name, subtitle: item.context ?? "Person", createdAt: item.createdAt })); userTimeline.filter((item) => matches(`${item.title} ${item.description ?? ""}`)).forEach((item) => results.push({ id: item.id, type: "timeline", title: item.title, subtitle: item.description ?? "Memory timeline", createdAt: item.createdAt })); userBrainDumps.filter((item) => matches(item.originalText)).forEach((item) => results.push({ id: item.id, type: "brainDump", title: "Brain dump", subtitle: item.originalText.slice(0, 140), createdAt: item.createdAt })); userDocuments.filter((item) => matches(`${item.filename} ${item.extractedText ?? ""}`)).forEach((item) => results.push({ id: item.id, type: "document", title: item.filename, subtitle: item.summary ?? "Document", createdAt: item.createdAt })); return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 60); }

export async function saveApprovedBrainDump(userId: number, originalText: string, analysis: BrainDumpAnalysis) { await createBrainDump(userId, originalText, analysis); for (const task of analysis.tasks) await createTask(userId, { title: task.title, description: task.description, dueDate: task.dueDate ? new Date(`${task.dueDate}T12:00:00`) : null, dueTime: task.dueTime, priority: task.priority, category: task.category, tags: task.tags, source: "brain_dump" }); for (const goal of analysis.goals) await createGoal(userId, { title: goal.title, description: goal.description, category: goal.category, targetDate: goal.targetDate ? new Date(`${goal.targetDate}T12:00:00`) : null, source: "brain_dump" }); for (const person of analysis.people) await findOrCreatePerson(userId, person.name); for (const followup of analysis.followups) { const personId = await findOrCreatePerson(userId, followup.personName); await createFollowup(userId, { personId, action: followup.action, dueDate: followup.dueDate ? new Date(`${followup.dueDate}T12:00:00`) : null }); } for (const item of analysis.knowledge) await createKnowledge(userId, { ...item, source: "brain_dump" }); for (const item of analysis.notes) await createNote(userId, { ...item, source: "brain_dump" }); for (const event of analysis.events) await createTimeline(userId, "event", event.title, { description: event.description, occurredAt: event.eventAt ? new Date(event.eventAt) : new Date() }); }
