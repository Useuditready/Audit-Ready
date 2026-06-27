CREATE TABLE `onboarding_checklist_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`checklistId` int NOT NULL,
	`userId` int NOT NULL,
	`staffId` int NOT NULL,
	`itemKey` varchar(64) NOT NULL,
	`label` varchar(255) NOT NULL,
	`category` enum('certification','training','background_check','documentation','insurance','other') NOT NULL,
	`isRequired` boolean NOT NULL DEFAULT true,
	`isReceived` boolean NOT NULL DEFAULT false,
	`receivedAt` timestamp,
	`expiresAt` timestamp,
	`documentNote` varchar(500),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboarding_checklist_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `onboarding_checklists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`staffId` int NOT NULL,
	`status` enum('in_progress','complete','on_hold') NOT NULL DEFAULT 'in_progress',
	`completedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboarding_checklists_id` PRIMARY KEY(`id`)
);
