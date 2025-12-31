'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useBuilding } from '@/contexts/BuildingContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Copy, Trash2, Loader2, Link2, QrCode } from 'lucide-react';
import type { BuildingInvite, Building, BuildingMember } from '@/types/database';

type InviteWithBuilding = BuildingInvite & {
  buildings?: Building;
};

export default function InvitesPage() {
  const t = useTranslations();
  const confirm = useConfirm();
  const { currentBuilding } = useBuilding();
  const [invites, setInvites] = useState<InviteWithBuilding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    default_role: 'tenant' as 'committee' | 'tenant',
    max_uses: '',
    expires_days: '',
  });

  // Get building info from context
  const buildingId = currentBuilding?.id || null;
  const building = currentBuilding;

  useEffect(() => {
    if (currentBuilding?.id) {
      loadData();
    } else {
      setIsLoading(false);
    }
  }, [currentBuilding?.id]);

  const loadData = async () => {
    if (!currentBuilding?.id) return;

    setIsLoading(true);
    const supabase = createClient();

    const { data: invitesData } = await supabase
      .from('building_invites')
      .select('*, buildings(*)')
      .eq('building_id', currentBuilding.id)
      .order('created_at', { ascending: false });

    setInvites((invitesData as InviteWithBuilding[]) || []);
    setIsLoading(false);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingId) return;

    setIsSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const code = generateCode();
      const expiresAt = formData.expires_days
        ? new Date(Date.now() + parseInt(formData.expires_days) * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase
        .from('building_invites')
        .insert({
          building_id: buildingId,
          code,
          default_role: formData.default_role,
          max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
          expires_at: expiresAt,
          created_by: user?.id,
        } as never);

      if (error) throw error;

      toast.success('קישור ההזמנה נוצר בהצלחה');
      setIsDialogOpen(false);
      setFormData({ default_role: 'tenant', max_uses: '', expires_days: '' });
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('שגיאה ביצירת הקישור');
    } finally {
      setIsSaving(false);
    }
  };

  const copyLink = (code: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/he/register?invite=${code}`;
    navigator.clipboard.writeText(link);
    toast.success('הקישור הועתק ללוח');
  };

  const deleteInvite = async (invite: BuildingInvite) => {
    const confirmed = await confirm({
      title: 'מחיקת קישור הזמנה',
      description: 'האם למחוק את קישור ההזמנה?',
      confirmText: 'מחק',
      cancelText: 'ביטול',
      variant: 'destructive',
    });
    if (!confirmed) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('building_invites')
      .delete()
      .eq('id', invite.id);

    if (error) {
      toast.error('שגיאה במחיקה');
      return;
    }

    toast.success('הקישור נמחק');
    loadData();
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isMaxedOut = (invite: BuildingInvite) => {
    if (!invite.max_uses) return false;
    return invite.uses_count >= invite.max_uses;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!buildingId) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">אין לך הרשאות ניהול</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" style={{ background: 'linear-gradient(135deg, rgba(236, 252, 203, 0.6) 0%, rgba(255, 255, 255, 1) 100%)', margin: '-1.5rem', padding: '1.5rem', minHeight: 'calc(100vh - 4rem)' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">קישורי הזמנה</h1>
          <p className="text-muted-foreground text-sm sm:text-base">{building?.name} - שליחת קישורי הרשמה לדיירים</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              צור קישור חדש
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>יצירת קישור הזמנה</DialogTitle>
              <DialogDescription>
                צור קישור הרשמה ייחודי לבניין שלך
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>תפקיד ברירת מחדל</Label>
                  <Select
                    value={formData.default_role}
                    onValueChange={(value: 'committee' | 'tenant') =>
                      setFormData({ ...formData, default_role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tenant">דייר</SelectItem>
                      <SelectItem value="committee">ועד בית</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    התפקיד שיוגדר אוטומטית למשתמש שנרשם דרך הקישור
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>מספר שימושים מקסימלי</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="ללא הגבלה"
                      value={formData.max_uses}
                      onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>תוקף (ימים)</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="ללא הגבלה"
                      value={formData.expires_days}
                      onChange={(e) => setFormData({ ...formData, expires_days: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  ביטול
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'צור קישור'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Link2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">איך זה עובד?</p>
              <p className="text-blue-700">
                צור קישור הזמנה ושלח אותו לדיירים. כשהם נרשמים דרך הקישור, הם מתווספים אוטומטית לבניין שלך.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {invites.map((invite) => {
          const expired = isExpired(invite.expires_at);
          const maxedOut = isMaxedOut(invite);
          const isValid = invite.is_active && !expired && !maxedOut;

          return (
            <Card key={invite.id} className={!isValid ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-lg">{invite.code}</span>
                      {!invite.is_active ? (
                        <Badge variant="outline">מבוטל</Badge>
                      ) : expired ? (
                        <Badge variant="destructive">פג תוקף</Badge>
                      ) : maxedOut ? (
                        <Badge variant="secondary">מיצה שימושים</Badge>
                      ) : (
                        <Badge className="bg-green-600">פעיל</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={invite.default_role === 'committee' ? 'default' : 'secondary'}>
                        {invite.default_role === 'committee' ? 'ועד' : 'דייר'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {invite.uses_count}{invite.max_uses && ` / ${invite.max_uses}`} שימושים
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      תוקף: {invite.expires_at
                        ? new Date(invite.expires_at).toLocaleDateString('he-IL')
                        : 'ללא הגבלה'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyLink(invite.code)}
                      title="העתק קישור"
                      disabled={!isValid}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteInvite(invite)}
                      title="מחק"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {invites.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              אין קישורי הזמנה. לחץ על "צור קישור חדש" ליצירת הקישור הראשון.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle className="text-lg">קישורים פעילים</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>קוד</TableHead>
                <TableHead>תפקיד</TableHead>
                <TableHead>שימושים</TableHead>
                <TableHead>תוקף</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((invite) => {
                const expired = isExpired(invite.expires_at);
                const maxedOut = isMaxedOut(invite);
                const isValid = invite.is_active && !expired && !maxedOut;

                return (
                  <TableRow key={invite.id} className={!isValid ? 'opacity-60' : ''}>
                    <TableCell className="font-mono font-bold">{invite.code}</TableCell>
                    <TableCell>
                      <Badge variant={invite.default_role === 'committee' ? 'default' : 'secondary'}>
                        {invite.default_role === 'committee' ? 'ועד' : 'דייר'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {invite.uses_count}
                      {invite.max_uses && ` / ${invite.max_uses}`}
                    </TableCell>
                    <TableCell>
                      {invite.expires_at
                        ? new Date(invite.expires_at).toLocaleDateString('he-IL')
                        : 'ללא הגבלה'}
                    </TableCell>
                    <TableCell>
                      {!invite.is_active ? (
                        <Badge variant="outline">מבוטל</Badge>
                      ) : expired ? (
                        <Badge variant="destructive">פג תוקף</Badge>
                      ) : maxedOut ? (
                        <Badge variant="secondary">מיצה שימושים</Badge>
                      ) : (
                        <Badge className="bg-green-600">פעיל</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyLink(invite.code)}
                          title="העתק קישור"
                          disabled={!isValid}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteInvite(invite)}
                          title="מחק"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {invites.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    אין קישורי הזמנה. לחץ על "צור קישור חדש" ליצירת הקישור הראשון.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
