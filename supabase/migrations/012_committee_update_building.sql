-- Allow committee members to update their own building settings
-- This enables committee to set monthly_fee and opening_balance

CREATE POLICY "buildings_update_committee"
  ON buildings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM building_members
      WHERE building_id = buildings.id
      AND user_id = auth.uid()
      AND role = 'committee'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM building_members
      WHERE building_id = buildings.id
      AND user_id = auth.uid()
      AND role = 'committee'
    )
  );
