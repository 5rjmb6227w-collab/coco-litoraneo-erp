ALTER TABLE `ai_sources` ADD `attachmentUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `ai_sources` ADD `attachmentType` enum('image','pdf','document','video','audio');--> statement-breakpoint
ALTER TABLE `ai_sources` ADD `extractedText` text;--> statement-breakpoint
ALTER TABLE `ai_sources` ADD `extractedEntities` json;--> statement-breakpoint
ALTER TABLE `ai_sources` ADD `boundingBoxes` json;--> statement-breakpoint
ALTER TABLE `ai_sources` ADD `confidenceScore` decimal(5,4);--> statement-breakpoint
ALTER TABLE `ai_sources` ADD `processingStatus` enum('pending','processing','completed','failed') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `ai_sources` ADD `processingError` text;--> statement-breakpoint
ALTER TABLE `ai_sources` ADD `processedAt` timestamp;--> statement-breakpoint
ALTER TABLE `ai_sources` ADD `processedBy` varchar(50);