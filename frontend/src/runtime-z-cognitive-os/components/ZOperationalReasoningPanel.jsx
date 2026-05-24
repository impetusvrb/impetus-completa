import React from 'react';
import useCognitiveOsData from '../runtime/useCognitiveOsData';
import { formatScore, scoreClass, badgeClassForLevel } from '../runtime/cognitiveOsFormatters';
import '../styles/cognitiveOs.css';

export default function ZOperationalReasoningPanel({ payload }) {
  const data = useCognitiveOsData(payload);
  if (!data.available) return null;
  const r = data.reasoning || {};

  return (
    <section className="z-cog-panel" aria-label="Raciocínio operacional industrial">
      <header className="z-cog-panel__header">
        <h3 className="z-cog-panel__title">Raciocínio Industrial</h3>
        <span className={`z-cog-panel__subtitle ${scoreClass(r.industrial_intelligence_score)}`}>
          II {formatScore(r.industrial_intelligence_score)}
        </span>
      </header>

      <div className="z-cog-panel__body">
        <div className="z-cog-grid">
          <div className="z-cog-metric">
            <div className="z-cog-metric__label">Prioridade</div>
            <div className="z-cog-metric__value">{r.priority?.tier || '—'}</div>
          </div>
          <div className="z-cog-metric">
            <div className="z-cog-metric__label">Criticidade</div>
            <div className="z-cog-metric__value">{r.criticality?.level || '—'}</div>
          </div>
          <div className="z-cog-metric">
            <div className="z-cog-metric__label">Qualidade</div>
            <div className="z-cog-metric__value">{formatScore(r.reasoning_quality)}</div>
          </div>
          <div className="z-cog-metric">
            <div className="z-cog-metric__label">Impacto</div>
            <div className="z-cog-metric__value">{r.impact?.organizational_impact || '—'}</div>
          </div>
        </div>

        <div className="z-cog-row">
          <span className="z-cog-label">Domínios impactados</span>
          <span className="z-cog-value">
            {(r.impact?.impact_domains || []).map((d) => (
              <span key={d} className="z-cog-badge" style={{ marginLeft: 4 }}>{d}</span>
            ))}
            {!(r.impact?.impact_domains || []).length && <span className="z-cog-empty">nenhum</span>}
          </span>
        </div>

        <div className="z-cog-row">
          <span className="z-cog-label">Escalonamento sugerido</span>
          <span className={`z-cog-badge ${badgeClassForLevel(r.criticality?.level)}`}>
            {(r.escalation?.suggested_escalation || 'self').replace(/_/g, ' ')}
          </span>
        </div>
        <div className="z-cog-row">
          <span className="z-cog-label">Revisão humana</span>
          <span className="z-cog-value">{r.escalation?.requires_human_review ? 'obrigatória' : 'recomendada'}</span>
        </div>
      </div>
    </section>
  );
}
