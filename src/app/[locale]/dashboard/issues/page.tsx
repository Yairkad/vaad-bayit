'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Loader2, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import type { Issue, BuildingMember, Building } from '@/types/database';

type IssueWithReporter = Issue & {
  building_members?: BuildingMember;
};

export default function IssuesPage() {
  const t = useTranslations();
  const [issues, setIssues] = useState<IssueWithReporter[]>([]);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'closed'>('all');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'normal' as 'low' | 'normal' | 'high',
  });
  const [closingIssue, setClosingIssue] = useState<Issue | null>(null);
  const [closingResponse, setClosingResponse] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    type MemberWithBuilding = BuildingMember & { buildings: Building | null };
    const { data: membership } = await supabase
      .from('building_members')
      .select('building_id, buildings(*), id')
      .eq('user_id', user.id)
      .eq('role', 'committee')
      .single() as { data: MemberWithBuilding | null };

    if (membership?.building_id) {
      setBuildingId(membership.building_id);
      setBuilding(membership.buildings as Building);

      const { data: issuesData } = await supabase
        .from('issues')
        .select('*, building_members(full_name, apartment_number)')
        .eq('building_id', membership.building_id)
        .order('created_at', { ascending: false });

      setIssues((issuesData as IssueWithReporter[]) || []);
    }

    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'normal',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingId) return;

    setIsSaving(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('issues')
        .insert({
          building_id: buildingId,
          title: formData.title,
          description: formData.description || null,
          priority: formData.priority,
          status: 'open',
        } as never);

      if (error) throw error;

      toast.success('התקלה נוספה');
      setIsDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('אירעה שגיאה');
    } finally {
      setIsSaving(false);
    }
  };

  const updateStatus = async (issue: Issue, newStatus: 'open' | 'in_progress' | 'closed') => {
    // If closing, open the closing dialog
    if (newStatus === 'closed') {
      setClosingIssue(issue);
      setClosingResponse('');
      return;
    }

    const supabase = createClient();

    const { error } = await supabase
      .from('issues')
      .update({
        status: newStatus,
        closed_at: null,
        closing_response: null,
      } as never)
      .eq('id', issue.id);

    if (error) {
      toast.error('שגיאה בעדכון');
      return;
    }

    toast.success('הסטטוס עודכן');
    loadData();
  };

  const handleCloseIssue = async () => {
    if (!closingIssue) return;

    setIsSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('issues')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closing_response: closingResponse || null,
      } as never)
      .eq('id', closingIssue.id);

    if (error) {
      toast.error('שגיאה בסגירת התקלה');
      setIsSaving(false);
      return;
    }

    toast.success('התקלה נסגרה');
    setClosingIssue(null);
    setClosingResponse('');
    setIsSaving(false);
    loadData();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'closed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'destructive' | 'default' | 'secondary'> = {
      open: 'destructive',
      in_progress: 'default',
      closed: 'secondary',
    };
    const labels: Record<string, string> = {
      open: t('issues.status.open'),
      in_progress: t('issues.status.inProgress'),
      closed: t('issues.status.closed'),
    };
    return (
      <Badge variant={variants[status]} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {labels[status]}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      normal: 'bg-blue-100 text-blue-800',
      high: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      low: t('issues.priority.low'),
      normal: t('issues.priority.normal'),
      high: t('issues.priority.high'),
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[priority]}`}>
        {labels[priority]}
      </span>
    );
  };

  const filteredIssues = issues.filter(issue => {
    if (filter === 'all') return true;
    return issue.status === filter;
  });

  const counts = {
    all: issues.length,
    open: issues.filter(i => i.status === 'open').length,
    in_progress: issues.filter(i => i.status === 'in_progress').length,
    closed: issues.filter(i => i.status === 'closed').length,
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('issues.title')}</h1>
          <p className="text-muted-foreground">{building?.name}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              {t('issues.reportIssue')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('issues.reportIssue')}</DialogTitle>
              <DialogDescription>
                דיווח על תקלה חדשה בבניין
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">{t('issues.issueTitle')} *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="תאר את התקלה בקצרה"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t('common.description')}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="פרטים נוספים..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>עדיפות</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: 'low' | 'normal' | 'high') =>
                      setFormData({ ...formData, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('issues.priority.low')}</SelectItem>
                      <SelectItem value="normal">{t('issues.priority.normal')}</SelectItem>
                      <SelectItem value="high">{t('issues.priority.high')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.save')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'open', 'in_progress', 'closed'] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status === 'all' && 'הכל'}
            {status === 'open' && t('issues.status.open')}
            {status === 'in_progress' && t('issues.status.inProgress')}
            {status === 'closed' && t('issues.status.closed')}
            <span className="mr-2 bg-white/20 px-1.5 py-0.5 rounded text-xs">
              {counts[status]}
            </span>
          </Button>
        ))}
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {filteredIssues.map((issue) => (
          <Card key={issue.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(issue.status)}
                    {getPriorityBadge(issue.priority)}
                  </div>
                  <p className="font-medium">{issue.title}</p>
                  {issue.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{issue.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{new Date(issue.created_at).toLocaleDateString('he-IL')}</span>
                    {issue.building_members && (
                      <span>• {issue.building_members.full_name} (דירה {issue.building_members.apartment_number})</span>
                    )}
                  </div>
                </div>
                <Select
                  value={issue.status}
                  onValueChange={(value: 'open' | 'in_progress' | 'closed') =>
                    updateStatus(issue, value)
                  }
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">{t('issues.status.open')}</SelectItem>
                    <SelectItem value="in_progress">{t('issues.status.inProgress')}</SelectItem>
                    <SelectItem value="closed">{t('issues.status.closed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredIssues.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              אין תקלות
            </CardContent>
          </Card>
        )}
      </div>

      {/* Issues Table - Desktop */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle className="text-lg">רשימת תקלות</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>{t('issues.issueTitle')}</TableHead>
                <TableHead>{t('issues.reportedBy')}</TableHead>
                <TableHead>עדיפות</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIssues.map((issue) => (
                <TableRow key={issue.id}>
                  <TableCell>
                    {new Date(issue.created_at).toLocaleDateString('he-IL')}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{issue.title}</p>
                      {issue.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-xs">
                          {issue.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {issue.building_members ? (
                      <span>
                        {issue.building_members.full_name}
                        <span className="text-muted-foreground mr-1">
                          (דירה {issue.building_members.apartment_number})
                        </span>
                      </span>
                    ) : (
                      'ועד הבית'
                    )}
                  </TableCell>
                  <TableCell>{getPriorityBadge(issue.priority)}</TableCell>
                  <TableCell>{getStatusBadge(issue.status)}</TableCell>
                  <TableCell>
                    <Select
                      value={issue.status}
                      onValueChange={(value: 'open' | 'in_progress' | 'closed') =>
                        updateStatus(issue, value)
                      }
                    >
                      <SelectTrigger className="w-28 sm:w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">{t('issues.status.open')}</SelectItem>
                        <SelectItem value="in_progress">{t('issues.status.inProgress')}</SelectItem>
                        <SelectItem value="closed">{t('issues.status.closed')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {filteredIssues.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    אין תקלות
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Close Issue Dialog */}
      <Dialog open={closingIssue !== null} onOpenChange={(open) => !open && setClosingIssue(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>סגירת תקלה</DialogTitle>
            <DialogDescription>
              {closingIssue?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="closing_response">תשובה לדייר (אופציונלי)</Label>
              <Textarea
                id="closing_response"
                value={closingResponse}
                onChange={(e) => setClosingResponse(e.target.value)}
                placeholder="הסבר קצר על הטיפול בתקלה..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                התשובה תוצג לדייר שפתח את התקלה
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setClosingIssue(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCloseIssue} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'סגור תקלה'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
