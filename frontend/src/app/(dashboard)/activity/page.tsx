'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ClipboardList, CreditCard, CalendarClock, Package, RefreshCw, Activity,
} from 'lucide-react';
import { toast } from 'sonner';

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

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function groupByDate(items: ActivityItem[]): { label: string; items: ActivityItem[] }[] {
  const groups: Record<string, ActivityItem[]> = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  for (const item of items) {
    const dateStr = new Date(item.timestamp).toDateString();
    let label: string;
    if (dateStr === today) label = 'Today';
    else if (dateStr === yesterday) label = 'Yesterday';
    else label = new Date(item.timestamp).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  }

  return Object.entries(groups).map(([label, items]) => ({ label, items }));
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const res = await api.get('/activity', { params: { limit: 100 } });
      setActivities(res.data);
    } catch {
      toast.error('Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchActivity(); }, []);

  const filtered = filter === 'all' ? activities : activities.filter((a) => a.type === filter);
  const grouped = groupByDate(filtered);

  const counts = {
    all: activities.length,
    order: activities.filter((a) => a.type === 'order').length,
    payment: activities.filter((a) => a.type === 'payment').length,
    reservation: activities.filter((a) => a.type === 'reservation').length,
    inventory: activities.filter((a) => a.type === 'inventory').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Activity Log</h1>
          <p className="text-muted-foreground">Recent actions across your restaurant</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchActivity}>
          <RefreshCw className="mr-1 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'order', 'payment', 'reservation', 'inventory'] as const).map((type) => (
          <Button
            key={type}
            variant={filter === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(type)}
          >
            {type === 'all' ? (
              <Activity className="mr-1 h-3.5 w-3.5" />
            ) : (
              <span className="mr-1">{typeConfig[type]?.icon}</span>
            )}
            {type.charAt(0).toUpperCase() + type.slice(1)}s
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
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Activity className="h-8 w-8" />
            <p>No activity found</p>
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
                              {item.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                          {item.actor && (
                            <p className="mt-0.5 text-xs text-muted-foreground">by {item.actor}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatTimestamp(item.timestamp)}
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
    </div>
  );
}
