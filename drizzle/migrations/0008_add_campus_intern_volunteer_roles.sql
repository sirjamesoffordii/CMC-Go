-- Migration: Add CAMPUS_INTERN and CAMPUS_VOLUNTEER to users.role enum
-- These roles share the same authorization as STAFF (campus-scoped)
-- This is a safe, additive-only change - no data loss, no column drops

ALTER TABLE `users` MODIFY COLUMN `role` ENUM(
  'STAFF',
  'CO_DIRECTOR',
  'CAMPUS_DIRECTOR',
  'CAMPUS_INTERN',
  'CAMPUS_VOLUNTEER',
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
