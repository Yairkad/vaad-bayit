'use client';

import { useEffect, useState } from 'react';
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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, GripVertical, Quote, Eye, EyeOff } from 'lucide-react';
import type { Testimonial } from '@/types/database';

type TestimonialFormData = {
  name: string;
  role: string;
  building: string;
  content: string;
  avatar: string;
  is_active: boolean;
  display_order: number;
};

const emptyFormData: TestimonialFormData = {
  name: '',
  role: '',
  building: '',
  content: '',
  avatar: '',
  is_active: true,
  display_order: 0,
};

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TestimonialFormData>(emptyFormData);
  const [testimonialToDelete, setTestimonialToDelete] = useState<Testimonial | null>(null);

  useEffect(() => {
    loadTestimonials();
  }, []);

  const loadTestimonials = async () => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error loading testimonials:', error);
      toast.error('שגיאה בטעינת ההמלצות');
    } else {
      setTestimonials(data || []);
    }
    setIsLoading(false);
  };

  const openCreateDialog = () => {
    setEditingId(null);
    const nextOrder = testimonials.length > 0
      ? Math.max(...testimonials.map(t => t.display_order)) + 1
      : 1;
    setFormData({ ...emptyFormData, display_order: nextOrder });
    setIsDialogOpen(true);
  };

  const openEditDialog = (testimonial: Testimonial) => {
    setEditingId(testimonial.id);
    setFormData({
      name: testimonial.name,
      role: testimonial.role,
      building: testimonial.building,
      content: testimonial.content,
      avatar: testimonial.avatar,
      is_active: testimonial.is_active,
      display_order: testimonial.display_order,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.role || !formData.content) {
      toast.error('יש למלא שם, תפקיד ותוכן ההמלצה');
      return;
    }

    // Auto-generate avatar if not provided
    const avatar = formData.avatar || formData.name.charAt(0);

    setIsSaving(true);
    const supabase = createClient();

    if (editingId) {
      // Update existing
      const { error } = await supabase
        .from('testimonials')
        .update({
          name: formData.name,
          role: formData.role,
          building: formData.building,
          content: formData.content,
          avatar: avatar,
          is_active: formData.is_active,
          display_order: formData.display_order,
        } as never)
        .eq('id', editingId);

      if (error) {
        toast.error('שגיאה בעדכון ההמלצה');
      } else {
        toast.success('ההמלצה עודכנה בהצלחה');
        setIsDialogOpen(false);
        loadTestimonials();
      }
    } else {
      // Create new
      const { error } = await supabase
        .from('testimonials')
        .insert({
          name: formData.name,
          role: formData.role,
          building: formData.building,
          content: formData.content,
          avatar: avatar,
          is_active: formData.is_active,
          display_order: formData.display_order,
        } as never);

      if (error) {
        toast.error('שגיאה בהוספת ההמלצה');
      } else {
        toast.success('ההמלצה נוספה בהצלחה');
        setIsDialogOpen(false);
        loadTestimonials();
      }
    }
    setIsSaving(false);
  };

  const handleToggleActive = async (testimonial: Testimonial) => {
    const supabase = createClient();

    const { error } = await supabase
      .from('testimonials')
      .update({ is_active: !testimonial.is_active } as never)
      .eq('id', testimonial.id);

    if (error) {
      toast.error('שגיאה בעדכון סטטוס ההמלצה');
    } else {
      toast.success(testimonial.is_active ? 'ההמלצה הוסתרה' : 'ההמלצה הופעלה');
      loadTestimonials();
    }
  };

  const openDeleteDialog = (testimonial: Testimonial) => {
    setTestimonialToDelete(testimonial);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!testimonialToDelete) return;

    setIsSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('testimonials')
      .delete()
      .eq('id', testimonialToDelete.id);

    if (error) {
      toast.error('שגיאה במחיקת ההמלצה');
    } else {
      toast.success('ההמלצה נמחקה בהצלחה');
      setIsDeleteDialogOpen(false);
      setTestimonialToDelete(null);
      loadTestimonials();
    }
    setIsSaving(false);
  };

  const handleMoveUp = async (testimonial: Testimonial) => {
    const currentIndex = testimonials.findIndex(t => t.id === testimonial.id);
    if (currentIndex <= 0) return;

    const prevTestimonial = testimonials[currentIndex - 1];
    const supabase = createClient();

    // Swap display orders
    await supabase
      .from('testimonials')
      .update({ display_order: prevTestimonial.display_order } as never)
      .eq('id', testimonial.id);

    await supabase
      .from('testimonials')
      .update({ display_order: testimonial.display_order } as never)
      .eq('id', prevTestimonial.id);

    loadTestimonials();
  };

  const handleMoveDown = async (testimonial: Testimonial) => {
    const currentIndex = testimonials.findIndex(t => t.id === testimonial.id);
    if (currentIndex >= testimonials.length - 1) return;

    const nextTestimonial = testimonials[currentIndex + 1];
    const supabase = createClient();

    // Swap display orders
    await supabase
      .from('testimonials')
      .update({ display_order: nextTestimonial.display_order } as never)
      .eq('id', testimonial.id);

    await supabase
      .from('testimonials')
      .update({ display_order: testimonial.display_order } as never)
      .eq('id', nextTestimonial.id);

    loadTestimonials();
  };

  const stats = {
    total: testimonials.length,
    active: testimonials.filter(t => t.is_active).length,
    inactive: testimonials.filter(t => !t.is_active).length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6" style={{ background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.6) 0%, rgba(255, 255, 255, 1) 100%)', margin: '-1.5rem', padding: '1.5rem', minHeight: 'calc(100vh - 4rem)' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold">ניהול המלצות</h1>
          <p className="text-sm sm:text-base text-muted-foreground">המלצות לקוחות המוצגות בדף הבית</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 ml-2" />
          הוסף המלצה
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-1">
              <div className="p-1.5 sm:p-2 rounded-lg bg-blue-100 shrink-0">
                <Quote className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1 sm:w-full">
                <p className="text-xs text-muted-foreground truncate">סה״כ המלצות</p>
                <p className="text-lg sm:text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-1">
              <div className="p-1.5 sm:p-2 rounded-lg bg-green-100 shrink-0">
                <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
              </div>
              <div className="min-w-0 flex-1 sm:w-full">
                <p className="text-xs text-muted-foreground truncate">פעילות</p>
                <p className="text-lg sm:text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-1">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gray-100 shrink-0">
                <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-600" />
              </div>
              <div className="min-w-0 flex-1 sm:w-full">
                <p className="text-xs text-muted-foreground truncate">מוסתרות</p>
                <p className="text-lg sm:text-2xl font-bold">{stats.inactive}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Cards View */}
      <div className="lg:hidden space-y-3">
        {testimonials.map((testimonial, index) => (
          <Card
            key={testimonial.id}
            className={`${!testimonial.is_active ? 'opacity-60' : ''}`}
          >
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#bee4fa] to-[#0ea5e9] flex items-center justify-center text-white font-bold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-bold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                  <Badge variant={testimonial.is_active ? 'default' : 'secondary'}>
                    {testimonial.is_active ? 'פעיל' : 'מוסתר'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  &ldquo;{testimonial.content}&rdquo;
                </p>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveUp(testimonial)}
                      disabled={index === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveDown(testimonial)}
                      disabled={index === testimonials.length - 1}
                    >
                      ↓
                    </Button>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(testimonial)}
                    >
                      {testimonial.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(testimonial)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => openDeleteDialog(testimonial)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {testimonials.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              אין המלצות עדיין. לחץ על &quot;הוסף המלצה&quot; כדי להתחיל.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden lg:block">
        <CardHeader>
          <CardTitle className="text-lg">רשימת המלצות</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">סדר</TableHead>
                <TableHead>שם</TableHead>
                <TableHead>תפקיד</TableHead>
                <TableHead>בניין</TableHead>
                <TableHead className="max-w-[300px]">תוכן</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead className="text-left">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testimonials.map((testimonial, index) => (
                <TableRow
                  key={testimonial.id}
                  className={`${!testimonial.is_active ? 'opacity-60' : ''}`}
                >
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMoveUp(testimonial)}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMoveDown(testimonial)}
                        disabled={index === testimonials.length - 1}
                      >
                        ↓
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#bee4fa] to-[#0ea5e9] flex items-center justify-center text-white font-bold text-sm">
                        {testimonial.avatar}
                      </div>
                      <span className="font-medium">{testimonial.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{testimonial.role}</TableCell>
                  <TableCell>{testimonial.building || '-'}</TableCell>
                  <TableCell className="max-w-[300px]">
                    <p className="truncate text-sm text-muted-foreground">
                      {testimonial.content}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={testimonial.is_active ? 'default' : 'secondary'}>
                      {testimonial.is_active ? 'פעיל' : 'מוסתר'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(testimonial)}
                        title={testimonial.is_active ? 'הסתר' : 'הפעל'}
                      >
                        {testimonial.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(testimonial)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => openDeleteDialog(testimonial)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {testimonials.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    אין המלצות עדיין. לחץ על &quot;הוסף המלצה&quot; כדי להתחיל.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'עריכת המלצה' : 'הוספת המלצה חדשה'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'ערוך את פרטי ההמלצה' : 'הוסף המלצה חדשה לדף הבית'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">שם *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="יוסי כהן"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatar">אות לאווטאר</Label>
                <Input
                  id="avatar"
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  placeholder="י"
                  maxLength={2}
                />
                <p className="text-xs text-muted-foreground">יוצג בעיגול. ברירת מחדל: אות ראשונה של השם</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">תפקיד *</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder='יו"ר ועד הבית'
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="building">בניין</Label>
                <Input
                  id="building"
                  value={formData.building}
                  onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                  placeholder="רחוב הרצל 22, תל אביב"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">תוכן ההמלצה *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="כתוב כאן את תוכן ההמלצה..."
                rows={4}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>סטטוס</Label>
                <p className="text-xs text-muted-foreground">
                  {formData.is_active ? 'ההמלצה תוצג בדף הבית' : 'ההמלצה לא תוצג'}
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingId ? (
                'שמור שינויים'
              ) : (
                'הוסף המלצה'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>מחיקת המלצה</DialogTitle>
            <DialogDescription>
              האם אתה בטוח שברצונך למחוק את ההמלצה של {testimonialToDelete?.name}?
              <br />
              פעולה זו אינה ניתנת לביטול.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              ביטול
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'מחק'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
