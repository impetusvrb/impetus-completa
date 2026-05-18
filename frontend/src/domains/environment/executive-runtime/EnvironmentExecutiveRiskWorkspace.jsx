import React, { useState } from 'react';
import { environmentExecutive as exApi } from '../../../services/api.js';
import { ExecutiveKpiStrip } from './ExecutiveKpiStrip.jsx';

export function EnvironmentExecutiveRiskWorkspace() {
  const [risk, setRisk] = useState(null);

  const load = async () => {
    const { data } = await exApi.runCockpit({
      environmental_risk: 0.5,
      carbon_risk: 0.6,
      compliance_risk: 0.3,
      emit_events: false
    });
    setRisk(data.pack?.risk);
  };

  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <h2 style={{ margin: 0, fontSize: 14, textTransform: 'uppercase', color: 'var(--red)' }}>Risco executivo</h2>
      <ExecutiveKpiStrip
        items={[
          { label: 'Severidade', value: risk?.scoring?.severity || '—', color: 'var(--red)' },
          {
            label: 'Score',
            value: risk?.scoring?.aggregate_risk_score != null ? `${(risk.scoring.aggregate_risk_score * 100).toFixed(0)}%` : '—'
          }
        ]}
      />
      <button type="button" className="btn-ghost" style={{ minHeight: 44, borderRadius: 4 }} onClick={load}>
        Atualizar mapa de risco
      </button>
    </div>
  );
}

export default EnvironmentExecutiveRiskWorkspace;
