'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Download, ExternalLink } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  category: string;
  file_path: string;
  visible_to_tenants: boolean;
  created_at: string;
}

const categoryLabels: Record<string, string> = {
  regulation: 'תקנון',
  insurance: 'ביטוח',
  protocol: 'פרוטוקול',
  standing_order: 'הוראת קבע',
  other: 'אחר',
};

export default function TenantDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
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

    // Get documents - general building documents OR documents for this member
    // Only show documents that are visible to tenants
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('building_id', membership.building_id)
      .eq('visible_to_tenants', true)
      .or(`member_id.is.null,member_id.eq.${membership.id}`)
      .order('created_at', { ascending: false }) as { data: Document[] | null };

    setDocuments(data || []);
    setIsLoading(false);
  };

  const handleDownload = async (doc: Document) => {
    const supabase = createClient();

    const { data } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.file_path, 3600); // 1 hour expiry

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
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
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
      <div>
        <h1 className="text-xl sm:text-3xl font-bold">מסמכים</h1>
        <p className="text-sm sm:text-base text-muted-foreground">מסמכי הבניין והמסמכים האישיים שלך</p>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">אין מסמכים להצגה</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
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
