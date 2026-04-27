import React from 'react';
import { useLiveSurfaceStream } from '../../../hooks/useLiveSurfaceStream';

function renderBody(block) {
  if (!block || typeof block !== 'object') return null;
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

/**
 * @param {object} [props]
 * @param {object} [props.surface] — se definido, modo controlado (sem fetch/SSE).
 * @param {boolean} [props.autoFetch] — obtém superfície via REST + SSE com fallback em polling.
 */
export default function LiveSurfacePanel({ surface: surfaceProp, autoFetch = false }) {
  const stream = useLiveSurfaceStream({ enabled: autoFetch && surfaceProp == null });
  const surface = surfaceProp != null ? surfaceProp : stream.surface;
  const rawBlocks = surface?.blocks;
  const blocks = Array.isArray(rawBlocks)
    ? rawBlocks.filter((b) => b != null && typeof b === 'object')
    : [];

  return (
    <section className="live-surface">
      {blocks.map((block, idx) => (
        <article key={block.id != null ? String(block.id) : `surface-block-${idx}`} className="live-surface-card">
          <header className="live-surface-card__header">
            <h3>{block.title != null ? String(block.title) : '—'}</h3>
            <span
              className={`live-surface-card__tag live-surface-card__tag--${block.visualization || 'fallback'}`}
            >
              {block.visualization || '—'}
            </span>
          </header>
          <p className="live-surface-card__subtitle">
            {block.subtitle != null ? String(block.subtitle) : ''}
          </p>
          {renderBody(block)}
          {block.requires_action && <small className="live-surface-card__action">Acao recomendada</small>}
        </article>
      ))}
    </section>
  );
}
