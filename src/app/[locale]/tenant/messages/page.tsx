'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { Message, MessageResponse, ResponseType } from '@/types/database';

type MessageWithResponse = Message & {
  myResponse?: MessageResponse | null;
};

export default function TenantMessagesPage() {
  const [messages, setMessages] = useState<MessageWithResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
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

    // Get messages for building
    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .eq('building_id', membership.building_id)
      .order('created_at', { ascending: false }) as { data: Message[] | null };

    // Get my responses
    const { data: myResponses } = await supabase
      .from('message_responses')
      .select('*')
      .eq('member_id', membership.id) as { data: MessageResponse[] | null };

    // Combine messages with responses
    const messagesWithResponses: MessageWithResponse[] = (messagesData || []).map(msg => ({
      ...msg,
      myResponse: myResponses?.find(r => r.message_id === msg.id) || null,
    }));

    // Filter out expired messages
    const activeMessages = messagesWithResponses.filter((msg) => {
      if (!msg.expires_at) return true;
      return new Date(msg.expires_at) > new Date();
    });

    setMessages(activeMessages);
    setIsLoading(false);
  };

  const handleRespond = async (messageId: string, response: ResponseType) => {
    if (!memberId) return;

    setRespondingTo(messageId);
    const supabase = createClient();

    try {
      // Check if already responded
      const existingResponse = messages.find(m => m.id === messageId)?.myResponse;

      if (existingResponse) {
        // Update existing response
        const { error } = await supabase
          .from('message_responses')
          .update({ response } as never)
          .eq('id', existingResponse.id);

        if (error) throw error;
      } else {
        // Create new response
        const { error } = await supabase
          .from('message_responses')
          .insert({
            message_id: messageId,
            member_id: memberId,
            response,
          } as never);

        if (error) throw error;
      }

      toast.success('התשובה נשמרה');
      loadMessages();
    } catch (error) {
      console.error(error);
      toast.error('שגיאה בשמירת התשובה');
    } finally {
      setRespondingTo(null);
    }
  };

  const isRecent = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays < 7;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-3xl font-bold">הודעות מהוועד</h1>
        <p className="text-sm sm:text-base text-muted-foreground">הודעות ועדכונים מוועד הבניין</p>
      </div>

      {messages.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">אין הודעות להצגה</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <Card key={message.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{message.title}</CardTitle>
                    {message.yes_label && message.no_label && (
                      <Badge variant="secondary">
                        דורש תשובה
                      </Badge>
                    )}
                  </div>
                  {isRecent(message.created_at) && (
                    <Badge className="shrink-0">חדש</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {new Date(message.created_at).toLocaleDateString('he-IL', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="whitespace-pre-wrap">{message.content}</p>

                {/* Response Buttons */}
                {message.yes_label && message.no_label && (
                  <div className="border-t pt-4">
                    {message.myResponse ? (
                      <div className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-600" />
                        <span className="text-sm">
                          ענית: <strong>{message.myResponse.response === 'yes' ? (message.yes_label || 'כן') : (message.no_label || 'לא')}</strong>
                        </span>
                        <span className="text-xs text-muted-foreground">(ניתן לשנות)</span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mb-2">בחר את תשובתך:</p>
                    )}

                    <div className="flex gap-3 mt-2">
                      <Button
                        variant={message.myResponse?.response === 'yes' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleRespond(message.id, 'yes')}
                        disabled={respondingTo === message.id}
                        className="flex items-center gap-2"
                      >
                        {respondingTo === message.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ThumbsUp className="h-4 w-4" />
                        )}
                        {message.yes_label || 'כן'}
                      </Button>
                      <Button
                        variant={message.myResponse?.response === 'no' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleRespond(message.id, 'no')}
                        disabled={respondingTo === message.id}
                        className="flex items-center gap-2"
                      >
                        {respondingTo === message.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ThumbsDown className="h-4 w-4" />
                        )}
                        {message.no_label || 'לא'}
                      </Button>
                    </div>
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
