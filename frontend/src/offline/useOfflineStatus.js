/**
 * WAVE 6 — Hook de estado offline/online.
 * Detecta mudanças de conectividade e opcionalmente drena a fila offline.
 */

import { useState, useEffect, useCallback } from 'react';
import { drainOfflineQueue, listOfflineQueue } from './offlineQueue';

/**
 * @returns {{ isOnline: boolean, queueSize: number, drainQueue: () => Promise<void> }}
 */
export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [queueSize, setQueueSize] = useState(0);

  const refreshQueueSize = useCallback(async () => {
    try {
      const q = await listOfflineQueue();
      setQueueSize(q.length);
    } catch {
      setQueueSize(0);
    }
  }, []);

  const drainQueue = useCallback(async () => {
    if (!isOnline) return;
    try {
      await drainOfflineQueue();
      await refreshQueueSize();
    } catch {
      /* silently ignore */
    }
  }, [isOnline, refreshQueueSize]);

  useEffect(() => {
    refreshQueueSize();

    const handleOnline = async () => {
      setIsOnline(true);
      // Drena automaticamente quando volta a estar online.
      try {
        await drainOfflineQueue();
        await refreshQueueSize();
      } catch { /* ignore */ }
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshQueueSize]);

  return { isOnline, queueSize, drainQueue };
}
