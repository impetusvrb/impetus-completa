/**
 * FIN-EVOLVE-2.4 — Explicit three-lane Financial Twin perspective.
 */
import React, { useMemo, useState } from 'react';
import { composeFinancialTemporalPerspective } from './financialPredictionTimeline.js';

const mono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.07em',
  textTransform: 'uppercase'
};

const laneColors = {
  observed_fact: 'var(--green)',
  simulated_scenario: 'var(--amber)',
  forecast_prediction: 'var(--cyan)'
};

function formatValue(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

export default function FinanceTemporalPerspectivePanel({
  observed = {},
  simulatedComparison = null,
  predictions = []
}) {
  const perspective = useMemo(
    () =>
      composeFinancialTemporalPerspective({
        observed,
        simulatedComparison,
        predictions
      }),
    [observed, simulatedComparison, predictions]
  );
  const [activeLane, setActiveLane] = useState('observed_fact');
  const lane =
    perspective.lanes.find((item) => item.id === activeLane) || perspective.lanes[0];

  return (
    <section
      className="impetus-card"
      style={{
        padding: '1rem',
        borderRadius: 4,
        border: '1px solid var(--border-subtle)'
      }}
    >
      <p style={{ ...mono, color: 'var(--cyan)', margin: '0 0 8px' }}>
        Perspectiva temporal · três lanes certificadas
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {perspective.lanes.map((item) => (
          <button
            key={item.id}
            type="button"
            className="btn btn-ghost"
            onClick={() => setActiveLane(item.id)}
            style={{
              borderRadius: 4,
              fontSize: 11,
              borderColor:
                activeLane === item.id ? laneColors[item.id] : 'var(--border-subtle)',
              color: activeLane === item.id ? laneColors[item.id] : 'var(--text-secondary)'
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p style={{ ...mono, color: laneColors[lane.id], margin: '0 0 8px' }}>
        {lane.id}
      </p>
      {!lane.items.length && (
        <p style={{ color: 'var(--text-tertiary)', fontSize: 12, margin: 0 }}>
          Sem dados para esta lane nesta sessão.
        </p>
      )}
      {lane.items.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 8
          }}
        >
          {lane.items.slice(0, 8).map((item) => (
            <div
              key={`${lane.id}-${item.target}`}
              style={{
                padding: 8,
                border: '1px solid var(--border-subtle)',
                borderRadius: 4,
                background: 'var(--bg-tertiary)'
              }}
            >
              <div style={{ ...mono, color: 'var(--text-tertiary)' }}>{item.target}</div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: laneColors[lane.id],
                  marginTop: 4
                }}
              >
                {formatValue(item.value)}
              </div>
            </div>
          ))}
        </div>
      )}
      <p style={{ ...mono, color: 'var(--text-tertiary)', margin: '10px 0 0' }}>
        Lanes não são combinadas · Twin não é alterado
      </p>
    </section>
  );
}

