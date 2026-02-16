-- Migration: Add OTHER to users.role enum
-- The OTHER role allows view-only access to the full national map
-- without seeing personal details or having edit access.
-- Also ensures roleTitle column exists (for OTHER's custom role title).

-- Step 1: Add OTHER to the role enum
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
  'ADMIN',
  'OTHER'
) NOT NULL;
