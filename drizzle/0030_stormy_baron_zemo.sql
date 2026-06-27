CREATE TABLE `oig_batch_checks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`runAt` timestamp NOT NULL DEFAULT (now()),
	`totalStaff` int NOT NULL DEFAULT 0,
	`cleared` int NOT NULL DEFAULT 0,
	`flagged` int NOT NULL DEFAULT 0,
	`errors` int NOT NULL DEFAULT 0,
	`results` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `oig_batch_checks_id` PRIMARY KEY(`id`)
);
