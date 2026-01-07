'use client';

import { useState } from 'react';
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
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Mock data for demonstrations
const mockScreens = [
  {
    id: 'dashboard',
    title: 'לוח בקרה',
    description: 'סקירה מהירה של כל הנתונים החשובים',
    icon: LayoutDashboard,
    content: (
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg">לוח בקרה</h3>
            <p className="text-sm text-muted-foreground">רחוב הרצל 15, תל אביב</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatMockup icon={Users} label="דיירים" value="24" color="blue" />
          <StatMockup icon={CreditCard} label="לא שולמו" value="3" color="red" />
          <StatMockup icon={AlertTriangle} label="תקלות פתוחות" value="2" color="orange" />
          <StatMockup icon={Receipt} label="הוצאות החודש" value="₪4,250" color="green" />
        </div>
      </div>
    ),
  },
  {
    id: 'messages',
    title: 'לוח מודעות',
    description: 'שליחת הודעות וסקרים לכל הדיירים',
    icon: MessageSquare,
    content: (
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">הודעות</h3>
          <Badge className="bg-blue-500">+ הודעה חדשה</Badge>
        </div>
        <MessageMockup
          title="אסיפת דיירים שנתית"
          date="15 בינואר 2026"
          hasVote
          yesCount={18}
          noCount={4}
        />
        <MessageMockup
          title="עבודות תחזוקה בחניון"
          date="10 בינואר 2026"
        />
        <MessageMockup
          title="עדכון תעריפי ועד"
          date="5 בינואר 2026"
          hasVote
          yesCount={20}
          noCount={2}
        />
      </div>
    ),
  },
  {
    id: 'phonebook',
    title: 'אלפון דיירים',
    description: 'רשימת כל הדיירים ופרטי הקשר שלהם',
    icon: Phone,
    content: (
      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">אלפון</h3>
          <div className="flex gap-2">
            <Badge variant="outline">סינון</Badge>
            <Badge variant="outline">חיפוש</Badge>
          </div>
        </div>
        <TenantMockup name="ישראל ישראלי" apt="1" floor="קרקע" phone="050-1234567" />
        <TenantMockup name="שרה כהן" apt="3" floor="1" phone="052-9876543" />
        <TenantMockup name="דוד לוי" apt="5" floor="2" phone="054-5551234" />
        <TenantMockup name="רחל אברהם" apt="7" floor="3" phone="053-7778899" />
        <TenantMockup name="משה גולן" apt="9" floor="4" phone="058-1112233" />
      </div>
    ),
  },
  {
    id: 'payments',
    title: 'מעקב תשלומים',
    description: 'מעקב אחר תשלומי ועד והוראות קבע',
    icon: CreditCard,
    content: (
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">תשלומים</h3>
          <Badge className="bg-green-500">₪12,450 החודש</Badge>
        </div>
        <PaymentMockup apt="1" name="ישראל ישראלי" amount={350} paid />
        <PaymentMockup apt="3" name="שרה כהן" amount={350} paid />
        <PaymentMockup apt="5" name="דוד לוי" amount={350} paid={false} />
        <PaymentMockup apt="7" name="רחל אברהם" amount={350} paid />
        <PaymentMockup apt="9" name="משה גולן" amount={350} paid={false} />
      </div>
    ),
  },
];

