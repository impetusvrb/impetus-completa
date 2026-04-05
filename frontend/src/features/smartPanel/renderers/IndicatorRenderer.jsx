import React from 'react';

export default function IndicatorRenderer({ indicators = [], visualOnly = false }) {
  if (!indicators?.length) return null;
  return (
    <div className="smart-panel-visual__indicators">
      {!visualOnly && <h5 className="smart-panel-visual__block-title">Indicadores</h5>}
      <ul className="smart-panel-visual__indicator-list">
        {indicators.map((ind, i) => (
          <li key={i} className={`smart-panel-visual__indicator smart-panel-visual__indicator--${ind.level || 'ok'}`}>
            <span className="smart-panel-visual__indicator-dot" aria-hidden />
            <span className="smart-panel-visual__indicator-label">{ind.label}</span>
            <span className="smart-panel-visual__indicator-value">{ind.value}</span>
            {typeof ind.progress === 'number' && (
              <div className="smart-panel-visual__progress">
                <div
                  className="smart-panel-visual__progress-bar"
                  style={{ width: `${Math.min(100, Math.max(0, ind.progress))}%` }}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
