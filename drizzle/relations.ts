import { relations } from "drizzle-orm";
import { brainDumps, documents, followups, goals, knowledge, notes, people, profiles, tasks, timelineEvents, users } from "./schema";

export const usersRelations = relations(users, ({ many, one }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
  tasks: many(tasks),
  goals: many(goals),
  notes: many(notes),
  knowledge: many(knowledge),
  people: many(people),
  followups: many(followups),
  timelineEvents: many(timelineEvents),
  documents: many(documents),
  brainDumps: many(brainDumps),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({ user: one(users, { fields: [profiles.userId], references: [users.id] }) }));
export const goalsRelations = relations(goals, ({ one, many }) => ({ user: one(users, { fields: [goals.userId], references: [users.id] }), tasks: many(tasks) }));
export const tasksRelations = relations(tasks, ({ one }) => ({ user: one(users, { fields: [tasks.userId], references: [users.id] }), goal: one(goals, { fields: [tasks.goalId], references: [goals.id] }) }));
export const notesRelations = relations(notes, ({ one }) => ({ user: one(users, { fields: [notes.userId], references: [users.id] }) }));
export const knowledgeRelations = relations(knowledge, ({ one }) => ({ user: one(users, { fields: [knowledge.userId], references: [users.id] }) }));
export const peopleRelations = relations(people, ({ one, many }) => ({ user: one(users, { fields: [people.userId], references: [users.id] }), followups: many(followups) }));
export const followupsRelations = relations(followups, ({ one }) => ({ user: one(users, { fields: [followups.userId], references: [users.id] }), person: one(people, { fields: [followups.personId], references: [people.id] }) }));
export const timelineRelations = relations(timelineEvents, ({ one }) => ({ user: one(users, { fields: [timelineEvents.userId], references: [users.id] }) }));
export const documentsRelations = relations(documents, ({ one }) => ({ user: one(users, { fields: [documents.userId], references: [users.id] }) }));
export const brainDumpsRelations = relations(brainDumps, ({ one }) => ({ user: one(users, { fields: [brainDumps.userId], references: [users.id] }) }));
