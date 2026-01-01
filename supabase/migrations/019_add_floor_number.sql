-- Migration: Add floor_number to building_members
-- This adds an optional floor number field for tenants

ALTER TABLE building_members ADD COLUMN IF NOT EXISTS floor_number INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN building_members.floor_number IS 'מספר קומה - אופציונלי';
