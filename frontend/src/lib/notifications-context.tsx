'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import type { Socket } from 'socket.io-client';

export interface Notification {
  id: string;
  type: 'order' | 'payment' | 'table' | 'inventory' | 'reservation' | 'info';
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clearAll: () => void;
}

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
  markRead: () => {},
  clearAll: () => {},
});

export const useNotifications = () => useContext(NotificationsContext);

let notifCounter = 0;
const makeId = () => `notif-${++notifCounter}-${Date.now()}`;

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const socketRef = useRef<Socket | null>(null);

  const addNotification = useCallback((n: Omit<Notification, 'id' | 'read' | 'timestamp'>) => {
    setNotifications((prev) => [
      { ...n, id: makeId(), read: false, timestamp: new Date() },
      ...prev.slice(0, 99),
    ]);
  }, []);

  useEffect(() => {
    if (!user?.restaurantId) return;

    const socket = connectSocket(user.restaurantId);
    socketRef.current = socket;

    socket.on('order:created', (order: { orderNumber: string; total: number; table?: { number: string } }) => {
      addNotification({
        type: 'order',
        title: `New Order ${order.orderNumber}`,
        description: `${order.total?.toLocaleString() || 0} FCFA${order.table ? ` — Table ${order.table.number}` : ''}`,
      });
    });

    socket.on('order:updated', (order: { orderNumber: string; status: string }) => {
      addNotification({
        type: 'order',
        title: `Order ${order.orderNumber} Updated`,
        description: `Status: ${order.status}`,
      });
    });

    socket.on('order:cancelled', (order: { orderNumber: string }) => {
      addNotification({
        type: 'order',
        title: `Order ${order.orderNumber} Cancelled`,
        description: 'Order has been cancelled',
      });
    });

    socket.on('payment:created', (data: { orderNumber?: string; amount?: number; method?: string }) => {
      addNotification({
        type: 'payment',
        title: `Payment Received`,
        description: `${data.amount?.toLocaleString() || 0} FCFA via ${data.method || 'unknown'}${data.orderNumber ? ` for ${data.orderNumber}` : ''}`,
      });
    });

    socket.on('table:updated', (data: { number?: string; status?: string }) => {
      addNotification({
        type: 'table',
        title: `Table ${data.number || ''} Updated`,
        description: `Status: ${data.status || 'changed'}`,
      });
    });

    socket.on('inventory:low-stock', (data: { itemName?: string; currentStock?: number }) => {
      addNotification({
        type: 'inventory',
        title: `Low Stock Alert`,
        description: `${data.itemName || 'Item'}: ${data.currentStock ?? 0} remaining`,
      });
    });

    socket.on('reservation:created', (data: { customerName?: string; guestCount?: number }) => {
      addNotification({
        type: 'reservation',
        title: `New Reservation`,
        description: `${data.customerName || 'Customer'} — ${data.guestCount || 0} guests`,
      });
    });

    return () => {
      disconnectSocket();
      socketRef.current = null;
    };
  }, [user?.restaurantId, addNotification]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markAllRead, markRead, clearAll }}>
      {children}
    </NotificationsContext.Provider>
  );
}
