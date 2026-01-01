'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, CreditCard, FileText, Loader2 } from 'lucide-react';
import { ContactDialog } from '@/components/ContactDialog';

export default function HomePage() {
  const t = useTranslations();
  const router = useRouter();
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);

  const handleLoginClick = () => {
    setIsLoginLoading(true);
    router.push('/login');
  };

  const handleRegisterClick = () => {
    setIsRegisterLoading(true);
    router.push('/register');
  };

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
    <div className="min-h-screen bg-[#f0f9ff]">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-[#bee4fa] border-b border-[#a5d4f0] shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2">
              <img src="/icon.svg" alt="ועד בית" className="h-10 w-10" />
              <span className="text-xl font-bold text-[#203857]">
                {t('common.appName')}
              </span>
            </Link>
            <div className="flex gap-2 sm:gap-4">
              <Button
                variant="ghost"
                className="text-[#203857] hover:bg-[#a5d4f0]"
                onClick={handleLoginClick}
                disabled={isLoginLoading || isRegisterLoading}
              >
                {isLoginLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('auth.login')}
              </Button>
              <Button
                className="bg-[#203857] hover:bg-[#2d4a6f]"
                onClick={handleRegisterClick}
                disabled={isLoginLoading || isRegisterLoading}
              >
                {isRegisterLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('auth.register')}
              </Button>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section>
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            מערכת ניהול ועד בית
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            פתרון פשוט וחינמי לניהול ועד הבית שלכם.
            מעקב תשלומים, ניהול דיירים, הודעות ומסמכים - הכל במקום אחד.
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              className="text-lg px-8 bg-[#203857] hover:bg-[#2d4a6f]"
              onClick={handleRegisterClick}
              disabled={isLoginLoading || isRegisterLoading}
            >
              {isRegisterLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'הרשמה'}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 border-[#203857] text-[#203857] hover:bg-[#bee4fa]"
              onClick={handleLoginClick}
              disabled={isLoginLoading || isRegisterLoading}
            >
              {isLoginLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'התחברות'}
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/50">
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
          <ContactDialog open={isContactOpen} onOpenChange={setIsContactOpen} showTrigger={false} />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#a5d4f0] py-6 bg-[#bee4fa]/30">
        <div className="container mx-auto px-4 text-center text-[#203857]/70">
          <div className="flex justify-center gap-4 text-sm mb-3">
            <Link href="/terms" className="hover:text-[#203857] hover:underline">
              תקנון
            </Link>
            <span>|</span>
            <Link href="/privacy" className="hover:text-[#203857] hover:underline">
              מדיניות פרטיות
            </Link>
            <span>|</span>
            <Link href="/accessibility" className="hover:text-[#203857] hover:underline">
              נגישות
            </Link>
            <span>|</span>
            <button
              onClick={() => setIsContactOpen(true)}
              className="hover:text-[#203857] hover:underline"
            >
              צור קשר
            </button>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} כל הזכויות שמורות למערכת ועד בית.</p>
        </div>
      </footer>
    </div>
  );
}
