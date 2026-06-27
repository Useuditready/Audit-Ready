CREATE TABLE `auditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`entityType` enum('staff','credential') NOT NULL,
	`entityId` int NOT NULL,
	`action` enum('create','update','delete','verify') NOT NULL,
	`changedBy` varchar(255) NOT NULL,
	`changedAt` timestamp NOT NULL DEFAULT (now()),
	`fieldChanged` varchar(100),
	`oldValue` text,
	`newValue` text,
	`summary` text,
	CONSTRAINT `auditLog_id` PRIMARY KEY(`id`)
);
