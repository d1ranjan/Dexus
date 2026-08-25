import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { appRouter } from "../server/routers";
import * as dexusDb from "../server/db";
import { authIdentities, brainDumps, documents, followups, goals, knowledge, notes, people, profiles, tasks, timelineEvents, users } from "../drizzle/schema";
import type { TrpcContext } from "../server/_core/context";

const enabled = process.env.DEXUS_RUN_LIVE_DB_TESTS === "1";
const describeLive = enabled ? describe : describe.skip;
const suffix = randomUUID().slice(0, 8);

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;
let userA: AuthenticatedUser;
let userB: AuthenticatedUser;

function context(user: AuthenticatedUser | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

async function cleanupUserData(userIds: number[]) {
  const db = await dexusDb.getDb();
  if (!db || !userIds.length) return;
  await db.delete(authIdentities).where(inArray(authIdentities.userId, userIds));
  await db.delete(followups).where(inArray(followups.userId, userIds));
  await db.delete(tasks).where(inArray(tasks.userId, userIds));
  await db.delete(goals).where(inArray(goals.userId, userIds));
  await db.delete(knowledge).where(inArray(knowledge.userId, userIds));
  await db.delete(notes).where(inArray(notes.userId, userIds));
  await db.delete(people).where(inArray(people.userId, userIds));
  await db.delete(timelineEvents).where(inArray(timelineEvents.userId, userIds));
  await db.delete(documents).where(inArray(documents.userId, userIds));
  await db.delete(brainDumps).where(inArray(brainDumps.userId, userIds));
  await db.delete(profiles).where(inArray(profiles.userId, userIds));
  await db.delete(users).where(inArray(users.id, userIds));
}

describeLive("Dexus live managed-database integration", () => {
  beforeAll(async () => {
    await dexusDb.upsertUser({ openId: `dexus-live-a-${suffix}`, name: "Dexus Live A", email: `dexus-live-a-${suffix}@example.test`, loginMethod: "manus", role: "user" });
    await dexusDb.upsertUser({ openId: `dexus-live-b-${suffix}`, name: "Dexus Live B", email: `dexus-live-b-${suffix}@example.test`, loginMethod: "manus", role: "user" });
    const [storedA, storedB] = await Promise.all([dexusDb.getUserByOpenId(`dexus-live-a-${suffix}`), dexusDb.getUserByOpenId(`dexus-live-b-${suffix}`)]);
    if (!storedA || !storedB) throw new Error("Live test identities were not persisted.");
    userA = storedA;
    userB = storedB;
  });

  afterAll(async () => {
    await cleanupUserData([userA?.id, userB?.id].filter((id): id is number => Boolean(id)));
  });

  it("rejects unauthenticated protected data access", async () => {
    const unauthenticated = appRouter.createCaller(context(null));
    await expect(unauthenticated.tasks.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("persists a profile and task for the authenticated account across a fresh request context", async () => {
    const callerA = appRouter.createCaller(context(userA));
    const profile = await callerA.dexus.profile();
    expect(profile.userId).toBe(userA.id);
    const taskId = await callerA.tasks.create({ title: `Persisted task ${suffix}`, description: "Live managed-database persistence validation", priority: "high", tags: ["live-test"] });
    expect(taskId).toBeTypeOf("number");
    const freshCallerA = appRouter.createCaller(context(userA));
    const persisted = await freshCallerA.tasks.list({ status: "open" });
    expect(persisted.some((task) => task.id === taskId && task.title === `Persisted task ${suffix}`)).toBe(true);
  });

  it("links a Supabase subject to the existing Dexus user by verified email without creating a duplicate user", async () => {
    const first = await dexusDb.resolveSupabaseIdentity({
      subject: `supabase-live-${suffix}`,
      email: userA.email!,
      name: "Dexus Supabase Mapping A",
    });
    const second = await dexusDb.resolveSupabaseIdentity({
      subject: `supabase-live-${suffix}`,
      email: userA.email!,
      name: "Dexus Supabase Mapping A Updated",
    });

    expect(first.id).toBe(userA.id);
    expect(second.id).toBe(userA.id);
    const db = await dexusDb.getDb();
    const mappings = await db!.select().from(authIdentities).where(eq(authIdentities.userId, userA.id));
    expect(mappings.filter((mapping) => mapping.provider === "supabase" && mapping.providerUserId === `supabase-live-${suffix}`)).toHaveLength(1);
  });

  it("prevents one authenticated user from reading or changing another user’s task", async () => {
    const callerA = appRouter.createCaller(context(userA));
    const callerB = appRouter.createCaller(context(userB));
    const taskId = await callerA.tasks.create({ title: `Private task ${suffix}`, description: "Must stay scoped to user A", priority: "medium", tags: [] });
    const userBTasks = await callerB.tasks.list();
    expect(userBTasks.some((task) => task.id === taskId)).toBe(false);
    await callerB.tasks.update({ id: taskId, title: "Unauthorised mutation" });
    const userATasks = await callerA.tasks.list();
    expect(userATasks.find((task) => task.id === taskId)?.title).toBe(`Private task ${suffix}`);
  });

  it("persists, updates, reads, and deletes every core user-scoped entity", async () => {
    const taskId = await dexusDb.createTask(userA.id, { title: `CRUD task ${suffix}`, tags: [] });
    await dexusDb.updateTask(userA.id, taskId, { status: "completed", description: "Completed live CRUD task" });
    expect((await dexusDb.listTasks(userA.id)).find((item) => item.id === taskId)?.status).toBe("completed");

    const goalId = await dexusDb.createGoal(userA.id, { title: `CRUD goal ${suffix}` });
    await dexusDb.updateGoal(userA.id, goalId, { progress: 65 });
    expect((await dexusDb.listGoals(userA.id)).find((item) => item.id === goalId)?.progress).toBe(65);

    const noteId = await dexusDb.createNote(userA.id, { title: `CRUD note ${suffix}`, content: "First note body", tags: [] });
    await dexusDb.updateNote(userA.id, noteId, { content: "Updated note body" });
    expect((await dexusDb.listNotes(userA.id)).find((item) => item.id === noteId)?.content).toBe("Updated note body");

    const knowledgeId = await dexusDb.createKnowledge(userA.id, { title: `CRUD knowledge ${suffix}`, content: "First knowledge body", tags: [] });
    await dexusDb.updateKnowledge(userA.id, knowledgeId, { content: "Updated knowledge body" });
    expect((await dexusDb.listKnowledge(userA.id)).find((item) => item.id === knowledgeId)?.content).toBe("Updated knowledge body");

    const personId = await dexusDb.createPerson(userA.id, { name: `CRUD person ${suffix}` });
    await dexusDb.updatePerson(userA.id, personId, { context: "Updated context" });
    expect((await dexusDb.listPeople(userA.id)).find((item) => item.id === personId)?.context).toBe("Updated context");
    const followupId = await dexusDb.createFollowup(userA.id, { personId, action: `CRUD follow-up ${suffix}` });
    await dexusDb.updateFollowup(userA.id, followupId, { status: "completed" });
    expect((await dexusDb.listFollowups(userA.id)).find((item) => item.followup.id === followupId)?.followup.status).toBe("completed");

    const documentId = await dexusDb.createDocument(userA.id, { filename: `CRUD-document-${suffix}.txt`, fileType: "text/plain", storageKey: `live-test/${suffix}.txt`, storageUrl: `/manus-storage/live-test/${suffix}.txt`, extractedText: "Live test text", summary: "Initial summary" });
    await dexusDb.updateDocumentSummary(userA.id, documentId, "Updated summary");
    expect((await dexusDb.listDocuments(userA.id)).find((item) => item.id === documentId)?.summary).toBe("Updated summary");

    await Promise.all([dexusDb.deleteTask(userA.id, taskId), dexusDb.deleteGoal(userA.id, goalId), dexusDb.deleteNote(userA.id, noteId), dexusDb.deleteKnowledge(userA.id, knowledgeId), dexusDb.deleteFollowup(userA.id, followupId), dexusDb.deletePerson(userA.id, personId)]);
    expect((await dexusDb.listTasks(userA.id)).some((item) => item.id === taskId)).toBe(false);
    expect((await dexusDb.listGoals(userA.id)).some((item) => item.id === goalId)).toBe(false);
    expect((await dexusDb.listNotes(userA.id)).some((item) => item.id === noteId)).toBe(false);
    expect((await dexusDb.listKnowledge(userA.id)).some((item) => item.id === knowledgeId)).toBe(false);
  });

  it("runs real Brain Dump extraction, saves approved results, and retrieves them only for the owning user", async () => {
    const callerA = appRouter.createCaller(context(userA));
    const callerB = appRouter.createCaller(context(userB));
    const originalText = `Create a high priority task to validate Dexus live AI workflow ${suffix} tomorrow. Remember that retrieval must remain private.`;
    const analysis = await callerA.dexus.processBrainDump({ text: originalText, timezone: "UTC" });
    const extractedCount = analysis.tasks.length + analysis.goals.length + analysis.people.length + analysis.followups.length + analysis.knowledge.length + analysis.notes.length + analysis.events.length;
    expect(extractedCount).toBeGreaterThan(0);
    await callerA.dexus.saveBrainDump({ originalText, analysis });
    const [historyA, searchA, historyB, searchB] = await Promise.all([callerA.brainDumps.list(), callerA.dexus.search({ query: suffix }), callerB.brainDumps.list(), callerB.dexus.search({ query: suffix })]);
    expect(historyA.some((item) => item.originalText === originalText)).toBe(true);
    expect(searchA.some((item) => item.subtitle.includes(suffix) || item.title.includes(suffix))).toBe(true);
    expect(historyB.some((item) => item.originalText === originalText)).toBe(false);
    expect(searchB.some((item) => item.subtitle.includes(suffix) || item.title.includes(suffix))).toBe(false);
  }, 60_000);
});
