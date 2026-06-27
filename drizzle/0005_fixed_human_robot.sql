CREATE TABLE `emailReminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`credentialId` int NOT NULL,
	`userId` int NOT NULL,
	`daysBeforeExpiry` int NOT NULL,
	`expirationDate` date NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`recipientEmail` varchar(320) NOT NULL,
	CONSTRAINT `emailReminders_id` PRIMARY KEY(`id`)
);
