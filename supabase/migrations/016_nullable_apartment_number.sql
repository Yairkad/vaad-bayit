-- Migration: Make apartment_number nullable for external committee managers
-- This allows committee members who are not residents (external managers) to manage buildings

-- Drop the unique constraint first
ALTER TABLE building_members DROP CONSTRAINT IF EXISTS building_members_building_id_apartment_number_key;

-- Make apartment_number nullable
ALTER TABLE building_members ALTER COLUMN apartment_number DROP NOT NULL;

-- Add a new unique constraint that only applies when apartment_number is not null
-- This prevents duplicate apartment numbers within a building while allowing multiple nulls
CREATE UNIQUE INDEX building_members_unique_apartment
ON building_members (building_id, apartment_number)
WHERE apartment_number IS NOT NULL;
