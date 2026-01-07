-- Create testimonials table for landing page
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  building TEXT NOT NULL,
  content TEXT NOT NULL,
  avatar TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Public can read active testimonials (for landing page)
CREATE POLICY "Anyone can read active testimonials"
  ON testimonials FOR SELECT
  USING (is_active = true);

-- Only admins can manage testimonials
CREATE POLICY "Admins can manage testimonials"
  ON testimonials FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert initial testimonials (same as current hardcoded ones)
INSERT INTO testimonials (name, role, building, content, avatar, is_active, display_order) VALUES
  ('יוסי כהן', 'יו"ר ועד הבית', 'רחוב הרצל 22, תל אביב', 'מאז שהתחלנו להשתמש במערכת, הכל הפך להרבה יותר מסודר. הדיירים מקבלים הודעות בזמן אמת והתשלומים מתנהלים בצורה חלקה.', 'י', true, 1),
  ('מירי לוי', 'גזברית', 'שדרות רוטשילד 45, רמת גן', 'הדוחות האוטומטיים חוסכים לי שעות של עבודה כל חודש. אני יכולה לראות במבט אחד מי שילם ומי לא, ולשלוח תזכורות בלחיצת כפתור.', 'מ', true, 2),
  ('דני אברהם', 'דייר', 'רחוב ביאליק 18, חיפה', 'סוף סוף יש לי מקום אחד לראות את כל ההודעות של הבניין, לדווח על תקלות ולשלם את ועד הבית. ממש נוח!', 'ד', true, 3),
  ('שרה גולדשטיין', 'יו"ר ועד הבית', 'רחוב ז''בוטינסקי 33, פתח תקווה', 'ניהול 40 דירות היה סיוט עד שמצאנו את המערכת הזו. עכשיו הכל במקום אחד - דיירים, תשלומים, הודעות ומסמכים.', 'ש', true, 4),
  ('אבי רוזנברג', 'חבר ועד', 'רחוב אלנבי 67, תל אביב', 'האפשרות לערוך סקרים ולקבל תשובות מהדיירים ישירות במערכת זה בדיוק מה שחיפשנו. הרבה יותר קל לקבל החלטות ככה.', 'א', true, 5);

-- Create index for ordering
CREATE INDEX idx_testimonials_order ON testimonials(display_order) WHERE is_active = true;
