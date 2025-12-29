-- =============================================
-- תיקון פשוט של RLS - ללא self-reference
-- =============================================

-- מחיקת הפוליסה הבעייתית
DROP POLICY IF EXISTS "building_members_select" ON building_members;

-- פוליסה פשוטה - כולם יכולים לקרוא building_members
-- (האבטחה תהיה ברמת האפליקציה)
CREATE POLICY "building_members_select_all"
  ON building_members FOR SELECT
  USING (true);
