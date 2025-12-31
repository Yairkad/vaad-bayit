-- Add phone2 and move_in_date fields to building_members
ALTER TABLE building_members
  ADD COLUMN IF NOT EXISTS phone2 TEXT,
  ADD COLUMN IF NOT EXISTS move_in_date DATE;

COMMENT ON COLUMN building_members.phone2 IS 'Secondary phone number (e.g., spouse phone)';
COMMENT ON COLUMN building_members.move_in_date IS 'Date when tenant moved into the apartment';
