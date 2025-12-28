-- =============================================
-- מערכת ניהול ועד בית - סכמת בסיס נתונים
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- טבלת פרופילים (מורחב מ-auth.users)
-- =============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'tenant' CHECK (role IN ('admin', 'committee', 'tenant')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- טבלת בניינים
-- =============================================
CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  monthly_fee DECIMAL(10,2) DEFAULT 0,
  is_approved BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- טבלת חברי בניין (דיירים)
-- =============================================
CREATE TABLE building_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id),          -- NULL לדייר מנוהל
  full_name TEXT NOT NULL,
  apartment_number TEXT NOT NULL,
  role TEXT DEFAULT 'tenant' CHECK (role IN ('committee', 'tenant')),
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('standing_order', 'cash')),
  standing_order_active BOOLEAN DEFAULT FALSE,
  standing_order_file TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(building_id, apartment_number)
);

-- =============================================
-- טבלת תשלומים
-- =============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES building_members(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- טבלת הוצאות
-- =============================================
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL,
  receipt_file TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- טבלת הודעות
-- =============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  send_email BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- טבלת תקלות
-- =============================================
CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE NOT NULL,
  reported_by UUID REFERENCES building_members(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- טבלת מסמכים
-- =============================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES building_members(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('regulation', 'insurance', 'protocol', 'standing_order', 'other')),
  file_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- אינדקסים לביצועים
-- =============================================
CREATE INDEX idx_building_members_building ON building_members(building_id);
CREATE INDEX idx_building_members_user ON building_members(user_id);
CREATE INDEX idx_payments_building ON payments(building_id);
CREATE INDEX idx_payments_member ON payments(member_id);
CREATE INDEX idx_payments_month ON payments(month);
CREATE INDEX idx_expenses_building ON expenses(building_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_messages_building ON messages(building_id);
CREATE INDEX idx_messages_expires ON messages(expires_at);
CREATE INDEX idx_issues_building ON issues(building_id);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_documents_building ON documents(building_id);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies - Profiles
-- =============================================
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- RLS Policies - Buildings
-- =============================================
CREATE POLICY "Users can view their buildings"
  ON buildings FOR SELECT
  USING (
    -- Admin can see all
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    -- Members can see their building
    EXISTS (SELECT 1 FROM building_members WHERE building_id = buildings.id AND user_id = auth.uid())
  );

CREATE POLICY "Admin can manage buildings"
  ON buildings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Committee can create buildings"
  ON buildings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================
-- RLS Policies - Building Members
-- =============================================
CREATE POLICY "View members of own building"
  ON building_members FOR SELECT
  USING (
    -- Admin can see all
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    -- Committee of same building can see all members
    EXISTS (
      SELECT 1 FROM building_members bm
      WHERE bm.building_id = building_members.building_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'committee'
    )
    OR
    -- User can see own record
    user_id = auth.uid()
  );

CREATE POLICY "Committee can manage members"
  ON building_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM building_members bm
      WHERE bm.building_id = building_members.building_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'committee'
    )
  );

-- =============================================
-- RLS Policies - Payments
-- =============================================
CREATE POLICY "View payments of own building"
  ON payments FOR SELECT
  USING (
    -- Committee can see all building payments
    EXISTS (
      SELECT 1 FROM building_members bm
      WHERE bm.building_id = payments.building_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'committee'
    )
    OR
    -- Tenant can see own payments
    EXISTS (
      SELECT 1 FROM building_members bm
      WHERE bm.id = payments.member_id
      AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Committee can manage payments"
  ON payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM building_members bm
      WHERE bm.building_id = payments.building_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'committee'
    )
  );

-- =============================================
-- RLS Policies - Expenses
-- =============================================
CREATE POLICY "View expenses of own building"
  ON expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM building_members bm
      WHERE bm.building_id = expenses.building_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'committee'
    )
  );

CREATE POLICY "Committee can manage expenses"
  ON expenses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM building_members bm
      WHERE bm.building_id = expenses.building_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'committee'
    )
  );

-- =============================================
-- RLS Policies - Messages
-- =============================================
CREATE POLICY "View messages of own building"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM building_members bm
      WHERE bm.building_id = messages.building_id
      AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Committee can manage messages"
  ON messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM building_members bm
      WHERE bm.building_id = messages.building_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'committee'
    )
  );

-- =============================================
-- RLS Policies - Issues
-- =============================================
CREATE POLICY "View issues of own building"
  ON issues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM building_members bm
      WHERE bm.building_id = issues.building_id
      AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create issues"
  ON issues FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM building_members bm
      WHERE bm.building_id = issues.building_id
      AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Committee can manage issues"
  ON issues FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM building_members bm
      WHERE bm.building_id = issues.building_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'committee'
    )
  );

-- =============================================
-- RLS Policies - Documents
-- =============================================
CREATE POLICY "View documents of own building"
  ON documents FOR SELECT
  USING (
    -- General documents visible to all building members
    (member_id IS NULL AND EXISTS (
      SELECT 1 FROM building_members bm
      WHERE bm.building_id = documents.building_id
      AND bm.user_id = auth.uid()
    ))
    OR
    -- Standing order docs visible only to committee
    (category = 'standing_order' AND EXISTS (
      SELECT 1 FROM building_members bm
      WHERE bm.building_id = documents.building_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'committee'
    ))
  );

CREATE POLICY "Committee can manage documents"
  ON documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM building_members bm
      WHERE bm.building_id = documents.building_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'committee'
    )
  );

-- =============================================
-- Trigger: יצירת פרופיל אוטומטית בהרשמה
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone',
    'tenant'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- Storage Buckets
-- =============================================
-- Run these in Supabase Dashboard -> Storage

-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('standing-orders', 'standing-orders', false);
