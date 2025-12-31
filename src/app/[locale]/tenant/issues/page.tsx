'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Plus, AlertTriangle } from 'lucide-react';

interface Issue {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  closing_response: string | null;
  in_progress_response: string | null;
  created_at: string;
  closed_at: string | null;
}

export default function TenantIssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [buildingId, setBuildingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'normal',
  });

  useEffect(() => {
    loadIssues();
  }, []);

  const loadIssues = async () => {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get membership
    const { data: membership } = await supabase
      .from('building_members')
      .select('id, building_id')
      .eq('user_id', user.id)
      .single() as { data: { id: string; building_id: string } | null };

    if (!membership) {
      setIsLoading(false);
      return;
    }

    setMemberId(membership.id);
    setBuildingId(membership.building_id);

    // Get issues reported by this user
    const { data } = await supabase
      .from('issues')
      .select('*')
      .eq('reported_by', membership.id)
      .order('created_at', { ascending: false }) as { data: Issue[] | null };

    setIssues(data || []);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || !buildingId) return;

    setIsSaving(true);
    const supabase = createClient();

    try {
      const { error } = await supabase.from('issues').insert({
        building_id: buildingId,
        reported_by: memberId,
        title: formData.title,
        description: formData.description || null,
        priority: formData.priority,
        status: 'open',
      } as never);

      if (error) throw error;

      toast.success('התקלה דווחה בהצלחה');
      setIsDialogOpen(false);
      setFormData({ title: '', description: '', priority: 'normal' });
      loadIssues();
    } catch (error) {
      console.error(error);
      toast.error('שגיאה בדיווח התקלה');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="destructive">פתוחה</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-500">בטיפול</Badge>;
      case 'closed':
        return <Badge variant="secondary">סגורה</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">דחוף</Badge>;
      case 'low':
        return <Badge variant="outline">נמוכה</Badge>;
      default:
        return <Badge variant="secondary">רגילה</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6" style={{ background: 'linear-gradient(135deg, rgba(254, 202, 202, 0.2) 0%, rgba(255, 255, 255, 1) 100%)', margin: '-1.5rem', padding: '1.5rem', minHeight: 'calc(100vh - 4rem)' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold">התקלות שלי</h1>
          <p className="text-sm sm:text-base text-muted-foreground">דיווח וצפייה בתקלות</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              דיווח תקלה חדשה
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>דיווח תקלה חדשה</DialogTitle>
              <DialogDescription>
                תאר את התקלה כדי שהוועד יוכל לטפל בה
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">כותרת *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="לדוגמה: נזילה בחדר מדרגות"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">תיאור</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="תאר את התקלה בפירוט..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>עדיפות</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">נמוכה</SelectItem>
                      <SelectItem value="normal">רגילה</SelectItem>
                      <SelectItem value="high">דחוף</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  ביטול
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'שלח דיווח'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {issues.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">לא דיווחת על תקלות</p>
            <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
              <Plus className="ml-2 h-4 w-4" />
              דיווח תקלה ראשונה
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {issues.map((issue) => (
            <Card key={issue.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{issue.title}</CardTitle>
                  <div className="flex gap-2 shrink-0">
                    {getPriorityBadge(issue.priority)}
                    {getStatusBadge(issue.status)}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  נפתחה ב-{new Date(issue.created_at).toLocaleDateString('he-IL')}
                  {issue.closed_at && (
                    <> · נסגרה ב-{new Date(issue.closed_at).toLocaleDateString('he-IL')}</>
                  )}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {issue.description && (
                  <p className="text-sm whitespace-pre-wrap">{issue.description}</p>
                )}
                {issue.in_progress_response && issue.status === 'in_progress' && (
                  <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">עדכון מהוועד:</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 whitespace-pre-wrap">{issue.in_progress_response}</p>
                  </div>
                )}
                {issue.closing_response && issue.status === 'closed' && (
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">תשובת הוועד:</p>
                    <p className="text-sm text-green-700 dark:text-green-300 whitespace-pre-wrap">{issue.closing_response}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
