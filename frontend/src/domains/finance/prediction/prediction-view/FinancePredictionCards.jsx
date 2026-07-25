/**
 * FIN-EVOLVE-2.4 — Finance prediction cards.
 */
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { filterDisplayableFinancialPredictions } from '../confidence/financialPredictionConfidence.js';
import { trackPredictionDisplayed } from '../observability/financePredictionObservability.js';

const mono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.07em',
  textTransform: 'uppercase'
};

function formatValue(value, unit) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  if (unit === '%') return `${Number(value).toFixed(1)}%`;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value));
}

function trendSymbol(trend) {
  if (trend === 'up') return '↑';
  if (trend === 'down') return '↓';
  if (trend === 'stable') return '→';
  return '·';
}

export default function FinancePredictionCards({
  predictions = [],
  loading = false,
  compact = false
}) {
  const displayable = filterDisplayableFinancialPredictions(predictions);

  useEffect(() => {
    if (displayable.length) {
      trackPredictionDisplayed({
        count: displayable.length,
        targets: displayable.map((prediction) => prediction.target)
      });
    }
  }, [displayable.length]);

  if (loading) {
    return (
      <p style={{ ...mono, color: 'var(--text-tertiary)' }}>
        A consultar platform.prediction.public_api.v1…
      </p>
    );
  }

  if (!displayable.length) {
    return (
      <p style={{ ...mono, color: 'var(--text-tertiary)' }}>
        Sem previsões certificadas disponíveis nesta sessão.
      </p>
    );
  }

  const visible = compact ? displayable.slice(0, 4) : displayable;
  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 8
        }}
      >
        {visible.map((prediction) => (
          <article
            key={prediction.prediction_id}
            className="impetus-card"
            style={{
              padding: '0.75rem',
              borderRadius: 4,
              border: '1px solid var(--border-subtle)',
              borderBottom: '2px solid var(--cyan)'
            }}
          >
            <p style={{ ...mono, color: 'var(--cyan)', margin: '0 0 5px' }}>
              forecast_prediction · {prediction.horizon}
            </p>
            <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>{prediction.label}</h4>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              <div style={{ color: 'var(--text-tertiary)' }}>
                Actual {formatValue(prediction.current_value, prediction.unit)}
              </div>
              <div style={{ color: 'var(--text-primary)', marginTop: 3 }}>
                Previsto {formatValue(prediction.predicted_value, prediction.unit)}{' '}
                <span style={{ color: 'var(--cyan)' }}>{trendSymbol(prediction.trend)}</span>
              </div>
              <div style={{ color: 'var(--green)', marginTop: 3 }}>
                Confiança {(Number(prediction.confidence_score) * 100).toFixed(0)}%
              </div>
            </div>
          </article>
        ))}
      </div>
      {compact && (
        <Link
          to="/app/finance/prediction"
          className="btn btn-ghost"
          style={{
            display: 'inline-block',
            marginTop: 10,
            borderRadius: 4,
            fontSize: 12,
            textDecoration: 'none'
          }}
        >
          Abrir detalhe das previsões
        </Link>
      )}
    </div>
  );
}

