CREATE TABLE `magic_moments_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`momentType` varchar(50) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`channels` json,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `magic_moments_config_id` PRIMARY KEY(`id`)
);
