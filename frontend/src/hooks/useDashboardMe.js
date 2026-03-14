/**
 * Hook para payload completo do dashboard personalizado
 * GET /api/dashboard/me - perfil + KPIs + insights + preferências
 */
import { useState, useEffect, useCallback } from 'react';
import { dashboard } from '../services/api';

export function useDashboardMe(options = {}) {
  const { ttlMs = 2 * 60 * 1000, enabled = true } = options;
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMe = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const r = await dashboard.getMe();
      if (r?.data) setPayload(r.data);
    } catch (e) {
      setError(e);
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const trackInteraction = useCallback((eventType, entityType, entityId, context = {}) => {
    const uid = payload?.user_context ? JSON.parse(localStorage.getItem('impetus_user') || '{}')?.id : null;
    const cid = payload?.user_context ? JSON.parse(localStorage.getItem('impetus_user') || '{}')?.company_id : null;
    if (uid && cid) {
      dashboard.trackInteraction(eventType, entityType, entityId, context).catch(() => {});
    }
  }, [payload]);

  return {
    payload,
    loading,
    error,
    refetch: fetchMe,
    trackInteraction
  };
}
