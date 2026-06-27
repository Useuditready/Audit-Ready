CREATE TABLE `bacb_certifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffId` int NOT NULL,
	`userId` int NOT NULL,
	`certType` enum('bcba','bcaba','rbt') NOT NULL,
	`certNumber` varchar(100),
	`issueDate` date,
	`expirationDate` date,
	`renewalCycleStartDate` date,
	`renewalCycleEndDate` date,
	`ceuRequired` int NOT NULL DEFAULT 32,
	`ceuCompleted` int NOT NULL DEFAULT 0,
	`ceuEthicsRequired` int NOT NULL DEFAULT 3,
	`ceuEthicsCompleted` int NOT NULL DEFAULT 0,
	`status` enum('current','expiring_soon','expired') NOT NULL DEFAULT 'current',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bacb_certifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ceu_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffId` int NOT NULL,
	`userId` int NOT NULL,
	`bacbCertId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`provider` varchar(255),
	`completedDate` date NOT NULL,
	`hours` int NOT NULL,
	`isEthics` boolean NOT NULL DEFAULT false,
	`certificateKey` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ceu_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supervision_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffId` int NOT NULL,
	`userId` int NOT NULL,
	`supervisorStaffId` int,
	`monthYear` varchar(7) NOT NULL,
	`totalHoursWorked` int NOT NULL,
	`supervisionHoursLogged` int NOT NULL,
	`ratioPercent` int NOT NULL,
	`isCompliant` boolean NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supervision_logs_id` PRIMARY KEY(`id`)
);
