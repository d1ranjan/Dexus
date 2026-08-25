ALTER TABLE `knowledge` MODIFY COLUMN `tags` json NOT NULL;--> statement-breakpoint
ALTER TABLE `notes` MODIFY COLUMN `tags` json NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` MODIFY COLUMN `tags` json NOT NULL;