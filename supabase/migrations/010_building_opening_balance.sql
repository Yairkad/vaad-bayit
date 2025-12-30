-- Add opening_balance field to buildings table
-- This field stores the initial balance of the building treasury before using the system

ALTER TABLE buildings ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(10,2) DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN buildings.opening_balance IS 'Initial treasury balance before using the system';
