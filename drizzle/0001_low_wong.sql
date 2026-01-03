CREATE TABLE `attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` varchar(500) NOT NULL,
	`fileType` varchar(50) NOT NULL,
	`fileSize` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	CONSTRAINT `attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`userName` varchar(255),
	`action` varchar(50) NOT NULL,
	`module` varchar(50) NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` int,
	`fieldName` varchar(100),
	`oldValue` text,
	`newValue` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	`details` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coconut_loads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalCode` varchar(50),
	`receivedAt` timestamp NOT NULL,
	`producerId` int NOT NULL,
	`licensePlate` varchar(10) NOT NULL,
	`driverName` varchar(255),
	`grossWeight` decimal(10,2) NOT NULL,
	`tareWeight` decimal(10,2) NOT NULL,
	`netWeight` decimal(10,2) NOT NULL,
	`observations` text,
	`photoUrl` varchar(500),
	`status` enum('recebido','conferido','fechado') NOT NULL DEFAULT 'recebido',
	`closedAt` timestamp,
	`closedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `coconut_loads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finished_goods_inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`skuId` int NOT NULL,
	`batchNumber` varchar(50) NOT NULL,
	`productionDate` date NOT NULL,
	`expirationDate` date NOT NULL,
	`quantity` decimal(10,2) NOT NULL,
	`status` enum('disponivel','reservado','vencido') NOT NULL DEFAULT 'disponivel',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `finished_goods_inventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finished_goods_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`skuId` int NOT NULL,
	`inventoryId` int,
	`movementType` enum('entrada','saida','ajuste') NOT NULL,
	`quantity` decimal(10,2) NOT NULL,
	`batchNumber` varchar(50),
	`reason` varchar(100) NOT NULL,
	`referenceType` varchar(50),
	`referenceId` int,
	`customerDestination` varchar(255),
	`observations` text,
	`previousStock` decimal(10,2) NOT NULL,
	`newStock` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	CONSTRAINT `finished_goods_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `producer_payables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalCode` varchar(50),
	`coconutLoadId` int NOT NULL,
	`producerId` int NOT NULL,
	`netWeight` decimal(10,2) NOT NULL,
	`pricePerKg` decimal(10,2) NOT NULL,
	`discountPercent` decimal(5,2) DEFAULT '0',
	`discountKg` decimal(10,2) DEFAULT '0',
	`payableWeight` decimal(10,2) NOT NULL,
	`totalValue` decimal(14,2) NOT NULL,
	`dueDate` date,
	`status` enum('pendente','aprovado','programado','pago') NOT NULL DEFAULT 'pendente',
	`approvedAt` timestamp,
	`approvedBy` int,
	`scheduledAt` timestamp,
	`scheduledBy` int,
	`paidAt` timestamp,
	`paidBy` int,
	`paymentMethod` enum('pix','transferencia','boleto','dinheiro','cheque'),
	`receiptUrl` varchar(500),
	`observations` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `producer_payables_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `producers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalCode` varchar(50),
	`name` varchar(255) NOT NULL,
	`cpfCnpj` varchar(20) NOT NULL,
	`phone` varchar(20),
	`email` varchar(320),
	`address` text,
	`bank` varchar(100),
	`agency` varchar(20),
	`account` varchar(30),
	`accountType` enum('corrente','poupanca'),
	`pixKey` varchar(255),
	`defaultPricePerKg` decimal(10,2) NOT NULL,
	`defaultDiscountPercent` decimal(5,2) DEFAULT '0',
	`status` enum('ativo','inativo') NOT NULL DEFAULT 'ativo',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `producers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skus` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalCode` varchar(50),
	`code` varchar(20) NOT NULL,
	`description` varchar(255) NOT NULL,
	`category` enum('seco','umido','adocado') NOT NULL,
	`variation` enum('flocos','medio','fino') NOT NULL,
	`packageWeight` decimal(10,2) NOT NULL,
	`packageType` varchar(100),
	`minimumStock` decimal(10,2) NOT NULL,
	`currentStock` decimal(10,2) NOT NULL DEFAULT '0',
	`shelfLifeDays` int NOT NULL,
	`suggestedPrice` decimal(10,2),
	`status` enum('ativo','inativo') NOT NULL DEFAULT 'ativo',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `skus_id` PRIMARY KEY(`id`),
	CONSTRAINT `skus_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `warehouse_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalCode` varchar(50),
	`internalCode` varchar(20) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`unit` enum('kg','litro','unidade','metro','rolo') NOT NULL,
	`warehouseType` enum('producao','geral') NOT NULL,
	`category` varchar(100) NOT NULL,
	`minimumStock` decimal(10,2) NOT NULL,
	`currentStock` decimal(10,2) NOT NULL DEFAULT '0',
	`defaultSupplier` varchar(255),
	`location` varchar(100),
	`status` enum('ativo','inativo') NOT NULL DEFAULT 'ativo',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `warehouse_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `warehouse_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`warehouseItemId` int NOT NULL,
	`movementType` enum('entrada','saida','ajuste') NOT NULL,
	`quantity` decimal(10,2) NOT NULL,
	`reason` varchar(100) NOT NULL,
	`observations` text,
	`previousStock` decimal(10,2) NOT NULL,
	`newStock` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	CONSTRAINT `warehouse_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','ceo','recebimento','producao','almox_prod','almox_geral','qualidade','compras','financeiro','rh','consulta') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `sector` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('ativo','inativo','bloqueado') DEFAULT 'ativo' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `forcePasswordChange` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `users` ADD `accessStartDate` date;--> statement-breakpoint
ALTER TABLE `users` ADD `accessExpirationDate` date;