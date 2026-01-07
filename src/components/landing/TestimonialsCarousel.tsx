'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Quote, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const testimonials = [
  {
    id: 1,
    name: 'יוסי כהן',
    role: 'יו"ר ועד הבית',
    building: 'רחוב הרצל 22, תל אביב',
    content: 'מאז שהתחלנו להשתמש במערכת, הכל הפך להרבה יותר מסודר. הדיירים מקבלים הודעות בזמן אמת והתשלומים מתנהלים בצורה חלקה.',
    rating: 5,
    avatar: 'י',
  },
  {
    id: 2,
    name: 'מירי לוי',
    role: 'גזברית',
    building: 'שדרות רוטשילד 45, רמת גן',
    content: 'הדוחות האוטומטיים חוסכים לי שעות של עבודה כל חודש. אני יכולה לראות במבט אחד מי שילם ומי לא, ולשלוח תזכורות בלחיצת כפתור.',
    rating: 5,
    avatar: 'מ',
  },
  {
    id: 3,
    name: 'דני אברהם',
    role: 'דייר',
    building: 'רחוב ביאליק 18, חיפה',
    content: 'סוף סוף יש לי מקום אחד לראות את כל ההודעות של הבניין, לדווח על תקלות ולשלם את ועד הבית. ממש נוח!',
    rating: 5,
    avatar: 'ד',
  },
  {
    id: 4,
    name: 'שרה גולדשטיין',
    role: 'יו"ר ועד הבית',
    building: 'רחוב ז\'בוטינסקי 33, פתח תקווה',
    content: 'ניהול 40 דירות היה סיוט עד שמצאנו את המערכת הזו. עכשיו הכל במקום אחד - דיירים, תשלומים, הודעות ומסמכים.',
    rating: 5,
    avatar: 'ש',
  },
  {
    id: 5,
    name: 'אבי רוזנברג',
    role: 'חבר ועד',
    building: 'רחוב אלנבי 67, תל אביב',
    content: 'האפשרות לערוך סקרים ולקבל תשובות מהדיירים ישירות במערכת זה בדיוק מה שחיפשנו. הרבה יותר קל לקבל החלטות ככה.',
    rating: 5,
    avatar: 'א',
  },
];

export function TestimonialsCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-rotate testimonials
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToPrev = () => {
    setIsAutoPlaying(false);
    setActiveIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setActiveIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  const activeTestimonial = testimonials[activeIndex];

  return (
    <section className="py-16 bg-[#203857]">
      <div className="container mx-auto px-4">
        <h3 className="text-3xl font-bold text-center mb-4 text-white">
          מה אומרים עלינו?
        </h3>
        <p className="text-center text-white/70 mb-12 max-w-xl mx-auto">
          הצטרפו לעשרות ועדי בתים שכבר מנהלים את הבניין שלהם בצורה חכמה יותר
        </p>

        <div className="max-w-3xl mx-auto relative">
          {/* Navigation arrows */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-12 z-10 rounded-full text-white hover:bg-white/20 hidden sm:flex"
            onClick={goToPrev}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-12 z-10 rounded-full text-white hover:bg-white/20 hidden sm:flex"
            onClick={goToNext}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>

          {/* Testimonial Card */}
          <Card className="bg-white/10 backdrop-blur border-white/20 overflow-hidden">
            <CardContent className="p-8 md:p-10">
              <div className="flex flex-col items-center text-center">
                {/* Quote icon */}
                <div className="mb-6">
                  <Quote className="h-10 w-10 text-[#bee4fa] opacity-50" />
                </div>

                {/* Rating stars */}
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < activeTestimonial.rating
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-white/30'
                      }`}
                    />
                  ))}
                </div>

                {/* Testimonial text */}
                <p className="text-lg md:text-xl text-white leading-relaxed mb-8 max-w-2xl">
                  &ldquo;{activeTestimonial.content}&rdquo;
                </p>

                {/* Author info */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#bee4fa] to-[#0ea5e9] flex items-center justify-center text-2xl font-bold text-white mb-4">
                    {activeTestimonial.avatar}
                  </div>
                  <p className="font-bold text-white text-lg">{activeTestimonial.name}</p>
                  <p className="text-[#bee4fa]">{activeTestimonial.role}</p>
                  <p className="text-white/50 text-sm mt-1">{activeTestimonial.building}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setIsAutoPlaying(false);
                  setActiveIndex(index);
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === activeIndex ? 'bg-white w-6' : 'bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>

          {/* Mobile swipe hint */}
          <div className="flex justify-center gap-4 mt-6 sm:hidden">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={goToPrev}
            >
              <ChevronRight className="h-4 w-4 ml-1" />
              הקודם
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={goToNext}
            >
              הבא
              <ChevronLeft className="h-4 w-4 mr-1" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
