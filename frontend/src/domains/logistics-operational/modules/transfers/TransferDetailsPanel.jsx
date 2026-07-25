import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';
import { TRANSFER_INTEGRATION_CONTRACTS, TRANSFER_LAYER_PRINCIPLE } from './transferIntegrationContracts.js';

export default function TransferDetailsPanel({
  open,
  row,
  onClose,
  onStartExecution,
  onComplete,
  busy = false
}) {
  if (!open || !row) return null;

  const meta = row._order?.metadata || {};
  const lines = meta.transfer_lines || meta.lines || [];

  const fields = [
    ['Ordem', row.order_number],
    ['Tipo interno', row.internal_type_label],
    ['Origem', row.from_warehouse],
    ['Destino', row.to_warehouse],
    ['Zona orig.', row.zone_from],
    ['Zona dest.', row.zone_to],
    ['Bin orig.', row.bin_from],
    ['Bin dest.', row.bin_to],
    ['Status', row.operational_status_label],
    ['Qtd total', row.qty_total],
    ['Operador', row.operator],
    ['Prioridade', row.priority],
    ['Divergência', row.divergence ? 'Sim' : 'Não'],
    ['Excepção', row.exception ? 'Sim' : 'Não']
  ];

  const canStart = ['planned', 'released'].includes(row.operational_status);
  const canComplete = ['executing', 'paused'].includes(row.operational_status);

  return (
    <aside
      className="transfer-details-panel impetus-card"
      role="region"
      aria-label="Detalhes transferência"
      style={{ padding: '1rem', borderRadius: 4, borderLeft: '3px solid var(--cyan)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ ...mono, color: 'var(--cyan)' }}>Transfer · {row.order_number}</span>
        <button type="button" className="btn btn-ghost" style={{ borderRadius: 4, fontSize: 11 }} onClick={onClose}>
          Fechar
        </button>
      </div>

      <p style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)', margin: '0 0 10px' }}>
        {TRANSFER_LAYER_PRINCIPLE.role} · {TRANSFER_INTEGRATION_CONTRACTS.inventory.invariant}
      </p>

      <dl className="transfer-details-grid">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>{label}</dt>
            <dd style={{ margin: '2px 0 0', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{value}</dd>
          </div>
        ))}
      </dl>

      {lines.length > 0 && (
        <>
          <h4 style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, margin: '12px 0 6px' }}>Linhas</h4>
          <ul style={{ margin: 0, paddingLeft: 16, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
            {lines.map((l, i) => (
              <li key={i}>
                {l.item_id?.slice(0, 8) || '—'} · {l.quantity ?? l.qty ?? '—'} {l.uom || ''}
              </li>
            ))}
          </ul>
        </>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        {canStart && (
          <button type="button" className="btn" style={{ borderRadius: 4 }} disabled={busy} onClick={() => onStartExecution?.(row._order)}>
            Iniciar execução
          </button>
        )}
        {canComplete && (
          <button type="button" className="btn" style={{ borderRadius: 4 }} disabled={busy} onClick={() => onComplete?.(row._order)}>
            Concluir transferência
          </button>
        )}
      </div>
    </aside>
  );
}
