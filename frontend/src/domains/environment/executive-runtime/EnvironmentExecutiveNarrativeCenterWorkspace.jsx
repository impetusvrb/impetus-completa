import React, { useState } from 'react';
import { environmentExecutive as exApi } from '../../../services/api.js';

export function EnvironmentExecutiveNarrativeCenterWorkspace() {
  const [narratives, setNarratives] = useState(null);

  const load = async () => {
    const { data } = await exApi.runCockpit({ emit_events: false });
    setNarratives(data.pack?.intelligence?.narratives);
  };

  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <h2 style={{ margin: 0, fontSize: 14, textTransform: 'uppercase' }}>Centro de narrativas</h2>
      <button type="button" className="btn-ghost" style={{ minHeight: 44, borderRadius: 4, marginTop: 8 }} onClick={load}>
        Consolidar narrativas
      </button>
      {narratives?.narratives?.map((n, i) => (
        <p key={i} style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 8 }}>
          {n}
        </p>
      ))}
    </div>
  );
}

export default EnvironmentExecutiveNarrativeCenterWorkspace;
