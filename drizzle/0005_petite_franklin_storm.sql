CREATE TABLE `ai_predictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`modelType` varchar(50) NOT NULL,
	`module` varchar(50) NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` int NOT NULL,
	`period` varchar(20) NOT NULL,
	`inputJson` json NOT NULL,
	`outputJson` json NOT NULL,
	`accuracyEstimate` decimal(5,2) DEFAULT 0,
	`validationScore` decimal(5,2),
	`lastValidatedAt` timestamp,
	`feedbackAggregate` json,
	`provider` enum('local_scikit','aws_sagemaker','hybrid') NOT NULL DEFAULT 'local_scikit',
	`executionTimeMs` int,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_predictions_id` PRIMARY KEY(`id`)
);
