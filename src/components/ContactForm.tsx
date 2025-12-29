'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Send, CheckCircle } from 'lucide-react';

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name || !formData.email || !formData.address) {
      toast.error('נא למלא את כל השדות הנדרשים');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('contact_requests')
        .insert({
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone || null,
          address: formData.address,
          city: formData.city || null,
          message: formData.message || null,
        } as never);

      if (error) throw error;

      setIsSubmitted(true);
      toast.success('הפניה נשלחה בהצלחה! ניצור איתך קשר בהקדם.');
    } catch (error) {
      console.error('Error submitting contact form:', error);
      toast.error('אירעה שגיאה בשליחת הפניה. נסה שנית.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h4 className="text-xl font-bold mb-2">תודה על פנייתך!</h4>
          <p className="text-muted-foreground">
            קיבלנו את הפניה שלך וניצור איתך קשר בהקדם.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>רוצים להצטרף?</CardTitle>
        <CardDescription>
          מלאו את הפרטים ונחזור אליכם עם פרטים על הוספת הבניין למערכת
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact_name">שם מלא *</Label>
            <Input
              id="contact_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="ישראל ישראלי"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_email">אימייל *</Label>
            <Input
              id="contact_email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="example@email.com"
              dir="ltr"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_phone">טלפון</Label>
            <Input
              id="contact_phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="050-1234567"
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_address">כתובת הבניין *</Label>
            <Input
              id="contact_address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="רחוב הרצל 1"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_city">עיר</Label>
            <Input
              id="contact_city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="תל אביב"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_message">הודעה נוספת</Label>
            <Textarea
              id="contact_message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="ספרו לנו על הבניין שלכם..."
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                שולח...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 ml-2" />
                שלח פניה
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
