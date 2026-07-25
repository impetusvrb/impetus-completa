/**
 * FIN-EVOLVE-2.4 — Official prediction vs user What-if comparison.
 */
import React, { useEffect, useMemo } from 'react';
import { comparePredictionWithWhatIf } from '../timeline/financialPredictionTimeline.js';
import { trackPredictionCompared } from '../observability/financePredictionObservability.js';

const mono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.07em',
  textTransform: 'uppercase'
};

export default function PredictionWhatIfComparisonPanel({
  predictions = [],
  simulatedComparison = null
}) {
  const rows = useMemo(
    () => comparePredictionWithWhatIf(predictions, simulatedComparison),
    [predictions, simulatedComparison]
  );

  useEffect(() => {
    if (rows.length) {
      trackPredictionCompared({
        count: rows.length,
        scenarioId: simulatedComparison?.scenarioId || null
      });
    }
  }, [rows.length, simulatedComparison?.scenarioId]);

  return (
    <section
      className="impetus-card"
      style={{
        padding: '1rem',
        borderRadius: 4,
        border: '1px solid var(--border-subtle)',
        marginTop: '0.75rem'
      }}
    >
      <p style={{ ...mono, color: 'var(--cyan)', margin: '0 0 5px' }}>
        forecast_prediction × simulated_scenario
      </p>
      <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>Previsão oficial vs What-if</h3>
      {!simulatedComparison && (
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: 0 }}>
          Calcule um cenário para compará-lo com a previsão oficial.
        </p>
      )}
      {simulatedComparison && !rows.length && (
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: 0 }}>
          Sem alvos coincidentes disponíveis para comparação.
        </p>
      )}
      {rows.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', fontSize: 12 }}>
            <thead>
              <tr>
                <th>Alvo</th>
                <th>Previsto</th>
                <th>Simulado</th>
                <th>Diferença</th>
                <th>Confiança</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.target}>
                  <td>{row.label}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>
                    {row.predicted}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>
                    {row.simulated}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{row.difference}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>
                    {(Number(row.confidence) * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ ...mono, color: 'var(--text-tertiary)', margin: '10px 0 0' }}>
        Previsão e simulação permanecem conceitos distintos
      </p>
    </section>
  );
}

