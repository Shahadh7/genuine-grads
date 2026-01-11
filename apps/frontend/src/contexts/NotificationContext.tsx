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
      // Silent fail - notification will remain unread
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
      // Silent fail
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
      // Silent fail
    }
  }, [role, notifications]);

  // Abort controller ref for fetch-based SSE
  const abortControllerRef = useRef<AbortController | null>(null);

  // Setup SSE connection using fetch with proper Authorization header
  // SECURITY: Using fetch instead of EventSource to support Authorization header
  // EventSource doesn't support custom headers, which is a security risk
  const setupSSE = useCallback(() => {
    // Close existing connection
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const token = graphqlClient.getAccessToken();
    if (!token) {
      // No token available, don't connect
      return;
    }

    const sseUrl = graphqlClient.getSSEEndpoint();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Use fetch with ReadableStream for SSE with Authorization header
    const connectSSE = async () => {
      try {
        const response = await fetch(sseUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`SSE connection failed: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        setIsConnected(true);
        setError(null);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete events (events are separated by double newlines)
          const events = buffer.split('\n\n');
          buffer = events.pop() || ''; // Keep incomplete event in buffer

          for (const eventData of events) {
            if (!eventData.trim()) continue;

            // Parse SSE format: "event: type\ndata: json"
            const lines = eventData.split('\n');
            let eventType = 'message';
            let data = '';

            for (const line of lines) {
              if (line.startsWith('event:')) {
                eventType = line.slice(6).trim();
              } else if (line.startsWith('data:')) {
                data = line.slice(5).trim();
              }
            }

            // Handle different event types
            if (eventType === 'connected') {
              setIsConnected(true);
              setError(null);
            } else if (eventType === 'notification' && data) {
              try {
                const notification = JSON.parse(data) as Notification;
                setNotifications(prev => [notification, ...prev]);
                setUnreadCount(prev => prev + 1);

                if (notification.priority === 'HIGH' || notification.priority === 'URGENT') {
                  toast.info({
                    title: notification.title,
                    description: notification.message,
                  });
                }
              } catch {
                // Silent fail - malformed notification
              }
            }
            // heartbeat events are just ignored (keep-alive)
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          // Connection was intentionally closed
          return;
        }

        setIsConnected(false);

        // Attempt to reconnect after 5 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          setupSSE();
        }, 5000);
      }
    };

    connectSSE();

    return () => {
      abortController.abort();
    };
  }, [toast]);

  // Initial fetch and SSE setup
  useEffect(() => {
    fetchNotifications(true);
    setupSSE();

    return () => {
      // SECURITY: Clean up connections properly
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
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
