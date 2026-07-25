import React, { useCallback, useEffect, useState } from 'react';
import WmsModulePanel from '../components/WmsModulePanel.jsx';
import wmsV1Api from '../services/wmsV1ApiClient.js';
import { logWmsUiEvent } from '../services/wmsUiObservability.js';

const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' };

function Kpi({ label, value, color = 'var(--cyan)' }) {
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4, flex: '1 1 140px' }}>
      <div style={{ ...mono, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontFamily: 'var(--font-mono)', color }}>{value ?? '—'}</div>
    </div>
  );
}

export default function WmsOperationalDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    logWmsUiEvent({ event: 'DASHBOARD_LOAD' });
    try {
      const [wh, rcv, pick, ship, xfer, items] = await Promise.all([
        wmsV1Api.listWarehouses().catch(() => ({ data: [] })),
        wmsV1Api.listReceiving().catch(() => ({ data: [] })),
        wmsV1Api.listPicking().catch(() => ({ data: [] })),
        wmsV1Api.listShipping().catch(() => ({ data: [] })),
        wmsV1Api.listTransfers().catch(() => ({ data: [] })),
        wmsV1Api.listItems().catch(() => ({ data: [] }))
      ]);
      const count = (r) => (Array.isArray(r?.data) ? r.data.length : Array.isArray(r?.data?.items) ? r.data.items.length : 0);
      setStats({
        warehouses: count(wh),
        receiving: count(rcv),
        picking: count(pick),
        shipping: count(ship),
        transfers: count(xfer),
        items: count(items)
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <WmsModulePanel title="Dashboard Operacional" subtitle="WMS-003 v1 · dados reais" loading={loading} error={error}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <Kpi label="Armazéns" value={stats?.warehouses} />
        <Kpi label="Itens" value={stats?.items} color="var(--green)" />
        <Kpi label="Recebimentos" value={stats?.receiving} color="var(--amber)" />
        <Kpi label="Pickings" value={stats?.picking} />
        <Kpi label="Expedições" value={stats?.shipping} />
        <Kpi label="Transferências" value={stats?.transfers} color="var(--text-secondary)" />
      </div>
      <button type="button" className="btn btn-ghost" style={{ borderRadius: 4 }} onClick={load} disabled={loading}>
        Atualizar
      </button>
    </WmsModulePanel>
  );
}
