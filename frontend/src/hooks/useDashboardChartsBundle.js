import { useState, useEffect } from 'react';
import { dashboardCache } from '../services/dashboardFetchCache';

/**
 * Bundle partilhado; se falhar, widgets podem usar cache individual (sem derrubar o dashboard).
 */
export default function useDashboardChartsBundle(enabled = true) {
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(!!enabled);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    dashboardCache
      .getChartsBundle()
      .then((data) => {
        if (!cancelled) setBundle(data);
      })
      .catch(() => {
        if (!cancelled) {
          setBundle(null);
          setError(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { bundle, loading, error };
}
