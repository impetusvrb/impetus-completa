import React from 'react';
import useCognitiveOsData from '../runtime/useCognitiveOsData';
import { shortenText } from '../runtime/cognitiveOsFormatters';
import '../styles/cognitiveOs.css';

export default function ZAssistiveActionsPanel({ payload }) {
  const data = useCognitiveOsData(payload);
  if (!data.available) return null;
  const a = data.actions || {};
  const list = Array.isArray(a.actions) ? a.actions : [];

  return (
    <section className="z-cog-panel" aria-label="Acções preparadas (assistive)">
      <header className="z-cog-panel__header">
        <h3 className="z-cog-panel__title">Acções Preparadas (assistive)</h3>
        <span className="z-cog-panel__subtitle">auto-execução bloqueada · {list.length} preparadas</span>
      </header>

      <div className="z-cog-panel__body">
        {list.length === 0 ? (
          <div className="z-cog-empty">Nenhuma acção preparada nesta interacção</div>
        ) : (
          list.slice(0, 5).map((act) => (
            <div key={act.id} className="z-cog-action">
              <div className="z-cog-action__title">{shortenText(act.title, 110)}</div>
              <div className="z-cog-action__meta">
                <span className="z-cog-badge">{act.kind?.replace(/_/g, ' ')}</span>
                {act.domain && <span className="z-cog-badge">{act.domain}</span>}
                <span className="z-cog-badge z-cog-badge--amber">requer revisão humana</span>
              </div>
              {Array.isArray(act.required_approvals) && act.required_approvals.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  <span className="z-cog-label">Aprovações:</span>{' '}
                  <span className="z-cog-value">{act.required_approvals.join(', ')}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
