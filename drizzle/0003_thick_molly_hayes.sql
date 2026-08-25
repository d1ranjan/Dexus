CREATE INDEX `brain_dumps_user_created_idx` ON `brainDumps` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `documents_user_created_idx` ON `documents` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `followups_user_status_idx` ON `followups` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `followups_person_idx` ON `followups` (`personId`);--> statement-breakpoint
CREATE INDEX `goals_user_created_idx` ON `goals` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `knowledge_user_created_idx` ON `knowledge` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `notes_user_created_idx` ON `notes` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `people_user_name_idx` ON `people` (`userId`,`name`);--> statement-breakpoint
CREATE INDEX `tasks_user_status_idx` ON `tasks` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `tasks_goal_idx` ON `tasks` (`goalId`);--> statement-breakpoint
CREATE INDEX `timeline_user_occurred_idx` ON `timelineEvents` (`userId`,`occurredAt`);