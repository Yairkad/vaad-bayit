'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertTriangle, MessageSquare, Building2, CreditCard, FileText, Calendar } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';

interface LastPayment {
  month: string;
  amount: number;
  paid_at: string;
}

interface Issue {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

interface Message {
  id: string;
  title: string;
  created_at: string;
  expires_at?: string;
}

interface TenantData {
  buildingName: string | null;
  apartmentNumber: string | null;
  standingOrderActive: boolean;
  lastPayment: LastPayment | null;
  unpaidCount: number;
  totalDue: number;
  myOpenIssues: Issue[];
  recentMessages: Message[];
}

export default function TenantDashboardPage() {
  const [data, setData] = useState<TenantData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get building membership
    const { data: membership } = await supabase
      .from('building_members')
      .select('id, apartment_number, building_id, standing_order_active, buildings(name, address)')
      .eq('user_id', user.id)
      .single() as { data: { id: string; apartment_number: string; building_id: string; standing_order_active: boolean; buildings: { name: string; address: string } | null } | null };

    if (!membership) {
      setData({
        buildingName: null,
        apartmentNumber: null,
        standingOrderActive: false,
        lastPayment: null,
        unpaidCount: 0,
        totalDue: 0,
        myOpenIssues: [],
        recentMessages: [],
      });
      setIsLoading(false);
      return;
    }

    const building = membership.buildings as { name: string; address: string } | null;

    // Get last paid payment
    const { data: lastPaymentData } = await supabase
      .from('payments')
      .select('month, amount, paid_at')
      .eq('member_id', membership.id)
      .eq('is_paid', true)
      .order('paid_at', { ascending: false })
      .limit(1)
      .single();

    // Get unpaid payments
    const { data: unpaidPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('member_id', membership.id)
      .eq('is_paid', false);

    // Get my open issues
    const { data: myIssues } = await supabase
      .from('issues')
      .select('id, title, status, created_at')
      .eq('reported_by', membership.id)
      .neq('status', 'closed')
      .order('created_at', { ascending: false })
      .limit(3);

    // Get recent messages (last 5)
    const { data: messages } = await supabase
      .from('messages')
      .select('id, title, created_at, expires_at')
      .eq('building_id', membership.building_id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Filter out expired messages
    const activeMessages = (messages || []).filter((msg: Message) => {
      if (!msg.expires_at) return true;
      return new Date(msg.expires_at) > new Date();
    });

    const totalDue = unpaidPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    setData({
      buildingName: building?.address || building?.name || null,
      apartmentNumber: membership.apartment_number,
      standingOrderActive: membership.standing_order_active || false,
      lastPayment: lastPaymentData as LastPayment | null,
      unpaidCount: unpaidPayments?.length || 0,
      totalDue,
      myOpenIssues: myIssues || [],
      recentMessages: activeMessages,
    });

    setIsLoading(false);
  };

  const formatMonth = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="destructive">פתוחה</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-500">בטיפול</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!data?.buildingName) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">האזור האישי שלי</h1>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">עדיין לא משויך לבניין</h2>
            <p className="text-muted-foreground">
              פנה לוועד הבניין כדי שיוסיפו אותך למערכת
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-3xl font-bold">שלום!</h1>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge variant="outline" className="text-sm">
            <Building2 className="h-3 w-3 ml-1" />
            {data.buildingName}
          </Badge>
          <Badge variant="secondary" className="text-sm">
            דירה {data.apartmentNumber}
          </Badge>
        </div>
      </div>

      {/* Payment Status Card */}
      <Card className={data.totalDue > 0 ? 'border-red-200' : 'border-green-200'}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            מצב תשלומים
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Standing Order Status */}
          <div className="flex items-center gap-2">
            {data.standingOrderActive ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">הוראת קבע פעילה</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-orange-700">אין הוראת קבע פעילה</span>
              </>
            )}
          </div>

          {/* Last Payment */}
          {data.lastPayment && (
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">תשלום אחרון:</span>
              </div>
              <p className="text-green-800 mt-1">
                <span className="font-bold">₪{Number(data.lastPayment.amount).toLocaleString()}</span>
                {' עבור '}
                {formatMonth(data.lastPayment.month)}
              </p>
              <p className="text-xs text-green-600">
                שולם ב-{new Date(data.lastPayment.paid_at).toLocaleDateString('he-IL')}
              </p>
            </div>
          )}

          {/* Unpaid */}
          {data.totalDue > 0 && (
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-red-700">
                <span className="font-bold">לתשלום: ₪{data.totalDue.toLocaleString()}</span>
                {' '}({data.unpaidCount} תשלומים)
              </p>
            </div>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push('/tenant/payments')}
          >
            צפייה בכל התשלומים
          </Button>
        </CardContent>
      </Card>

      {/* My Open Issues */}
      {data.myOpenIssues.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              התקלות שפתחתי
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.myOpenIssues.map((issue) => (
              <div key={issue.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <span className="text-sm">{issue.title}</span>
                {getStatusBadge(issue.status)}
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => router.push('/tenant/issues')}
            >
              צפייה בכל התקלות
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Messages */}
      {data.recentMessages.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              הודעות אחרונות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentMessages.map((msg) => (
              <div key={msg.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <span className="text-sm truncate flex-1">{msg.title}</span>
                <span className="text-xs text-muted-foreground shrink-0 mr-2">
                  {new Date(msg.created_at).toLocaleDateString('he-IL')}
                </span>
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => router.push('/tenant/messages')}
            >
              צפייה בכל ההודעות
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">פעולות מהירות</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-auto py-4 flex-col gap-2"
            onClick={() => router.push('/tenant/issues')}
          >
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">דיווח תקלה</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex-col gap-2"
            onClick={() => router.push('/tenant/documents')}
          >
            <FileText className="h-5 w-5" />
            <span className="text-sm">מסמכים</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
