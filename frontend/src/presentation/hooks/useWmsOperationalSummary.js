/**
 * UX-001 — Resumo operacional WMS para Centro de Comando (APIs WMS-003 v1 existentes).
 */
import { useCallback, useEffect, useState } from 'react';
import wmsV1Api from '../../domains/logistics-operational/services/wmsV1ApiClient.js';

function _count(r) {
  if (Array.isArray(r?.data)) return r.data.length;
  if (Array.isArray(r?.data?.items)) return r.data.items.length;
  return 0;
}

export function useWmsOperationalSummary({ enabled = true } = {}) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [syncedAt, setSyncedAt] = useState(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const [wh, rcv, pick, ship, xfer, items] = await Promise.all([
        wmsV1Api.listWarehouses().catch(() => ({ data: [] })),
        wmsV1Api.listReceiving().catch(() => ({ data: [] })),
        wmsV1Api.listPicking().catch(() => ({ data: [] })),
        wmsV1Api.listShipping().catch(() => ({ data: [] })),
        wmsV1Api.listTransfers().catch(() => ({ data: [] })),
        wmsV1Api.listItems().catch(() => ({ data: [] }))
      ]);
      setStats({
        warehouses: _count(wh),
        inventory: _count(items),
        receiving: _count(rcv),
        picking: _count(pick),
        shipping: _count(ship),
        transfers: _count(xfer)
      });
      setSyncedAt(new Date().toISOString());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  return Object.freeze({ stats, loading, error, syncedAt, reload });
}
