CREATE TABLE `pilot_signups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`agencyName` varchar(255) NOT NULL,
	`agencySize` varchar(64),
	`plan` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pilot_signups_id` PRIMARY KEY(`id`)
);
