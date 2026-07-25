import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';
import { RECEIVING_INTEGRATION_CONTRACTS } from './receivingIntegrationContracts.js';

export default function ReceivingDetailsPanel({ open, row, onClose, onComplete, completing = false }) {
  if (!open || !row) return null;

  const meta = row._order?.metadata || {};
  const lines = meta.lines || meta.receipt_lines || [];

  const fields = [
    ['Documento', row.order_number],
    ['ASN', row.asn_number],
    ['Fornecedor', row.supplier],
    ['Pedido compra', row.po_number],
    ['Doca', row.dock],
    ['Armazém', row.warehouse],
    ['Status operacional', row.operational_status_label],
    ['Qtd. prevista', row.qty_expected],
    ['Qtd. recebida', row.qty_received],
    ['Previsão', row.expected_at],
    ['Inspeção pendente', row.inspection_pending ? 'Sim' : 'Não'],
    ['Quarentena', row.quarantine ? 'Sim' : 'Não'],
    ['Divergência', row.divergence ? 'Sim' : 'Não']
  ];

  const docChecks = [
    ['Nota fiscal', meta.invoice_valid != null ? (meta.invoice_valid ? 'OK' : 'Pendente') : '—'],
    ['ASN documental', meta.asn_valid != null ? (meta.asn_valid ? 'OK' : 'Pendente') : '—'],
    ['Pedido', meta.po_valid != null ? (meta.po_valid ? 'OK' : 'Pendente') : '—'],
    ['Certificados', meta.certificates_ok != null ? (meta.certificates_ok ? 'OK' : 'Pendente') : '—']
  ];

  return (
    <aside
      className="receiving-details-panel impetus-card"
      role="region"
      aria-label="Detalhes do recebimento"
      style={{ padding: '1rem', borderRadius: 4, borderLeft: '3px solid var(--cyan)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ ...mono, color: 'var(--cyan)' }}>Recebimento · {row.asn_number}</span>
        <button type="button" className="btn btn-ghost" style={{ borderRadius: 4, fontSize: 11 }} onClick={onClose}>
          Fechar
        </button>
      </div>

      <h4 style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, margin: '0 0 6px' }}>Conferência documental</h4>
      <dl className="receiving-details-grid" style={{ marginBottom: 12 }}>
        {docChecks.map(([label, value]) => (
          <div key={label}>
            <dt style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>{label}</dt>
            <dd style={{ margin: '2px 0 0', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{value}</dd>
          </div>
        ))}
      </dl>

      <h4 style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, margin: '0 0 6px' }}>Conferência física · linhas</h4>
      {lines.length === 0 ? (
        <p style={{ ...mono, fontSize: 10, color: 'var(--text-tertiary)' }}>Sem linhas registadas em metadata.lines</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 16, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
          {lines.map((l, i) => (
            <li key={i}>
              {l.item_code || l.item_id?.slice(0, 8)} · {l.quantity_received ?? l.quantity} {l.uom || 'un'}
              {l.lot_number ? ` · lote ${l.lot_number}` : ''}
              {l.damage ? ' · avaria' : ''}
            </li>
          ))}
        </ul>
      )}

      <dl className="receiving-details-grid" style={{ marginTop: 12 }}>
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>{label}</dt>
            <dd style={{ margin: '2px 0 0', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{value ?? '—'}</dd>
          </div>
        ))}
      </dl>

      <p style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)', marginTop: 10 }}>
        Integração Qualidade: {RECEIVING_INTEGRATION_CONTRACTS.quality.status} · Inventário: {RECEIVING_INTEGRATION_CONTRACTS.inventory.status}
      </p>

      {row.api_status !== 'completed' && onComplete && (
        <button
          type="button"
          className="btn btn-ghost"
          style={{ borderRadius: 4, fontSize: 11, marginTop: 10, borderColor: 'var(--cyan)' }}
          disabled={completing}
          onClick={() => onComplete(row._order)}
        >
          {completing ? 'A concluir…' : 'Concluir recebimento → Inventário'}
        </button>
      )}
    </aside>
  );
}
