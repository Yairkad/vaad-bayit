'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Send, CheckCircle, MessageSquare } from 'lucide-react';

interface ContactDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

export function ContactDialog({ open, onOpenChange, showTrigger = true }: ContactDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;
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

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      message: '',
    });
    setIsSubmitted(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetForm();
    }}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button size="lg" variant="outline" className="text-lg px-8">
            <MessageSquare className="h-5 w-5 ml-2" />
            רוצים גם? השאירו פרטים
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        {isSubmitted ? (
          <div className="py-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h4 className="text-xl font-bold mb-2">תודה על פנייתך!</h4>
            <p className="text-muted-foreground mb-4">
              קיבלנו את הפניה שלך וניצור איתך קשר בהקדם.
            </p>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              סגור
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader className="text-center">
              <DialogTitle className="text-center">רוצים להצטרף?</DialogTitle>
              <DialogDescription className="text-center">
                מלאו את הפרטים ונחזור אליכם עם מידע על הוספת הבניין למערכת
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="dialog_contact_name">שם מלא *</Label>
                <Input
                  id="dialog_contact_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="ישראל ישראלי"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dialog_contact_email">אימייל *</Label>
                <Input
                  id="dialog_contact_email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="example@email.com"
                  dir="ltr"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dialog_contact_phone">טלפון</Label>
                <Input
                  id="dialog_contact_phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="050-1234567"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dialog_contact_address">כתובת הבניין *</Label>
                <Input
                  id="dialog_contact_address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="רחוב הרצל 1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dialog_contact_city">עיר</Label>
                <Input
                  id="dialog_contact_city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="תל אביב"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dialog_contact_message">הודעה נוספת</Label>
                <Textarea
                  id="dialog_contact_message"
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
