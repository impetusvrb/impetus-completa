import React from 'react';
import './DataLineageBlock.css';

function normalizeLineageItem(raw, i) {
  if (!raw || typeof raw !== 'object') return null;
  const entity = raw.entity ?? raw.entidade ?? 'Dado';
  const origin = raw.origin ?? raw.fonte_tecnica ?? raw.source ?? '—';
  const freshness = raw.freshness ?? raw.frescura ?? '—';
  let rel = raw.reliability_score;
  if (rel == null && raw.fiabilidade_0_100 != null) rel = raw.fiabilidade_0_100;
  const reliability_score =
    typeof rel === 'number' && !Number.isNaN(rel) ? Math.max(0, Math.min(100, Math.round(rel))) : null;
  return { entity, origin, freshness, reliability_score, key: `${i}-${entity}`.slice(0, 120) };
}

/**
 * Secção «Origem dos Dados» — selos de procedência (data_lineage do explanation_layer ou trace).
 * @param {'dark'|'light'} variant — tema do cartão (admin claro vs. modais escuros).
 */
export default function DataLineageBlock({
  items,
  className = '',
  title = 'Origem dos Dados',
  variant = 'dark',
  showHint = true
}) {
  const list = Array.isArray(items) ? items.map(normalizeLineageItem).filter(Boolean) : [];
  if (!list.length) return null;

  const rootClass = ['impetus-data-lineage', variant === 'light' && 'impetus-data-lineage--light', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass}>
      <div className="impetus-data-lineage__title">{title}</div>
      {showHint ? (
        <p className="impetus-data-lineage__hint">
          Cada entrada indica de onde veio a informação e quão recente é — para auditoria e confiança na resposta.
        </p>
      ) : null}
      <ul className="impetus-data-lineage__list">
        {list.map((row) => (
          <li key={row.key} className="impetus-data-lineage__card">
            <div className="impetus-data-lineage__entity">{row.entity}</div>
            <div className="impetus-data-lineage__origin">{row.origin}</div>
            <div className="impetus-data-lineage__meta">
              <span className="impetus-data-lineage__pill impetus-data-lineage__pill--fresh">{row.freshness}</span>
              {row.reliability_score != null && (
                <span
                  className="impetus-data-lineage__pill impetus-data-lineage__pill--score"
                  title="Nível de confiança na integridade desta fonte (0 a 100)"
                >
                  Fiabilidade {row.reliability_score}/100
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
