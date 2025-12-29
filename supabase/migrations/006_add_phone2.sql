-- Add phone2 column to building_members for second phone number
ALTER TABLE building_members ADD COLUMN IF NOT EXISTS phone2 TEXT;
