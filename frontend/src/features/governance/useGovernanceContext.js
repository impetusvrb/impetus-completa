/**
 * useGovernanceContext
 *
 * Hook análogo ao `useDashboardContext` — mas para o Context Governance
 * Dashboard (Phase 4). Consome `GET /dashboard/v2/governance/snapshot`
 * e expõe um estado consolidado para a UI.
 *
 * Princípios:
 *   - usa o cliente axios partilhado (`services/api.js`)
 *   - emite eventos `governance.trackInteraction` para telemetria
 *   - tolerante a 503 (governance_unavailable / governance_disabled)
 *   - tolerante a 403 (não-admin) — devolve `{ available: false }`
 */
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import api from '../../services/api';

const POLL_DEFAULT_MS = 60_000; // 1 min

export function useGovernanceContext({ autoRefreshMs = POLL_DEFAULT_MS, includeUsersBreakdown = false } = {}) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [available, setAvailable] = useState(true);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const intervalRef = useRef(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/dashboard/v2/governance/snapshot', {
        params: includeUsersBreakdown ? { users: 'true' } : {}
      });
      if (res?.data?.ok === false) {
        setSnapshot(null);
        setAvailable(false);
        setError(res?.data?.error || 'governance_unavailable');
      } else {
        setSnapshot(res?.data || null);
        setAvailable(true);
      }
      setLastFetchedAt(new Date().toISOString());
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) {
        setAvailable(false);
        setError('forbidden');
        setSnapshot(null);
      } else if (status === 503) {
        setAvailable(false);
        setError('governance_disabled');
        setSnapshot(null);
      } else {
        setError(err?.response?.data?.error || err?.message || 'erro');
      }
    } finally {
      setLoading(false);
    }
  }, [includeUsersBreakdown]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefreshMs || autoRefreshMs <= 0) return undefined;
    intervalRef.current = setInterval(() => refresh(), autoRefreshMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefreshMs, refresh]);

  const summary = snapshot?.summary || null;

  return useMemo(() => ({
    snapshot,
    summary,
    loading,
    error,
    available,
    lastFetchedAt,
    refresh
  }), [snapshot, summary, loading, error, available, lastFetchedAt, refresh]);
}

export default useGovernanceContext;
