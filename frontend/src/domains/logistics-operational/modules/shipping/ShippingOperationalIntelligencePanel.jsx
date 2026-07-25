import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';
import { SHIPPING_INTEGRATION_CONTRACTS } from './shippingIntegrationContracts.js';

export default function ShippingOperationalIntelligencePanel({ intelligence }) {
  if (!intelligence) return null;

  const cards = [
    { id: 'belowMin', label: intelligence.labels?.belowMin || 'Atraso expedição', count: intelligence.counts.belowMin, color: 'var(--amber)' },
    { id: 'noMovement', label: intelligence.labels?.noMovement || 'Utilização docas', count: intelligence.counts.noMovement, color: 'var(--orange)' },
    { id: 'divergences', label: intelligence.labels?.divergences || 'Divergências transportadora', count: intelligence.counts.divergences, color: 'var(--red)' },
    { id: 'critical', label: intelligence.labels?.critical || 'Produtividade operador', count: intelligence.counts.critical, color: 'var(--cyan)' },
    { id: 'stagnant', label: intelligence.labels?.stagnant || 'Docas congestionadas', count: intelligence.counts.stagnant, color: 'var(--amber)' },
    { id: 'ruptureTrend', label: intelligence.labels?.ruptureTrend || 'SLA cliente', count: intelligence.counts.ruptureTrend, color: 'var(--red)' }
  ];

  return (
    <section className="shipping-intelligence-panel" data-shipping-intelligence="operational">
      <h3 style={{ ...mono, color: 'var(--cyan)', margin: 0, fontSize: 11 }}>Inteligência operacional · outbound logistics</h3>
      <p style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, margin: '6px 0 0' }}>
        Conclusão order fulfillment · contratos: {Object.keys(SHIPPING_INTEGRATION_CONTRACTS).join(', ')}
      </p>
      <div className="shipping-intelligence-grid">
        {cards.map((c) => (
          <div key={c.id} className="shipping-intel-card">
            <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>{c.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: c.count > 0 ? c.color : 'var(--green)' }}>{c.count}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
