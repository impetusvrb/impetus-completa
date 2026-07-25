import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';
import { unavailableLabel } from './warehouseOperationalMessages.js';
import { computeOccupancy } from './warehouseTimelineUtils.js';

export default function WarehouseLocationsPanel({ locations = [], capacity }) {
  const occ = computeOccupancy(capacity, locations);

  return (
    <section className="warehouse-locations-panel" aria-label="Posições e ocupação">
      <div className="warehouse-occupancy-row">
        <div className="warehouse-occ-card">
          <span style={{ ...mono, fontSize: 10, color: 'var(--text-tertiary)' }}>Utilizada</span>
          <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>{occ.used}</strong>
        </div>
        <div className="warehouse-occ-card">
          <span style={{ ...mono, fontSize: 10, color: 'var(--text-tertiary)' }}>Livre</span>
          <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>
            {occ.free != null ? occ.free : unavailableLabel()}
          </strong>
        </div>
        <div className="warehouse-occ-card">
          <span style={{ ...mono, fontSize: 10, color: 'var(--text-tertiary)' }}>Ocupação</span>
          <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>
            {occ.pct != null ? `${occ.pct}%` : unavailableLabel()}
          </strong>
        </div>
      </div>

      <h4 style={{ ...mono, color: 'var(--text-tertiary)', margin: '12px 0 6px', fontSize: 10 }}>
        Posições ({locations.length})
      </h4>
      {locations.length === 0 ? (
        <p style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>Sem posições registadas para este armazém.</p>
      ) : (
        <div style={{ maxHeight: 160, overflow: 'auto' }}>
          <table className="data-table" style={{ width: '100%', fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', color: 'var(--text-tertiary)' }}>Código</th>
                <th style={{ textAlign: 'left', color: 'var(--text-tertiary)' }}>Tipo</th>
                <th style={{ textAlign: 'left', color: 'var(--text-tertiary)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {locations.slice(0, 50).map((loc) => (
                <tr key={loc.id}>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{loc.address_code || loc.code || loc.id}</td>
                  <td>{loc.address_type || loc.location_type || '—'}</td>
                  <td>{loc.status || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
