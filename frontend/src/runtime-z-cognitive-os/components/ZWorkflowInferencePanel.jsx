import React from 'react';
import useCognitiveOsData from '../runtime/useCognitiveOsData';
import { shortenText } from '../runtime/cognitiveOsFormatters';
import '../styles/cognitiveOs.css';

export default function ZWorkflowInferencePanel({ payload }) {
  const data = useCognitiveOsData(payload);
  if (!data.available) return null;
  const w = data.continuity?.workflow || {};
  const active = Array.isArray(w.active_workflows) ? w.active_workflows : [];

  return (
    <section className="z-cog-panel" aria-label="Workflows inferidos">
      <header className="z-cog-panel__header">
        <h3 className="z-cog-panel__title">Workflows Inferidos</h3>
        <span className="z-cog-panel__subtitle">activos {w.active_count || 0}</span>
      </header>

      <div className="z-cog-panel__body">
        {active.length === 0 ? (
          <div className="z-cog-empty">Sem workflows activos</div>
        ) : (
          <ul className="z-cog-list">
            {active.slice(0, 6).map((wf) => (
              <li key={wf.id}>
                <strong>{shortenText(wf.summary, 80)}</strong>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <span className="z-cog-badge">{wf.state || 'preparing'}</span>
                  {(wf.pending_inputs || []).slice(0, 3).map((p) => (
                    <span key={p} className="z-cog-badge z-cog-badge--amber">aguarda: {p}</span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
