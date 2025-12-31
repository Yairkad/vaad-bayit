'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Bug, Lightbulb, Upload, X, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface BugReportDialogProps {
  trigger: React.ReactNode;
}

export function BugReportDialog({ trigger }: BugReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [type, setType] = useState<'bug' | 'improvement'>('bug');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('הקובץ גדול מדי. גודל מקסימלי: 5MB');
        return;
      }
      setScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetForm = () => {
    setType('bug');
    setName('');
    setEmail('');
    setPhone('');
    setDescription('');
    setScreenshot(null);
    setScreenshotPreview(null);
    setSubmitted(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !description) {
      toast.error('נא למלא את כל השדות הנדרשים');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('name', name);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('description', description);
      if (screenshot) {
        formData.append('screenshot', screenshot);
      }

      const response = await fetch('/api/bug-report', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to send report');
      }

      setSubmitted(true);
      toast.success('הדיווח נשלח בהצלחה!');

      setTimeout(() => {
        setOpen(false);
        resetForm();
      }, 2000);
    } catch {
      toast.error('שגיאה בשליחת הדיווח. נסה שוב.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        {submitted ? (
          <div className="py-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">תודה על הדיווח!</h3>
            <p className="text-muted-foreground">נחזור אליך בהקדם</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-xl">
                דיווח באג / הצעת שיפור
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {/* Report Type */}
              <div className="space-y-2">
                <Label>סוג הפנייה</Label>
                <RadioGroup
                  value={type}
                  onValueChange={(value) => setType(value as 'bug' | 'improvement')}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="bug" id="bug" />
                    <Label htmlFor="bug" className="flex items-center gap-2 cursor-pointer">
                      <Bug className="h-4 w-4 text-red-500" />
                      דיווח באג
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="improvement" id="improvement" />
                    <Label htmlFor="improvement" className="flex items-center gap-2 cursor-pointer">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      הצעת שיפור
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">שם מלא *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="הזן את שמך"
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">אימייל *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  dir="ltr"
                  required
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">טלפון (אופציונלי)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="050-1234567"
                  dir="ltr"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  {type === 'bug' ? 'תיאור הבעיה *' : 'תיאור ההצעה *'}
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={type === 'bug'
                    ? 'תאר את הבעיה בפירוט: מה קרה, מתי קרה, באיזה דף...'
                    : 'תאר את הצעת השיפור שלך בפירוט...'
                  }
                  rows={4}
                  required
                />
              </div>

              {/* Screenshot Upload */}
              <div className="space-y-2">
                <Label>צילום מסך (אופציונלי)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {screenshotPreview ? (
                  <div className="relative">
                    <img
                      src={screenshotPreview}
                      alt="Screenshot preview"
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 left-2 h-6 w-6"
                      onClick={removeScreenshot}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-20 border-dashed"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">לחץ להעלאת תמונה</span>
                    </div>
                  </Button>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      שולח...
                    </>
                  ) : (
                    'שלח דיווח'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
