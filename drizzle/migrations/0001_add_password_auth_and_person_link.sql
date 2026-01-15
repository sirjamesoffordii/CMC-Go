-- Add password auth + person linking to users
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` varchar(64) NOT NULL;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `passwordHash` varchar(255);
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `roleTitle` varchar(255);
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `linkedPersonId` varchar(64);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `campusId` int NULL;
