CREATE TABLE `importLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`importType` enum('staff','credential') NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`totalRows` int NOT NULL DEFAULT 0,
	`inserted` int NOT NULL DEFAULT 0,
	`failed` int NOT NULL DEFAULT 0,
	`errorSummary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `importLogs_id` PRIMARY KEY(`id`)
);
