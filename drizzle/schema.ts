import { boolean, index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(), openId: varchar("openId", { length: 64 }).notNull().unique(), name: text("name"), email: varchar("email", { length: 320 }), loginMethod: varchar("loginMethod", { length: 64 }), role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(), accountStatus: mysqlEnum("accountStatus", ["active", "suspended", "deactivated"]).default("active").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/**
 * External authentication identities are deliberately separate from Dexus users.
 * Every product table continues to reference users.id, so changing or adding an
 * authentication provider never changes a person’s Dexus data relationships.
 */
export const authIdentities = mysqlTable("authIdentities", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  provider: varchar("provider", { length: 32 }).notNull(),
  providerUserId: varchar("providerUserId", { length: 128 }).notNull(),
  providerEmail: varchar("providerEmail", { length: 320 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastAuthenticatedAt: timestamp("lastAuthenticatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("auth_identity_provider_subject_unique").on(table.provider, table.providerUserId),
  uniqueIndex("auth_identity_user_provider_unique").on(table.userId, table.provider),
  index("auth_identity_email_idx").on(table.providerEmail),
]);

export const profiles = mysqlTable("profiles", { id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), displayName: varchar("displayName", { length: 120 }), avatarUrl: text("avatarUrl"), timezone: varchar("timezone", { length: 80 }).default("UTC").notNull(), defaultPriority: mysqlEnum("defaultPriority", ["low", "medium", "high"]).default("medium").notNull(), appearance: mysqlEnum("appearance", ["system", "light", "dark"]).default("system").notNull(), aiSuggestionsEnabled: boolean("aiSuggestionsEnabled").default(true).notNull(), notificationsEnabled: boolean("notificationsEnabled").default(true).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull() }, (table) => [uniqueIndex("profiles_user_unique").on(table.userId)]);

export const goals = mysqlTable("goals", { id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), title: varchar("title", { length: 255 }).notNull(), description: text("description"), category: varchar("category", { length: 80 }), progress: int("progress").default(0).notNull(), targetDate: timestamp("targetDate"), status: mysqlEnum("status", ["active", "paused", "completed", "abandoned"]).default("active").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull() }, (table) => [index("goals_user_created_idx").on(table.userId, table.createdAt)]);

export const tasks = mysqlTable("tasks", { id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), goalId: int("goalId"), title: varchar("title", { length: 255 }).notNull(), description: text("description"), status: mysqlEnum("status", ["open", "completed", "archived"]).default("open").notNull(), priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium").notNull(), category: varchar("category", { length: 80 }), dueDate: timestamp("dueDate"), dueTime: varchar("dueTime", { length: 20 }), tags: json("tags").$type<string[]>().notNull(), source: varchar("source", { length: 40 }).default("manual").notNull(), completedAt: timestamp("completedAt"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull() }, (table) => [index("tasks_user_status_idx").on(table.userId, table.status), index("tasks_goal_idx").on(table.goalId)]);

export const notes = mysqlTable("notes", { id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), title: varchar("title", { length: 255 }).notNull(), content: text("content").notNull(), category: varchar("category", { length: 80 }), tags: json("tags").$type<string[]>().notNull(), source: varchar("source", { length: 40 }).default("manual").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull() }, (table) => [index("notes_user_created_idx").on(table.userId, table.createdAt)]);

export const knowledge = mysqlTable("knowledge", { id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), title: varchar("title", { length: 255 }).notNull(), content: text("content").notNull(), category: varchar("category", { length: 80 }), tags: json("tags").$type<string[]>().notNull(), source: varchar("source", { length: 40 }).default("manual").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull() }, (table) => [index("knowledge_user_created_idx").on(table.userId, table.createdAt)]);

export const people = mysqlTable("people", { id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), name: varchar("name", { length: 160 }).notNull(), context: text("context"), notes: text("notes"), lastInteractionAt: timestamp("lastInteractionAt"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull() }, (table) => [index("people_user_name_idx").on(table.userId, table.name)]);

