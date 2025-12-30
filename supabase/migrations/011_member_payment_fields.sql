-- Add payment-related fields to building_members table
-- These allow customizing payment settings per member

ALTER TABLE building_members ADD COLUMN IF NOT EXISTS monthly_amount DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE building_members ADD COLUMN IF NOT EXISTS payment_day INTEGER DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN building_members.monthly_amount IS 'Custom monthly payment amount for this member (overrides building default)';
COMMENT ON COLUMN building_members.payment_day IS 'Day of month for standing order payment';
