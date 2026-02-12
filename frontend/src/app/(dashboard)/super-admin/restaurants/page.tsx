'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  RefreshCw,
  Power,
  PowerOff,
  Trash2,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';

interface RestaurantRow {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  plan: string;
  isActive: boolean;
  createdAt: string;
  users: number;
  orders: number;
  tables: number;
  menuItems: number;
  todayRevenue: number;
  todayOrders: number;
}

const emptyForm = {
  name: '',
  slug: '',
  email: '',
  phone: '',
  city: 'Abidjan',
  country: "Côte d'Ivoire",
  plan: 'standard',
  adminEmail: '',
  adminPassword: '',
  adminFirstName: '',
  adminLastName: '',
  adminPhone: '',
};

export default function RestaurantsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/super-admin/restaurants');
      setRestaurants(res.data);
    } catch {
      toast.error('Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'SUPER_ADMIN') {
    return <div className="flex h-64 items-center justify-center"><p className="text-lg text-destructive font-semibold">Access denied</p></div>;
  }

  const createRestaurant = async () => {
    if (!form.name || !form.slug || !form.adminEmail || !form.adminPassword || !form.adminFirstName || !form.adminLastName) {
      toast.error('Please fill all required fields');
      return;
    }
    setCreating(true);
    try {
      await api.post('/super-admin/restaurants', form);
      toast.success(`Restaurant "${form.name}" created!`);
      setCreateOpen(false);
      setForm({ ...emptyForm });
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create restaurant';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await api.patch(`/super-admin/restaurants/${id}`, { isActive: !active });
      toast.success(active ? t('superAdmin.suspend') + ' ✓' : t('superAdmin.activate') + ' ✓');
      fetchData();
    } catch { toast.error('Failed to update'); }
  };

  const deleteRestaurant = async (id: string, name: string) => {
    if (!confirm(t('superAdmin.deleteConfirm'))) return;
    try {
      await api.delete(`/super-admin/restaurants/${id}`);
      toast.success(`"${name}" deleted`);
      fetchData();
    } catch { toast.error('Failed to delete'); }
  };

  const copyId = (id: string) => { navigator.clipboard.writeText(id); toast.success('Restaurant ID copied!'); };

  const planColors: Record<string, string> = {
    free: 'bg-gray-500/10 text-gray-600',
    standard: 'bg-blue-500/10 text-blue-600',
    premium: 'bg-amber-500/10 text-amber-600',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('superAdmin.restaurantManagement')}</h1>
          <p className="text-muted-foreground">{restaurants.length} restaurants</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="mr-1 h-4 w-4" /> {t('common.refresh')}
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" /> {t('superAdmin.createRestaurant')}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('superAdmin.createRestaurant')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-md bg-muted/50 px-3 py-2 text-sm font-medium">Restaurant</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{t('superAdmin.restaurantName')} *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') })} placeholder="Chez Moussa" />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('superAdmin.slug')} *</Label>
                    <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="chez-moussa" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>{t('common.email')}</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contact@chezmoussa.ci" /></div>
                  <div className="space-y-1"><Label>{t('common.phone')}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+225 07..." /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1"><Label>{t('superAdmin.city')}</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                  <div className="space-y-1"><Label>{t('superAdmin.country')}</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
                  <div className="space-y-1">
                    <Label>{t('superAdmin.plan')}</Label>
                    <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">{t('superAdmin.planFree')}</SelectItem>
                        <SelectItem value="standard">{t('superAdmin.planStandard')}</SelectItem>
                        <SelectItem value="premium">{t('superAdmin.planPremium')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="rounded-md bg-muted/50 px-3 py-2 text-sm font-medium">Admin</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>{t('superAdmin.adminFirstName')} *</Label><Input value={form.adminFirstName} onChange={(e) => setForm({ ...form, adminFirstName: e.target.value })} /></div>
                  <div className="space-y-1"><Label>{t('superAdmin.adminLastName')} *</Label><Input value={form.adminLastName} onChange={(e) => setForm({ ...form, adminLastName: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>{t('superAdmin.adminEmail')} *</Label><Input type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} placeholder="admin@chezmoussa.ci" /></div>
                  <div className="space-y-1"><Label>{t('superAdmin.adminPassword')} *</Label><Input type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} /></div>
                </div>
                <div className="space-y-1"><Label>{t('superAdmin.adminPhone')}</Label><Input value={form.adminPhone} onChange={(e) => setForm({ ...form, adminPhone: e.target.value })} placeholder="+225 07..." /></div>
                <Button className="w-full" onClick={createRestaurant} disabled={creating}>{creating ? t('common.loading') : t('superAdmin.createRestaurant')}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : restaurants.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">{t('superAdmin.noRestaurants')}</CardContent></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {restaurants.map((r) => (
            <Card key={r.id} className={!r.isActive ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{r.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{r.city}{r.country ? `, ${r.country}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={planColors[r.plan] || ''}>{r.plan}</Badge>
                    <Badge variant={r.isActive ? 'default' : 'secondary'}>{r.isActive ? t('common.active') : t('common.inactive')}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div><p className="text-lg font-bold">{r.users}</p><p className="text-[10px] text-muted-foreground">{t('superAdmin.users')}</p></div>
                  <div><p className="text-lg font-bold">{r.tables}</p><p className="text-[10px] text-muted-foreground">{t('superAdmin.tables')}</p></div>
                  <div><p className="text-lg font-bold">{r.menuItems}</p><p className="text-[10px] text-muted-foreground">{t('superAdmin.menuItems')}</p></div>
                  <div><p className="text-lg font-bold">{r.orders}</p><p className="text-[10px] text-muted-foreground">{t('superAdmin.orders')}</p></div>
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <div>
                    <p className="text-sm font-semibold">{r.todayRevenue.toLocaleString()} FCFA <span className="ml-1 text-xs font-normal text-muted-foreground">({r.todayOrders} {t('superAdmin.todayOrders').toLowerCase()})</span></p>
                    <p className="text-[10px] text-muted-foreground">{t('superAdmin.created')}: {new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" title="Copy Restaurant ID" onClick={() => copyId(r.id)}><Copy className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant={r.isActive ? 'outline' : 'default'} onClick={() => toggleActive(r.id, r.isActive)}>
                      {r.isActive ? <><PowerOff className="mr-1 h-3.5 w-3.5" /> {t('superAdmin.suspend')}</> : <><Power className="mr-1 h-3.5 w-3.5" /> {t('superAdmin.activate')}</>}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteRestaurant(r.id, r.name)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