export const followups = mysqlTable("followups", { id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), personId: int("personId").notNull(), action: varchar("action", { length: 255 }).notNull(), dueDate: timestamp("dueDate"), status: mysqlEnum("status", ["open", "completed", "snoozed"]).default("open").notNull(), completedAt: timestamp("completedAt"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull() }, (table) => [index("followups_user_status_idx").on(table.userId, table.status), index("followups_person_idx").on(table.personId)]);

export const timelineEvents = mysqlTable("timelineEvents", { id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), eventType: varchar("eventType", { length: 48 }).notNull(), title: varchar("title", { length: 255 }).notNull(), description: text("description"), relatedEntityType: varchar("relatedEntityType", { length: 48 }), relatedEntityId: int("relatedEntityId"), occurredAt: timestamp("occurredAt").defaultNow().notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() }, (table) => [index("timeline_user_occurred_idx").on(table.userId, table.occurredAt)]);

export const documents = mysqlTable("documents", { id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), filename: varchar("filename", { length: 255 }).notNull(), fileType: varchar("fileType", { length: 100 }).notNull(), storageKey: text("storageKey").notNull(), storageUrl: text("storageUrl").notNull(), extractedText: text("extractedText"), summary: text("summary"), fileSize: int("fileSize").default(0).notNull(), deletedAt: timestamp("deletedAt"), deletedReason: text("deletedReason"), createdAt: timestamp("createdAt").defaultNow().notNull() }, (table) => [index("documents_user_created_idx").on(table.userId, table.createdAt), index("documents_deleted_idx").on(table.deletedAt)]);

export const brainDumps = mysqlTable("brainDumps", { id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), originalText: text("originalText").notNull(), processedText: text("processedText"), aiResponse: text("aiResponse"), deletedAt: timestamp("deletedAt"), deletedReason: text("deletedReason"), createdAt: timestamp("createdAt").defaultNow().notNull() }, (table) => [index("brain_dumps_user_created_idx").on(table.userId, table.createdAt), index("brain_dumps_deleted_idx").on(table.deletedAt)]);

export const adminAuditLogs = mysqlTable("adminAuditLogs", { id: int("id").autoincrement().primaryKey(), adminUserId: int("adminUserId").notNull(), targetUserId: int("targetUserId"), resource: varchar("resource", { length: 64 }).notNull(), action: varchar("action", { length: 64 }).notNull(), reason: text("reason").notNull(), requestId: varchar("requestId", { length: 120 }), metadata: json("metadata").$type<Record<string, unknown>>().notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() }, (table) => [index("audit_admin_created_idx").on(table.adminUserId, table.createdAt), index("audit_target_created_idx").on(table.targetUserId, table.createdAt), index("audit_action_created_idx").on(table.action, table.createdAt)]);

export const aiRequestLogs = mysqlTable("aiRequestLogs", { id: int("id").autoincrement().primaryKey(), userId: int("userId"), requestType: varchar("requestType", { length: 64 }).notNull(), status: mysqlEnum("status", ["success", "failure"]).notNull(), durationMs: int("durationMs").notNull(), promptTokens: int("promptTokens"), completionTokens: int("completionTokens"), errorCategory: varchar("errorCategory", { length: 100 }), createdAt: timestamp("createdAt").defaultNow().notNull() }, (table) => [index("ai_status_created_idx").on(table.status, table.createdAt), index("ai_user_created_idx").on(table.userId, table.createdAt)]);

export const systemErrors = mysqlTable("systemErrors", { id: int("id").autoincrement().primaryKey(), userId: int("userId"), feature: varchar("feature", { length: 80 }).notNull(), severity: mysqlEnum("severity", ["info", "warning", "error", "critical"]).default("error").notNull(), safeMessage: text("safeMessage").notNull(), requestId: varchar("requestId", { length: 120 }), status: mysqlEnum("status", ["open", "resolved"]).default("open").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), resolvedAt: timestamp("resolvedAt") }, (table) => [index("errors_status_created_idx").on(table.status, table.createdAt), index("errors_feature_created_idx").on(table.feature, table.createdAt)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type AuthIdentity = typeof authIdentities.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Knowledge = typeof knowledge.$inferSelect;
export type Person = typeof people.$inferSelect;
export type Followup = typeof followups.$inferSelect;
export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type BrainDump = typeof brainDumps.$inferSelect;
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
