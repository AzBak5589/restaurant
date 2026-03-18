'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ClipboardList, CreditCard, CalendarClock, Package, RefreshCw, Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import { useI18n } from '@/lib/i18n';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface ActivityItem {
  id: string;
  type: 'order' | 'payment' | 'reservation' | 'inventory';
  title: string;
  description: string;
  actor: string | null;
  timestamp: string;
}

const typeConfig: Record<string, { icon: React.ReactNode; color: string; badge: string }> = {
  order: { icon: <ClipboardList className="h-4 w-4" />, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950', badge: 'bg-blue-100 text-blue-700' },
  payment: { icon: <CreditCard className="h-4 w-4" />, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950', badge: 'bg-emerald-100 text-emerald-700' },
  reservation: { icon: <CalendarClock className="h-4 w-4" />, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950', badge: 'bg-purple-100 text-purple-700' },
  inventory: { icon: <Package className="h-4 w-4" />, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950', badge: 'bg-amber-100 text-amber-700' },
};

function formatTimestamp(ts: string, t: (key: string) => string): string {
  const date = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return t('activity.justNow');
  if (mins < 60) return `${mins}${t('activity.minutesAgoSuffix')}`;
  if (hours < 24) return `${hours}${t('activity.hoursAgoSuffix')}`;
  if (days < 7) return `${days}${t('activity.daysAgoSuffix')}`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function groupByDate(
  items: ActivityItem[],
  t: (key: string) => string,
): { label: string; items: ActivityItem[] }[] {
  const groups: Record<string, ActivityItem[]> = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  for (const item of items) {
    const dateStr = new Date(item.timestamp).toDateString();
    let label: string;
    if (dateStr === today) label = t('activity.today');
    else if (dateStr === yesterday) label = t('activity.yesterday');
    else label = new Date(item.timestamp).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  }

  return Object.entries(groups).map(([label, items]) => ({ label, items }));
}

export default function ActivityPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const PAGE_SIZE = 30;
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>(() => {
    const type = searchParams.get('type');
    return ['all', 'order', 'payment', 'reservation', 'inventory'].includes(
      type || '',
    )
      ? (type as string)
      : 'all';
  });
  const [page, setPage] = useState(() => {
    const raw = searchParams.get('page');
    const parsed = raw ? Number.parseInt(raw, 10) : 1;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  });

  const syncToUrl = (nextType: string, nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextType === 'all') {
      params.delete('type');
    } else {
      params.set('type', nextType);
    }

    if (nextPage <= 1) {
      params.delete('page');
    } else {
      params.set('page', String(nextPage));
    }

    const query = params.toString();
    const currentQuery = searchParams.toString();
    if (query !== currentQuery) {
      router.replace(query ? `${pathname}?${query}` : pathname);
    }
  };

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page,
        limit: PAGE_SIZE,
      };
      if (filter !== 'all') params.type = filter;
      const res = await api.get('/activity', { params });
      setActivities(res.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('activity.error.load')));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchActivity(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page]);

  useEffect(() => {
    syncToUrl(filter, page);
  }, [filter, page]);

  useEffect(() => {
    const nextType = searchParams.get('type');
    const normalizedType = ['order', 'payment', 'reservation', 'inventory'].includes(
      nextType || '',
    )
      ? (nextType as string)
      : 'all';
    const rawPage = searchParams.get('page');
    const parsedPage = rawPage ? Number.parseInt(rawPage, 10) : 1;
    const normalizedPage =
      Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

    if (normalizedType !== filter) {
      setFilter(normalizedType);
    }
    if (normalizedPage !== page) {
      setPage(normalizedPage);
    }
  }, [searchParams, filter, page]);

  const grouped = groupByDate(activities, t);

  const counts = {
    all: filter === 'all' ? activities.length : 0,
    order: filter === 'order' ? activities.length : 0,
    payment: filter === 'payment' ? activities.length : 0,
    reservation: filter === 'reservation' ? activities.length : 0,
    inventory: filter === 'inventory' ? activities.length : 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('activity.title')}</h1>
          <p className="text-muted-foreground">{t('activity.subtitle')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchActivity}>
          <RefreshCw className="mr-1 h-4 w-4" /> {t('common.refresh')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'order', 'payment', 'reservation', 'inventory'] as const).map((type) => (
          <Button
            key={type}
            variant={filter === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setFilter(type);
              setPage(1);
            }}
          >
            {type === 'all' ? (
              <Activity className="mr-1 h-3.5 w-3.5" />
            ) : (
              <span className="mr-1">{typeConfig[type]?.icon}</span>
            )}
            {t(`activity.${type === 'all' ? 'allTypes' : `${type}s`}`)}
            <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1 text-[10px]">
              {counts[type]}
            </Badge>
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : activities.length === 0 ? (
        <Card>
          <CardContent className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Activity className="h-8 w-8" />
            <p>{t('activity.noActivity')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.label}>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">{group.label}</h3>
              <Card>
                <CardContent className="divide-y p-0">
                  {group.items.map((item) => {
                    const config = typeConfig[item.type] || typeConfig.order;
                    return (
                      <div key={item.id} className="flex items-start gap-4 px-4 py-3">
                        <div className={`mt-0.5 rounded-lg p-2 ${config.color}`}>
                          {config.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{item.title}</p>
                            <Badge className={`text-[10px] ${config.badge}`}>
                              {t(`activity.${item.type}s`)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                          {item.actor && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {t('activity.by')} {item.actor}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatTimestamp(item.timestamp, t)}
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
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
          disabled={loading || activities.length < PAGE_SIZE}
        >
          {t('common.next')}
        </Button>
      </div>
    </div>
  );
}
