import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';
import { PICKING_INTEGRATION_CONTRACTS } from './pickingIntegrationContracts.js';
import { buildRouteView } from './pickingRouteUtils.js';

export default function PickingDetailsPanel({
  open,
  row,
  onClose,
  onStart,
  onComplete,
  onPause,
  busy = false,
  routeViewId = null
}) {
  if (!open || !row) return null;

  const meta = row._order?.metadata || {};
  const lines = meta.pick_lines || meta.lines || [];
  const route = routeViewId === row.id ? buildRouteView(row) : null;

  const fields = [
    ['Ordem', row.order_number],
    ['Onda', row.wave_id],
    ['Tipo', row.wave_type_label],
    ['Operador', row.operator],
    ['Zona', row.route_zone],
    ['Armazém', row.warehouse],
    ['Prioridade', row.priority],
    ['Status', row.operational_status_label],
    ['Progresso rota', row.route_progress],
    ['Distância est.', row.route_distance_m !== '—' ? `${row.route_distance_m} m` : '—'],
    ['Divergência', row.divergence ? 'Sim' : 'Não'],
    ['Excepção', row.exception ? 'Sim' : 'Não']
  ];

  return (
    <aside
      className="picking-details-panel impetus-card"
      role="region"
      aria-label="Detalhes ordem picking"
      style={{ padding: '1rem', borderRadius: 4, borderLeft: '3px solid var(--cyan)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ ...mono, color: 'var(--cyan)' }}>Picking · {row.order_number}</span>
        <button type="button" className="btn btn-ghost" style={{ borderRadius: 4, fontSize: 11 }} onClick={onClose}>
          Fechar
        </button>
      </div>

      {route && route.stops.length > 0 && (
        <>
          <h4 style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, margin: '0 0 6px' }}>Sequência de colecta</h4>
          <ol style={{ margin: '0 0 12px', paddingLeft: 18, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' }}>
            {route.stops.map((s) => (
              <li key={s.seq} style={{ color: s.done ? 'var(--green)' : 'var(--text-secondary)' }}>
                #{s.seq} {s.address} · {s.item} × {s.qty}
              </li>
            ))}
          </ol>
        </>
      )}

      <h4 style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, margin: '0 0 6px' }}>Linhas de separação</h4>
      {lines.length === 0 ? (
        <p style={{ ...mono, fontSize: 10, color: 'var(--text-tertiary)' }}>Sem linhas em metadata.pick_lines</p>
      ) : (
        <ul style={{ margin: '0 0 12px', paddingLeft: 16, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
          {lines.map((l, i) => (
            <li key={i}>
              {l.item_code || l.item_id?.slice(0, 8)} · {l.qty_picked ?? l.quantity} {l.uom || 'un'}
              {l.substitution ? ' · substituição' : ''}
              {l.stockout ? ' · falta estoque' : ''}
            </li>
          ))}
        </ul>
      )}

      <dl className="picking-details-grid">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>{label}</dt>
            <dd style={{ margin: '2px 0 0', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{value ?? '—'}</dd>
          </div>
        ))}
      </dl>

      <p style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)', marginTop: 10 }}>
        Inventário: {PICKING_INTEGRATION_CONTRACTS.inventory.status} · Shipping: {PICKING_INTEGRATION_CONTRACTS.shipping.status}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {row.api_status === 'open' || row.api_status === 'assigned' ? (
          <button type="button" className="btn btn-ghost" style={{ borderRadius: 4, fontSize: 11, borderColor: 'var(--cyan)' }} disabled={busy} onClick={() => onStart?.(row._order)}>
            {busy ? 'A processar…' : 'Iniciar picking'}
          </button>
        ) : null}
        {row.api_status === 'picking' && onPause ? (
          <button type="button" className="btn btn-ghost" style={{ borderRadius: 4, fontSize: 11 }} disabled={busy} onClick={() => onPause?.(row._order)}>
            Registar pausa
          </button>
        ) : null}
        {row.api_status !== 'completed' && row.api_status !== 'cancelled' && onComplete ? (
          <button type="button" className="btn btn-ghost" style={{ borderRadius: 4, fontSize: 11, borderColor: 'var(--green)' }} disabled={busy} onClick={() => onComplete?.(row._order)}>
            {busy ? 'A concluir…' : 'Concluir → Inventário'}
          </button>
        ) : null}
      </div>
    </aside>
  );
}
