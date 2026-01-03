CREATE TABLE `login_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`success` boolean NOT NULL,
	`ipAddress` varchar(45),
	`userAgent` text,
	`failReason` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `login_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `security_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alertType` enum('login_bloqueado','login_fora_horario','acesso_negado','multiplas_sessoes','reset_senha') NOT NULL,
	`priority` enum('baixa','media','alta') NOT NULL,
	`userId` int,
	`userName` varchar(255),
	`description` text NOT NULL,
	`ipAddress` varchar(45),
	`isRead` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`readBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `security_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(100) NOT NULL,
	`settingValue` text NOT NULL,
	`settingType` enum('string','number','boolean','json') NOT NULL DEFAULT 'string',
	`category` varchar(50) NOT NULL,
	`description` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `system_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_settings_settingKey_unique` UNIQUE(`settingKey`)
);
--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`loginAt` timestamp NOT NULL DEFAULT (now()),
	`logoutAt` timestamp,
	`lastActivityAt` timestamp NOT NULL DEFAULT (now()),
	`durationMinutes` int,
	`ipAddress` varchar(45),
	`userAgent` text,
	`currentModule` varchar(100),
	`logoutReason` enum('manual','timeout','forcado','expirado'),
	`isActive` boolean NOT NULL DEFAULT true,
	CONSTRAINT `user_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_sessions_sessionId_unique` UNIQUE(`sessionId`)
);
