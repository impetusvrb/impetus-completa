import React, { useState } from 'react';
import { environmentExecutive as exApi } from '../../../services/api.js';

function HeatmapGrid({ cells = [] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
      {cells.map((c) => (
        <div
          key={c.id}
          style={{
            padding: '8px 12px',
            borderRadius: 4,
            border: '1px solid var(--border-subtle)',
            background: `rgba(0, 212, 255, ${0.08 + (c.intensity || 0) * 0.35})`,
            fontFamily: 'var(--font-mono)',
            fontSize: 11
          }}
        >
          {c.label}: {c.value}
        </div>
      ))}
    </div>
  );
}

export function EnvironmentCarbonHeatmapWorkspace() {
  const [cells, setCells] = useState([]);

  const load = async () => {
    const { data } = await exApi.runCockpit({
      scope1_tco2e: 200,
      scope2_tco2e: 50,
      scope3_tco2e: 30,
      emit_events: false
    });
    setCells(data.pack?.carbon?.heatmap?.cells || []);
  };

  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <h2 style={{ margin: 0, fontSize: 14, textTransform: 'uppercase' }}>Heatmap carbono</h2>
      <button type="button" className="btn-ghost" style={{ minHeight: 44, borderRadius: 4, marginTop: 8 }} onClick={load}>
        Carregar
      </button>
      <HeatmapGrid cells={cells} />
    </div>
  );
}

export default EnvironmentCarbonHeatmapWorkspace;
