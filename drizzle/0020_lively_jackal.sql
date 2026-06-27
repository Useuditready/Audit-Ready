CREATE TABLE `commissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`repId` int NOT NULL,
	`userId` int NOT NULL,
	`repCode` varchar(32) NOT NULL,
	`setupFeeAmountCents` int NOT NULL DEFAULT 19900,
	`commissionAmountCents` int NOT NULL DEFAULT 3980,
	`status` enum('owed','paid') NOT NULL DEFAULT 'owed',
	`paidAt` timestamp,
	`stripeSessionId` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `salesReps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`code` varchar(32) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `salesReps_id` PRIMARY KEY(`id`),
	CONSTRAINT `salesReps_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `acquisitionSource` enum('direct','rep') DEFAULT 'direct';--> statement-breakpoint
ALTER TABLE `users` ADD `repCodeUsed` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `repId` int;