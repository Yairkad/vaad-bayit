'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, FileText, ExternalLink, Plus, Trash2, User, Building2 } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  category: string;
  file_path: string;
  visible_to_tenants: boolean;
  created_at: string;
  member_id: string | null;
  uploaded_by: string | null;
}

const categoryLabels: Record<string, string> = {
  regulation: 'תקנון',
  insurance: 'ביטוח',
  protocol: 'פרוטוקול',
  standing_order: 'הוראת קבע',
  personal: 'מסמך אישי',
  other: 'אחר',
};

export default function TenantDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [myDocuments, setMyDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [membership, setMembership] = useState<{ id: string; building_id: string } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    showToCommittee: false,
  });

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    // Get membership
    const { data: membershipData } = await supabase
      .from('building_members')
      .select('id, building_id')
      .eq('user_id', user.id)
      .single() as { data: { id: string; building_id: string } | null };

    if (!membershipData) {
      setIsLoading(false);
      return;
    }

    setMembership(membershipData);

    // Get building documents (visible to tenants, no specific member)
    const { data: buildingDocs } = await supabase
      .from('documents')
      .select('*')
      .eq('building_id', membershipData.building_id)
      .eq('visible_to_tenants', true)
      .is('member_id', null)
      .order('created_at', { ascending: false }) as { data: Document[] | null };

    // Get my personal documents (uploaded by me or assigned to me)
    const { data: personalDocs } = await supabase
      .from('documents')
      .select('*')
      .eq('building_id', membershipData.building_id)
      .eq('member_id', membershipData.id)
      .order('created_at', { ascending: false }) as { data: Document[] | null };

    setDocuments(buildingDocs || []);
    setMyDocuments(personalDocs || []);
    setIsLoading(false);
  };

  const handleDownload = async (doc: Document) => {
    const supabase = createClient();

    const { data } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.file_path, 3600);

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  const resetForm = () => {
    setFormData({ title: '', showToCommittee: false });
    setSelectedFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!membership || !selectedFile || !userId) return;

    setIsSaving(true);
    const supabase = createClient();

    try {
      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${membership.building_id}/personal/${membership.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Create document record
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          building_id: membership.building_id,
          member_id: membership.id,
          title: formData.title,
          category: 'personal',
          file_path: fileName,
          visible_to_tenants: !formData.showToCommittee, // If showing to committee, not visible_to_tenants means committee can see
          uploaded_by: userId,
        } as never);

      if (dbError) throw dbError;

      toast.success('המסמך הועלה בהצלחה');
      setIsDialogOpen(false);
      resetForm();
      loadDocuments();
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
    await supabase.storage.from('documents').remove([doc.file_path]);

    // Delete from database
    const { error } = await supabase.from('documents').delete().eq('id', doc.id);

    if (error) {
      toast.error('שגיאה במחיקה');
      return;
    }

    toast.success('המסמך נמחק');
    loadDocuments();
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'regulation':
        return 'bg-blue-100 text-blue-800';
      case 'insurance':
        return 'bg-green-100 text-green-800';
      case 'protocol':
        return 'bg-purple-100 text-purple-800';
      case 'standing_order':
        return 'bg-orange-100 text-orange-800';
      case 'personal':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canDelete = (doc: Document) => {
    return doc.uploaded_by === userId;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Group documents by category
  const groupedDocs = documents.reduce((acc, doc) => {
    const cat = doc.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold">מסמכים</h1>
          <p className="text-sm sm:text-base text-muted-foreground">מסמכי הבניין והמסמכים האישיים שלך</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="ml-2 h-4 w-4" />
              העלה מסמך
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader className="text-center">
              <DialogTitle className="text-center">העלאת מסמך אישי</DialogTitle>
              <DialogDescription className="text-center">
                העלה מסמך אישי לשמירה או להצגה לועד הבית
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">שם המסמך *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="לדוגמה: אישור הוראת קבע"
                    required
                  />
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

                <div className="flex items-center gap-3 pt-2 p-3 bg-muted rounded-lg">
                  <Switch
                    id="showToCommittee"
                    checked={formData.showToCommittee}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, showToCommittee: checked })
                    }
                  />
                  <Label htmlFor="showToCommittee" className="text-sm font-normal cursor-pointer">
                    <span className="font-medium">הצג לועד הבית</span>
                    <p className="text-xs text-muted-foreground">
                      {formData.showToCommittee ? 'ועד הבית יוכל לראות את המסמך' : 'המסמך יישמר רק אצלך'}
                    </p>
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  ביטול
                </Button>
                <Button type="submit" disabled={isSaving || !selectedFile}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'העלה'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* My Documents Section */}
      {myDocuments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              המסמכים שלי
              <span className="text-sm text-muted-foreground font-normal">
                ({myDocuments.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {myDocuments.map((doc) => (
                <div key={doc.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-pink-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.visible_to_tenants ? 'פרטי' : 'מוצג לועד'} • הועלה ב-{new Date(doc.created_at).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(doc)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    {canDelete(doc) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(doc)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Building Documents Section */}
      {documents.length === 0 && myDocuments.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">אין מסמכים להצגה</p>
            <p className="text-sm text-muted-foreground">לחץ על "העלה מסמך" להעלאת מסמך אישי</p>
          </CardContent>
        </Card>
      ) : documents.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-5 w-5" />
            <span className="font-medium">מסמכי הבניין</span>
          </div>
          {Object.entries(groupedDocs).map(([category, docs]) => (
            <Card key={category}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge className={getCategoryColor(category)}>
                    {categoryLabels[category] || category}
                  </Badge>
                  <span className="text-sm text-muted-foreground font-normal">
                    ({docs.length} מסמכים)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {docs.map((doc) => (
                    <div key={doc.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">
                            הועלה ב-{new Date(doc.created_at).toLocaleDateString('he-IL')}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                        className="shrink-0"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
