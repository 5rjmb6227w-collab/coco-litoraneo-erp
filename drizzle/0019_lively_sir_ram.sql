CREATE TABLE `strategic_task_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`projectId` int NOT NULL,
	`authorId` int NOT NULL,
	`authorName` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`mentions` json,
	`parentCommentId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `strategic_task_comments_id` PRIMARY KEY(`id`)
);
