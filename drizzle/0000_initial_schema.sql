CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` varchar(255),
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `districts` (
	`id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`region` varchar(255) NOT NULL,
	`leftNeighbor` varchar(64),
	`rightNeighbor` varchar(64),
	CONSTRAINT `districts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campuses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`districtId` varchar(64) NOT NULL,
	CONSTRAINT `campuses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` int AUTO_INCREMENT NOT NULL,
	`personId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`primaryRole` varchar(255),
	`primaryCampusId` int,
	`primaryDistrictId` varchar(64),
	`primaryRegion` varchar(255),
	`nationalCategory` varchar(255),
	`status` enum('Yes','Maybe','No','Not Invited') NOT NULL DEFAULT 'Not Invited',
	`depositPaid` boolean NOT NULL DEFAULT false,
	`statusLastUpdated` timestamp,
	`statusLastUpdatedBy` varchar(255),
	`needs` text,
	`notes` text,
	`spouse` varchar(255),
	`kids` varchar(10),
	`guests` varchar(10),
	`childrenAges` text,
	`lastEdited` timestamp,
	`lastEditedBy` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `people_id` PRIMARY KEY(`id`),
	CONSTRAINT `people_personId_unique` UNIQUE(`personId`)
);
--> statement-breakpoint
CREATE TABLE `assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`personId` varchar(64) NOT NULL,
	`assignmentType` enum('Campus','District','Region','National') NOT NULL,
	`roleTitle` varchar(255) NOT NULL,
	`campusId` int,
	`districtId` varchar(64),
	`region` varchar(255),
	`isPrimary` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `needs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`personId` varchar(64) NOT NULL,
	`description` text NOT NULL,
	`amount` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `needs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`personId` varchar(64) NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` varchar(255),
	CONSTRAINT `notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` varchar(255) NOT NULL,
	`value` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_key` PRIMARY KEY(`key`)
);

