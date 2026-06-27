ALTER TABLE `users` ADD `deletionRequestedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `deletionReason` varchar(500);