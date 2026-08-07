CREATE TABLE `sessions` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastActivityAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`revokedAt` timestamp,
	`userAgent` varchar(500),
	`ipAddress` varchar(64),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
