-- Migration: Add password authentication and three-tier authorization system
-- This adds passwordHash, scopeLevel, viewLevel, editLevel, overseeRegionId, isBanned columns
-- Also adds new roles: DISTRICT_STAFF, REGIONAL_STAFF, NATIONAL_STAFF, NATIONAL_DIRECTOR, FIELD_DIRECTOR, CMC_GO_ADMIN

-- Step 1: Add new columns
ALTER TABLE `users` 
  ADD COLUMN `passwordHash` VARCHAR(255) NULL,
  ADD COLUMN `overseeRegionId` VARCHAR(255) NULL,
  ADD COLUMN `scopeLevel` ENUM('NATIONAL', 'REGION', 'DISTRICT') NOT NULL DEFAULT 'REGION',
  ADD COLUMN `viewLevel` ENUM('NATIONAL', 'REGION', 'DISTRICT', 'CAMPUS') NOT NULL DEFAULT 'CAMPUS',
  ADD COLUMN `editLevel` ENUM('NATIONAL', 'XAN', 'REGION', 'DISTRICT', 'CAMPUS') NOT NULL DEFAULT 'CAMPUS',
  ADD COLUMN `isBanned` BOOLEAN NOT NULL DEFAULT FALSE;

-- Step 2: Make campusId nullable (for National Team members who don't have a campus)
ALTER TABLE `users` MODIFY COLUMN `campusId` INT NULL;

-- Step 3: Modify role enum to include new roles
-- Note: MySQL requires recreating the column to change enum values
ALTER TABLE `users` MODIFY COLUMN `role` ENUM(
  'STAFF',
  'CO_DIRECTOR', 
  'CAMPUS_DIRECTOR',
  'DISTRICT_DIRECTOR',
  'DISTRICT_STAFF',
  'REGION_DIRECTOR',
  'REGIONAL_STAFF',
  'NATIONAL_STAFF',
  'NATIONAL_DIRECTOR',
  'FIELD_DIRECTOR',
  'CMC_GO_ADMIN',
  'ADMIN'
) NOT NULL;

-- Step 4: Set default authorization levels for existing users based on their role
UPDATE `users` SET 
  `scopeLevel` = CASE 
    WHEN `role` IN ('REGION_DIRECTOR', 'ADMIN') THEN 'NATIONAL'
    ELSE 'REGION'
  END,
  `viewLevel` = CASE 
    WHEN `role` IN ('REGION_DIRECTOR', 'ADMIN') THEN 'NATIONAL'
    WHEN `role` = 'DISTRICT_DIRECTOR' THEN 'REGION'
    WHEN `role` = 'CAMPUS_DIRECTOR' THEN 'DISTRICT'
    ELSE 'CAMPUS'
  END,
  `editLevel` = CASE 
    WHEN `role` IN ('REGION_DIRECTOR', 'ADMIN') THEN 'NATIONAL'
    WHEN `role` = 'DISTRICT_DIRECTOR' THEN 'REGION'
    WHEN `role` = 'CAMPUS_DIRECTOR' THEN 'DISTRICT'
    ELSE 'CAMPUS'
  END
WHERE `scopeLevel` = 'REGION' AND `viewLevel` = 'CAMPUS' AND `editLevel` = 'CAMPUS';
