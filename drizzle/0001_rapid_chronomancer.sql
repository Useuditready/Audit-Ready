CREATE TABLE `credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffId` int NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(150) NOT NULL,
	`category` enum('license','certification','training','background_check','insurance','other') NOT NULL DEFAULT 'license',
	`issuingBody` varchar(200),
	`licenseNumber` varchar(100),
	`issueDate` date,
	`expirationDate` date,
	`status` enum('current','expiring_soon','expired','not_applicable') NOT NULL DEFAULT 'current',
	`documentUrl` text,
	`notes` text,
	`verified` boolean DEFAULT false,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `credentials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staff` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`role` varchar(100),
	`hireDate` date,
	`status` enum('active','inactive','terminated') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staff_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `agencyName` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `plan` enum('starter','growth','enterprise') DEFAULT 'starter';