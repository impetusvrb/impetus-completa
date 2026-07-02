/**
 * Notification Center — feed default + Unified Feed (NC-04-FEDERATION)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { appCommunications } from '../services/api';
import { getSocket } from '../chat-module/hooks/useChatSocket';
import { useDashboardBoot } from '../runtimeBoot/DashboardBootContext';

export const UNIFIED_CATEGORIES = [
  { id: 'todas', label: 'Todas' },
  { id: 'sistema', label: 'Sistema' },
  { id: 'operacional', label: 'Operacional' },
  { id: 'billing', label: 'Billing' },
  { id: 'manuia', label: 'ManuIA' },
  { id: 'dsr', label: 'DSR' },
  { id: 'tpm', label: 'TPM' }
];

function mapPayloadToItem(payload) {
  if (!payload || !payload.id) return null;
  return {
    id: payload.id,
    text_content: payload.text || payload.text_content || '',
    communication_id: payload.related_communication_id || payload.communication_id || null,
    sent_at: payload.created_at || payload.sent_at || new Date().toISOString(),
    read_at: payload.read_at || null
  };
}

export function useNotificationCenter() {
  const { phase } = useDashboardBoot();
  const [items, setItems] = useState([]);
  const [unifiedItems, setUnifiedItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unifiedLoading, setUnifiedLoading] = useState(false);
  const [error, setError] = useState(null);
  const [feedMode, setFeedMode] = useState('default');
  const [categoryFilter, setCategoryFilter] = useState('todas');
  const mountedRef = useRef(true);

  const refreshDefault = useCallback(async () => {
    if (!localStorage.getItem('impetus_token')) {
      setItems([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const [countRes, listRes] = await Promise.all([
        appCommunications.notifications.unreadCount(),
        appCommunications.notifications.list({ limit: 15, offset: 0 })
      ]);
      if (!mountedRef.current) return;
      const count = countRes?.data?.unread_count ?? 0;
      const list = listRes?.data?.notifications ?? [];
      setUnreadCount(typeof count === 'number' ? count : 0);
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      if (mountedRef.current) {
        setError(e?.response?.data?.error || e?.message || 'Erro ao carregar notificações');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const refreshUnified = useCallback(async () => {
    if (!localStorage.getItem('impetus_token')) {
      setUnifiedItems([]);
      return;
    }
    setUnifiedLoading(true);
    try {
      setError(null);
      const res = await appCommunications.unifiedNotifications.list({
        limit: 20,
        offset: 0,
        category: categoryFilter === 'todas' ? undefined : categoryFilter
      });
      if (!mountedRef.current) return;
      setUnifiedItems(Array.isArray(res?.data?.notifications) ? res.data.notifications : []);
    } catch (e) {
      if (mountedRef.current) {
        setError(e?.response?.data?.error || e?.message || 'Erro ao carregar feed unificado');
      }
    } finally {
      if (mountedRef.current) setUnifiedLoading(false);
    }
  }, [categoryFilter]);

  const refresh = useCallback(async () => {
    await refreshDefault();
    if (feedMode === 'unified') {
      await refreshUnified();
    }
  }, [refreshDefault, refreshUnified, feedMode]);

  useEffect(() => {
    mountedRef.current = true;
    if (phase < 2) {
      setLoading(false);
      return () => {
        mountedRef.current = false;
      };
    }
    refreshDefault();
    return () => {
      mountedRef.current = false;
    };
  }, [refreshDefault, phase]);

  useEffect(() => {
    if (feedMode === 'unified') {
      refreshUnified();
    }
  }, [feedMode, refreshUnified]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const onAppNotification = (payload) => {
      const item = mapPayloadToItem(payload);
      if (!item) return;
      setItems((prev) => {
        const filtered = prev.filter((n) => n.id !== item.id);
        return [item, ...filtered].slice(0, 15);
      });
      setUnreadCount((c) => c + 1);
    };

    socket.on('app_notification', onAppNotification);
    return () => {
      socket.off('app_notification', onAppNotification);
    };
  }, []);

  const markRead = useCallback(async (notificationId) => {
    if (!notificationId) return;
    const prevItems = items;
    const wasUnread = prevItems.find((n) => n.id === notificationId && !n.read_at);
    setItems((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, read_at: n.read_at || new Date().toISOString() } : n
      )
    );
    if (wasUnread) {
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    try {
      await appCommunications.notifications.markRead(notificationId);
    } catch (e) {
      setItems(prevItems);
      if (wasUnread) {
        setUnreadCount((c) => c + 1);
      }
      throw e;
    }
  }, [items]);

  const markUnifiedRead = useCallback(async (item) => {
    if (!item || item.read) return;
    if (item.source === 'app_notifications' && item.raw_id) {
      await markRead(item.raw_id);
      setUnifiedItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      );
    }
  }, [markRead]);

  const displayItems = feedMode === 'unified' ? unifiedItems : items;
  const displayLoading = feedMode === 'unified' ? unifiedLoading : loading;

  return {
    items,
    unifiedItems,
    displayItems,
    unreadCount,
    loading,
    unifiedLoading,
    displayLoading,
    error,
    feedMode,
    setFeedMode,
    categoryFilter,
    setCategoryFilter,
    refresh,
    refreshUnified,
    markRead,
    markUnifiedRead
  };
}

export default useNotificationCenter;
