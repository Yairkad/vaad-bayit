'use client';

import { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  CreditCard,
  MessageSquare,
  LayoutDashboard,
  Phone,
  Building2,
  Receipt,
  AlertTriangle,
  Settings,
} from 'lucide-react';

// Helper Components for mockups
function StatMockup({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    green: 'bg-green-50 text-green-600 border-green-200',
  }[color] || 'bg-gray-50 text-gray-600 border-gray-200';

  return (
    <div className={`p-2 rounded-lg border ${colorClasses}`}>
      <div className="flex items-center gap-1 mb-0.5">
        <Icon className="h-3 w-3" />
        <span className="text-[9px]">{label}</span>
      </div>
      <p className="text-base font-bold">{value}</p>
    </div>
  );
}

function MessageMockup({ title, date, hasVote, yesCount, noCount }: { title: string; date: string; hasVote?: boolean; yesCount?: number; noCount?: number }) {
  return (
    <div className="p-2 bg-white border rounded-lg shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-xs">{title}</p>
          <p className="text-[10px] text-muted-foreground">{date}</p>
        </div>
        {hasVote && <Badge variant="secondary" className="text-[8px] px-1 py-0">סקר</Badge>}
      </div>
      {hasVote && (
        <div className="flex gap-1 mt-1">
          <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">בעד: {yesCount}</span>
          <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">נגד: {noCount}</span>
        </div>
      )}
    </div>
  );
}

function TenantMockup({ name, apt, floor, phone }: { name: string; apt: string; floor: string; phone: string }) {
  return (
    <div className="flex items-center justify-between p-1.5 bg-white border rounded-lg text-xs">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-medium">
          {name.charAt(0)}
        </div>
        <div>
          <p className="font-medium text-[11px]">{name}</p>
          <p className="text-[9px] text-muted-foreground">דירה {apt} • קומה {floor}</p>
        </div>
      </div>
      <span className="text-[9px] text-muted-foreground">{phone}</span>
    </div>
  );
}

function PaymentMockup({ apt, name, amount, paid }: { apt: string; name: string; amount: number; paid: boolean }) {
  return (
    <div className="flex items-center justify-between p-1.5 bg-white border rounded-lg text-xs">
      <div className="flex items-center gap-2">
        <span className="font-medium text-muted-foreground text-[10px]">דירה {apt}</span>
        <span className="text-[11px]">{name}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="font-medium text-[10px]">₪{amount}</span>
        <Badge variant={paid ? 'default' : 'destructive'} className={`text-[8px] px-1 py-0 ${paid ? 'bg-green-500' : ''}`}>
          {paid ? 'שולם' : 'לא שולם'}
        </Badge>
      </div>
    </div>
  );
}

// Sidebar items for desktop view
const sidebarItems = [
  { id: 'dashboard', label: 'לוח בקרה', color: 'bg-blue-400', icon: LayoutDashboard },
  { id: 'phonebook', label: 'דיירים', color: 'bg-cyan-400', icon: Users },
  { id: 'payments', label: 'תשלומים', color: 'bg-green-400', icon: CreditCard },
  { id: 'messages', label: 'הודעות', color: 'bg-purple-400', icon: MessageSquare },
  { id: 'settings', label: 'הגדרות', color: 'bg-gray-400', icon: Settings },
];

