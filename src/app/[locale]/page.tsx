import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, CreditCard, FileText } from 'lucide-react';
import { ContactDialog } from '@/components/ContactDialog';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations();

  const features = [
    {
      icon: Building2,
      title: 'ניהול בניינים',
      description: 'ניהול קל ופשוט של מספר בניינים במקום אחד'
    },
    {
      icon: Users,
      title: 'ניהול דיירים',
      description: 'מעקב אחר כל הדיירים, פרטי קשר ותשלומים'
    },
    {
      icon: CreditCard,
      title: 'מעקב תשלומים',
      description: 'מעקב אחר תשלומי ועד, הוראות קבע ומזומן'
    },
    {
      icon: FileText,
      title: 'מסמכים ודוחות',
      description: 'ניהול מסמכים, תקנון, ביטוח והפקת דוחות'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <header className="bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto px-4 py-6">
          <nav className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-primary">
              {t('common.appName')}
            </h1>
            <div className="flex gap-4">
              <Link href="/login">
                <Button variant="ghost">{t('auth.login')}</Button>
              </Link>
              <Link href="/register">
                <Button>{t('auth.register')}</Button>
              </Link>
            </div>
          </nav>
        </div>

        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            מערכת ניהול ועד בית
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            פתרון פשוט וחינמי לניהול ועד הבית שלכם.
            מעקב תשלומים, ניהול דיירים, הודעות ומסמכים - הכל במקום אחד.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="text-lg px-8">
                הרשמה
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-lg px-8">
                התחברות
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">
            מה המערכת מציעה?
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-4">
            רוצים להצטרף למערכת?
          </h3>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            השאירו פרטים ונחזור אליכם עם מידע על הוספת הבניין שלכם למערכת
          </p>
          <ContactDialog />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} ועד בית. כל הזכויות שמורות.</p>
          <p className="text-sm mt-2">
            מערכת לניהול ועד בית - מעקב ותיעוד בלבד
          </p>
        </div>
      </footer>
    </div>
  );
}
