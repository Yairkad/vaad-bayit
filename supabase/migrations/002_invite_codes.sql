-- =============================================
-- טבלת קודי הזמנה לבניינים
-- =============================================
CREATE TABLE building_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  default_role TEXT DEFAULT 'tenant' CHECK (default_role IN ('committee', 'tenant')),
  default_apartment TEXT,
  uses_count INT DEFAULT 0,
  max_uses INT,  -- NULL = unlimited
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick code lookup
CREATE INDEX idx_invite_code ON building_invites(code);
CREATE INDEX idx_invite_building ON building_invites(building_id);

-- RLS
ALTER TABLE building_invites ENABLE ROW LEVEL SECURITY;

-- Anyone can read active invite codes (needed for registration)
CREATE POLICY "Anyone can view active invites"
  ON building_invites FOR SELECT
  USING (is_active = true);

-- Committee can manage invites for their building
CREATE POLICY "Committee can manage invites"
  ON building_invites FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM building_members bm
      WHERE bm.building_id = building_invites.building_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'committee'
    )
  );

-- Admin can manage all invites
CREATE POLICY "Admin can manage all invites"
  ON building_invites FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Function to generate short invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
