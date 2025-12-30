import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AccessibilityPage({ params }: Props) {
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
        <h1 className="text-3xl font-bold text-[#203857] mb-8">הצהרת נגישות</h1>

        <div className="bg-white rounded-lg shadow-sm p-8 space-y-6 text-[#203857]/80 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">מחויבות לנגישות</h2>
            <p>
              אתר &quot;ועד בית&quot; מחויב לאפשר לכל אדם, לרבות אנשים עם מוגבלויות, גישה שווה לשירותים ולמידע באתר.
              אנו פועלים לשפר את נגישות האתר באופן מתמיד ולהתאימו לתקנות שוויון זכויות לאנשים עם מוגבלות
              (התאמות נגישות לשירות), התשע&quot;ג-2013, ולתקן הישראלי ת&quot;י 5568.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">רמת הנגישות</h2>
            <p>
              אנו שואפים לעמוד ברמת הנגישות AA של תקן WCAG 2.1 (Web Content Accessibility Guidelines).
              התקן מגדיר כיצד להנגיש תוכן אינטרנט לאנשים עם מוגבלויות שונות.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">התאמות הנגישות באתר</h2>
            <p className="mb-3">האתר כולל את התאמות הנגישות הבאות:</p>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>תמיכה בניווט באמצעות מקלדת בלבד</li>
              <li>תמיכה בקוראי מסך ותוכנות עזר</li>
              <li>תגיות alt לתמונות</li>
              <li>מבנה כותרות היררכי ומסודר</li>
              <li>ניגודיות צבעים מספקת בין טקסט לרקע</li>
              <li>טפסים עם תוויות ברורות והנחיות</li>
              <li>אפשרות לשינוי גודל הטקסט באמצעות הדפדפן</li>
              <li>עיצוב רספונסיבי המותאם למגוון מכשירים</li>
              <li>תמיכה בשפה העברית וכיוון טקסט מימין לשמאל (RTL)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">דפדפנים וטכנולוגיות נתמכים</h2>
            <p className="mb-3">האתר נבדק ותואם לשימוש עם:</p>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>דפדפנים: Chrome, Firefox, Safari, Edge (גרסאות עדכניות)</li>
              <li>קוראי מסך: NVDA, JAWS, VoiceOver</li>
              <li>מכשירים: מחשבים שולחניים, מחשבים ניידים, טאבלטים וטלפונים חכמים</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">קיצורי מקלדת</h2>
            <p className="mb-3">ניתן לנווט באתר באמצעות המקלדת:</p>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li><kbd className="px-2 py-1 bg-gray-100 rounded text-sm">Tab</kbd> - מעבר לאלמנט הבא</li>
              <li><kbd className="px-2 py-1 bg-gray-100 rounded text-sm">Shift + Tab</kbd> - מעבר לאלמנט הקודם</li>
              <li><kbd className="px-2 py-1 bg-gray-100 rounded text-sm">Enter</kbd> - הפעלת קישורים ולחצנים</li>
              <li><kbd className="px-2 py-1 bg-gray-100 rounded text-sm">Esc</kbd> - סגירת חלונות קופצים</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">מגבלות ידועות</h2>
            <p>
              למרות מאמצינו, ייתכן שחלקים מסוימים באתר עדיין אינם נגישים באופן מלא.
              אנו עובדים על שיפור מתמיד של נגישות האתר וממשיכים לטפל בבעיות שמזוהות.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">משוב ויצירת קשר</h2>
            <p>
              אנו מתייחסים ברצינות לכל פניה בנושא נגישות. אם נתקלתם בבעיית נגישות באתר
              או שיש לכם הצעות לשיפור, נשמח לשמוע מכם.
            </p>
            <p className="mt-3">
              ניתן לפנות אלינו בדוא&quot;ל:{' '}
              <a href="mailto:vaadbayit.vercel@gmail.com" className="text-[#203857] underline hover:no-underline">
                vaadbayit.vercel@gmail.com
              </a>
              <br />
              אנו מתחייבים להגיב לפניות בתוך 5 ימי עסקים.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#203857] mb-3">רכז נגישות</h2>
            <p>
              לשאלות ופניות בנושא נגישות האתר והשירותים, ניתן לפנות לרכז הנגישות בדוא&quot;ל:{' '}
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
