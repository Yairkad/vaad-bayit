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
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, FileText, Download, Eye, EyeOff, Pencil } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { Document, Building, BuildingMember } from '@/types/database';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type MemberWithBuilding = BuildingMember & {
  buildings: Building | null;
};

const CATEGORIES = [
  { value: 'regulation', label: 'תקנון' },
  { value: 'insurance', label: 'ביטוח' },
  { value: 'protocol', label: 'פרוטוקול' },
  { value: 'standing_order', label: 'הוראת קבע' },
  { value: 'other', label: 'אחר' },
];

export default function DocumentsPage() {
  const t = useTranslations();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const [formData, setFormData] = useState({
    title: '',
    category: 'other',
    visible_to_tenants: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const { data: membership } = await supabase
      .from('building_members')
      .select('building_id, buildings(*)')
      .eq('user_id', user.id)
      .eq('role', 'committee')
      .single() as { data: MemberWithBuilding | null };

    if (membership?.building_id) {
      setBuildingId(membership.building_id);
      setBuilding(membership.buildings);

      const { data: docsData } = await supabase
        .from('documents')
        .select('*')
        .eq('building_id', membership.building_id)
        .order('created_at', { ascending: false });

      setDocuments(docsData || []);
    }

    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({ title: '', category: 'other', visible_to_tenants: true });
    setSelectedFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingId || !selectedFile) return;

    setIsSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${buildingId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Create document record
      const docData = {
        building_id: buildingId,
        title: formData.title,
        category: formData.category,
        file_path: fileName,
        visible_to_tenants: formData.visible_to_tenants,
        uploaded_by: user?.id,
      };

      const { error: dbError } = await supabase
        .from('documents')
        .insert(docData as never);

      if (dbError) throw dbError;

      toast.success('המסמך הועלה בהצלחה');
      setIsDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('אירעה שגיאה בהעלאה');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm('האם למחוק את המסמך?')) return;

    const supabase = createClient();

    // Delete from storage
    await supabase.storage
      .from('documents')
      .remove([doc.file_path]);

    // Delete from database
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', doc.id);

    if (error) {
      toast.error('שגיאה במחיקה');
      return;
    }

    toast.success('המסמך נמחק');
    loadData();
  };

  const toggleVisibility = async (doc: Document) => {
    const supabase = createClient();

    const { error } = await supabase
      .from('documents')
      .update({ visible_to_tenants: !doc.visible_to_tenants } as never)
      .eq('id', doc.id);

    if (error) {
      toast.error('שגיאה בעדכון');
      return;
    }

    toast.success(doc.visible_to_tenants ? 'המסמך הוסתר מהדיירים' : 'המסמך גלוי לדיירים');
    loadData();
  };

  const getFileUrl = async (filePath: string) => {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 900); // 15 minutes

    return data?.signedUrl;
  };

  const handleView = async (doc: Document) => {
    const url = await getFileUrl(doc.file_path);
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleDownload = async (doc: Document) => {
    const url = await getFileUrl(doc.file_path);
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.title;
      a.click();
    }
  };

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find(c => c.value === value)?.label || value;
  };

  const filteredDocs = documents.filter(doc => {
    if (filter === 'all') return true;
    return doc.category === filter;
  });

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
          <h1 className="text-2xl sm:text-3xl font-bold">{t('documents.title')}</h1>
          <p className="text-muted-foreground">{building?.name}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              {t('documents.uploadDocument')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('documents.uploadDocument')}</DialogTitle>
              <DialogDescription>
                העלאת מסמך חדש לבניין
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">{t('documents.documentTitle')} *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="שם המסמך"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('documents.category')} *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file">קובץ *</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    PDF, Word, Excel או תמונה
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Switch
                    id="visible_to_tenants"
                    checked={formData.visible_to_tenants}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, visible_to_tenants: checked })
                    }
                  />
                  <Label htmlFor="visible_to_tenants" className="text-sm font-normal cursor-pointer">
                    הצג לדיירים
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={isSaving || !selectedFile}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'העלה'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          הכל ({documents.length})
        </Button>
        {CATEGORIES.map(cat => {
          const count = documents.filter(d => d.category === cat.value).length;
          if (count === 0) return null;
          return (
            <Button
              key={cat.value}
              variant={filter === cat.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(cat.value)}
            >
              {cat.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {filteredDocs.map((doc) => (
          <Card key={doc.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{doc.title}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{getCategoryLabel(doc.category)}</Badge>
                    {doc.visible_to_tenants ? (
                      <span className="flex items-center gap-1 text-green-600 text-xs">
                        <Eye className="h-3 w-3" />
                        גלוי לדיירים
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground text-xs">
                        <EyeOff className="h-3 w-3" />
                        מוסתר
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(doc.created_at).toLocaleDateString('he-IL')}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleView(doc)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => toggleVisibility(doc)} title={doc.visible_to_tenants ? 'הסתר מדיירים' : 'הצג לדיירים'}>
                    {doc.visible_to_tenants ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredDocs.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              אין מסמכים
            </CardContent>
          </Card>
        )}
      </div>

      {/* Documents Table - Desktop */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle className="text-lg">רשימת מסמכים</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>{t('documents.documentTitle')}</TableHead>
                <TableHead>{t('documents.category')}</TableHead>
                <TableHead>נראות</TableHead>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </TableCell>
                  <TableCell className="font-medium">{doc.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getCategoryLabel(doc.category)}</Badge>
                  </TableCell>
                  <TableCell>
                    {doc.visible_to_tenants ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm" title="נראה לדיירים">
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline">גלוי</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground text-sm" title="מוסתר מדיירים">
                        <EyeOff className="h-4 w-4" />
                        <span className="hidden sm:inline">מוסתר</span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(doc.created_at).toLocaleDateString('he-IL')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleView(doc)}
                        title={t('documents.view')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(doc)}
                        title={t('documents.download')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleVisibility(doc)}
                        title={doc.visible_to_tenants ? 'הסתר מדיירים' : 'הצג לדיירים'}
                      >
                        {doc.visible_to_tenants ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-green-600" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(doc)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredDocs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    אין מסמכים
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
