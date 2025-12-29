-- =============================================
-- תיקון RLS Policies
-- =============================================

-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their buildings" ON buildings;
DROP POLICY IF EXISTS "Admin can manage buildings" ON buildings;

-- =============================================
-- RLS Policies - Profiles (Fixed)
-- =============================================

-- Simple policy for viewing profiles - users see their own, admins see all
CREATE POLICY "profiles_select_policy"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id
    OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Users can only update their own profile
CREATE POLICY "profiles_update_policy"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Allow insert for new users (through trigger)
CREATE POLICY "profiles_insert_policy"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =============================================
-- RLS Policies - Buildings (Fixed)
-- =============================================

-- View buildings: admins see all, members see their building
CREATE POLICY "buildings_select_policy"
  ON buildings FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR
    EXISTS (SELECT 1 FROM building_members WHERE building_id = buildings.id AND user_id = auth.uid())
  );

-- Insert buildings: anyone logged in can create
CREATE POLICY "buildings_insert_policy"
  ON buildings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Update/Delete buildings: only admins
CREATE POLICY "buildings_update_policy"
  ON buildings FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "buildings_delete_policy"
  ON buildings FOR DELETE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- =============================================
-- Fix Building Members policies
-- =============================================
DROP POLICY IF EXISTS "View members of own building" ON building_members;
DROP POLICY IF EXISTS "Committee can manage members" ON building_members;

-- Admin can manage all building members
CREATE POLICY "building_members_admin_all"
  ON building_members FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Users can view members of their building (if committee) or just themselves
CREATE POLICY "building_members_select_policy"
  ON building_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM building_members bm
      WHERE bm.building_id = building_members.building_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'committee'
    )
  );

-- Committee can insert/update/delete members in their building
CREATE POLICY "building_members_committee_insert"
  ON building_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM building_members bm
      WHERE bm.building_id = building_members.building_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'committee'
    )
    OR auth.uid() = user_id -- Allow users to insert themselves (for registration)
  );

CREATE POLICY "building_members_committee_update"
  ON building_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM building_members bm
      WHERE bm.building_id = building_members.building_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'committee'
    )
  );

CREATE POLICY "building_members_committee_delete"
  ON building_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM building_members bm
      WHERE bm.building_id = building_members.building_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'committee'
    )
  );
