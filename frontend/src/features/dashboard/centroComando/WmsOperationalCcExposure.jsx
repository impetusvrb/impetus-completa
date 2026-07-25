/**
 * UX-001 — Exposição operacional WMS no Centro de Comando (Presentation Layer).
 * Executivo/cognitivo preservado — card com resumo KPI + acção workspace.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import {
  isWmsCcExposureActive,
  WMS_CC_OPERATIONAL_EXPOSURE
} from '../../../domains/logistics-operational/routes/wmsCommandCenterRegistry.js';
import { useWmsOperationalSummary } from '../../../presentation/hooks/useWmsOperationalSummary.js';

const mono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase'
};

function KpiCell({ label, value }) {
  return (
    <div style={{ flex: '1 1 72px', minWidth: 72 }}>
      <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--cyan)' }}>{value ?? '—'}</div>
    </div>
  );
}

export default function WmsOperationalCcExposure() {
  const active = isWmsCcExposureActive();
  const { stats, loading, error, syncedAt, reload } = useWmsOperationalSummary({ enabled: active });

  if (!active) return null;

  const syncLabel = syncedAt
    ? new Date(syncedAt).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  return (
    <div
      className="cc-widget cc-kpi"
      style={{ minHeight: 140, gridColumn: 'span 2' }}
      data-wms-operational-cc-exposure
      data-ux-presentation="UX-001"
    >
      <div className="cc-kpi__header">
        <span>Logística Operacional</span>
        <span style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>
          {WMS_CC_OPERATIONAL_EXPOSURE.api_phase} · resumo
        </span>
      </div>

      <p style={{ ...mono, color: 'var(--text-tertiary)', margin: '6px 0 10px' }}>
        Resumo operacional · WMS-003 v1 · sem lógica cognitiva
      </p>

      {loading && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
          A sincronizar…
        </p>
      )}
      {error && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)' }}>{error}</p>
      )}

      {!loading && !error && stats && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
          <KpiCell label="Armazéns" value={stats.warehouses} />
          <KpiCell label="Inventário" value={stats.inventory} />
          <KpiCell label="Receb." value={stats.receiving} />
          <KpiCell label="Picking" value={stats.picking} />
          <KpiCell label="Exped." value={stats.shipping} />
          <KpiCell label="Transf." value={stats.transfers} />
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 }}>
        <Link
          to={WMS_CC_OPERATIONAL_EXPOSURE.workspace_path}
          className="btn btn-ghost"
          style={{ borderRadius: 4, fontSize: 12 }}
        >
          Abrir Workspace
        </Link>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ borderRadius: 4, fontSize: 11, opacity: 0.85 }}
          onClick={reload}
          disabled={loading}
        >
          Actualizar
        </button>
        <span style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>
          sync {syncLabel}
        </span>
      </div>
    </div>
  );
}
