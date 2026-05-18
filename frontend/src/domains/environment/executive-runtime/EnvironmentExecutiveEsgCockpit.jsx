import React, { useState } from 'react';
import { environmentExecutive as exApi } from '../../../services/api.js';
import { ExecutiveKpiStrip } from './ExecutiveKpiStrip.jsx';

export function EnvironmentExecutiveEsgCockpit() {
  const [pack, setPack] = useState(null);

  const load = async () => {
    const { data } = await exApi.runCockpit({
      environmental_score: 68,
      social_proxy: 60,
      governance_proxy: 65,
      emit_events: false
    });
    setPack(data.pack?.esg);
  };

  const score = pack?.analytics?.overview?.esg_score ?? '—';

  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <h2 style={{ margin: 0, fontSize: 14, textTransform: 'uppercase', color: 'var(--cyan)' }}>ESG Executivo</h2>
      <ExecutiveKpiStrip
        items={[
          { label: 'ESG', value: score },
          { label: 'Maturidade', value: pack?.maturity?.maturity_band || '—' },
          { label: 'Gap', value: pack?.maturity?.gap ?? '—', color: 'var(--amber)' }
        ]}
      />
      <button type="button" className="btn-ghost" style={{ minHeight: 44, borderRadius: 4 }} onClick={load}>
        Atualizar cockpit ESG
      </button>
      {pack?.narrative ? (
        <p style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: 13 }}>{pack.narrative.headline}</p>
      ) : null}
    </div>
  );
}

export default EnvironmentExecutiveEsgCockpit;
