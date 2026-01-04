CREATE TABLE `ai_action_approvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actionId` int NOT NULL,
	`userId` int NOT NULL,
	`decision` enum('approved','rejected') NOT NULL,
	`reason` text,
	`decidedAt` timestamp NOT NULL DEFAULT (now()),
	`executedAt` timestamp,
	`executionResult` json,
	CONSTRAINT `ai_action_approvals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`insightId` int,
	`conversationId` int,
	`actionType` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`targetModule` varchar(50) NOT NULL,
	`targetMutation` varchar(100) NOT NULL,
	`payload` json NOT NULL,
	`status` enum('suggested','approved','rejected','executed','failed') NOT NULL DEFAULT 'suggested',
	`suggestedAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	CONSTRAINT `ai_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`insightId` int,
	`alertType` varchar(50) NOT NULL,
	`channel` enum('email','whatsapp','push','in_app') NOT NULL,
	`recipientUserId` int,
	`recipientEmail` varchar(320),
	`recipientPhone` varchar(20),
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`status` enum('pending','sent','failed','read') NOT NULL DEFAULT 'pending',
	`sentAt` timestamp,
	`readAt` timestamp,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configKey` varchar(100) NOT NULL,
	`configValue` json NOT NULL,
	`description` text,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_config_configKey_unique` UNIQUE(`configKey`)
);
--> statement-breakpoint
CREATE TABLE `ai_conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255),
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`module` varchar(50) NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` int NOT NULL,
	`producerId` int,
	`skuId` int,
	`payload` json,
	`metadata` json,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`messageId` int,
	`insightId` int,
	`feedbackType` enum('like','dislike') NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_insights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`insightType` varchar(50) NOT NULL,
	`severity` enum('info','warning','critical') NOT NULL DEFAULT 'info',
	`title` varchar(255) NOT NULL,
	`summary` text NOT NULL,
	`details` json,
	`evidenceIds` json,
	`module` varchar(50),
	`entityType` varchar(50),
	`entityId` int,
	`status` enum('active','dismissed','resolved') NOT NULL DEFAULT 'active',
	`dismissedBy` int,
	`dismissedAt` timestamp,
	`resolvedAt` timestamp,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `ai_insights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`sourceIds` json,
	`tokensUsed` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` int NOT NULL,
	`label` varchar(255) NOT NULL,
	`url` varchar(500),
	`snippet` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_sources_id` PRIMARY KEY(`id`)
);
