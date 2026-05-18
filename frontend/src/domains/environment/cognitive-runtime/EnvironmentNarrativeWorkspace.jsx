import React, { useState } from 'react';
import { environmentCognitive as ecApi } from '../../../services/api.js';

export function EnvironmentNarrativeWorkspace() {
  const [narrative, setNarrative] = useState(null);

  const load = async () => {
    const { data } = await ecApi.runInsights({
      signals: {
        water_flow: [100, 105, 110, 118, 125],
        emissions_co2: [45, 50, 55, 62, 70],
        telemetry_anomaly_score: 0.6
      },
      emit_events: false
    });
    setNarrative(data.pack?.narrative);
  };

  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <h2 style={{ margin: 0, fontSize: 14, textTransform: 'uppercase', color: 'var(--text-accent)' }}>Narrativas ambientais</h2>
      <button type="button" className="btn-ghost" style={{ minHeight: 44, borderRadius: 4, marginTop: 8 }} onClick={load}>
        Gerar narrativa
      </button>
      {narrative ? (
        <div style={{ marginTop: 12 }}>
          <p style={{ color: 'var(--cyan)', fontWeight: 600, textTransform: 'uppercase', fontSize: 13 }}>{narrative.headline}</p>
          {narrative.paragraphs?.map((p, i) => (
            <p key={i} style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 8 }}>
              {p}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default EnvironmentNarrativeWorkspace;
