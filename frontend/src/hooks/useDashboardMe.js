import { useState, useEffect, useCallback } from 'react';
import { dashboard } from '../services/api';

export function useDashboardMe({ enabled = true } = {}) {
  const [payload, setPayload] = useState(null);

  const refetch = useCallback(async () => {
    try {
      const r = await dashboard.getMe();
      if (r?.data) setPayload(r.data);
    } catch {
      setPayload(null);
    }
  }, []);

  useEffect(() => {
    if (enabled) refetch();
  }, [enabled, refetch]);

  return {
    payload,
    trackInteraction: (event_type, entity_type, entity_id, context) => {
      dashboard.trackInteraction(event_type, entity_type, entity_id, context).catch(() => {});
    },
    refetch,
  };
}
