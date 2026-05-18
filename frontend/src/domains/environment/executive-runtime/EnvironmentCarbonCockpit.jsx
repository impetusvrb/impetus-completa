import React, { useState } from 'react';
import { environmentExecutive as exApi } from '../../../services/api.js';
import { ExecutiveKpiStrip } from './ExecutiveKpiStrip.jsx';

export function EnvironmentCarbonCockpit() {
  const [pack, setPack] = useState(null);

  const load = async () => {
    const { data } = await exApi.runCockpit({
      scope1_tco2e: 120,
      scope2_tco2e: 80,
      scope3_tco2e: 45,
      production_units: 1000,
      emit_events: false
    });
    setPack(data.pack?.carbon);
  };

  const total = pack?.analytics?.total_tco2e;

  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <h2 style={{ margin: 0, fontSize: 14, textTransform: 'uppercase', color: 'var(--cyan)' }}>Carbono</h2>
      <ExecutiveKpiStrip
        items={[
          { label: 'tCO₂e', value: total != null ? total.toFixed(1) : '—' },
          { label: 'Intensidade', value: pack?.analytics?.intensity?.toFixed?.(2) ?? pack?.analytics?.intensity ?? '—' },
          { label: 'Hotspots', value: pack?.heatmap?.hotspots?.length ?? 0, color: 'var(--amber)' }
        ]}
      />
      <button type="button" className="btn-ghost" style={{ minHeight: 44, borderRadius: 4 }} onClick={load}>
        Atualizar carbono
      </button>
    </div>
  );
}

export default EnvironmentCarbonCockpit;