// Helper Components for mockups
function StatMockup({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    green: 'bg-green-50 text-green-600 border-green-200',
  }[color] || 'bg-gray-50 text-gray-600 border-gray-200';

  return (
    <div className={`p-3 rounded-lg border ${colorClasses}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function MessageMockup({ title, date, hasVote, yesCount, noCount }: { title: string; date: string; hasVote?: boolean; yesCount?: number; noCount?: number }) {
  return (
    <div className="p-3 bg-white border rounded-lg shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{date}</p>
        </div>
        {hasVote && <Badge variant="secondary" className="text-[10px]">סקר</Badge>}
      </div>
      {hasVote && (
        <div className="flex gap-2 mt-2">
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">בעד: {yesCount}</span>
          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">נגד: {noCount}</span>
        </div>
      )}
    </div>
  );
}

function TenantMockup({ name, apt, floor, phone }: { name: string; apt: string; floor: string; phone: string }) {
  return (
    <div className="flex items-center justify-between p-2 bg-white border rounded-lg text-sm">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
          {name.charAt(0)}
        </div>
        <div>
          <p className="font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">דירה {apt} • קומה {floor}</p>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">{phone}</span>
    </div>
  );
}

function PaymentMockup({ apt, name, amount, paid }: { apt: string; name: string; amount: number; paid: boolean }) {
  return (
    <div className="flex items-center justify-between p-2 bg-white border rounded-lg text-sm">
      <div className="flex items-center gap-3">
        <span className="font-medium text-muted-foreground">דירה {apt}</span>
        <span>{name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium">₪{amount}</span>
        <Badge variant={paid ? 'default' : 'destructive'} className={`text-[10px] ${paid ? 'bg-green-500' : ''}`}>
          {paid ? 'שולם' : 'לא שולם'}
        </Badge>
      </div>
    </div>
  );
}

export function ScreenshotsGallery() {
  const [activeIndex, setActiveIndex] = useState(0);

  const goToPrev = () => {
    setActiveIndex((prev) => (prev === 0 ? mockScreens.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setActiveIndex((prev) => (prev === mockScreens.length - 1 ? 0 : prev + 1));
  };

  const activeScreen = mockScreens[activeIndex];

  return (
    <section className="py-16 bg-gradient-to-b from-white to-[#f0f9ff]">
      <div className="container mx-auto px-4">
        <h3 className="text-3xl font-bold text-center mb-4">
          הצצה למערכת
        </h3>
        <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">
          צפו במסכים העיקריים וגלו איך המערכת תעזור לכם לנהל את ועד הבית בקלות
        </p>

        {/* Screen selector tabs */}
        <div className="flex justify-center gap-2 mb-8 flex-wrap">
          {mockScreens.map((screen, index) => (
            <button
              key={screen.id}
              onClick={() => setActiveIndex(index)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                index === activeIndex
                  ? 'bg-[#203857] text-white shadow-lg'
                  : 'bg-white text-[#203857] border border-[#203857]/20 hover:bg-[#bee4fa]'
              }`}
            >
              <screen.icon className="h-4 w-4" />
              <span className="text-sm font-medium">{screen.title}</span>
            </button>
          ))}
        </div>

        {/* Main display */}
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Navigation arrows */}
            <Button
              variant="outline"
              size="icon"
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 rounded-full shadow-lg bg-white hidden md:flex"
              onClick={goToPrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 rounded-full shadow-lg bg-white hidden md:flex"
              onClick={goToNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Device Frame */}
            <div className="bg-[#1a1a1a] rounded-[2.5rem] p-3 shadow-2xl max-w-md mx-auto">
              {/* Phone notch */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#1a1a1a] rounded-b-xl z-10" />

              {/* Screen content */}
              <div className="bg-[#f8fafc] rounded-[2rem] overflow-hidden min-h-[500px]">
                {/* Status bar mockup */}
                <div className="bg-white px-6 py-2 flex justify-between items-center text-xs border-b">
                  <span>12:30</span>
                  <div className="flex gap-1">
                    <div className="w-4 h-2 bg-gray-400 rounded-sm" />
                    <div className="w-4 h-2 bg-gray-300 rounded-sm" />
                    <div className="w-6 h-3 bg-green-500 rounded-sm" />
                  </div>
                </div>

                {/* App header */}
                <div className="bg-gradient-to-l from-[#0ea5e9] to-[#0284c7] px-4 py-3 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      <span className="font-bold">ועד בית</span>
                    </div>
                    <div className="text-xs">בית הרצל 15</div>
                  </div>
                </div>

                {/* Screen content */}
                <div className="bg-[#f0f9ff]">
                  {activeScreen.content}
                </div>
              </div>
            </div>
          </div>

          {/* Screen description */}
          <div className="text-center mt-8">
            <h4 className="text-xl font-bold text-[#203857]">{activeScreen.title}</h4>
            <p className="text-muted-foreground">{activeScreen.description}</p>
          </div>

          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {mockScreens.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === activeIndex ? 'bg-[#203857] w-6' : 'bg-[#203857]/30'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
