-- Add missing household and family fields to people table
-- Migration script will handle duplicate column errors gracefully
ALTER TABLE `people` ADD COLUMN `householdId` int;
--> statement-breakpoint
ALTER TABLE `people` ADD COLUMN `householdRole` enum('primary','member') DEFAULT 'primary';
--> statement-breakpoint
ALTER TABLE `people` ADD COLUMN `spouseAttending` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE `people` ADD COLUMN `childrenCount` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `people` ADD COLUMN `guestsCount` int NOT NULL DEFAULT 0;
