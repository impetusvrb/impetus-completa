import React from 'react';
import useCognitiveOsData from '../runtime/useCognitiveOsData';
import { formatScore, scoreClass, badgeClassForLevel } from '../runtime/cognitiveOsFormatters';
import '../styles/cognitiveOs.css';

export default function ZOperationalContextPanel({ payload }) {
  const data = useCognitiveOsData(payload);
  if (!data.available) return null;

  const ctx = data.context || {};
  const op = ctx.operational || {};
  const temporal = ctx.temporal || {};
  const shift = ctx.shift || {};
  const urgency = ctx.urgency || {};

  return (
    <section className="z-cog-panel" aria-label="Contexto operacional Runtime Z">
      <header className="z-cog-panel__header">
        <h3 className="z-cog-panel__title">Contexto Operacional · Z</h3>
        <span className="z-cog-panel__subtitle">stage {data.stage}</span>
      </header>

      <div className="z-cog-panel__body">
        <div className="z-cog-grid">
          <div className="z-cog-metric">
            <div className="z-cog-metric__label">Awareness</div>
            <div className={`z-cog-metric__value ${scoreClass(ctx.awareness_score).replace('z-cog-value', 'z-cog-value')}`}>
              {formatScore(ctx.awareness_score)}
            </div>
          </div>
          <div className="z-cog-metric">
            <div className="z-cog-metric__label">Saturação Op.</div>
            <div className="z-cog-metric__value">{formatScore(op.operational_saturation)}</div>
          </div>
          <div className="z-cog-metric">
            <div className="z-cog-metric__label">Turno</div>
            <div className="z-cog-metric__value">{(shift.shift_name || '—').replace('turno_', 'T')}</div>
          </div>
          <div className="z-cog-metric">
            <div className="z-cog-metric__label">Período</div>
            <div className="z-cog-metric__value">{temporal.part_of_day || '—'}</div>
          </div>
        </div>

        <div className="z-cog-row">
          <span className="z-cog-label">Estado operacional</span>
          <span className={`z-cog-value ${scoreClass(op.operational_saturation)}`}>
            {op.state || '—'}
          </span>
        </div>
        <div className="z-cog-row">
          <span className="z-cog-label">Urgência inferida</span>
          <span className={`z-cog-badge ${badgeClassForLevel(urgency.level)}`}>{urgency.level || 'normal'}</span>
        </div>
        <div className="z-cog-row">
          <span className="z-cog-label">Incidentes abertos</span>
          <span className="z-cog-value">
            {op.open_incidents ?? 0} <span className="z-cog-label">(críticos {op.critical_incidents ?? 0})</span>
          </span>
        </div>
        <div className="z-cog-row">
          <span className="z-cog-label">Tarefas abertas</span>
          <span className="z-cog-value">{op.open_tasks ?? 0}</span>
        </div>
      </div>
    </section>
  );
}
