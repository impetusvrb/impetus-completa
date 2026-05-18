import React, { useState } from 'react';
import { environmentExecutive as exApi } from '../../../services/api.js';

export function EnvironmentExecutiveEsgNarrativeWorkspace() {
  const [narrative, setNarrative] = useState(null);

  const load = async () => {
    const { data } = await exApi.runCockpit({ emit_events: false });
    setNarrative(data.pack?.esg?.narrative);
  };

  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <h2 style={{ margin: 0, fontSize: 14, textTransform: 'uppercase', color: 'var(--text-accent)' }}>Narrativa ESG</h2>
      <button type="button" className="btn-ghost" style={{ minHeight: 44, borderRadius: 4, marginTop: 8 }} onClick={load}>
        Gerar narrativa
      </button>
      {narrative?.paragraphs?.map((p, i) => (
        <p key={i} style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 8 }}>
          {p}
        </p>
      ))}
    </div>
  );
}

export default EnvironmentExecutiveEsgNarrativeWorkspace;
