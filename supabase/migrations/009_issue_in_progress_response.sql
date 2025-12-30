-- Add in_progress_response field to issues table
-- This field stores the committee's response when changing issue status to in_progress

ALTER TABLE issues ADD COLUMN IF NOT EXISTS in_progress_response TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN issues.in_progress_response IS 'Committee response shown to tenant when issue is moved to in_progress status';
