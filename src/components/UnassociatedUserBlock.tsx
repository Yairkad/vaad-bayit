'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, LogOut, Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from '@/i18n/navigation';

export function UnassociatedUserBlock() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <CardTitle className="text-xl">חשבון לא משויך</CardTitle>
          <CardDescription>
            החשבון שלך לא משויך לאף בניין במערכת
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">איך להצטרף לבניין?</p>
                <p className="text-sm text-muted-foreground">
                  פנה לוועד הבניין שלך ובקש קישור הזמנה להצטרפות למערכת.
                </p>
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground text-center">
            אם קיבלת קישור הזמנה, השתמש בו כדי להירשם מחדש או פנה לוועד לעזרה.
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="ml-2 h-4 w-4" />
            התנתקות
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
