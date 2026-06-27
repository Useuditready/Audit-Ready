CREATE TABLE `ai_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`plan` varchar(32) NOT NULL,
	`month_key` varchar(7) NOT NULL,
	`question_count` int NOT NULL DEFAULT 0,
	`reset_date` varchar(10),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_usage_id` PRIMARY KEY(`id`)
);
