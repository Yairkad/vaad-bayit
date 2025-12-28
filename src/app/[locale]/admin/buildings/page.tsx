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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Check, X, Loader2, Building2, Trash2 } from 'lucide-react';
import type { Building, Profile } from '@/types/database';

type BuildingWithCreator = Building & {
  profiles?: Profile;
  member_count?: number;
};

export default function AdminBuildingsPage() {
  const [buildings, setBuildings] = useState<BuildingWithCreator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    monthly_fee: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();

    const { data } = await supabase
      .from('buildings')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false }) as { data: Building[] | null };

    // Get member counts
    const buildingsWithCounts = await Promise.all(
      (data || []).map(async (building: Building) => {
        const { count } = await supabase
          .from('building_members')
          .select('*', { count: 'exact', head: true })
          .eq('building_id', building.id);

        return { ...building, member_count: count || 0 };
      })
    );

    setBuildings(buildingsWithCounts as BuildingWithCreator[]);
    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({ name: '', address: '', city: '', monthly_fee: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const buildingData = {
        name: formData.name,
        address: formData.address,
        city: formData.city || null,
        monthly_fee: Number(formData.monthly_fee) || 0,
        is_approved: true, // Admin creates approved buildings
        created_by: user?.id,
      };

      const { error } = await supabase
        .from('buildings')
        .insert(buildingData as never);

      if (error) throw error;

      toast.success('הבניין נוסף בהצלחה');
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

  const approveBuilding = async (building: Building) => {
    const supabase = createClient();

    const { error } = await supabase
      .from('buildings')
      .update({ is_approved: true } as never)
      .eq('id', building.id);

    if (error) {
      toast.error('שגיאה באישור');
      return;
    }

    toast.success('הבניין אושר');
    loadData();
  };

  const rejectBuilding = async (building: Building) => {
    if (!confirm('האם למחוק את הבקשה?')) return;

    const supabase = createClient();

    const { error } = await supabase
      .from('buildings')
      .delete()
      .eq('id', building.id);

    if (error) {
      toast.error('שגיאה במחיקה');
      return;
    }

    toast.success('הבקשה נמחקה');
    loadData();
  };

  const filteredBuildings = buildings.filter(b => {
    if (filter === 'all') return true;
    if (filter === 'pending') return !b.is_approved;
    if (filter === 'approved') return b.is_approved;
    return true;
  });

  const counts = {
    all: buildings.length,
    pending: buildings.filter(b => !b.is_approved).length,
    approved: buildings.filter(b => b.is_approved).length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ניהול בניינים</h1>
          <p className="text-muted-foreground">אישור וניהול בניינים במערכת</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              הוסף בניין
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>הוספת בניין חדש</DialogTitle>
              <DialogDescription>
                הוספת בניין חדש למערכת
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">שם הבניין *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="לדוגמה: רחוב הרצל 5"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">כתובת *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="כתובת מלאה"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">עיר</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthly_fee">דמי ועד חודשיים (₪)</Label>
                    <Input
                      id="monthly_fee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.monthly_fee}
                      onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  ביטול
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'שמור'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'pending', 'approved'] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status === 'all' && 'הכל'}
            {status === 'pending' && 'ממתין לאישור'}
            {status === 'approved' && 'מאושר'}
            <span className="mr-2 bg-white/20 px-1.5 py-0.5 rounded text-xs">
              {counts[status]}
            </span>
          </Button>
        ))}
      </div>

      {/* Buildings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">רשימת בניינים</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>שם הבניין</TableHead>
                <TableHead>כתובת</TableHead>
                <TableHead>עיר</TableHead>
                <TableHead>דמי ועד</TableHead>
                <TableHead>דיירים</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBuildings.map((building) => (
                <TableRow key={building.id}>
                  <TableCell>
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </TableCell>
                  <TableCell className="font-medium">{building.name}</TableCell>
                  <TableCell>{building.address}</TableCell>
                  <TableCell>{building.city || '-'}</TableCell>
                  <TableCell>₪{Number(building.monthly_fee).toLocaleString()}</TableCell>
                  <TableCell>{building.member_count}</TableCell>
                  <TableCell>
                    <Badge variant={building.is_approved ? 'default' : 'secondary'}>
                      {building.is_approved ? 'מאושר' : 'ממתין'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {!building.is_approved && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => approveBuilding(building)}
                            title="אשר"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => rejectBuilding(building)}
                            title="דחה"
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </>
                      )}
                      {building.is_approved && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => rejectBuilding(building)}
                          title="מחק"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredBuildings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    אין בניינים
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
