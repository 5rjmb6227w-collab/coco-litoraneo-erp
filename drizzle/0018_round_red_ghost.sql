CREATE TABLE `strategic_phases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`orderIndex` int NOT NULL DEFAULT 0,
	`status` enum('pendente','em_andamento','concluida') NOT NULL DEFAULT 'pendente',
	`startDate` date,
	`endDate` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `strategic_phases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `strategic_project_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','editor','viewer') NOT NULL DEFAULT 'viewer',
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	`addedBy` int,
	CONSTRAINT `strategic_project_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `strategic_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(20) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`category` enum('equipamento','obra','insumo','processo','comercial','outro') NOT NULL,
	`priority` enum('critica','alta','media','baixa') NOT NULL DEFAULT 'media',
	`status` enum('planejamento','em_andamento','pausado','concluido','cancelado') NOT NULL DEFAULT 'planejamento',
	`startDate` date,
	`targetEndDate` date,
	`actualEndDate` date,
	`budgetPlanned` decimal(14,2),
	`budgetActual` decimal(14,2) DEFAULT '0.00',
	`progress` int NOT NULL DEFAULT 0,
	`ownerId` int NOT NULL,
	`photoUrl` varchar(500),
	`tags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `strategic_projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `strategic_projects_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `strategic_task_dependencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`dependsOnTaskId` int NOT NULL,
	`dependencyType` enum('FS','SS','FF','SF') NOT NULL DEFAULT 'FS',
	CONSTRAINT `strategic_task_dependencies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `strategic_task_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`projectId` int NOT NULL,
	`linkedModule` enum('compras','financeiro','orcamento','producao','qualidade','almoxarifado','produtores','cargas','pagamentos','rh','estoque','custos','lotes') NOT NULL,
	`linkedEntityType` varchar(100) NOT NULL,
	`linkedEntityId` int NOT NULL,
	`linkedEntityLabel` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	CONSTRAINT `strategic_task_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `strategic_task_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`projectId` int NOT NULL,
	`content` text NOT NULL,
	`noteType` enum('observacao','decisao','problema','mudanca','valor') NOT NULL DEFAULT 'observacao',
	`attachmentUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`createdByName` varchar(255),
	CONSTRAINT `strategic_task_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `strategic_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`phaseId` int,
	`parentTaskId` int,
	`code` varchar(20),
	`title` varchar(255) NOT NULL,
	`description` text,
	`priority` enum('critica','alta','media','baixa') NOT NULL DEFAULT 'media',
	`status` enum('a_fazer','em_andamento','aguardando','concluida','cancelada') NOT NULL DEFAULT 'a_fazer',
	`assigneeId` int,
	`assigneeName` varchar(255),
	`startDate` date,
	`dueDate` date,
	`completedAt` timestamp,
	`estimatedHours` decimal(8,2),
	`actualHours` decimal(8,2),
	`estimatedCost` decimal(14,2),
	`actualCost` decimal(14,2),
	`orderIndex` int NOT NULL DEFAULT 0,
	`tags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `strategic_tasks_id` PRIMARY KEY(`id`)
);
