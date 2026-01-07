'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { Testimonial } from '@/types/database';

// Fallback testimonials in case database is not available
const fallbackTestimonials: Testimonial[] = [
  {
    id: '1',
    name: 'יוסי כהן',
    role: 'יו"ר ועד הבית',
    building: 'רחוב הרצל 22, תל אביב',
    content: 'מאז שהתחלנו להשתמש במערכת, הכל הפך להרבה יותר מסודר. הדיירים מקבלים הודעות בזמן אמת והתשלומים מתנהלים בצורה חלקה.',
    avatar: 'י',
    is_active: true,
    display_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'מירי לוי',
    role: 'גזברית',
    building: 'שדרות רוטשילד 45, רמת גן',
    content: 'הדוחות האוטומטיים חוסכים לי שעות של עבודה כל חודש. אני יכולה לראות במבט אחד מי שילם ומי לא, ולשלוח תזכורות בלחיצת כפתור.',
    avatar: 'מ',
    is_active: true,
    display_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'דני אברהם',
    role: 'דייר',
    building: 'רחוב ביאליק 18, חיפה',
    content: 'סוף סוף יש לי מקום אחד לראות את כל ההודעות של הבניין, לדווח על תקלות ולשלם את ועד הבית. ממש נוח!',
    avatar: 'ד',
    is_active: true,
    display_order: 3,
    created_at: new Date().toISOString(),
  },
];

function TestimonialCard({
  testimonial,
  isActive,
  direction,
}: {
  testimonial: Testimonial;
  isActive: boolean;
  direction: 'enter' | 'exit-left' | 'exit-right' | 'none';
}) {
  return (
    <div
      className={`
        flex-shrink-0 transition-all duration-500 ease-out transform
        ${isActive
          ? 'w-[280px] sm:w-[320px] scale-100 opacity-100 z-10'
          : 'w-[240px] sm:w-[280px] scale-[0.85] opacity-40'
        }
        ${direction === 'enter' ? 'animate-fade-in-scale' : ''}
      `}
    >
      <div
        className={`
          backdrop-blur rounded-xl border shadow-xl h-full
          ${isActive
            ? 'bg-white/15 border-white/30 p-5 sm:p-6'
            : 'bg-white/10 border-white/20 p-4 sm:p-5'
          }
        `}
      >
        {/* Testimonial text */}
        <p className={`text-white leading-relaxed mb-4 ${isActive ? 'text-sm sm:text-base text-center' : 'text-xs sm:text-sm line-clamp-3'}`}>
          &ldquo;{testimonial.content}&rdquo;
        </p>

        {/* Author info */}
        <div className={`${isActive ? 'flex flex-col items-center' : 'flex items-center gap-3'}`}>
          <div
            className={`
              rounded-full bg-gradient-to-br from-[#bee4fa] to-[#0ea5e9]
              flex items-center justify-center text-white font-bold
              ${isActive ? 'w-12 h-12 sm:w-14 sm:h-14 text-lg sm:text-xl mb-2' : 'w-9 h-9 sm:w-10 sm:h-10 text-sm sm:text-base'}
            `}
          >
            {testimonial.avatar}
          </div>
          <div className={isActive ? 'text-center' : ''}>
            <p className={`text-white font-bold ${isActive ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'}`}>
              {testimonial.name}
            </p>
            <p className={`${isActive ? 'text-[#bee4fa] text-xs sm:text-sm' : 'text-white/60 text-[10px] sm:text-xs'}`}>
              {testimonial.role}
            </p>
            {isActive && (
              <p className="text-white/50 text-[10px] sm:text-xs mt-0.5">{testimonial.building}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TestimonialsCarousel() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(fallbackTestimonials);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch testimonials from database
  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('testimonials')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) {
          console.error('Error fetching testimonials:', error);
          // Keep using fallback testimonials
        } else if (data && data.length > 0) {
          setTestimonials(data);
        }
      } catch (err) {
        console.error('Failed to fetch testimonials:', err);
        // Keep using fallback testimonials
      } finally {
        setIsLoading(false);
      }
    };

    fetchTestimonials();
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    if (!isAutoPlaying || isLoading) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, isLoading, testimonials.length]);

  const goToPrev = () => {
    setIsAutoPlaying(false);
    setActiveIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setActiveIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  // Get visible cards (prev, active, next) for infinite loop effect
  const getVisibleCards = () => {
    const prevIndex = activeIndex === 0 ? testimonials.length - 1 : activeIndex - 1;
    const nextIndex = activeIndex === testimonials.length - 1 ? 0 : activeIndex + 1;

    return [
      { testimonial: testimonials[prevIndex], isActive: false, key: `prev-${prevIndex}`, direction: 'none' as const },
      { testimonial: testimonials[activeIndex], isActive: true, key: `active-${activeIndex}`, direction: 'enter' as const },
      { testimonial: testimonials[nextIndex], isActive: false, key: `next-${nextIndex}`, direction: 'none' as const },
    ];
  };

  // Don't render if no testimonials
  if (testimonials.length === 0) {
    return null;
  }

  const visibleCards = getVisibleCards();

  return (
    <section className="py-10 md:py-14 bg-[#203857] overflow-hidden" aria-label="המלצות לקוחות">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-2 text-white">
          מה אומרים עלינו?
        </h2>
        <p className="text-center text-white/70 mb-8 max-w-xl mx-auto text-sm md:text-base">
          הצטרפו לעשרות ועדי בתים שכבר מנהלים את הבניין שלהם בצורה חכמה יותר
        </p>

        <div className="relative max-w-5xl mx-auto">
          {/* Navigation arrows - Desktop */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 rounded-full text-white hover:bg-white/20 hidden md:flex"
            onClick={goToNext}
            aria-label="המלצה הבאה"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 rounded-full text-white hover:bg-white/20 hidden md:flex"
            onClick={goToPrev}
            aria-label="המלצה קודמת"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          {/* Cards container */}
          <div
            ref={containerRef}
            className="flex items-center justify-center gap-3 sm:gap-4 py-4 px-4"
          >
            {visibleCards.map((card) => (
              <TestimonialCard
                key={card.key}
                testimonial={card.testimonial}
                isActive={card.isActive}
                direction={card.direction}
              />
            ))}
          </div>

          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mt-4" role="tablist" aria-label="בחירת המלצה">
            {testimonials.map((testimonial, index) => (
              <button
                key={index}
                onClick={() => {
                  setIsAutoPlaying(false);
                  setActiveIndex(index);
                }}
                className={`h-2 rounded-full transition-all ${
                  index === activeIndex ? 'bg-white w-6' : 'bg-white/30 hover:bg-white/50 w-2'
                }`}
                role="tab"
                aria-selected={index === activeIndex}
                aria-label={`המלצה ${index + 1} מתוך ${testimonials.length} - ${testimonial.name}`}
              />
            ))}
          </div>

          {/* Mobile swipe hint */}
          <p className="text-center text-white/40 text-xs mt-3 md:hidden">
            לחצו על הנקודות להחלפה
          </p>
        </div>
      </div>
    </section>
  );
}
