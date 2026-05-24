import React from 'react';
import useCognitiveOsData from '../runtime/useCognitiveOsData';
import { formatScore, scoreClass } from '../runtime/cognitiveOsFormatters';
import '../styles/cognitiveOs.css';

export default function ZIndustrialAwarenessPanel({ payload }) {
  const data = useCognitiveOsData(payload);
  if (!data.available) return null;
  const aw = data.awareness || {};
  const fusion = data.fusion || {};
  const cross = data.context?.cross_domain || {};

  return (
    <section className="z-cog-panel" aria-label="Awareness industrial">
      <header className="z-cog-panel__header">
        <h3 className="z-cog-panel__title">Awareness Industrial</h3>
        <span className={`z-cog-panel__subtitle ${scoreClass(fusion.cognitive_density)}`}>
          densidade {formatScore(fusion.cognitive_density)}
        </span>
      </header>

      <div className="z-cog-panel__body">
        <div className="z-cog-grid">
          <div className="z-cog-metric">
            <div className="z-cog-metric__label">Turno</div>
            <div className="z-cog-metric__value">{(aw.shift || '—').replace('turno_', 'T')}</div>
          </div>
          <div className="z-cog-metric">
            <div className="z-cog-metric__label">Estado</div>
            <div className="z-cog-metric__value">{aw.operational_state || 'idle'}</div>
          </div>
          <div className="z-cog-metric">
            <div className="z-cog-metric__label">Workflow activo</div>
            <div className="z-cog-metric__value">{aw.has_active_workflow ? 'sim' : 'não'}</div>
          </div>
          <div className="z-cog-metric">
            <div className="z-cog-metric__label">Críticos</div>
            <div className="z-cog-metric__value">{aw.critical_incidents || 0}</div>
          </div>
        </div>

        <div className="z-cog-row">
          <span className="z-cog-label">Riscos detectados</span>
          <span className="z-cog-value">
            {(aw.detected_risks || []).length === 0
              ? <span className="z-cog-empty">nenhum</span>
              : (aw.detected_risks || []).map((r) => (
                  <span key={r} className="z-cog-badge z-cog-badge--amber" style={{ marginLeft: 4 }}>{r}</span>
                ))}
          </span>
        </div>
        <div className="z-cog-row">
          <span className="z-cog-label">Domínios activos</span>
          <span className="z-cog-value">
            {cross.domain_count || 0} {cross.multi_domain && <span className="z-cog-badge">multi-domain</span>}
          </span>
        </div>
        <div className="z-cog-row">
          <span className="z-cog-label">Foco primário</span>
          <span className="z-cog-value">{(data.attention?.primary_focus || '—').replace(/_/g, ' ')}</span>
        </div>
      </div>
    </section>
  );
}
