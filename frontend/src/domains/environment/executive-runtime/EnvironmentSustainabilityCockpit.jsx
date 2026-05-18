import React, { useState } from 'react';
import { environmentExecutive as exApi } from '../../../services/api.js';
import { ExecutiveKpiStrip } from './ExecutiveKpiStrip.jsx';

export function EnvironmentSustainabilityCockpit() {
  const [pack, setPack] = useState(null);

  const load = async () => {
    const { data } = await exApi.runCockpit({ esg_score: 62, water_m3: 1200, waste_tonnes: 8, emit_events: false });
    setPack(data.pack?.sustainability);
  };

  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <h2 style={{ margin: 0, fontSize: 14, textTransform: 'uppercase', color: 'var(--green)' }}>Sustentabilidade</h2>
      <ExecutiveKpiStrip
        items={[
          { label: 'Score', value: pack?.analytics?.sustainability_score ?? '—', color: 'var(--green)' },
          { label: 'Performance', value: pack?.analytics?.environmental_performance ?? '—' }
        ]}
      />
      <button type="button" className="btn-ghost" style={{ minHeight: 44, borderRadius: 4 }} onClick={load}>
        Atualizar
      </button>
    </div>
  );
}

export default EnvironmentSustainabilityCockpit;
