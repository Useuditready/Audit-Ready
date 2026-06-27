CREATE TABLE `pilot_email_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`emailType` enum('activation','day11_warning','day13_warning','day14_expired') NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`recipientEmail` varchar(320) NOT NULL,
	CONSTRAINT `pilot_email_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pilot_signups` ADD `status` enum('pending','approved','rejected') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `pilot_signups` ADD `reviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `pilot_signups` ADD `reviewedBy` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `accountStatus` enum('pending','active_pilot','read_only','locked','subscribed') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `pilotActivatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `pilotExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `gracePeriodEndsAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `pilotSignupId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `subscribedAt` timestamp;