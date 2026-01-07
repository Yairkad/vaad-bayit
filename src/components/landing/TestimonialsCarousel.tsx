'use client';

import { useState, useEffect, useRef } from 'react';
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

function TestimonialCard({
  testimonial,
  isActive,
  position
}: {
  testimonial: typeof testimonials[0];
  isActive: boolean;
  position: 'prev' | 'active' | 'next' | 'hidden';
}) {
  const positionStyles = {
    prev: 'translate-x-[85%] scale-[0.85] opacity-40 pointer-events-none',
    active: 'translate-x-0 scale-100 opacity-100',
    next: '-translate-x-[85%] scale-[0.85] opacity-40 pointer-events-none',
    hidden: 'translate-x-[200%] scale-75 opacity-0 pointer-events-none',
  };

  return (
    <Card
      className={`
        absolute top-0 left-0 right-0 bg-white/10 backdrop-blur border-white/20
        transition-all duration-500 ease-out
        ${positionStyles[position]}
      `}
    >
      <CardContent className="p-5 md:p-6">
        <div className="flex flex-col items-center text-center">
          {/* Quote icon */}
          <div className="mb-3">
            <Quote className="h-6 w-6 md:h-8 md:w-8 text-[#bee4fa] opacity-50" />
          </div>

          {/* Rating stars */}
          <div className="flex gap-0.5 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < testimonial.rating
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-white/30'
                }`}
              />
            ))}
          </div>

          {/* Testimonial text */}
          <p className="text-sm md:text-base text-white leading-relaxed mb-4 max-w-lg line-clamp-4">
            &ldquo;{testimonial.content}&rdquo;
          </p>

          {/* Author info */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-[#bee4fa] to-[#0ea5e9] flex items-center justify-center text-lg md:text-xl font-bold text-white mb-2">
              {testimonial.avatar}
            </div>
            <p className="font-bold text-white text-sm md:text-base">{testimonial.name}</p>
            <p className="text-[#bee4fa] text-xs md:text-sm">{testimonial.role}</p>
            <p className="text-white/50 text-xs mt-0.5">{testimonial.building}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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

  const getPosition = (index: number): 'prev' | 'active' | 'next' | 'hidden' => {
    const prevIndex = activeIndex === 0 ? testimonials.length - 1 : activeIndex - 1;
    const nextIndex = activeIndex === testimonials.length - 1 ? 0 : activeIndex + 1;

    if (index === activeIndex) return 'active';
    if (index === prevIndex) return 'prev';
    if (index === nextIndex) return 'next';
    return 'hidden';
  };

  return (
    <section className="py-10 md:py-14 bg-[#203857] overflow-hidden">
      <div className="container mx-auto px-4">
        <h3 className="text-2xl md:text-3xl font-bold text-center mb-3 text-white">
          מה אומרים עלינו?
        </h3>
        <p className="text-center text-white/70 mb-8 max-w-xl mx-auto text-sm md:text-base">
          הצטרפו לעשרות ועדי בתים שכבר מנהלים את הבניין שלהם בצורה חכמה יותר
        </p>

        <div className="max-w-xl mx-auto relative">
          {/* Navigation arrows */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-14 z-20 rounded-full text-white hover:bg-white/20 hidden sm:flex"
            onClick={goToPrev}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-14 z-20 rounded-full text-white hover:bg-white/20 hidden sm:flex"
            onClick={goToNext}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          {/* Testimonials container with peek effect */}
          <div className="relative h-[280px] md:h-[300px]">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard
                key={testimonial.id}
                testimonial={testimonial}
                isActive={index === activeIndex}
                position={getPosition(index)}
              />
            ))}
          </div>

          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mt-4">
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

          {/* Mobile navigation */}
          <div className="flex justify-center gap-4 mt-4 sm:hidden">
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
