import { useCallback, useEffect, useState } from 'react';
import { logWmsUiEvent } from '../services/wmsUiObservability.js';

export function useWmsModuleData(moduleId, fetcher) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetcher();
      setData(res);
      logWmsUiEvent({ event: 'API_OK', module: moduleId });
    } catch (e) {
      setError(e.message);
      logWmsUiEvent({ event: 'API_ERROR', module: moduleId, error: e.message });
    } finally {
      setLoading(false);
    }
  }, [moduleId, fetcher]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

export function extractRows(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.items)) return payload.data.items;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}
