import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-[#f0f9ff]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#bee4fa] border-b border-[#a5d4f0] shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2">
              <img src="/icon.svg" alt="ועד בית" className="h-10 w-10" />
              <span className="text-xl font-bold text-[#203857]">ועד בית</span>
            </Link>
            <Link href="/">
              <Button variant="ghost" className="text-[#203857] hover:bg-[#a5d4f0]">
                <ArrowRight className="w-4 h-4 ml-2" />
                חזרה לדף הבית
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold text-[#203857] mb-8">תקנון האתר</h1>

        <div className="bg-white rounded-lg shadow-sm p-8 space-y-6 text-[#203857]/80 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">1. כללי</h2>
            <p>
              ברוכים הבאים לאתר &quot;ועד בית&quot; (להלן: &quot;האתר&quot;). האתר מופעל על ידי מפעילי המערכת (להלן: &quot;המפעיל&quot;).
              השימוש באתר מהווה הסכמה לתנאי תקנון זה. אם אינך מסכים לתנאים אלה, אנא הימנע משימוש באתר.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">2. מטרת האתר</h2>
            <p>
              האתר מספק פלטפורמה לניהול ועד בית, כולל מעקב אחר תשלומים, ניהול דיירים, הודעות ומסמכים.
              המערכת מיועדת למעקב ותיעוד בלבד ואינה מהווה תחליף לייעוץ משפטי או חשבונאי מקצועי.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">3. הרשמה וחשבון משתמש</h2>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>הגישה למערכת מותנית בהרשמה ויצירת חשבון משתמש.</li>
              <li>המשתמש מתחייב למסור פרטים נכונים ומדויקים בעת ההרשמה.</li>
              <li>המשתמש אחראי לשמירת סודיות פרטי הכניסה שלו ולכל פעילות המתבצעת בחשבונו.</li>
              <li>המפעיל רשאי לבטל או להשעות חשבון משתמש בכל עת ומכל סיבה.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">4. שימוש מותר</h2>
            <p className="mb-2">המשתמש מתחייב:</p>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>להשתמש באתר למטרות חוקיות בלבד.</li>
              <li>לא להעלות תכנים פוגעניים, מזיקים או בלתי חוקיים.</li>
              <li>לא לפגוע בפרטיות משתמשים אחרים.</li>
              <li>לא לנסות לחדור למערכות האתר או לשבש את פעילותו.</li>
              <li>לא להשתמש במידע מהאתר למטרות מסחריות ללא אישור.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">5. תשלומים ואישורים</h2>
            <p>
              אישורי התשלום המופקים במערכת הם לצורכי תיעוד פנימי בלבד ואינם מהווים קבלה רשמית או מסמך משפטי.
              המפעיל אינו אחראי לאי-דיוקים במידע הנוגע לתשלומים המוזנים על ידי המשתמשים.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">6. קניין רוחני</h2>
            <p>
              כל הזכויות באתר, לרבות עיצוב, קוד, תוכן, לוגו וסימני מסחר, שייכות למפעיל.
              אין להעתיק, לשכפל, להפיץ או לעשות שימוש מסחרי בתכני האתר ללא אישור מראש ובכתב.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">7. הגבלת אחריות</h2>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>האתר מסופק &quot;כמות שהוא&quot; (AS IS) ללא אחריות מכל סוג.</li>
              <li>המפעיל אינו אחראי לנזקים ישירים או עקיפים הנובעים מהשימוש באתר.</li>
              <li>המפעיל אינו אחראי לזמינות האתר או לתקלות טכניות.</li>
              <li>המפעיל אינו אחראי לתוכן שמועלה על ידי משתמשים.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">8. שינויים בתקנון</h2>
            <p>
              המפעיל רשאי לשנות את תנאי התקנון בכל עת. השינויים ייכנסו לתוקף עם פרסומם באתר.
              המשך השימוש באתר לאחר השינויים מהווה הסכמה לתנאים המעודכנים.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">9. סמכות שיפוט</h2>
            <p>
              על תקנון זה יחולו דיני מדינת ישראל. סמכות השיפוט הבלעדית בכל עניין הנוגע לתקנון זה
              נתונה לבתי המשפט המוסמכים במחוז תל אביב-יפו.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">10. יצירת קשר</h2>
            <p>
              לשאלות או בירורים בנוגע לתקנון זה, ניתן לפנות אלינו בדוא&quot;ל:{' '}
              <a href="mailto:vaadbayit.vercel@gmail.com" className="text-[#203857] underline hover:no-underline">
                vaadbayit.vercel@gmail.com
              </a>
            </p>
          </section>

          <p className="text-sm text-[#203857]/60 pt-4 border-t border-[#a5d4f0]">
            עדכון אחרון: דצמבר 2025
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#a5d4f0] py-8 bg-[#bee4fa]/30">
        <div className="container mx-auto px-4 text-center text-[#203857]/70">
          <p>© {new Date().getFullYear()} ועד בית. כל הזכויות שמורות.</p>
        </div>
      </footer>
    </div>
  );
}
