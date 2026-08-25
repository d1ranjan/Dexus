CREATE TABLE `adminAuditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminUserId` int NOT NULL,
	`targetUserId` int,
	`resource` varchar(64) NOT NULL,
	`action` varchar(64) NOT NULL,
	`reason` text NOT NULL,
	`requestId` varchar(120),
	`metadata` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adminAuditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aiRequestLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`requestType` varchar(64) NOT NULL,
	`status` enum('success','failure') NOT NULL,
	`durationMs` int NOT NULL,
	`promptTokens` int,
	`completionTokens` int,
	`errorCategory` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiRequestLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `systemErrors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`feature` varchar(80) NOT NULL,
	`severity` enum('info','warning','error','critical') NOT NULL DEFAULT 'error',
	`safeMessage` text NOT NULL,
	`requestId` varchar(120),
	`status` enum('open','resolved') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `systemErrors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `brainDumps` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `brainDumps` ADD `deletedReason` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `fileSize` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `documents` ADD `deletedReason` text;--> statement-breakpoint
ALTER TABLE `users` ADD `accountStatus` enum('active','suspended','deactivated') DEFAULT 'active' NOT NULL;--> statement-breakpoint
CREATE INDEX `audit_admin_created_idx` ON `adminAuditLogs` (`adminUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `audit_target_created_idx` ON `adminAuditLogs` (`targetUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `audit_action_created_idx` ON `adminAuditLogs` (`action`,`createdAt`);--> statement-breakpoint
CREATE INDEX `ai_status_created_idx` ON `aiRequestLogs` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `ai_user_created_idx` ON `aiRequestLogs` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `errors_status_created_idx` ON `systemErrors` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `errors_feature_created_idx` ON `systemErrors` (`feature`,`createdAt`);--> statement-breakpoint
CREATE INDEX `brain_dumps_deleted_idx` ON `brainDumps` (`deletedAt`);--> statement-breakpoint
CREATE INDEX `documents_deleted_idx` ON `documents` (`deletedAt`);