-- Migration: Rename need type 'Financial' to 'Registration'
-- This changes the enum value in the needs table type column.

-- Step 1: Add Registration to enum
ALTER TABLE needs 
MODIFY COLUMN type ENUM('Financial', 'Registration', 'Transportation', 'Housing', 'Other') NOT NULL;

-- Step 2: Update existing data
UPDATE needs SET type = 'Registration' WHERE type = 'Financial';

-- Step 3: Remove Financial from enum
ALTER TABLE needs 
MODIFY COLUMN type ENUM('Registration', 'Transportation', 'Housing', 'Other') NOT NULL;
