import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';
import { RECEIVING_INTEGRATION_CONTRACTS } from './receivingIntegrationContracts.js';

/**
 * OPM-003 — Inteligência operacional inbound (heurísticas WMS-003).
 */
export default function ReceivingOperationalIntelligencePanel({ intelligence }) {
  if (!intelligence) return null;

  const cards = [
    { id: 'belowMin', label: intelligence.labels?.belowMin || 'Atrasos fornecedor', count: intelligence.counts.belowMin, color: 'var(--amber)' },
    { id: 'divergences', label: intelligence.labels?.divergences || 'Divergências', count: intelligence.counts.divergences, color: 'var(--red)' },
    { id: 'noMovement', label: intelligence.labels?.noMovement || 'Gargalos doca', count: intelligence.counts.noMovement, color: 'var(--orange)' },
    { id: 'critical', label: intelligence.labels?.critical || 'Quarentena', count: intelligence.counts.critical, color: 'var(--red)' },
    { id: 'stagnant', label: intelligence.labels?.stagnant || 'Docas congestionadas', count: intelligence.counts.stagnant, color: 'var(--amber)' },
    { id: 'ruptureTrend', label: intelligence.labels?.ruptureTrend || 'SLA fornecedor', count: intelligence.counts.ruptureTrend, color: 'var(--orange)' }
  ];

  return (
    <section className="receiving-intelligence-panel" data-receiving-intelligence="operational">
      <h3 style={{ ...mono, color: 'var(--cyan)', margin: 0, fontSize: 11 }}>Inteligência operacional · inbound logistics</h3>
      <p style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, margin: '6px 0 0' }}>
        Porta de entrada WMS · contratos: {Object.keys(RECEIVING_INTEGRATION_CONTRACTS).join(', ')}
      </p>
      <div className="receiving-intelligence-grid">
        {cards.map((c) => (
          <div key={c.id} className="receiving-intel-card">
            <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>{c.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: c.count > 0 ? c.color : 'var(--green)' }}>{c.count}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
