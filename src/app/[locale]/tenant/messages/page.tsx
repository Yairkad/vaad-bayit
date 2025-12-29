'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare } from 'lucide-react';

interface Message {
  id: string;
  title: string;
  content: string;
  created_at: string;
  expires_at: string | null;
}

export default function TenantMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      .select('building_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      setIsLoading(false);
      return;
    }

    // Get messages for building
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('building_id', membership.building_id)
      .order('created_at', { ascending: false });

    // Filter out expired messages
    const activeMessages = (data || []).filter((msg: Message) => {
      if (!msg.expires_at) return true;
      return new Date(msg.expires_at) > new Date();
    });

    setMessages(activeMessages);
    setIsLoading(false);
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
                  <CardTitle className="text-lg">{message.title}</CardTitle>
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
              <CardContent>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