// Mock data for demonstrations
const mockScreens = [
  {
    id: 'dashboard',
    title: 'לוח בקרה',
    description: 'סקירה מהירה של כל הנתונים החשובים',
    icon: LayoutDashboard,
    phoneContent: (
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm">לוח בקרה</h3>
            <p className="text-[11px] text-muted-foreground">רחוב הרצל 15, תל אביב</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatMockup icon={Users} label="דיירים" value="24" color="blue" />
          <StatMockup icon={CreditCard} label="לא שולמו" value="3" color="red" />
          <StatMockup icon={AlertTriangle} label="תקלות" value="2" color="orange" />
          <StatMockup icon={Receipt} label="הוצאות" value="₪4,250" color="green" />
        </div>
      </div>
    ),
    desktopContent: (
      <div className="p-2 sm:p-3">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
            <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-[10px] sm:text-sm">לוח בקרה</h3>
            <p className="text-[8px] sm:text-xs text-gray-500">רחוב הרצל 15, תל אביב</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1 sm:gap-2">
          <div className="p-1 sm:p-2 rounded-lg border bg-blue-50 text-blue-600 border-blue-200">
            <div className="text-[7px] sm:text-[10px] mb-0.5">דיירים</div>
            <p className="text-sm sm:text-lg font-bold">24</p>
          </div>
          <div className="p-1 sm:p-2 rounded-lg border bg-red-50 text-red-600 border-red-200">
            <div className="text-[7px] sm:text-[10px] mb-0.5">לא שולמו</div>
            <p className="text-sm sm:text-lg font-bold">3</p>
          </div>
          <div className="p-1 sm:p-2 rounded-lg border bg-orange-50 text-orange-600 border-orange-200">
            <div className="text-[7px] sm:text-[10px] mb-0.5">תקלות</div>
            <p className="text-sm sm:text-lg font-bold">2</p>
          </div>
          <div className="p-1 sm:p-2 rounded-lg border bg-green-50 text-green-600 border-green-200">
            <div className="text-[7px] sm:text-[10px] mb-0.5">הוצאות</div>
            <p className="text-sm sm:text-lg font-bold">₪4,250</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'messages',
    title: 'לוח מודעות',
    description: 'שליחת הודעות וסקרים לכל הדיירים',
    icon: MessageSquare,
    phoneContent: (
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-sm">הודעות</h3>
          <Badge className="bg-blue-500 text-[9px] px-1.5">+ חדשה</Badge>
        </div>
        <MessageMockup title="אסיפת דיירים שנתית" date="15 בינואר 2026" hasVote yesCount={18} noCount={4} />
        <MessageMockup title="עבודות תחזוקה בחניון" date="10 בינואר 2026" />
        <MessageMockup title="עדכון תעריפי ועד" date="5 בינואר 2026" hasVote yesCount={20} noCount={2} />
      </div>
    ),
    desktopContent: (
      <div className="p-2 sm:p-3">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <h3 className="font-bold text-[10px] sm:text-sm">הודעות</h3>
          <Badge className="bg-blue-500 text-[7px] sm:text-[10px] px-1 sm:px-1.5">+ חדשה</Badge>
        </div>
        <div className="space-y-1 sm:space-y-2">
          <div className="p-1.5 sm:p-2 bg-white border rounded-lg shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-[9px] sm:text-xs">אסיפת דיירים שנתית</p>
                <p className="text-[7px] sm:text-[10px] text-muted-foreground">15 בינואר 2026</p>
              </div>
              <Badge variant="secondary" className="text-[6px] sm:text-[8px] px-1">סקר</Badge>
            </div>
            <div className="flex gap-1 mt-1">
              <span className="text-[6px] sm:text-[8px] bg-green-100 text-green-700 px-1 py-0.5 rounded">בעד: 18</span>
              <span className="text-[6px] sm:text-[8px] bg-red-100 text-red-700 px-1 py-0.5 rounded">נגד: 4</span>
            </div>
          </div>
          <div className="p-1.5 sm:p-2 bg-white border rounded-lg shadow-sm">
            <p className="font-medium text-[9px] sm:text-xs">עבודות תחזוקה בחניון</p>
            <p className="text-[7px] sm:text-[10px] text-muted-foreground">10 בינואר 2026</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'phonebook',
    title: 'אלפון דיירים',
    description: 'רשימת כל הדיירים ופרטי הקשר שלהם',
    icon: Phone,
    phoneContent: (
      <div className="p-3 space-y-1.5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-sm">אלפון</h3>
          <div className="flex gap-1">
            <Badge variant="outline" className="text-[8px] px-1">סינון</Badge>
            <Badge variant="outline" className="text-[8px] px-1">חיפוש</Badge>
          </div>
        </div>
        <TenantMockup name="ישראל ישראלי" apt="1" floor="קרקע" phone="050-123..." />
        <TenantMockup name="שרה כהן" apt="3" floor="1" phone="052-987..." />
        <TenantMockup name="דוד לוי" apt="5" floor="2" phone="054-555..." />
        <TenantMockup name="רחל אברהם" apt="7" floor="3" phone="053-777..." />
      </div>
    ),
    desktopContent: (
      <div className="p-2 sm:p-3">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <h3 className="font-bold text-[10px] sm:text-sm">אלפון דיירים</h3>
          <Badge variant="outline" className="text-[7px] sm:text-[10px] px-1">חיפוש</Badge>
        </div>
        <div className="space-y-1 sm:space-y-1.5">
          {[
            { name: 'ישראל ישראלי', apt: '1', floor: 'קרקע', phone: '050-123...' },
            { name: 'שרה כהן', apt: '3', floor: '1', phone: '052-987...' },
            { name: 'דוד לוי', apt: '5', floor: '2', phone: '054-555...' },
          ].map((tenant, idx) => (
            <div key={idx} className="flex items-center justify-between p-1 sm:p-1.5 bg-white border rounded-lg">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[8px] sm:text-[10px] font-medium">
                  {tenant.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-[9px] sm:text-[11px]">{tenant.name}</p>
                  <p className="text-[7px] sm:text-[9px] text-muted-foreground">דירה {tenant.apt} • קומה {tenant.floor}</p>
                </div>
              </div>
              <span className="text-[7px] sm:text-[9px] text-muted-foreground">{tenant.phone}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'payments',
    title: 'מעקב תשלומים',
    description: 'מעקב אחר תשלומי ועד והוראות קבע',
    icon: CreditCard,
    phoneContent: (
      <div className="p-3 space-y-1.5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-sm">תשלומים</h3>
          <Badge className="bg-green-500 text-[9px] px-1.5">₪12,450</Badge>
        </div>
        <PaymentMockup apt="1" name="ישראל ישראלי" amount={350} paid />
        <PaymentMockup apt="3" name="שרה כהן" amount={350} paid />
        <PaymentMockup apt="5" name="דוד לוי" amount={350} paid={false} />
        <PaymentMockup apt="7" name="רחל אברהם" amount={350} paid />
      </div>
    ),
    desktopContent: (
      <div className="p-2 sm:p-3">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <h3 className="font-bold text-[10px] sm:text-sm">תשלומים</h3>
          <Badge className="bg-green-500 text-[7px] sm:text-[10px] px-1">₪12,450</Badge>
        </div>
        <div className="space-y-1 sm:space-y-1.5">
          {[
            { apt: '1', name: 'ישראל ישראלי', amount: 350, paid: true },
            { apt: '3', name: 'שרה כהן', amount: 350, paid: true },
            { apt: '5', name: 'דוד לוי', amount: 350, paid: false },
          ].map((payment, idx) => (
            <div key={idx} className="flex items-center justify-between p-1 sm:p-1.5 bg-white border rounded-lg">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-medium text-muted-foreground text-[8px] sm:text-[10px]">דירה {payment.apt}</span>
                <span className="text-[9px] sm:text-[11px]">{payment.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium text-[8px] sm:text-[10px]">₪{payment.amount}</span>
                <Badge variant={payment.paid ? 'default' : 'destructive'} className={`text-[6px] sm:text-[8px] px-1 ${payment.paid ? 'bg-green-500' : ''}`}>
                  {payment.paid ? 'שולם' : 'לא שולם'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

export function ScreenshotsGallery() {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const activeScreen = mockScreens[activeIndex];

  // Handle scroll snap to update active index
  const handleScroll = () => {
    if (!scrollContainerRef.current || isDragging) return;
    const container = scrollContainerRef.current;
    const scrollPosition = container.scrollLeft;
    const itemWidth = container.offsetWidth;
    const newIndex = Math.round(scrollPosition / itemWidth);
    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < mockScreens.length) {
      setActiveIndex(newIndex);
    }
  };

  // Mouse drag handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Scroll to index when clicking dots
  const scrollToIndex = (index: number) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const itemWidth = container.offsetWidth;
    container.scrollTo({ left: itemWidth * index, behavior: 'smooth' });
    setActiveIndex(index);
  };

  // Get sidebar items with active state based on current screen
  const getSidebarItemsWithActive = () => {
    return sidebarItems.map(item => ({
      ...item,
      active: item.id === activeScreen.id,
    }));
  };

  return (
    <section className="py-12 sm:py-16 bg-gradient-to-b from-white to-[#f0f9ff]">
      <div className="container mx-auto px-4">
        <h3 className="text-2xl sm:text-3xl font-bold text-center mb-3">
          הצצה למערכת
        </h3>
        <p className="text-center text-muted-foreground mb-8 max-w-xl mx-auto text-sm sm:text-base">
          גללו הצידה לצפייה במסכים השונים וגלו איך המערכת תעזור לכם לנהל את ועד הבית בקלות
        </p>

        {/* Main display with horizontal scroll */}
        <div className="max-w-4xl mx-auto">
          {/* Scrollable container */}
          <div
            ref={scrollContainerRef}
            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide cursor-grab active:cursor-grabbing"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onScroll={handleScroll}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {mockScreens.map((screen, index) => (
              <div
                key={screen.id}
                className="flex-shrink-0 w-full snap-center px-4"
              >
                <div className="flex flex-col lg:flex-row gap-6 items-center justify-center">
                  {/* Phone Frame - Realistic iPhone style - Hidden on mobile, shown on desktop */}
                  <div
                    className="relative mx-auto max-w-[220px] select-none hidden lg:block"
                    style={{
                      background: 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 50%, #2d2d2d 100%)',
                      borderRadius: '2.5rem',
                      padding: '0.4rem',
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), inset 0 0 0 2px rgba(255,255,255,0.1), 0 0 0 1px rgba(0,0,0,0.3)',
                    }}
                  >
                    {/* Side buttons */}
                    <div className="absolute top-[50%] right-[-2px] -translate-y-1/2 w-[3px] h-[50px] bg-[#333] rounded-l" />
                    <div className="absolute top-[30%] left-[-2px] w-[3px] h-[25px] bg-[#333] rounded-r" />
                    <div className="absolute top-[45%] left-[-2px] w-[3px] h-[25px] bg-[#333] rounded-r" />

                    {/* Screen */}
                    <div className="bg-[#f8fafc] rounded-[2.2rem] overflow-hidden relative min-h-[420px]">
                      {/* Dynamic Island */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90px] h-[22px] bg-[#1a1a1a] rounded-b-[12px] z-10">
                        <div className="absolute top-[7px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#333] rounded-full" />
                      </div>

                      {/* Status bar */}
                      <div className="bg-white px-4 pt-7 pb-1 flex justify-between items-center text-[10px]">
                        <span className="font-medium">12:30</span>
                        <div className="flex gap-1 items-center">
                          <div className="w-3.5 h-1.5 bg-gray-400 rounded-sm" />
                          <div className="w-5 h-2.5 bg-green-500 rounded-sm relative">
                            <div className="absolute -right-0.5 top-0.5 w-0.5 h-1 bg-green-500 rounded-r" />
                          </div>
                        </div>
                      </div>

                      {/* App header */}
                      <div className="bg-gradient-to-l from-[#0ea5e9] to-[#0284c7] px-3 py-2 text-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-4 w-4" />
                            <span className="font-bold text-xs">בית+</span>
                          </div>
                          <div className="text-[10px] opacity-90">בית הרצל 15</div>
                        </div>
                      </div>

                      {/* Screen content */}
                      <div className="bg-[#f0f9ff]">
                        {screen.phoneContent}
                      </div>

                      {/* Home indicator */}
                      <div className="bg-[#f0f9ff] pb-2 pt-3 flex justify-center">
                        <div className="w-24 h-1 bg-gray-300 rounded-full" />
                      </div>
                    </div>
                  </div>

                  {/* Desktop Frame - 16:9 aspect ratio - Shown on all devices */}
                  <div className="mx-auto select-none w-full max-w-[320px] sm:max-w-[400px] lg:max-w-[480px]">
                    <div
                      style={{
                        background: 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 50%, #2d2d2d 100%)',
                        borderRadius: '0.75rem',
                        padding: '0.35rem',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255,255,255,0.1)',
                      }}
                    >
                      <div className="bg-[#f8fafc] rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                        {/* Browser bar */}
                        <div className="bg-gray-100 px-2 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 sm:gap-2 border-b border-gray-200">
                          <div className="flex gap-0.5 sm:gap-1">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-400" />
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-yellow-400" />
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-400" />
                          </div>
                          <div className="flex-1 bg-white rounded px-2 sm:px-3 py-0.5 text-[7px] sm:text-[9px] text-gray-500 text-center border">
                            vaad-bayit.vercel.app/{screen.id === 'dashboard' ? 'dashboard' : `dashboard/${screen.id}`}
                          </div>
                        </div>

                        {/* App content */}
                        <div className="flex h-[calc(100%-24px)] sm:h-[calc(100%-28px)]">
                          {/* Sidebar */}
                          <div className="w-20 sm:w-28 lg:w-32 bg-[#203857] text-white p-1.5 sm:p-2 flex flex-col">
                            <div className="flex items-center gap-1 sm:gap-1.5 mb-2 sm:mb-3 pb-1.5 sm:pb-2 border-b border-white/20">
                              <div className="h-4 w-4 sm:h-6 sm:w-6 rounded-lg bg-[#bee4fa] flex items-center justify-center">
                                <Building2 className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-[#203857]" />
                              </div>
                              <span className="font-bold text-[8px] sm:text-[10px]">בית+</span>
                            </div>
                            <div className="space-y-0.5 text-[8px] sm:text-[10px]">
                              {sidebarItems.map((item, idx) => (
                                <div
                                  key={idx}
                                  className={`px-1 sm:px-1.5 py-0.5 sm:py-1 rounded flex items-center gap-1 sm:gap-1.5 ${
                                    item.id === screen.id
                                      ? 'bg-gradient-to-l from-white/20 to-white/10 border-r-2 border-[#bee4fa]'
                                      : 'opacity-60'
                                  }`}
                                >
                                  <div className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${item.color}`} />
                                  <span className="hidden sm:inline">{item.label}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Main content */}
                          <div className="flex-1 bg-[#f0f9ff] overflow-hidden">
                            {screen.desktopContent}
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Stand */}
                    <div className="w-12 sm:w-16 h-6 sm:h-10 mx-auto bg-gradient-to-b from-[#2d2d2d] to-[#1a1a1a] rounded-b" />
                    <div className="w-20 sm:w-28 h-2 sm:h-2.5 mx-auto bg-gradient-to-b from-[#1a1a1a] to-[#333] rounded-b-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Screen description */}
          <div className="text-center mt-6">
            <h4 className="text-lg sm:text-xl font-bold text-[#203857]">{activeScreen.title}</h4>
            <p className="text-muted-foreground text-sm">{activeScreen.description}</p>
          </div>

          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mt-4">
            {mockScreens.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollToIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === activeIndex ? 'bg-[#203857] w-6' : 'bg-[#203857]/30'
                }`}
              />
            ))}
          </div>

          {/* Swipe hint */}
          <p className="text-center text-xs text-muted-foreground mt-3">
            ← גללו לצדדים לצפייה במסכים נוספים →
          </p>
        </div>
      </div>
    </section>
  );
}
