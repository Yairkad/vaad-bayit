-- Migration: Extra Charges and Building Settings
-- Description: Add extra_charges table for partial charges, update expenses for shared buildings, and add building logo

-- =====================================================
-- 1. Add new fields to buildings table
-- =====================================================

-- Add logo field to buildings
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- =====================================================
-- 2. Add new fields to expenses table for shared expenses
-- =====================================================

-- Number of buildings sharing this expense (1 = not shared, 2+ = shared)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS shared_buildings_count INTEGER DEFAULT 1;

-- Original total amount before division (for display purposes)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10,2);

-- =====================================================
-- 3. Create extra_charges table for partial/exceptional charges
-- =====================================================

CREATE TABLE IF NOT EXISTS extra_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES building_members(id) ON DELETE CASCADE,
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL, -- Optional link to expense
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT NOT NULL,
  charge_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  payment_method TEXT, -- 'cash', 'transfer', etc.
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_extra_charges_building ON extra_charges(building_id);
CREATE INDEX IF NOT EXISTS idx_extra_charges_member ON extra_charges(member_id);
CREATE INDEX IF NOT EXISTS idx_extra_charges_date ON extra_charges(charge_date);

-- =====================================================
-- 4. RLS Policies for extra_charges
-- =====================================================

ALTER TABLE extra_charges ENABLE ROW LEVEL SECURITY;

-- Committee can view all extra charges for their building
CREATE POLICY "extra_charges_select_committee"
  ON extra_charges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM building_members
      WHERE building_id = extra_charges.building_id
      AND user_id = auth.uid()
      AND role = 'committee'
    )
  );

-- Tenants can view their own extra charges
CREATE POLICY "extra_charges_select_own"
  ON extra_charges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM building_members
      WHERE id = extra_charges.member_id
      AND user_id = auth.uid()
    )
  );

-- Committee can create extra charges for their building
CREATE POLICY "extra_charges_insert_committee"
  ON extra_charges FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM building_members
      WHERE building_id = extra_charges.building_id
      AND user_id = auth.uid()
      AND role = 'committee'
    )
  );

-- Committee can update extra charges for their building
CREATE POLICY "extra_charges_update_committee"
  ON extra_charges FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM building_members
      WHERE building_id = extra_charges.building_id
      AND user_id = auth.uid()
      AND role = 'committee'
    )
  );

-- Committee can delete extra charges for their building
CREATE POLICY "extra_charges_delete_committee"
  ON extra_charges FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM building_members
      WHERE building_id = extra_charges.building_id
      AND user_id = auth.uid()
      AND role = 'committee'
    )
  );

-- =====================================================
-- 5. Storage bucket for building logos
-- =====================================================

-- Note: This needs to be run in Supabase dashboard or via API
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('building-logos', 'building-logos', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policies will be configured in the dashboard
