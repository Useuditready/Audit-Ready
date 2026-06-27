ALTER TABLE `credentials` ADD `documentLink` text;--> statement-breakpoint
ALTER TABLE `credentials` ADD `verificationStatus` enum('pending','approved','rejected','needs_update') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `credentials` ADD `verifiedBy` varchar(255);--> statement-breakpoint
ALTER TABLE `credentials` ADD `verificationDate` timestamp;--> statement-breakpoint
ALTER TABLE `credentials` ADD `verificationNotes` text;--> statement-breakpoint
ALTER TABLE `credentials` DROP COLUMN `documentUrl`;--> statement-breakpoint
ALTER TABLE `credentials` DROP COLUMN `verified`;--> statement-breakpoint
ALTER TABLE `credentials` DROP COLUMN `verifiedAt`;