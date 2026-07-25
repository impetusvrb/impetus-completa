import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';
import { SHIPPING_INTEGRATION_CONTRACTS } from './shippingIntegrationContracts.js';

export default function ShippingDetailsPanel({
  open,
  row,
  onClose,
  onStartLoading,
  onDispatch,
  busy = false,
  pickingCandidates = []
}) {
  if (!open || !row) return null;

  const meta = row._order?.metadata || {};
  const volumes = meta.volumes || meta.load_units || [];
  const lines = meta.ship_lines || meta.pick_lines || meta.lines || [];

  const fields = [
    ['Ordem', row.order_number],
    ['Transportadora', row.carrier],
    ['Carga', row.load_id],
    ['Veículo', row.vehicle],
    ['Doca saída', row.outbound_dock],
    ['Armazém', row.warehouse],
    ['Ref. picking', row.picking_ref],
    ['Status', row.operational_status_label],
    ['Volumes', row.volume_count],
    ['Ocupação carga', row.load_occupancy],
    ['Operador', row.operator],
    ['Divergência', row.divergence ? 'Sim' : 'Não']
  ];

  const docChecks = [
    ['Conferência volumes', meta.volume_check_ok != null ? (meta.volume_check_ok ? 'OK' : 'Pendente') : '—'],
    ['Conferência documental', meta.document_check_ok != null ? (meta.document_check_ok ? 'OK' : 'Pendente') : '—'],
    ['Aprovação final', meta.final_approval != null ? (meta.final_approval ? 'OK' : 'Pendente') : '—']
  ];

  return (
    <aside
      className="shipping-details-panel impetus-card"
      role="region"
      aria-label="Detalhes expedição"
      style={{ padding: '1rem', borderRadius: 4, borderLeft: '3px solid var(--cyan)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ ...mono, color: 'var(--cyan)' }}>Expedição · {row.order_number}</span>
        <button type="button" className="btn btn-ghost" style={{ borderRadius: 4, fontSize: 11 }} onClick={onClose}>
          Fechar
        </button>
      </div>

      <h4 style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, margin: '0 0 6px' }}>Conferência final</h4>
      <dl className="shipping-details-grid" style={{ marginBottom: 12 }}>
        {docChecks.map(([label, value]) => (
          <div key={label}>
            <dt style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>{label}</dt>
            <dd style={{ margin: '2px 0 0', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{value}</dd>
          </div>
        ))}
      </dl>

      <h4 style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, margin: '0 0 6px' }}>Volumes / linhas</h4>
      {volumes.length === 0 && lines.length === 0 ? (
        <p style={{ ...mono, fontSize: 10, color: 'var(--text-tertiary)' }}>Sem volumes em metadata</p>
      ) : (
        <ul style={{ margin: '0 0 12px', paddingLeft: 16, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
          {(volumes.length ? volumes : lines).map((v, i) => (
            <li key={i}>
              {v.type || 'volume'} · {v.item_code || v.item_id?.slice(0, 8) || '—'} · {v.qty ?? v.quantity ?? 1}
              {v.substitution ? ' · substituição' : ''}
              {v.shortage ? ' · falta' : ''}
            </li>
          ))}
        </ul>
      )}

      {pickingCandidates.length > 0 && !meta.picking_order_id && (
        <p style={{ ...mono, fontSize: 9, color: 'var(--amber)', marginBottom: 8 }}>
          Picking concluídos disponíveis: {pickingCandidates.length}
        </p>
      )}

      <dl className="shipping-details-grid">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>{label}</dt>
            <dd style={{ margin: '2px 0 0', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{value ?? '—'}</dd>
          </div>
        ))}
      </dl>

      <p style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)', marginTop: 10 }}>
        Picking: {SHIPPING_INTEGRATION_CONTRACTS.picking.status} · Inventário: {SHIPPING_INTEGRATION_CONTRACTS.inventory.status}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {row.api_status !== 'shipped' && onStartLoading && (
          <button type="button" className="btn btn-ghost" style={{ borderRadius: 4, fontSize: 11, borderColor: 'var(--cyan)' }} disabled={busy} onClick={() => onStartLoading(row._order)}>
            {busy ? 'A processar…' : 'Iniciar carregamento'}
          </button>
        )}
        {row.api_status !== 'shipped' && onDispatch && (
          <button type="button" className="btn btn-ghost" style={{ borderRadius: 4, fontSize: 11, borderColor: 'var(--green)' }} disabled={busy} onClick={() => onDispatch(row._order)}>
            {busy ? 'A expedir…' : 'Expedir → Inventário'}
          </button>
        )}
      </div>
    </aside>
  );
}
