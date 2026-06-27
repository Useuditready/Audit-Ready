CREATE TABLE `demo_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`agencyName` varchar(255) NOT NULL,
	`agencySize` varchar(64),
	`message` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `demo_requests_id` PRIMARY KEY(`id`)
);
