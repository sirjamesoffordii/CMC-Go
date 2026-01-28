-- Migration: Add displayOrder column to campuses table
-- Issue: #295 - Campus management mutations (reorder feature)
-- Date: 2026-01-27

-- Add displayOrder column to campuses table for visual ordering within a district
ALTER TABLE `campuses` ADD COLUMN `displayOrder` INT NOT NULL DEFAULT 0;
