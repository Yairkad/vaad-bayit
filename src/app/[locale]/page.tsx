'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Users, CreditCard, FileText, Loader2, MessageSquare } from 'lucide-react';
import { ContactDialog } from '@/components/ContactDialog';
import { ScreenshotsGallery } from '@/components/landing/ScreenshotsGallery';
import { TestimonialsCarousel } from '@/components/landing/TestimonialsCarousel';

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
      icon: Users,
      title: 'ניהול דיירים',
      description: 'מעקב אחר כל הדיירים, פרטי קשר, דירות וקומות',
      color: 'from-[#bee4fa] to-[#0ea5e9]',
      borderColor: 'border-[#0ea5e9]',
    },
    {
      icon: CreditCard,
      title: 'מעקב תשלומים',
      description: 'מעקב אחר תשלומי ועד בית והתראות על פיגורים',
      color: 'from-[#bbf7d0] to-[#2da05f]',
      borderColor: 'border-[#2da05f]',
    },
    {
      icon: MessageSquare,
      title: 'הודעות ומסמכים',
      description: 'לוח מודעות, סקרים וניהול מסמכים',
      color: 'from-[#fef3c7] to-[#f59e0b]',
      borderColor: 'border-[#f59e0b]',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Sticky Header - Compact for mobile */}
      <header className="sticky top-0 z-50 bg-[#bee4fa]/95 backdrop-blur border-b border-[#a5d4f0] shadow-sm">
        <div className="container mx-auto px-3 py-2 sm:px-4 sm:py-3">
          <nav className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-1.5 sm:gap-2">
              <img src="/icon.svg" alt="בית+" className="h-8 w-8 sm:h-10 sm:w-10" />
              <span className="text-lg sm:text-xl font-bold text-[#203857]">
                {t('common.appName')}
              </span>
            </Link>
            <div className="flex gap-1.5 sm:gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-[#203857] hover:bg-[#a5d4f0] text-xs sm:text-sm px-2.5 sm:px-4"
                onClick={handleLoginClick}
                disabled={isLoginLoading || isRegisterLoading}
              >
                {isLoginLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('auth.login')}
              </Button>
              <Button
                size="sm"
                className="bg-[#203857] hover:bg-[#2d4a6f] text-xs sm:text-sm px-2.5 sm:px-4"
                onClick={handleRegisterClick}
                disabled={isLoginLoading || isRegisterLoading}
              >
                {isRegisterLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('auth.register')}
              </Button>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section with background image */}
      <section
        className="relative bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(240, 249, 255, 0.95) 0%, rgba(190, 228, 250, 0.9) 100%), url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80')`,
        }}
      >
        <div className="container mx-auto px-4 py-16 sm:py-20 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            בית+
          </h2>
          <p className="text-2xl md:text-3xl font-medium text-[#203857]/80 mb-6">
            פשוט. מותאם. יעיל.
          </p>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            מערכת ניהול ועד בית מותאמת לצרכים שלכם.
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
              className="text-lg px-8 border-[#203857] text-[#203857] hover:bg-white/50 bg-white/30"
              onClick={handleLoginClick}
              disabled={isLoginLoading || isRegisterLoading}
            >
              {isLoginLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'התחברות'}
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section - 3 compact cards */}
      <section className="py-12 sm:py-16 bg-white/80">
        <div className="container mx-auto px-4">
          <h3 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-10">
            מה המערכת מציעה?
          </h3>
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`bg-white rounded-xl shadow-lg p-4 sm:p-5 text-center border-t-4 ${feature.borderColor} hover:shadow-xl transition-shadow`}
              >
                <div className={`mx-auto w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-3 shadow-md`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-bold text-base mb-2 text-[#203857]">{feature.title}</h4>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots Gallery Section */}
      <ScreenshotsGallery />

      {/* Testimonials Carousel Section */}
      <TestimonialsCarousel />

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
          <p className="text-sm">© {new Date().getFullYear()} כל הזכויות שמורות למערכת בית+</p>
        </div>
      </footer>
    </div>
  );
}
