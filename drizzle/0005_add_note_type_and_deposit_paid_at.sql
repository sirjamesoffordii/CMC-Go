-- Migration: Add note_type to notes table and deposit_paid_at to people table
-- Task 4: PR for adding deposit_paid_at timestamp and note_type varchar columns
-- Date: 2025-12-28

-- Add note_type column to notes table
ALTER TABLE `notes` ADD COLUMN `note_type` ENUM('GENERAL', 'NEED') NOT NULL DEFAULT 'GENERAL';
-- Add deposit_paid_at column to people table
ALTER TABLE `people` ADD COLUMN `deposit_paid_at` DATETIME NULL;
