'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  RefreshCw,
  Shield,
  Users,
  Building2,
  AlertTriangle,
  CheckCircle,
  UserX,
} from 'lucide-react';
import { toast } from 'sonner';

interface SecurityData {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  suspendedRestaurants: number;
  totalRestaurants: number;
  activeSessionsEstimate: number;
  recentLogins: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    lastLogin: string;
    restaurant: { name: string } | null;
  }[];
}

export default function SecurityPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/super-admin/security');
      setData(res.data);
    } catch {
      toast.error('Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'SUPER_ADMIN') {
    return <div className="flex h-64 items-center justify-center"><p className="text-lg text-destructive font-semibold">Access denied</p></div>;
  }

  const statCards = data ? [
    { label: t('superAdmin.activeSessionsCount'), value: data.activeSessionsEstimate, icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: t('superAdmin.inactiveUsers'), value: data.inactiveUsers, icon: UserX, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: t('superAdmin.suspendedRestaurants'), value: data.suspendedRestaurants, icon: Building2, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: t('superAdmin.totalUsers'), value: data.totalUsers, icon: Shield, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('superAdmin.securityTitle')}</h1>
          <p className="text-muted-foreground">{t('superAdmin.securitySubtitle')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="mr-1 h-4 w-4" /> {t('common.refresh')}
        </Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Security Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4" /> {t('superAdmin.securityAlerts')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data && data.suspendedRestaurants > 0 ? (
                <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <p className="text-sm">{data.suspendedRestaurants} restaurant(s) suspended</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <p className="text-sm">{t('superAdmin.noAlerts')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Logins */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" /> {t('superAdmin.recentLogins')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data && data.recentLogins.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('superAdmin.userName')}</TableHead>
                      <TableHead>{t('superAdmin.userEmail')}</TableHead>
                      <TableHead>{t('superAdmin.userRole')}</TableHead>
                      <TableHead>{t('superAdmin.userRestaurant')}</TableHead>
                      <TableHead>{t('superAdmin.userLastLogin')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentLogins.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.firstName} {u.lastName}</TableCell>
                        <TableCell className="text-sm">{u.email}</TableCell>
                        <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.restaurant?.name || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">No recent logins today</div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
