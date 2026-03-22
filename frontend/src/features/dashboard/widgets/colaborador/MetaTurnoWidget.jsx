/**
 * Widget Atividades do Turno — Dashboard Colaborador Dinâmico
 */
import React from 'react';
import { Target } from 'lucide-react';

export default function MetaTurnoWidget({ data = {}, widgetClass = 'dcl-widget' }) {
  const metaTurno = data.metaTurno ?? 800;
  const realizado = data.realizado ?? 420;
  const percentMeta = metaTurno > 0 ? Math.min(100, Math.round((realizado / metaTurno) * 100)) : 0;

  return (
    <section className={`cc-widget ${widgetClass}`}>
      <div className="cc-kpi__header">
        <Target size={20} />
        <span>Atividades do Turno</span>
      </div>
      <div className="dcl-meta-grid">
        <div className="metric-card green">
          <span className="metric-label">Realizado</span>
          <span className="metric-value">{realizado}</span>
          <span className="metric-unit">un.</span>
        </div>
        <div className="metric-card blue">
          <span className="metric-label">Meta</span>
          <span className="metric-value">{metaTurno}</span>
          <span className="metric-unit">un.</span>
        </div>
      </div>
      <div className="dcl-progress-wrap">
        <div className="dcl-progress-bar" style={{ width: `${percentMeta}%` }} />
        <span className="dcl-progress-label">{percentMeta}% da meta</span>
      </div>
    </section>
  );
}
