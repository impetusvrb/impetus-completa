import React, { useState } from 'react';
import { environmentExecutive as exApi } from '../../../services/api.js';

export function EnvironmentExecutiveCrossDomainWorkspace() {
  const [insights, setInsights] = useState([]);

  const load = async () => {
    const { data } = await exApi.runCockpit({
      production_rate: 100,
      emissions_co2: 60,
      logistics_carbon_index: 0.7,
      emit_events: false
    });
    setInsights(data.pack?.intelligence?.cross_domain?.insights || []);
  };

  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <h2 style={{ margin: 0, fontSize: 14, textTransform: 'uppercase', color: 'var(--green)' }}>Cross-domain</h2>
      <button type="button" className="btn-ghost" style={{ minHeight: 44, borderRadius: 4, marginTop: 8 }} onClick={load}>
        Insights estratégicos
      </button>
      <ul style={{ marginTop: 12, paddingLeft: 18, color: 'var(--text-secondary)', fontSize: 13 }}>
        {insights.map((ins, i) => (
          <li key={i}>{ins.text}</li>
        ))}
      </ul>
    </div>
  );
}

export default EnvironmentExecutiveCrossDomainWorkspace;
