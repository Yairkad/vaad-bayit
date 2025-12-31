'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Mail, Phone, MapPin, MessageSquare, Check, X, Eye } from 'lucide-react';

type ContactRequest = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string;
  city: string | null;
  message: string | null;
  status: 'new' | 'contacted' | 'converted' | 'dismissed';
  notes: string | null;
  created_at: string;
};

const statusLabels: Record<ContactRequest['status'], string> = {
  new: 'חדש',
  contacted: 'נוצר קשר',
  converted: 'הומר ללקוח',
  dismissed: 'נדחה',
};

const statusColors: Record<ContactRequest['status'], string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  converted: 'bg-green-100 text-green-800',
  dismissed: 'bg-gray-100 text-gray-800',
};

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ContactRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editStatus, setEditStatus] = useState<ContactRequest['status']>('new');
  const [editNotes, setEditNotes] = useState('');
  const [filter, setFilter] = useState<'all' | ContactRequest['status']>('all');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('contact_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading requests:', error);
      toast.error('שגיאה בטעינת הפניות');
    } else {
      setRequests(data as ContactRequest[]);
    }

    setIsLoading(false);
  };

  const openRequestDialog = (request: ContactRequest) => {
    setSelectedRequest(request);
    setEditStatus(request.status);
    setEditNotes(request.notes || '');
    setIsDialogOpen(true);
  };

  const handleUpdateRequest = async () => {
    if (!selectedRequest) return;

    setIsSaving(true);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('contact_requests')
        .update({
          status: editStatus,
          notes: editNotes || null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast.success('הפניה עודכנה בהצלחה');
      setIsDialogOpen(false);
      loadRequests();
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('שגיאה בעדכון הפניה');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickStatusChange = async (request: ContactRequest, newStatus: ContactRequest['status']) => {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('contact_requests')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', request.id);

      if (error) throw error;

      toast.success('הסטטוס עודכן');
      loadRequests();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('שגיאה בעדכון הסטטוס');
    }
  };

  const filteredRequests = requests.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const counts = {
    all: requests.length,
    new: requests.filter(r => r.status === 'new').length,
    contacted: requests.filter(r => r.status === 'contacted').length,
    converted: requests.filter(r => r.status === 'converted').length,
    dismissed: requests.filter(r => r.status === 'dismissed').length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.6) 0%, rgba(255, 255, 255, 1) 100%)', margin: '-1.5rem', padding: '1.5rem', minHeight: 'calc(100vh - 4rem)' }}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">פניות חדשות</h1>
          <p className="text-muted-foreground">פניות מבניינים שמעוניינים להצטרף למערכת</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilter('all')}>
          <CardContent className="p-3">
            <div className="text-2xl font-bold">{counts.all}</div>
            <div className="text-xs text-muted-foreground">סה״כ פניות</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilter('new')}>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-blue-600">{counts.new}</div>
            <div className="text-xs text-muted-foreground">חדשות</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilter('contacted')}>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-yellow-600">{counts.contacted}</div>
            <div className="text-xs text-muted-foreground">נוצר קשר</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilter('converted')}>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-green-600">{counts.converted}</div>
            <div className="text-xs text-muted-foreground">הומרו</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilter('dismissed')}>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-gray-600">{counts.dismissed}</div>
            <div className="text-xs text-muted-foreground">נדחו</div>
          </CardContent>
        </Card>
      </div>

      {/* Request Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>פרטי פניה</DialogTitle>
            <DialogDescription>
              {selectedRequest?.full_name} - {selectedRequest?.address}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">שם</Label>
                  <p className="font-medium">{selectedRequest.full_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">תאריך פניה</Label>
                  <p className="font-medium">
                    {new Date(selectedRequest.created_at).toLocaleDateString('he-IL')}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">אימייל</Label>
                  <p className="font-medium" dir="ltr">{selectedRequest.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">טלפון</Label>
                  <p className="font-medium" dir="ltr">{selectedRequest.phone || '-'}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">כתובת</Label>
                  <p className="font-medium">
                    {selectedRequest.address}
                    {selectedRequest.city && `, ${selectedRequest.city}`}
                  </p>
                </div>
                {selectedRequest.message && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">הודעה</Label>
                    <p className="font-medium">{selectedRequest.message}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 space-y-4">
                <div className="space-y-2">
                  <Label>סטטוס</Label>
                  <Select
                    value={editStatus}
                    onValueChange={(value) => setEditStatus(value as ContactRequest['status'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">חדש</SelectItem>
                      <SelectItem value="contacted">נוצר קשר</SelectItem>
                      <SelectItem value="converted">הומר ללקוח</SelectItem>
                      <SelectItem value="dismissed">נדחה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>הערות פנימיות</Label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="הערות לשימוש פנימי..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleUpdateRequest} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'שמור'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cards View (Mobile) */}
      <div className="lg:hidden space-y-3">
        {filteredRequests.map((request) => (
          <Card key={request.id} onClick={() => openRequestDialog(request)} className="cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{request.full_name}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${statusColors[request.status]}`}>
                      {statusLabels[request.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{request.address}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <span dir="ltr" className="truncate">{request.email}</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(request.created_at).toLocaleDateString('he-IL')}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {request.status === 'new' && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickStatusChange(request, 'contacted');
                        }}
                        title="סמן כנוצר קשר"
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickStatusChange(request, 'dismissed');
                        }}
                        title="דחה"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredRequests.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              אין פניות
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden lg:block">
        <CardHeader>
          <CardTitle className="text-lg">רשימת פניות</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם</TableHead>
                <TableHead>כתובת</TableHead>
                <TableHead>אימייל</TableHead>
                <TableHead>טלפון</TableHead>
                <TableHead>תאריך</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.full_name}</TableCell>
                  <TableCell>
                    {request.address}
                    {request.city && `, ${request.city}`}
                  </TableCell>
                  <TableCell dir="ltr">{request.email}</TableCell>
                  <TableCell dir="ltr">{request.phone || '-'}</TableCell>
                  <TableCell>
                    {new Date(request.created_at).toLocaleDateString('he-IL')}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${statusColors[request.status]}`}>
                      {statusLabels[request.status]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openRequestDialog(request)}
                        title="צפה בפרטים"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {request.status === 'new' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleQuickStatusChange(request, 'contacted')}
                            title="סמן כנוצר קשר"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleQuickStatusChange(request, 'dismissed')}
                            title="דחה"
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRequests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    אין פניות
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
