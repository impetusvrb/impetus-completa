import React, { useState } from 'react';
import { environmentExecutive as exApi } from '../../../services/api.js';

export function EnvironmentSustainabilityNarrativeWorkspace() {
  const [n, setN] = useState(null);
  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <h2 style={{ margin: 0, fontSize: 14, textTransform: 'uppercase' }}>Narrativa sustentabilidade</h2>
      <button
        type="button"
        className="btn-ghost"
        style={{ minHeight: 44, borderRadius: 4, marginTop: 8 }}
        onClick={async () => {
          const { data } = await exApi.runCockpit({ emit_events: false });
          setN(data.pack?.sustainability?.narrative);
        }}
      >
        Gerar
      </button>
      {n?.headline ? <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>{n.headline}</p> : null}
    </div>
  );
}

export default EnvironmentSustainabilityNarrativeWorkspace;
