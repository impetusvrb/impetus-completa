import React from 'react';
import useCognitiveOsData from '../runtime/useCognitiveOsData';
import { formatScore, scoreClass } from '../runtime/cognitiveOsFormatters';
import '../styles/cognitiveOs.css';

export default function ZOperationalNarrativePanel({ payload }) {
  const data = useCognitiveOsData(payload);
  if (!data.available) return null;
  const narr = data.narrative || {};
  const sentences = Array.isArray(narr.sentences) ? narr.sentences : [];

  return (
    <section className="z-cog-panel" aria-label="Narrativa operacional Z">
      <header className="z-cog-panel__header">
        <h3 className="z-cog-panel__title">Narrativa Operacional · Z</h3>
        <span className={`z-cog-panel__subtitle ${scoreClass(narr.cognitive_density)}`}>
          densidade {formatScore(narr.cognitive_density)}
        </span>
      </header>

      <div className="z-cog-panel__body">
        <div className="z-cog-narrative">
          {narr.narrative || 'Estado operacional estável.'}
        </div>
        {sentences.length > 0 && (
          <ul className="z-cog-list">
            {sentences.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ul>
        )}
        <div className="z-cog-row">
          <span className="z-cog-label">Modo</span>
          <span className="z-cog-badge z-cog-badge--green">assistive-only</span>
        </div>
      </div>
    </section>
  );
}
