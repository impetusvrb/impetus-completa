import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';
import { INVENTORY_INTEGRATION_CONTRACTS } from './inventoryIntegrationContracts.js';

/**
 * OPM-002A — Inteligência operacional (heurísticas locais; IA Cognitiva — OPM-008).
 */
export default function InventoryOperationalIntelligencePanel({ intelligence }) {
  if (!intelligence) return null;

  const cards = [
    { id: 'belowMin', label: 'Abaixo do mínimo', count: intelligence.counts.belowMin, color: 'var(--amber)' },
    { id: 'divergences', label: 'Divergências', count: intelligence.counts.divergences, color: 'var(--red)' },
    { id: 'noMovement', label: 'Sem movimentação', count: intelligence.counts.noMovement, color: 'var(--text-secondary)' },
    { id: 'critical', label: 'Produtos críticos', count: intelligence.counts.critical, color: 'var(--red)' },
    { id: 'stagnant', label: 'Estoque parado', count: intelligence.counts.stagnant, color: 'var(--amber)' },
    { id: 'ruptureTrend', label: 'Tendência ruptura', count: intelligence.counts.ruptureTrend, color: 'var(--orange)' }
  ];

  return (
    <section className="inventory-intelligence-panel" data-inventory-intelligence="operational">
      <h3 style={{ ...mono, color: 'var(--cyan)', margin: 0, fontSize: 11 }}>Inteligência operacional · inventário</h3>
      <p style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, margin: '6px 0 0' }}>
        Heurísticas WMS-003 · integração CC reservada · contratos: {Object.keys(INVENTORY_INTEGRATION_CONTRACTS).join(', ')}
      </p>
      <div className="inventory-intelligence-grid">
        {cards.map((c) => (
          <div key={c.id} className="inventory-intel-card">
            <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>{c.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: c.count > 0 ? c.color : 'var(--green)' }}>{c.count}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
