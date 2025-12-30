import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function PrivacyPage({ params }: Props) {
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
        <h1 className="text-3xl font-bold text-[#203857] mb-8">מדיניות פרטיות</h1>

        <div className="bg-white rounded-lg shadow-sm p-8 space-y-6 text-[#203857]/80 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">1. מבוא</h2>
            <p>
              מדיניות פרטיות זו מתארת כיצד אתר &quot;ועד בית&quot; (להלן: &quot;האתר&quot; או &quot;המערכת&quot;)
              אוסף, משתמש ומגן על המידע האישי של המשתמשים. אנו מחויבים להגן על פרטיותכם
              ולפעול בהתאם לחוק הגנת הפרטיות, התשמ&quot;א-1981.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">2. המידע שאנו אוספים</h2>
            <p className="mb-3">במסגרת השימוש במערכת, אנו עשויים לאסוף את המידע הבא:</p>

            <h3 className="font-semibold text-[#203857] mt-4 mb-2">מידע שנמסר על ידכם:</h3>
            <ul className="list-disc list-inside space-y-1 mr-4 mb-4">
              <li>שם מלא</li>
              <li>כתובת דואר אלקטרוני</li>
              <li>מספר טלפון</li>
              <li>כתובת מגורים (מספר דירה, בניין)</li>
              <li>מידע על תשלומים ושיטת תשלום</li>
            </ul>

            <h3 className="font-semibold text-[#203857] mb-2">מידע שנאסף אוטומטית:</h3>
            <ul className="list-disc list-inside space-y-1 mr-4">
              <li>כתובת IP</li>
              <li>סוג הדפדפן והמכשיר</li>
              <li>זמני גישה ופעילות באתר</li>
              <li>עמודים שנצפו</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">3. אופן השימוש במידע</h2>
            <p className="mb-3">המידע שנאסף משמש למטרות הבאות:</p>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>מתן השירותים המבוקשים - ניהול ועד בית, מעקב תשלומים, הודעות ומסמכים</li>
              <li>יצירת קשר עמכם בנוגע לחשבונכם או לשירותים</li>
              <li>שיפור השירותים והחוויה באתר</li>
              <li>אבטחת המערכת ומניעת שימוש לרעה</li>
              <li>עמידה בדרישות החוק</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">4. שיתוף מידע עם צדדים שלישיים</h2>
            <p className="mb-3">אנו לא מוכרים או משכירים את המידע האישי שלכם. המידע עשוי להיות משותף:</p>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>עם חברי ועד הבית ודיירי הבניין שלכם (בהתאם להרשאות)</li>
              <li>עם ספקי שירות הפועלים מטעמנו (אחסון, תשתיות)</li>
              <li>כאשר נדרש על פי חוק או צו בית משפט</li>
              <li>להגנה על זכויותינו או בטיחות המשתמשים</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">5. אחסון ואבטחת מידע</h2>
            <p>
              המידע שלכם מאוחסן בשרתים מאובטחים. אנו נוקטים באמצעי אבטחה מקובלים בתעשייה
              להגנה על המידע, לרבות הצפנה, בקרת גישה וניטור אבטחה.
              עם זאת, אין שיטת העברה או אחסון מידע באינטרנט שהיא בטוחה ב-100%.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">6. שמירת מידע</h2>
            <p>
              אנו שומרים את המידע האישי שלכם כל עוד חשבונכם פעיל או כנדרש לצורך מתן השירותים.
              ניתן לבקש מחיקת החשבון והמידע בכל עת, בכפוף לדרישות חוקיות לשמירת מידע.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">7. עוגיות (Cookies)</h2>
            <p>
              האתר משתמש בעוגיות לצורך תפעול תקין, שמירת העדפות משתמש ושיפור חווית השימוש.
              ניתן לשלוט בהגדרות העוגיות דרך הדפדפן שלכם, אך חסימת עוגיות עלולה לפגוע בפונקציונליות האתר.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">8. זכויות המשתמש</h2>
            <p className="mb-3">על פי חוק הגנת הפרטיות, עומדות לכם הזכויות הבאות:</p>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>זכות לעיין במידע האישי שלכם המוחזק אצלנו</li>
              <li>זכות לתקן מידע שגוי</li>
              <li>זכות לבקש מחיקת המידע שלכם</li>
              <li>זכות להתנגד לעיבוד המידע לצורכי שיווק</li>
            </ul>
            <p className="mt-3">
              לממוש זכויותיכם, אנא פנו אלינו בדוא&quot;ל:{' '}
              <a href="mailto:vaadbayit.vercel@gmail.com" className="text-[#203857] underline hover:no-underline">
                vaadbayit.vercel@gmail.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">9. פרטיות קטינים</h2>
            <p>
              השירותים שלנו אינם מיועדים לקטינים מתחת לגיל 18.
              איננו אוספים ביודעין מידע אישי מקטינים.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">10. שינויים במדיניות</h2>
            <p>
              אנו עשויים לעדכן מדיניות פרטיות זו מעת לעת.
              שינויים מהותיים יפורסמו באתר ויישלח עליהם עדכון למשתמשים רשומים.
              המשך השימוש באתר לאחר השינויים מהווה הסכמה למדיניות המעודכנת.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">11. יצירת קשר</h2>
            <p>
              לשאלות או בקשות בנוגע לפרטיות ולמידע האישי שלכם, ניתן לפנות אלינו בדוא&quot;ל:{' '}
              <a href="mailto:vaadbayit.vercel@gmail.com" className="text-[#203857] underline hover:no-underline">
                vaadbayit.vercel@gmail.com
              </a>
            </p>
          </section>

          <p className="text-sm text-[#203857]/60 pt-4 border-t border-[#a5d4f0]">
            עדכון אחרון: דצמבר 2024
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
