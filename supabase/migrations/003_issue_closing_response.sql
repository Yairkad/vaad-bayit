-- Add closing_response field to issues table
-- This field stores the committee's response when closing an issue

ALTER TABLE issues ADD COLUMN IF NOT EXISTS closing_response TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN issues.closing_response IS 'Committee response shown to tenant when issue is closed';
