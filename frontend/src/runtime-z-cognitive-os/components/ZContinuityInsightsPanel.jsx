import React from 'react';
import useCognitiveOsData from '../runtime/useCognitiveOsData';
import { formatScore, scoreClass, shortenText } from '../runtime/cognitiveOsFormatters';
import '../styles/cognitiveOs.css';

export default function ZContinuityInsightsPanel({ payload }) {
  const data = useCognitiveOsData(payload);
  if (!data.available) return null;

  const c = data.continuity || {};
  const inherited = c.inherited_context;
  const conv = c.conversation || {};

  return (
    <section className="z-cog-panel" aria-label="Continuidade cognitiva">
      <header className="z-cog-panel__header">
        <h3 className="z-cog-panel__title">Continuidade Cognitiva</h3>
        <span className={`z-cog-panel__subtitle ${scoreClass(c.continuation_score)}`}>
          score {formatScore(c.continuation_score)}
        </span>
      </header>

      <div className="z-cog-panel__body">
        {inherited ? (
          <div className="z-cog-narrative">
            Contexto herdado: <strong>{shortenText(inherited.summary, 140)}</strong>
            {Array.isArray(inherited.anchors) && inherited.anchors.length > 0 && (
              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {inherited.anchors.slice(0, 6).map((a) => (
                  <span key={a} className="z-cog-badge">{a}</span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="z-cog-empty">Sem contexto herdado · aguardando interacção</div>
        )}

        <div className="z-cog-row">
          <span className="z-cog-label">Turns recentes (1h)</span>
          <span className="z-cog-value">{conv.recent_turns_count || 0}</span>
        </div>
        <div className="z-cog-row">
          <span className="z-cog-label">Continuidade conversacional</span>
          <span className="z-cog-value">{conv.has_continuity ? 'sim' : 'não'}</span>
        </div>
        <div className="z-cog-row">
          <span className="z-cog-label">Continuidade operacional</span>
          <span className="z-cog-value">{c.operational?.has_operational_continuity ? 'sim' : 'não'}</span>
        </div>
      </div>
    </section>
  );
}
