import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';

export default function PickingRoutePanel({ routes = [], onViewRoute }) {
  if (!routes.length) return null;

  return (
    <section className="picking-route-panel" data-picking-routes="operational">
      <h3 style={{ ...mono, color: 'var(--cyan)', margin: 0, fontSize: 11 }}>Rotas de separação · progresso</h3>
      <div className="picking-route-grid">
        {routes.slice(0, 6).map((r) => (
          <div key={r.orderId} className="picking-route-card">
            <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>{r.orderNumber}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--green)' }}>{r.progress}%</div>
            <div style={{ ...mono, fontSize: 9, color: 'var(--text-secondary)' }}>Zona: {r.zone}</div>
            <div style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)' }}>
              Paragens: {r.stops.length}
              {r.distanceM != null ? ` · ${r.distanceM}m` : ''}
            </div>
            {onViewRoute && (
              <button type="button" className="btn btn-ghost" style={{ borderRadius: 4, fontSize: 9, marginTop: 4 }} onClick={() => onViewRoute(r.orderId)}>
                Ver sequência
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
