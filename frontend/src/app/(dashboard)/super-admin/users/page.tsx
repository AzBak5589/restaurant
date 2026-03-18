'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RefreshCw, Search, Power, PowerOff } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  restaurantId: string | null;
  restaurant: { name: string } | null;
}

interface RestaurantOption {
  id: string;
  name: string;
}

export default function UsersPage() {
  const PAGE_SIZE = 25;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { t } = useI18n();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const roles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'CHEF', 'BARTENDER'];
  const normalizeRole = (value: string | null) => {
    return value && roles.includes(value) ? value : 'all';
  };
  const normalizePage = (value: string | null) => {
    const parsed = value ? Number.parseInt(value, 10) : 1;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  };

  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [roleFilter, setRoleFilter] = useState(() => normalizeRole(searchParams.get('role')));
  const [restaurantFilter, setRestaurantFilter] = useState(
    () => searchParams.get('restaurantId') || 'all',
  );
  const [page, setPage] = useState(() => normalizePage(searchParams.get('page')));

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') {
      fetchRestaurants();
      fetchUsers(page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchRestaurants = async () => {
    try {
      const res = await api.get('/super-admin/restaurants');
      setRestaurants(res.data.map((r: RestaurantOption) => ({ id: r.id, name: r.name })));
    } catch { /* ignore */ }
  };

  const fetchUsers = async (targetPage: number = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (restaurantFilter !== 'all') params.set('restaurantId', restaurantFilter);
      if (search) params.set('search', search);
      params.set('page', String(targetPage));
      params.set('limit', String(PAGE_SIZE));
      const res = await api.get(`/super-admin/users?${params.toString()}`);
      setUsers(res.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('superAdmin.error.loadUsers')));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, restaurantFilter, page]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (search.trim()) params.set('q', search.trim());
    else params.delete('q');

    if (roleFilter !== 'all') params.set('role', roleFilter);
    else params.delete('role');

    if (restaurantFilter !== 'all') params.set('restaurantId', restaurantFilter);
    else params.delete('restaurantId');

    if (page > 1) params.set('page', String(page));
    else params.delete('page');

    const query = params.toString();
    const currentQuery = searchParams.toString();
    if (query !== currentQuery) {
      router.replace(query ? `${pathname}?${query}` : pathname);
    }
  }, [search, roleFilter, restaurantFilter, page, searchParams, router, pathname]);

  useEffect(() => {
    const nextSearch = searchParams.get('q') || '';
    const nextRole = normalizeRole(searchParams.get('role'));
    const nextRestaurant = searchParams.get('restaurantId') || 'all';
    const nextPage = normalizePage(searchParams.get('page'));

    if (nextSearch !== search) setSearch(nextSearch);
    if (nextRole !== roleFilter) setRoleFilter(nextRole);
    if (nextRestaurant !== restaurantFilter) setRestaurantFilter(nextRestaurant);
    if (nextPage !== page) setPage(nextPage);
  }, [searchParams, search, roleFilter, restaurantFilter, page]);

  const handleSearch = () => {
    setPage(1);
    fetchUsers(1);
  };

  const toggleUserActive = async (id: string, active: boolean) => {
    try {
      await api.patch(`/super-admin/users/${id}`, { isActive: !active });
      toast.success(!active ? t('superAdmin.activateUser') + ' ✓' : t('superAdmin.deactivateUser') + ' ✓');
      fetchUsers();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('superAdmin.error.updateUser')));
    }
  };

  if (user?.role !== 'SUPER_ADMIN') {
    return <div className="flex h-64 items-center justify-center"><p className="text-lg text-destructive font-semibold">{t('superAdmin.accessDenied')}</p></div>;
  }

  const roleColors: Record<string, string> = {
    SUPER_ADMIN: 'bg-red-500/10 text-red-600',
    ADMIN: 'bg-blue-500/10 text-blue-600',
    MANAGER: 'bg-violet-500/10 text-violet-600',
    CASHIER: 'bg-emerald-500/10 text-emerald-600',
    WAITER: 'bg-amber-500/10 text-amber-600',
    CHEF: 'bg-orange-500/10 text-orange-600',
    BARTENDER: 'bg-pink-500/10 text-pink-600',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('superAdmin.allUsersTitle')}</h1>
        <p className="text-muted-foreground">{t('superAdmin.allUsersSubtitle')}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t('superAdmin.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(value) => {
            setRoleFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]"><SelectValue placeholder={t('superAdmin.filterByRole')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('superAdmin.allRoles')}</SelectItem>
            {roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select
          value={restaurantFilter}
          onValueChange={(value) => {
            setRestaurantFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]"><SelectValue placeholder={t('superAdmin.filterByRestaurant')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('superAdmin.allRestaurants')}</SelectItem>
            {restaurants.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => fetchUsers()}>
          <RefreshCw className="mr-1 h-4 w-4" /> {t('common.refresh')}
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">{t('superAdmin.noUsers')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('superAdmin.userName')}</TableHead>
                  <TableHead>{t('superAdmin.userEmail')}</TableHead>
                  <TableHead>{t('superAdmin.userRole')}</TableHead>
                  <TableHead>{t('superAdmin.userRestaurant')}</TableHead>
                  <TableHead>{t('superAdmin.userStatus')}</TableHead>
                  <TableHead>{t('superAdmin.userLastLogin')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className={!u.isActive ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{u.firstName} {u.lastName}</TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={roleColors[u.role] || ''}>{u.role}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.restaurant?.name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={u.isActive ? 'default' : 'secondary'}>{u.isActive ? t('common.active') : t('common.inactive')}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : t('superAdmin.never')}
                    </TableCell>
                    <TableCell className="text-right">
                      {u.role !== 'SUPER_ADMIN' && (
                        <Button size="sm" variant="ghost" onClick={() => toggleUserActive(u.id, u.isActive)}>
                          {u.isActive ? <PowerOff className="h-4 w-4 text-destructive" /> : <Power className="h-4 w-4 text-emerald-500" />}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1 || loading}
        >
          {t('common.back')}
        </Button>
        <span className="text-sm text-muted-foreground">{t('superAdmin.page')} {page}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => p + 1)}
          disabled={loading || users.length < PAGE_SIZE}
        >
          {t('common.next')}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{users.length} {t('superAdmin.users').toLowerCase()}</p>
    </div>
  );
}
