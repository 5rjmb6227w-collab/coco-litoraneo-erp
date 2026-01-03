CREATE TABLE `corrective_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nonConformityId` int NOT NULL,
	`rootCause` text NOT NULL,
	`correctiveAction` text NOT NULL,
	`responsibleId` int,
	`responsibleName` varchar(255),
	`deadline` date NOT NULL,
	`status` enum('pendente','em_andamento','concluida','verificada') NOT NULL DEFAULT 'pendente',
	`effectivenessVerified` enum('sim','nao'),
	`verificationNotes` text,
	`completedAt` timestamp,
	`completedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `corrective_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employee_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`eventDate` date NOT NULL,
	`eventType` enum('falta_justificada','falta_injustificada','atraso','saida_antecipada','hora_extra','atestado_medico') NOT NULL,
	`hoursQuantity` decimal(4,2),
	`reason` text,
	`attachmentUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	CONSTRAINT `employee_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employee_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`noteDate` date NOT NULL,
	`noteType` enum('elogio','advertencia_verbal','advertencia_escrita','feedback','observacao') NOT NULL,
	`description` text NOT NULL,
	`attachmentUrl` varchar(500),
	`visibility` enum('restrito','gestores') NOT NULL DEFAULT 'restrito',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	CONSTRAINT `employee_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalCode` varchar(50),
	`fullName` varchar(255) NOT NULL,
	`cpf` varchar(14) NOT NULL,
	`birthDate` date,
	`position` varchar(100) NOT NULL,
	`sector` enum('recepcao','producao','embalagem','expedicao','qualidade','manutencao','almoxarifado','administrativo') NOT NULL,
	`admissionDate` date NOT NULL,
	`phone` varchar(20),
	`emergencyContact` varchar(255),
	`status` enum('ativo','afastado','desligado') NOT NULL DEFAULT 'ativo',
	`terminationDate` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financial_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalCode` varchar(50),
	`entryType` enum('pagar','receber') NOT NULL,
	`origin` enum('produtor','compra','venda','outros') NOT NULL,
	`referenceType` varchar(50),
	`referenceId` int,
	`description` varchar(255) NOT NULL,
	`entityName` varchar(255),
	`value` decimal(14,2) NOT NULL,
	`dueDate` date NOT NULL,
	`status` enum('pendente','programado','pago','recebido','atrasado','cancelado') NOT NULL DEFAULT 'pendente',
	`paidAt` timestamp,
	`paidBy` int,
	`paymentMethod` enum('pix','transferencia','boleto','dinheiro','cheque'),
	`receiptUrl` varchar(500),
	`observations` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `financial_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `non_conformities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalCode` varchar(50),
	`ncNumber` varchar(20) NOT NULL,
	`identificationDate` date NOT NULL,
	`origin` enum('analise','reclamacao_cliente','auditoria','processo','fornecedor') NOT NULL,
	`relatedAnalysisId` int,
	`area` enum('recepcao','producao','embalagem','expedicao','qualidade','almoxarifado') NOT NULL,
	`description` text NOT NULL,
	`affectedProduct` varchar(255),
	`affectedQuantity` decimal(10,2),
	`immediateAction` text,
	`status` enum('aberta','em_analise','acao_corretiva','verificacao','fechada') NOT NULL DEFAULT 'aberta',
	`closedAt` timestamp,
	`closedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `non_conformities_id` PRIMARY KEY(`id`),
	CONSTRAINT `non_conformities_ncNumber_unique` UNIQUE(`ncNumber`)
);
--> statement-breakpoint
CREATE TABLE `production_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalCode` varchar(50),
	`productionDate` date NOT NULL,
	`shift` enum('manha','tarde','noite') NOT NULL,
	`line` enum('linha1','linha2','unica') DEFAULT 'unica',
	`responsibleId` int,
	`responsibleName` varchar(255),
	`skuId` int NOT NULL,
	`variation` enum('flocos','medio','fino') NOT NULL,
	`quantityProduced` decimal(10,2) NOT NULL,
	`batchNumber` varchar(50) NOT NULL,
	`losses` decimal(10,2) DEFAULT '0',
	`lossReason` enum('processo','qualidade','equipamento','materia_prima','outro'),
	`observations` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `production_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `production_issues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`occurredAt` timestamp NOT NULL,
	`shift` enum('manha','tarde','noite') NOT NULL,
	`area` enum('recepcao','producao','embalagem','expedicao','manutencao') NOT NULL,
	`tags` json NOT NULL,
	`description` text NOT NULL,
	`impact` enum('nenhum','baixo','medio','alto','parada_total') DEFAULT 'nenhum',
	`downtimeMinutes` int,
	`actionTaken` text,
	`photoUrl` varchar(500),
	`status` enum('aberto','em_tratamento','resolvido') NOT NULL DEFAULT 'aberto',
	`resolvedAt` timestamp,
	`resolvedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `production_issues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_quotation_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quotationId` int NOT NULL,
	`requestItemId` int NOT NULL,
	`unitValue` decimal(10,2) NOT NULL,
	`totalValue` decimal(10,2) NOT NULL,
	`deliveryDays` varchar(50),
	`observations` text,
	CONSTRAINT `purchase_quotation_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_quotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseRequestId` int NOT NULL,
	`supplierName` varchar(255) NOT NULL,
	`supplierCnpj` varchar(20),
	`supplierContact` varchar(255),
	`supplierPhone` varchar(20),
	`supplierEmail` varchar(320),
	`totalValue` decimal(14,2) NOT NULL,
	`deliveryDays` int,
	`paymentCondition` varchar(255),
	`observations` text,
	`quotationFileUrl` varchar(500),
	`isChosen` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	CONSTRAINT `purchase_quotations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_request_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseRequestId` int NOT NULL,
	`itemName` varchar(255) NOT NULL,
	`specification` text,
	`quantity` decimal(10,2) NOT NULL,
	`unit` varchar(20) NOT NULL,
	`estimatedValue` decimal(10,2),
	`warehouseItemId` int,
	CONSTRAINT `purchase_request_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalCode` varchar(50),
	`requestNumber` varchar(20) NOT NULL,
	`requestDate` timestamp NOT NULL DEFAULT (now()),
	`requesterId` int,
	`requesterName` varchar(255),
	`sector` enum('producao','qualidade','manutencao','administrativo','almoxarifado') NOT NULL,
	`urgency` enum('baixa','media','alta','critica') NOT NULL DEFAULT 'media',
	`deadlineDate` date,
	`status` enum('solicitado','em_cotacao','aguardando_aprovacao','aprovado','reprovado','comprado','entregue','cancelado') NOT NULL DEFAULT 'solicitado',
	`totalEstimated` decimal(14,2),
	`totalApproved` decimal(14,2),
	`chosenQuotationId` int,
	`approvedAt` timestamp,
	`approvedBy` int,
	`approvalNotes` text,
	`rejectionReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `purchase_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_requests_requestNumber_unique` UNIQUE(`requestNumber`)
);
--> statement-breakpoint
CREATE TABLE `quality_analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalCode` varchar(50),
	`analysisDate` date NOT NULL,
	`analysisType` enum('microbiologica','fisico_quimica','sensorial','outra') NOT NULL,
	`relatedTo` enum('carga_coco','lote_producao','nenhum') DEFAULT 'nenhum',
	`referenceId` int,
	`skuId` int,
	`batchNumber` varchar(50),
	`parameters` text NOT NULL,
	`results` text NOT NULL,
	`specificationLimits` text,
	`result` enum('conforme','nao_conforme','pendente') NOT NULL DEFAULT 'pendente',
	`responsibleId` int,
	`responsibleName` varchar(255),
	`observations` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `quality_analyses_id` PRIMARY KEY(`id`)
);
