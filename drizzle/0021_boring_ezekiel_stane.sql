CREATE TABLE `notification_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientType` enum('admin','rep','agency') NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`eventType` varchar(64) NOT NULL,
	`deliveryStatus` enum('sent','failed','skipped') NOT NULL DEFAULT 'sent',
	`agencyId` int,
	`credentialId` int,
	`repId` int,
	`metadata` json,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`emailEnabled` boolean NOT NULL DEFAULT true,
	`credentialReminderDays` int NOT NULL DEFAULT 30,
	`billingNotifications` boolean NOT NULL DEFAULT true,
	`repCommissionAlerts` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_preferences_userId_unique` UNIQUE(`userId`)
);
