-- Add MESSAGE to note_type enum for community-to-person messages
ALTER TABLE `notes` MODIFY COLUMN `note_type` ENUM('GENERAL', 'REQUEST', 'MESSAGE') NOT NULL DEFAULT 'GENERAL';
