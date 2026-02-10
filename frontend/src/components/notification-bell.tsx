'use client';

import { useState } from 'react';
import { useNotifications, Notification } from '@/lib/notifications-context';
import { Button } from '@/components/ui/button';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Bell, CheckCheck, ClipboardList, CreditCard, Package, CalendarClock, Grid3X3, Trash2 } from 'lucide-react';

const typeIcons: Record<Notification['type'], React.ReactNode> = {
  order: <ClipboardList className="h-4 w-4 text-blue-500" />,
  payment: <CreditCard className="h-4 w-4 text-emerald-500" />,
  table: <Grid3X3 className="h-4 w-4 text-purple-500" />,
  inventory: <Package className="h-4 w-4 text-amber-500" />,
  reservation: <CalendarClock className="h-4 w-4 text-pink-500" />,
  info: <Bell className="h-4 w-4 text-muted-foreground" />,
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" side="right">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
                <CheckCheck className="mr-1 h-3 w-3" /> Read all
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={clearAll}>
                <Trash2 className="mr-1 h-3 w-3" /> Clear
              </Button>
            )}
          </div>
        </div>
        <Separator />
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-1 px-4 py-8 text-muted-foreground">
              <Bell className="h-6 w-6" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.slice(0, 30).map((n) => (
              <div
                key={n.id}
                className={`flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${!n.read ? 'bg-muted/30' : ''}`}
              >
                <div className="mt-0.5 shrink-0">{typeIcons[n.type]}</div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${!n.read ? 'font-semibold' : ''}`}>{n.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{n.description}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{timeAgo(n.timestamp)}</p>
                </div>
                {!n.read && (
                  <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
