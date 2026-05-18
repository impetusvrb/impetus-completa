import React, { useState } from 'react';
import { environmentCognitive as ecApi } from '../../../services/api.js';

export function EnvironmentRecommendationWorkspace() {
  const [pack, setPack] = useState(null);

  const load = async () => {
    const { data } = await ecApi.runInsights({
      signals: {
        water_flow: [10, 11, 12, 13, 14, 15, 16, 17],
        reservoir_level: [80, 82, 85, 88, 91],
        emissions_co2: [50, 52, 55, 60, 65, 70]
      },
      emit_events: false
    });
    setPack(data.pack);
  };

  const recs = pack?.recommendations?.recommendations || [];

  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <h2 style={{ margin: 0, fontSize: 14, textTransform: 'uppercase', color: 'var(--cyan)' }}>Recomendações contextuais</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 8 }}>
        Assistivas · auditáveis · com score de confiança — sem enforcement.
      </p>
      <button type="button" className="btn-ghost" style={{ minHeight: 44, borderRadius: 4, marginTop: 8 }} onClick={load}>
        Gerar recomendações
      </button>
      <ul style={{ marginTop: 12, paddingLeft: 18, color: 'var(--text-secondary)', fontSize: 13 }}>
        {recs.map((r) => (
          <li key={r.id} style={{ marginBottom: 8 }}>
            <strong style={{ color: 'var(--text-accent)' }}>{r.kind}</strong> — {r.rationale}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, marginLeft: 8, color: 'var(--amber)' }}>
              conf {(r.confidence * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default EnvironmentRecommendationWorkspace;
