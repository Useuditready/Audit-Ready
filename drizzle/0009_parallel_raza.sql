CREATE TABLE `verificationChecks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`staffId` int NOT NULL,
	`credentialId` int,
	`source` enum('bacb','oig_leie','npi') NOT NULL,
	`queryFirstName` varchar(100) NOT NULL,
	`queryLastName` varchar(100) NOT NULL,
	`queryLicenseNumber` varchar(100),
	`rawResult` text,
	`matchCount` int DEFAULT 0,
	`status` enum('not_checked','verified','needs_review','not_found','manual_review_required') NOT NULL DEFAULT 'not_checked',
	`reviewedBy` varchar(255),
	`reviewedAt` timestamp,
	`reviewNote` text,
	`checkedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `verificationChecks_id` PRIMARY KEY(`id`)
);
