-- Migration: Add archived flag and archivedAt timestamp to campuses table
-- Issue: #308 - Server: Add archived flag to campuses schema

-- Add archived column with default false
ALTER TABLE `campuses` ADD COLUMN `archived` BOOLEAN NOT NULL DEFAULT false;

-- Add archivedAt timestamp for audit trail
ALTER TABLE `campuses` ADD COLUMN `archivedAt` TIMESTAMP NULL;

-- Add index for filtering archived campuses
CREATE INDEX `campuses_archived_idx` ON `campuses` (`archived`);
