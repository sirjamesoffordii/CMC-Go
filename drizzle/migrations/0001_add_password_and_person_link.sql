--> statement-breakpoint
ALTER TABLE `users`
  ADD COLUMN `passwordHash` varchar(255) NULL,
  ADD COLUMN `personId` varchar(64) NULL,
  ADD COLUMN `roleLabel` varchar(255) NULL;
