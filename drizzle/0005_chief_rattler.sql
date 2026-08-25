CREATE TABLE `authIdentities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` varchar(32) NOT NULL,
	`providerUserId` varchar(128) NOT NULL,
	`providerEmail` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastAuthenticatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `authIdentities_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_identity_provider_subject_unique` UNIQUE(`provider`,`providerUserId`),
	CONSTRAINT `auth_identity_user_provider_unique` UNIQUE(`userId`,`provider`)
);
--> statement-breakpoint
CREATE INDEX `auth_identity_email_idx` ON `authIdentities` (`providerEmail`);