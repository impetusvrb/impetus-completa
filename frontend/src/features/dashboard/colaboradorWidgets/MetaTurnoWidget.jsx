import React from 'react';
import { Target } from 'lucide-react';

export default function MetaTurnoWidget({ data = {} }) {
  const metaTurno = data.metaTurno ?? 0;
  const realizado = data.realizado ?? 0;
  const percent = metaTurno > 0 ? Math.min(100, Math.round((realizado / metaTurno) * 100)) : 0;

  return (
    <section className="cc-widget dcl-widget">
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
        <div className="dcl-progress-bar" style={{ width: `${percent}%` }} />
        <span className="dcl-progress-label">{percent}% da meta</span>
      </div>
    </section>
  );
}
