'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useBuilding } from '@/contexts/BuildingContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, Clock, Mail, Users, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp } from 'lucide-react';
import type { Message, Building, BuildingMember, MessageResponse } from '@/types/database';

type MessageWithResponses = Message & {
  responses?: (MessageResponse & { building_members: BuildingMember })[];
};


export default function MessagesPage() {
  const t = useTranslations();
  const confirm = useConfirm();
  const { currentBuilding } = useBuilding();
  const [messages, setMessages] = useState<MessageWithResponses[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedResponses, setExpandedResponses] = useState<Record<string, 'yes' | 'no' | null>>({});

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    requires_response: false,
    yes_label: '',
    no_label: '',
    expires_at: '',
    send_email: false,
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

    // Load messages
    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .eq('building_id', currentBuilding.id)
      .order('created_at', { ascending: false }) as { data: Message[] | null };

    // Load responses for each message
    const messagesWithResponses: MessageWithResponses[] = [];
    for (const message of messagesData || []) {
      // Check if message requires response (has yes_label and no_label)
      if (message.yes_label && message.no_label) {
        const { data: responses } = await supabase
          .from('message_responses')
          .select('*, building_members(*)')
          .eq('message_id', message.id);
        messagesWithResponses.push({
          ...message,
          responses: responses as (MessageResponse & { building_members: BuildingMember })[] || [],
        });
      } else {
        messagesWithResponses.push({ ...message, responses: [] });
      }
    }

    setMessages(messagesWithResponses);

    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      requires_response: false,
      yes_label: '',
      no_label: '',
      expires_at: '',
      send_email: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingId) return;

    setIsSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          building_id: buildingId,
          title: formData.title,
          content: formData.content,
          message_type: formData.requires_response ? 'vote' : 'announcement',
          yes_label: formData.requires_response ? formData.yes_label : null,
          no_label: formData.requires_response ? formData.no_label : null,
          expires_at: formData.expires_at || null,
          send_email: formData.send_email,
          created_by: user?.id,
        } as never);

      if (error) throw error;

      toast.success('ההודעה נוספה בהצלחה');
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

  const handleDelete = async (message: Message) => {
    const confirmed = await confirm({
      title: 'מחיקת הודעה',
      description: 'האם למחוק את ההודעה?',
      confirmText: 'מחק',
      cancelText: 'ביטול',
      variant: 'destructive',
    });
    if (!confirmed) return;

    const supabase = createClient();

    // First delete responses
    await supabase
      .from('message_responses')
      .delete()
      .eq('message_id', message.id);

    // Then delete message
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', message.id);

    if (error) {
      toast.error('שגיאה במחיקה');
      return;
    }

    toast.success('ההודעה נמחקה');
    loadData();
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const toggleResponsesView = (messageId: string, type: 'yes' | 'no') => {
    setExpandedResponses(prev => ({
      ...prev,
      [messageId]: prev[messageId] === type ? null : type,
    }));
  };

  const getResponseCounts = (responses: (MessageResponse & { building_members: BuildingMember })[]) => {
    const yes = responses.filter(r => r.response === 'yes');
    const no = responses.filter(r => r.response === 'no');
    return { yes, no };
  };

  const requiresResponse = (message: Message) => {
    return message.yes_label && message.no_label;
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
    <div className="space-y-6" style={{ background: 'linear-gradient(135deg, rgba(224, 242, 254, 0.6) 0%, rgba(255, 255, 255, 1) 100%)', margin: '-1.5rem', padding: '1.5rem', minHeight: 'calc(100vh - 4rem)' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('messages.title')}</h1>
          <p className="text-muted-foreground">{building?.name}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              {t('messages.newMessage')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('messages.newMessage')}</DialogTitle>
              <DialogDescription>
                שליחת הודעה לכל דיירי הבניין
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">{t('messages.messageTitle')} *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="כותרת ההודעה"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">{t('messages.content')} *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="תוכן ההודעה..."
                    rows={5}
                    required
                  />
                </div>

                {/* Response Toggle */}
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <input
                    type="checkbox"
                    id="requires_response"
                    checked={formData.requires_response}
                    onChange={(e) => setFormData({ ...formData, requires_response: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="requires_response" className="flex items-center gap-2 cursor-pointer">
                    <Users className="h-4 w-4" />
                    אפשר לדיירים לענות על ההודעה
                  </Label>
                </div>

                {formData.requires_response && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 border rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="yes_label">טקסט כפתור ראשון *</Label>
                      <Input
                        id="yes_label"
                        value={formData.yes_label}
                        onChange={(e) => setFormData({ ...formData, yes_label: e.target.value })}
                        placeholder="לדוגמה: אשתתף, מסכים, בעד"
                        required={formData.requires_response}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="no_label">טקסט כפתור שני *</Label>
                      <Input
                        id="no_label"
                        value={formData.no_label}
                        onChange={(e) => setFormData({ ...formData, no_label: e.target.value })}
                        placeholder="לדוגמה: לא אשתתף, לא מסכים, נגד"
                        required={formData.requires_response}
                      />
                    </div>
                    <p className="col-span-2 text-xs text-muted-foreground">
                      הדיירים יראו את שני הכפתורים האלה ויוכלו לבחור אחד מהם
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="expires_at">{t('messages.expiresAt')}</Label>
                  <Input
                    id="expires_at"
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    השאר ריק להודעה ללא תוקף
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="send_email"
                    checked={formData.send_email}
                    onChange={(e) => setFormData({ ...formData, send_email: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="send_email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {t('messages.sendEmail')}
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'שלח הודעה'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Messages List */}
      <div className="space-y-4">
        {messages.map((message) => {
          const { yes: yesResponses, no: noResponses } = getResponseCounts(message.responses || []);
          const expanded = expandedResponses[message.id];

          return (
            <Card key={message.id} className={isExpired(message.expires_at) ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{message.title}</CardTitle>
                      {requiresResponse(message) && (
                        <Badge variant="secondary">
                          דורש תשובה
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-4 mt-1">
                      <span>
                        {new Date(message.created_at).toLocaleDateString('he-IL', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                      {message.expires_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {isExpired(message.expires_at) ? 'פג תוקף' : `עד ${new Date(message.expires_at).toLocaleDateString('he-IL')}`}
                        </span>
                      )}
                      {message.send_email && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Mail className="h-3 w-3" />
                          נשלח במייל
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(message)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="whitespace-pre-wrap">{message.content}</p>

                {/* Response Summary */}
                {requiresResponse(message) && (
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">תשובות ({(message.responses?.length || 0)})</span>
                    </div>

                    <div className="flex gap-2 sm:gap-3 flex-wrap">
                      {/* Yes Button */}
                      <Button
                        variant={expanded === 'yes' ? 'default' : 'outline'}
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={() => toggleResponsesView(message.id, 'yes')}
                      >
                        <ThumbsUp className="h-4 w-4" />
                        <span>{message.yes_label || 'כן'}</span>
                        <Badge variant="secondary" className="mr-1">
                          {yesResponses.length}
                        </Badge>
                        {expanded === 'yes' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>

                      {/* No Button */}
                      <Button
                        variant={expanded === 'no' ? 'default' : 'outline'}
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={() => toggleResponsesView(message.id, 'no')}
                      >
                        <ThumbsDown className="h-4 w-4" />
                        <span>{message.no_label || 'לא'}</span>
                        <Badge variant="secondary" className="mr-1">
                          {noResponses.length}
                        </Badge>
                        {expanded === 'no' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>
                    </div>

                    {/* Expanded Responses List */}
                    {expanded && (
                      <div className="mt-3 p-3 bg-muted rounded-lg">
                        <p className="font-medium mb-2">
                          {expanded === 'yes' ? message.yes_label || 'כן' : message.no_label || 'לא'}:
                        </p>
                        <div className="space-y-1">
                          {(expanded === 'yes' ? yesResponses : noResponses).map((response) => (
                            <div key={response.id} className="flex items-center gap-2 text-sm">
                              <span>דירה {response.building_members?.apartment_number}:</span>
                              <span className="font-medium">{response.building_members?.full_name}</span>
                            </div>
                          ))}
                          {(expanded === 'yes' ? yesResponses : noResponses).length === 0 && (
                            <p className="text-sm text-muted-foreground">אין תשובות</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {messages.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              {t('messages.noMessages')}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
