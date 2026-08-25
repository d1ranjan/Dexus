import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { appRouter } from "../server/routers";
import * as dexusDb from "../server/db";
import { adminAuditLogs, brainDumps, documents, followups, goals, knowledge, notes, people, profiles, tasks, timelineEvents, users } from "../drizzle/schema";
import type { TrpcContext } from "../server/_core/context";

const enabled = process.env.DEXUS_RUN_LIVE_DB_TESTS === "1";
const describeLive = enabled ? describe : describe.skip;
const suffix = randomUUID().slice(0, 8);
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;
let admin: AuthenticatedUser;
let regular: AuthenticatedUser;
let target: AuthenticatedUser;

function context(user: AuthenticatedUser | null): TrpcContext { return { user, req: { protocol: "https", hostname: "dexus.example.com", headers: { host: "dexus.example.com", "x-request-id": `admin-test-${suffix}` } } as unknown as TrpcContext["req"], res: { clearCookie: () => undefined } as unknown as TrpcContext["res"] }; }

async function cleanup(userIds: number[]) {
  const db = await dexusDb.getDb(); if (!db) return;
  await db.delete(adminAuditLogs).where(inArray(adminAuditLogs.adminUserId, userIds));
  await db.delete(followups).where(inArray(followups.userId, userIds)); await db.delete(tasks).where(inArray(tasks.userId, userIds)); await db.delete(goals).where(inArray(goals.userId, userIds)); await db.delete(knowledge).where(inArray(knowledge.userId, userIds)); await db.delete(notes).where(inArray(notes.userId, userIds)); await db.delete(people).where(inArray(people.userId, userIds)); await db.delete(timelineEvents).where(inArray(timelineEvents.userId, userIds)); await db.delete(documents).where(inArray(documents.userId, userIds)); await db.delete(brainDumps).where(inArray(brainDumps.userId, userIds)); await db.delete(profiles).where(inArray(profiles.userId, userIds)); await db.delete(users).where(inArray(users.id, userIds));
}

describeLive("Dexus Admin live security integration", () => {
  beforeAll(async () => {
    await Promise.all([
      dexusDb.upsertUser({ openId: `dexus-admin-${suffix}`, name: "Dexus Admin Test", email: `admin-${suffix}@example.test`, loginMethod: "manus", role: "admin" }),
      dexusDb.upsertUser({ openId: `dexus-regular-${suffix}`, name: "Dexus Regular Test", email: `regular-${suffix}@example.test`, loginMethod: "manus", role: "user" }),
      dexusDb.upsertUser({ openId: `dexus-target-${suffix}`, name: "Dexus Target Test", email: `target-${suffix}@example.test`, loginMethod: "manus", role: "user" }),
    ]);
    const stored = await Promise.all([dexusDb.getUserByOpenId(`dexus-admin-${suffix}`), dexusDb.getUserByOpenId(`dexus-regular-${suffix}`), dexusDb.getUserByOpenId(`dexus-target-${suffix}`)]);
    if (stored.some((item) => !item)) throw new Error("Admin integration test identities were not created.");
    [admin, regular, target] = stored as AuthenticatedUser[];
  });

  afterAll(async () => cleanup([admin?.id, regular?.id, target?.id].filter((id): id is number => Boolean(id))));

  it("rejects normal users from every privileged administration route", async () => {
    const caller = appRouter.createCaller(context(regular));
    await expect(caller.admin.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.users()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.accessContent({ userId: target.id, resources: ["tasks"], reason: "Support review needed" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns metadata-only user management and requires a valid reason before private content access", async () => {
    const adminCaller = appRouter.createCaller(context(admin));
    await dexusDb.createTask(target.id, { title: `Private support task ${suffix}`, description: "Private target content", tags: [] });
    const users = await adminCaller.admin.users({ query: suffix });
    const targetMetadata = users.find((item) => item.id === target.id);
    expect(targetMetadata).toMatchObject({ id: target.id, role: "user", accountStatus: "active" });
    expect(JSON.stringify(targetMetadata)).not.toContain("Private target content");
    await expect(adminCaller.admin.accessContent({ userId: target.id, resources: ["tasks"], reason: "short" })).rejects.toBeTruthy();
    const content = await adminCaller.admin.accessContent({ userId: target.id, resources: ["tasks"], reason: "Investigating a user-reported task issue." });
    expect((content.tasks as Array<{ title: string }>).some((task) => task.title.includes(suffix))).toBe(true);
    const audit = await adminCaller.admin.auditLogs({ query: "VIEW_PRIVATE_CONTENT" });
    expect(audit.some((record) => record.adminUserId === admin.id && record.targetUserId === target.id && record.action === "VIEW_PRIVATE_CONTENT")).toBe(true);
  });

  it("logs account state changes, blocks suspended user procedures, and records soft deletion without permanent removal", async () => {
    const adminCaller = appRouter.createCaller(context(admin));
    const targetCaller = appRouter.createCaller(context(target));
    const dumpId = await dexusDb.createBrainDump(target.id, `Sensitive brain dump ${suffix}`, { tasks: [], goals: [], people: [], followups: [], knowledge: [], notes: [], events: [] });
    await adminCaller.admin.softDelete({ userId: target.id, resource: "brainDump", resourceId: dumpId, reason: "Removing corrupted support-test record." });
    expect((await dexusDb.listBrainDumps(target.id)).some((item) => item.id === dumpId)).toBe(false);
    await adminCaller.admin.setAccountStatus({ userId: target.id, status: "suspended", reason: "Temporary support investigation." });
    await expect(targetCaller.tasks.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    const currentTarget = await dexusDb.getUserById(target.id);
    expect(currentTarget?.accountStatus).toBe("suspended");
    const audit = await adminCaller.admin.auditLogs({ query: "SUSPENDED" });
    expect(audit.some((record) => record.targetUserId === target.id && record.action === "SUSPENDED")).toBe(true);
  });

  it("provides redacted operational metrics and logs private-data exports", async () => {
    const adminCaller = appRouter.createCaller(context(admin));
    const [overview, storage, ai, errors] = await Promise.all([adminCaller.admin.overview(), adminCaller.admin.storage(), adminCaller.admin.ai(), adminCaller.admin.errors()]);
    expect(overview.health.database).toBe("healthy");
    expect(storage).not.toHaveProperty("storageKey");
    expect(JSON.stringify(ai)).not.toContain("Private target content");
    expect(JSON.stringify(errors)).not.toContain("stack");
    const exported = await adminCaller.admin.exportUser({ userId: target.id, resources: ["documents"], reason: "Providing a requested administrative support export." });
    expect(exported.format).toBe("json");
    const audit = await adminCaller.admin.auditLogs({ query: "EXPORT_JSON" });
    expect(audit.some((record) => record.targetUserId === target.id && record.action === "EXPORT_JSON")).toBe(true);
  });
});
