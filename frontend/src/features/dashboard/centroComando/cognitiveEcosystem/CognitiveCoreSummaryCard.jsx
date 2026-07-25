import React from 'react';

/**
 * Card resumido do Cognitive Core — mesmos dados em mobile/tablet compacto.
 */
export default function CognitiveCoreSummaryCard({
  core,
  consciousness,
  onOpenDetails,
  onOpenAwareness,
  compact = false,
  detailsExpanded = false
}) {
  if (!core) return null;

  const coreState = core.status?.cognitive_core;
  const statusLabel =
    consciousness?.awareness_state ||
    (coreState === 'PRESENCE'
      ? 'PRESENÇA ATIVA'
      : coreState === 'ACTIVE'
        ? 'ATIVO'
        : coreState === 'STANDBY'
          ? 'AGUARDANDO DADOS'
          : '—');
  const confidenceRaw = core.confidence_level ?? core.awareness_level_pct;
  const confidenceDisplay = typeof confidenceRaw === 'number' ? `${confidenceRaw}%` : '—';
  const syncRaw = core.status?.operational_sync;
  const syncLabel =
    syncRaw === 'SYNCING' || syncRaw === 'RUNNING' || syncRaw === 'STABLE' || syncRaw === 'Estável'
      ? syncRaw === 'STABLE'
        ? 'Estável'
        : syncRaw
      : syncRaw && syncRaw !== '—'
        ? syncRaw
        : '—';
  const awareRaw = core.awareness_level_pct;
  const awareDisplay = typeof awareRaw === 'number' ? `${awareRaw}%` : '—';

  return (
    <div
      className={`cog-mobile-summary${compact ? ' cog-mobile-summary--compact' : ''}`}
      role="region"
      aria-label="IMPETUS Cognitive Core — resumo"
    >
      <div className="cog-mobile-summary__left">
        <span className="cog-mobile-summary__orb" aria-hidden />
        <div>
          <p className="cog-mobile-summary__title">{core.name || 'COGNITIVE CORE'}</p>
          <p className="cog-mobile-summary__status">
            <span className="cog-mobile-summary__dot cog-mobile-summary__dot--green" aria-hidden />
            Status: {statusLabel}
          </p>
        </div>
      </div>
      <div className="cog-mobile-summary__metrics">
        <span className="cog-mobile-summary__metric">
          <span className="cog-mobile-summary__metric-label">CONF</span>
          <span className="cog-mobile-summary__metric-val">{confidenceDisplay}</span>
        </span>
        <span className="cog-mobile-summary__metric">
          <span className="cog-mobile-summary__metric-label">SYNC</span>
          <span className="cog-mobile-summary__metric-val">{syncLabel}</span>
        </span>
        <span className="cog-mobile-summary__metric">
          <span className="cog-mobile-summary__metric-label">AWARE</span>
          <span className="cog-mobile-summary__metric-val">{awareDisplay}</span>
        </span>
      </div>
      <div className="cog-mobile-summary__actions">
        {onOpenDetails && (
          <button type="button" className="cog-mobile-summary__btn" onClick={onOpenDetails}>
            {detailsExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}
          </button>
        )}
        {onOpenAwareness && (
          <button
            type="button"
            className="cog-mobile-summary__btn cog-mobile-summary__btn--awareness"
            onClick={onOpenAwareness}
          >
            Consciência total
          </button>
        )}
      </div>
    </div>
  );
}
