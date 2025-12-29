-- Create contact_requests table for new building inquiries
CREATE TABLE IF NOT EXISTS contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT NOT NULL,
  city TEXT,
  message TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'dismissed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage contact requests
CREATE POLICY "Admins can manage contact requests"
  ON contact_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow anonymous users to insert (for contact form)
CREATE POLICY "Anyone can submit contact request"
  ON contact_requests
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Also allow authenticated users to submit
CREATE POLICY "Authenticated users can submit contact request"
  ON contact_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
