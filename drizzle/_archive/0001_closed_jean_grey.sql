CREATE TABLE `queryHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`query` text NOT NULL,
	`resultCount` int DEFAULT 0,
	`executionTime` int DEFAULT 0,
	`status` enum('success','error') DEFAULT 'success',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `queryHistory_id` PRIMARY KEY(`id`)
);
