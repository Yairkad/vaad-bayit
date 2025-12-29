-- =============================================
-- תיקון מלא של RLS - מחיקת כל הפוליסות והתחלה מחדש
-- =============================================

-- =============================================
-- מחיקת כל הפוליסות הקיימות
-- =============================================

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;

-- Buildings
DROP POLICY IF EXISTS "Users can view their buildings" ON buildings;
DROP POLICY IF EXISTS "Admin can manage buildings" ON buildings;
DROP POLICY IF EXISTS "Committee can create buildings" ON buildings;
DROP POLICY IF EXISTS "buildings_select_policy" ON buildings;
DROP POLICY IF EXISTS "buildings_insert_policy" ON buildings;
DROP POLICY IF EXISTS "buildings_update_policy" ON buildings;
DROP POLICY IF EXISTS "buildings_delete_policy" ON buildings;

-- Building Members
DROP POLICY IF EXISTS "View members of own building" ON building_members;
DROP POLICY IF EXISTS "Committee can manage members" ON building_members;
DROP POLICY IF EXISTS "building_members_admin_all" ON building_members;
DROP POLICY IF EXISTS "building_members_select_policy" ON building_members;
DROP POLICY IF EXISTS "building_members_committee_insert" ON building_members;
DROP POLICY IF EXISTS "building_members_committee_update" ON building_members;
DROP POLICY IF EXISTS "building_members_committee_delete" ON building_members;

-- =============================================
-- יצירת פונקציית עזר לבדיקת אדמין
-- =============================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================
-- Profiles - פוליסות חדשות
-- =============================================

-- כולם יכולים לקרוא פרופילים (נדרש ל-joins)
CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT
  USING (true);

-- משתמשים יכולים לעדכן רק את עצמם
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- הוספת פרופיל - רק למשתמש עצמו
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =============================================
-- Buildings - פוליסות חדשות
-- =============================================

-- כולם יכולים לקרוא בניינים
CREATE POLICY "buildings_select_all"
  ON buildings FOR SELECT
  USING (true);

-- כל מי שמחובר יכול ליצור בניין
CREATE POLICY "buildings_insert_auth"
  ON buildings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- אדמין יכול לעדכן בניינים
CREATE POLICY "buildings_update_admin"
  ON buildings FOR UPDATE
  USING (is_admin());

-- אדמין יכול למחוק בניינים
CREATE POLICY "buildings_delete_admin"
  ON buildings FOR DELETE
  USING (is_admin());

-- =============================================
-- Building Members - פוליסות חדשות
-- =============================================

-- קריאה: אדמין רואה הכל, או חברי אותו בניין
CREATE POLICY "building_members_select"
  ON building_members FOR SELECT
  USING (
    is_admin()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM building_members bm
      WHERE bm.building_id = building_members.building_id
      AND bm.user_id = auth.uid()
    )
  );

-- הוספה: אדמין, ועד של הבניין, או המשתמש עצמו (להרשמה)
CREATE POLICY "building_members_insert"
  ON building_members FOR INSERT
  WITH CHECK (
    is_admin()
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM building_members bm
      WHERE bm.building_id = building_members.building_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'committee'
    )
  );

-- עדכון: אדמין או ועד של הבניין
CREATE POLICY "building_members_update"
  ON building_members FOR UPDATE
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM building_members bm
      WHERE bm.building_id = building_members.building_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'committee'
    )
  );

-- מחיקה: אדמין או ועד של הבניין
CREATE POLICY "building_members_delete"
  ON building_members FOR DELETE
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM building_members bm
      WHERE bm.building_id = building_members.building_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'committee'
    )
  );

-- =============================================
-- Building Invites - תיקון פוליסות
-- =============================================
DROP POLICY IF EXISTS "Anyone can view active invites" ON building_invites;
DROP POLICY IF EXISTS "Committee can manage invites" ON building_invites;
DROP POLICY IF EXISTS "Admin can manage all invites" ON building_invites;

-- כולם יכולים לקרוא הזמנות פעילות (נדרש להרשמה)
CREATE POLICY "invites_select_active"
  ON building_invites FOR SELECT
  USING (is_active = true OR is_admin());

-- ועד יכול לנהל הזמנות של הבניין שלו
CREATE POLICY "invites_manage_committee"
  ON building_invites FOR ALL
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM building_members bm
      WHERE bm.building_id = building_invites.building_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'committee'
    )
  );

-- עדכון uses_count - כולם יכולים (נדרש להרשמה)
CREATE POLICY "invites_update_uses"
  ON building_invites FOR UPDATE
  USING (true)
  WITH CHECK (true);
