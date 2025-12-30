-- Create pending_invites table to store invite data when email confirmation is required
-- This ensures the invite is processed even if the user verifies from a different browser/device

CREATE TABLE IF NOT EXISTS pending_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL UNIQUE,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  invite_id UUID NOT NULL REFERENCES building_invites(id) ON DELETE CASCADE,
  apartment_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  default_role TEXT NOT NULL DEFAULT 'tenant',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by email
CREATE INDEX IF NOT EXISTS idx_pending_invites_email ON pending_invites(user_email);

-- RLS policies
ALTER TABLE pending_invites ENABLE ROW LEVEL SECURITY;

-- Allow inserting pending invites (during registration)
CREATE POLICY "Anyone can insert pending invites"
ON pending_invites FOR INSERT
TO public
WITH CHECK (true);

-- Allow selecting own pending invite
CREATE POLICY "Users can select their own pending invite"
ON pending_invites FOR SELECT
TO authenticated
USING (user_email = auth.jwt() ->> 'email');

-- Allow deleting own pending invite
CREATE POLICY "Users can delete their own pending invite"
ON pending_invites FOR DELETE
TO authenticated
USING (user_email = auth.jwt() ->> 'email');

-- Add comment for documentation
COMMENT ON TABLE pending_invites IS 'Stores invite data when user registers with invite link but needs email confirmation';
