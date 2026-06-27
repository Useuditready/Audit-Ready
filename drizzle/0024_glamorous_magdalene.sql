CREATE TABLE `note_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`staffId` int NOT NULL,
	`weekOf` date NOT NULL,
	`sessionsHeld` int NOT NULL DEFAULT 0,
	`notesCompleted` int NOT NULL DEFAULT 0,
	`notesPending` int NOT NULL DEFAULT 0,
	`notesLate` int NOT NULL DEFAULT 0,
	`supervisorReviewed` boolean NOT NULL DEFAULT false,
	`reviewedAt` timestamp,
	`reviewerName` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `note_logs_id` PRIMARY KEY(`id`)
);
