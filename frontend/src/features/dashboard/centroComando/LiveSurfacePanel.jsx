import React from 'react';

function renderBody(block) {
  const viz = block.visualization;
  const data = block.data || {};

  if (viz === 'kpi') {
    return (
      <div className="live-surface-card__kpi">
        <strong>{data.value ?? '-'}</strong>
        <span>{Number.isFinite(Number(data.growth)) ? `${data.growth}%` : 'sem variação'}</span>
      </div>
    );
  }

  if (viz === 'alert') {
    return (
      <p className="live-surface-card__alert">
        {data.message || 'Evento crítico detectado para este contexto.'}
      </p>
    );
  }

  if (viz === 'fallback') {
    return (
      <p className="live-surface-card__fallback">
        {data.message || 'Aguardando integração de dados para gerar insights mais precisos.'}
      </p>
    );
  }

  return (
    <p className="live-surface-card__insight">
      {data.message || 'Bloco dinâmico gerado com base em relevância operacional.'}
    </p>
  );
}

export default function LiveSurfacePanel({ surface }) {
  const blocks = surface?.blocks || [];

  return (
    <section className="live-surface">
      {blocks.map((block) => (
        <article key={block.id} className="live-surface-card">
          <header className="live-surface-card__header">
            <h3>{block.title}</h3>
            <span className={`live-surface-card__tag live-surface-card__tag--${block.visualization}`}>
              {block.visualization}
            </span>
          </header>
          <p className="live-surface-card__subtitle">{block.subtitle}</p>
          {renderBody(block)}
          {block.requires_action && <small className="live-surface-card__action">Acao recomendada</small>}
        </article>
      ))}
    </section>
  );
}
