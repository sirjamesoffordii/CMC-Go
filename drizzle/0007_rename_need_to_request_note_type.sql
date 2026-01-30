-- Migration: Rename note_type enum value from NEED to REQUEST
-- This migration updates the note_type enum in the notes table

-- Step 1: Add REQUEST as a valid enum value
ALTER TABLE `notes` MODIFY COLUMN `note_type` ENUM('GENERAL', 'NEED', 'REQUEST') NOT NULL DEFAULT 'GENERAL';

-- Step 2: Update existing NEED values to REQUEST
UPDATE `notes` SET `note_type` = 'REQUEST' WHERE `note_type` = 'NEED';

-- Step 3: Remove NEED from the enum (leaving only GENERAL and REQUEST)
ALTER TABLE `notes` MODIFY COLUMN `note_type` ENUM('GENERAL', 'REQUEST') NOT NULL DEFAULT 'GENERAL';
