'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
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
import { RefreshCw, ShoppingCart, UserPlus, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface LogEntry {
  type: string;
  action: string;
  user: string;
  details: string;
  timestamp: string;
}

export default function LogsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') fetchLogs();
  }, [user]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/super-admin/logs');
      setLogs(res.data);
    } catch {
      toast.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'SUPER_ADMIN') {
    return <div className="flex h-64 items-center justify-center"><p className="text-lg text-destructive font-semibold">Access denied</p></div>;
  }

  const typeIcons: Record<string, React.ReactNode> = {
    order: <ShoppingCart className="h-4 w-4 text-blue-500" />,
    user: <UserPlus className="h-4 w-4 text-emerald-500" />,
    restaurant: <Building2 className="h-4 w-4 text-amber-500" />,
  };

  const typeColors: Record<string, string> = {
    order: 'bg-blue-500/10 text-blue-600',
    user: 'bg-emerald-500/10 text-emerald-600',
    restaurant: 'bg-amber-500/10 text-amber-600',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('superAdmin.logsTitle')}</h1>
          <p className="text-muted-foreground">{t('superAdmin.logsSubtitle')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs}>
          <RefreshCw className="mr-1 h-4 w-4" /> {t('common.refresh')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">{t('superAdmin.noLogs')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>{t('superAdmin.logAction')}</TableHead>
                  <TableHead>{t('superAdmin.logUser')}</TableHead>
                  <TableHead>{t('superAdmin.logDetails')}</TableHead>
                  <TableHead>{t('superAdmin.logTimestamp')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log, i) => (
                  <TableRow key={i}>
                    <TableCell>{typeIcons[log.type] || null}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={typeColors[log.type] || ''}>{log.type}</Badge>
                        <span className="text-sm font-medium">{log.action}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{log.user}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">{log.details}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">{logs.length} entries</p>
    </div>
  );
}
