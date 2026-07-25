import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';
import { PICKING_INTEGRATION_CONTRACTS } from './pickingIntegrationContracts.js';

export default function PickingOperationalIntelligencePanel({ intelligence }) {
  if (!intelligence) return null;

  const cards = [
    { id: 'belowMin', label: intelligence.labels?.belowMin || 'Congestionamento operadores', count: intelligence.counts.belowMin, color: 'var(--amber)' },
    { id: 'critical', label: intelligence.labels?.critical || 'Produtos mais colectados', count: intelligence.counts.critical, color: 'var(--cyan)' },
    { id: 'noMovement', label: intelligence.labels?.noMovement || 'Rotas mais longas', count: intelligence.counts.noMovement, color: 'var(--orange)' },
    { id: 'divergences', label: intelligence.labels?.divergences || 'Divergências recorrentes', count: intelligence.counts.divergences, color: 'var(--red)' },
    { id: 'stagnant', label: 'Produtividade turno', count: `${intelligence.counts.shiftMorning}/${intelligence.counts.shiftAfternoon}/${intelligence.counts.shiftNight}`, color: 'var(--text-secondary)', isText: true },
    { id: 'ruptureTrend', label: intelligence.labels?.ruptureTrend || 'SLA por operador', count: intelligence.counts.ruptureTrend, color: 'var(--red)' }
  ];

  return (
    <section className="picking-intelligence-panel" data-picking-intelligence="operational">
      <h3 style={{ ...mono, color: 'var(--cyan)', margin: 0, fontSize: 11 }}>Inteligência operacional · order fulfillment</h3>
      <p style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, margin: '6px 0 0' }}>
        1ª etapa atendimento pedidos · contratos: {Object.keys(PICKING_INTEGRATION_CONTRACTS).join(', ')}
      </p>
      <div className="picking-intelligence-grid">
        {cards.map((c) => (
          <div key={c.id} className="picking-intel-card">
            <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>{c.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: c.isText ? 14 : 22, color: c.isText ? 'var(--text-secondary)' : c.count > 0 ? c.color : 'var(--green)' }}>
              {c.count}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
