ALTER TABLE `users` ADD `emailVerifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerificationToken` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerificationSentAt` timestamp;