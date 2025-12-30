'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { graphqlClient } from '@/lib/graphql-client';
import { useToastContext } from '@/components/ui/toast-provider';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  metadata: Record<string, unknown> | null;
  actionUrl: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  isConnected: boolean;
  fetchNotifications: (reset?: boolean) => Promise<void>;
  fetchMore: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: React.ReactNode;
  role: 'admin' | 'student';
}

export function NotificationProvider({ children, role }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [endCursor, setEndCursor] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toast = useToastContext();

  // Fetch notifications from API
  const fetchNotifications = useCallback(async (reset = false) => {
    setLoading(true);
    setError(null);

    try {
      const cursor = reset ? undefined : endCursor || undefined;

      let data: {
        nodes: Notification[];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        unreadCount: number;
      } | undefined;
      let errors: Array<{ message: string }> | undefined;

      if (role === 'admin') {
        const response = await graphqlClient.getNotifications(5, cursor);
        data = response.data?.notifications as typeof data;
        errors = response.errors;
      } else {
        const response = await graphqlClient.getStudentNotifications(5, cursor);
        data = response.data?.studentNotifications as typeof data;
        errors = response.errors;
      }

      if (data) {
        if (reset) {
          setNotifications(data.nodes);
        } else {
          setNotifications(prev => [...prev, ...data!.nodes]);
        }
        setHasMore(data.pageInfo.hasNextPage);
        setEndCursor(data.pageInfo.endCursor);
        setUnreadCount(data.unreadCount);
      }

      if (errors) {
        setError(errors[0].message);
      }
    } catch (err) {
      setError('Failed to fetch notifications');
      console.error('Notification fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [role, endCursor]);

  // Fetch more notifications (for infinite scroll)
  const fetchMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchNotifications(false);
  }, [fetchNotifications, hasMore, loading]);

  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = role === 'admin'
        ? await graphqlClient.markNotificationAsRead(id)
        : await graphqlClient.markStudentNotificationAsRead(id);

      if (!response.errors) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  }, [role]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = role === 'admin'
        ? await graphqlClient.markAllNotificationsAsRead()
        : await graphqlClient.markAllStudentNotificationsAsRead();

      if (!response.errors) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() }))
        );
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Mark all as read error:', err);
    }
  }, [role]);

  // Delete notification
  const deleteNotification = useCallback(async (id: string) => {
    try {
      const response = role === 'admin'
        ? await graphqlClient.deleteNotification(id)
        : await graphqlClient.deleteStudentNotification(id);

      if (!response.errors) {
        const notification = notifications.find(n => n.id === id);
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (notification && !notification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (err) {
      console.error('Delete notification error:', err);
    }
  }, [role, notifications]);

  // Setup SSE connection
  const setupSSE = useCallback(() => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const sseUrl = graphqlClient.getSSEEndpoint();
    if (!sseUrl.includes('token=') || sseUrl.endsWith('token=')) {
      // No token available, don't connect
      return;
    }

    try {
      const eventSource = new EventSource(sseUrl, { withCredentials: false });
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('connected', () => {
        setIsConnected(true);
        setError(null);
        console.log('SSE connected');
      });

      eventSource.addEventListener('notification', (event) => {
        try {
          const notification = JSON.parse(event.data) as Notification;

          // Add to beginning of list
          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Show toast for high priority notifications
          if (notification.priority === 'HIGH' || notification.priority === 'URGENT') {
            toast.info({
              title: notification.title,
              description: notification.message,
            });
          }
        } catch (err) {
          console.error('Failed to parse notification:', err);
        }
      });

      eventSource.addEventListener('heartbeat', () => {
        // Heartbeat received, connection is alive
      });

      eventSource.onerror = () => {
        // Only log error if we were previously connected
        if (isConnected) {
          console.warn('SSE connection lost, will attempt to reconnect...');
        }
        setIsConnected(false);
        eventSource.close();

        // Attempt to reconnect after 5 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          setupSSE();
        }, 5000);
      };
    } catch (err) {
      console.warn('SSE connection failed, falling back to polling:', err);
      setIsConnected(false);
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [toast]);

  // Initial fetch and SSE setup
  useEffect(() => {
    fetchNotifications(true);
    setupSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [role]); // Only re-run when role changes

  const value: NotificationContextValue = {
    notifications,
    unreadCount,
    loading,
    hasMore,
    error,
    isConnected,
    fetchNotifications,
    fetchMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
