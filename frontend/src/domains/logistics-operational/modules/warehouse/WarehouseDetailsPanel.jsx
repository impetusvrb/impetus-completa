import React, { useMemo, useState } from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';
import { formatWarehouseDetailFields } from './useWarehouseDetail.js';
import { toWarehouseOperationalMessage } from './warehouseOperationalMessages.js';
import WarehouseLocationsPanel from './WarehouseLocationsPanel.jsx';
import WarehouseMovementsPanel from './WarehouseMovementsPanel.jsx';
import WarehouseWorkflowShell from './WarehouseWorkflowShell.jsx';

const TABS = Object.freeze([
  { id: 'resumo', label: 'Resumo' },
  { id: 'posicoes', label: 'Posições' },
  { id: 'movimentos', label: 'Movimentações' },
  { id: 'workflow', label: 'Workflow' }
]);

export default function WarehouseDetailsPanel({ open, warehouse, detailState, movements = [], onClose }) {
  const [tab, setTab] = useState('resumo');

  if (!open || !warehouse) return null;

  const { detail, capacity, locations, loading, error } = detailState;
  const fields = useMemo(() => formatWarehouseDetailFields(detail, capacity, locations), [detail, capacity, locations]);

  return (
    <aside
      className="warehouse-details-panel impetus-card"
      data-warehouse-details-open={open}
      role="region"
      aria-label="Detalhes do armazém"
      style={{
        marginTop: 12,
        padding: '1rem',
        borderRadius: 4,
        borderLeft: '3px solid var(--cyan)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ ...mono, color: 'var(--cyan)' }}>Armazém · {warehouse.code || warehouse.name}</span>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ borderRadius: 4, fontSize: 11 }}
          onClick={onClose}
          aria-label="Fechar painel de detalhes"
        >
          Fechar
        </button>
      </div>

      <div className="warehouse-details-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`btn btn-ghost warehouse-tab ${tab === t.id ? 'warehouse-tab--active' : ''}`}
            style={{ borderRadius: 4, fontSize: 10 }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <p style={{ ...mono, color: 'var(--text-secondary)', fontSize: 11, marginTop: 10 }}>A carregar detalhes…</p>
      )}
      {!loading && error && (
        <p style={{ ...mono, color: 'var(--amber)', fontSize: 11, marginTop: 10 }}>
          {toWarehouseOperationalMessage('detail_load_failed')}
        </p>
      )}

      {!loading && !error && tab === 'resumo' && (
        <>
          <dl className="warehouse-details-grid" style={{ marginTop: 10 }}>
            {fields.map((f) => (
              <div key={f.label} className="warehouse-details-row">
                <dt style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>{f.label}</dt>
                <dd style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: 12, margin: '2px 0 8px' }}>
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
          {detail?.created_at && (
            <p style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9, marginTop: 8 }}>
              Registo desde {new Date(detail.created_at).toLocaleDateString('pt-BR')}
            </p>
          )}
        </>
      )}

      {!loading && !error && tab === 'posicoes' && (
        <WarehouseLocationsPanel locations={locations} capacity={capacity} />
      )}

      {!loading && !error && tab === 'movimentos' && (
        <WarehouseMovementsPanel movements={movements} warehouseId={warehouse.id} />
      )}

      {!loading && tab === 'workflow' && <WarehouseWorkflowShell />}
    </aside>
  );
}
