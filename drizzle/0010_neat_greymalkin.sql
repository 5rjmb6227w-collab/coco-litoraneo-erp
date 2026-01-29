CREATE TABLE `change_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tableName` varchar(100) NOT NULL,
	`recordId` int NOT NULL,
	`action` enum('create','update','delete') NOT NULL,
	`fieldName` varchar(100),
	`oldValue` text,
	`newValue` text,
	`changedAt` timestamp NOT NULL DEFAULT (now()),
	`changedBy` int,
	`ipAddress` varchar(45),
	`userAgent` text,
	CONSTRAINT `change_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fixed_costs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('aluguel','energia','agua','gas','internet','telefone','manutencao','seguro','impostos','salarios','beneficios','depreciacao','limpeza','seguranca','outros') NOT NULL,
	`description` varchar(255) NOT NULL,
	`monthlyValue` decimal(14,2) NOT NULL,
	`effectiveFrom` date NOT NULL,
	`effectiveTo` date,
	`allocationMethod` enum('direto','proporcional_producao','proporcional_horas','fixo') DEFAULT 'proporcional_producao',
	`allocationPercentage` decimal(5,2) DEFAULT '100',
	`observations` text,
	`active` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `fixed_costs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`emailEnabled` boolean DEFAULT true,
	`pushEnabled` boolean DEFAULT true,
	`whatsappEnabled` boolean DEFAULT false,
	`stockAlerts` boolean DEFAULT true,
	`expirationAlerts` boolean DEFAULT true,
	`paymentAlerts` boolean DEFAULT true,
	`productionAlerts` boolean DEFAULT true,
	`qualityAlerts` boolean DEFAULT true,
	`systemAlerts` boolean DEFAULT true,
	`quietHoursStart` varchar(5),
	`quietHoursEnd` varchar(5),
	`dailySummary` boolean DEFAULT true,
	`weeklySummary` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_preferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('supplier','producer','sku') NOT NULL,
	`entityId` int NOT NULL,
	`skuId` int,
	`price` decimal(14,4) NOT NULL,
	`unit` varchar(20) NOT NULL,
	`effectiveDate` date NOT NULL,
	`endDate` date,
	`source` varchar(100),
	`sourceId` int,
	`observations` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	CONSTRAINT `price_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `producer_rankings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`producerId` int NOT NULL,
	`period` varchar(7) NOT NULL,
	`totalLoads` int DEFAULT 0,
	`totalWeight` decimal(14,2) DEFAULT '0',
	`avgWeightPerLoad` decimal(10,2) DEFAULT '0',
	`avgQualityScore` decimal(5,2),
	`qualityALoads` int DEFAULT 0,
	`qualityBLoads` int DEFAULT 0,
	`qualityCLoads` int DEFAULT 0,
	`rejectedLoads` int DEFAULT 0,
	`totalPaid` decimal(14,2) DEFAULT '0',
	`avgPricePerKg` decimal(10,4) DEFAULT '0',
	`volumeRank` int,
	`qualityRank` int,
	`overallRank` int,
	`overallScore` decimal(5,2),
	`calculatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `producer_rankings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` varchar(255) NOT NULL,
	`auth` varchar(255) NOT NULL,
	`deviceType` varchar(50),
	`deviceName` varchar(100),
	`active` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastUsedAt` timestamp,
	CONSTRAINT `push_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `qr_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('batch','load','product','equipment') NOT NULL,
	`entityId` int NOT NULL,
	`code` varchar(100) NOT NULL,
	`data` json,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`generatedBy` int,
	`printedAt` timestamp,
	`printedBy` int,
	`scannedCount` int DEFAULT 0,
	`lastScannedAt` timestamp,
	`active` boolean DEFAULT true,
	CONSTRAINT `qr_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `qr_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `user_active_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionToken` varchar(255) NOT NULL,
	`refreshToken` varchar(255),
	`deviceInfo` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	`lastActivityAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`isValid` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_active_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_active_sessions_sessionToken_unique` UNIQUE(`sessionToken`)
);
--> statement-breakpoint
CREATE TABLE `user_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`passwordSalt` varchar(64) NOT NULL,
	`passwordChangedAt` timestamp NOT NULL DEFAULT (now()),
	`passwordHistory` json,
	`failedLoginAttempts` int DEFAULT 0,
	`lockedUntil` timestamp,
	`mustChangePassword` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_credentials_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `user_credentials_email_unique` UNIQUE(`email`)
);
