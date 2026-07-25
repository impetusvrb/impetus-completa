import React, { useState, useEffect } from 'react';
import { Brain } from 'lucide-react';
import { useCognitiveShellUi } from './CognitiveShellUiContext';
import CognitiveCoreSummaryCard from './CognitiveCoreSummaryCard';

/** Rótulos curtos — valor completo no title. */
const ENGINE_SHORT_LABELS = {
  'Cognitive Core': 'Core',
  'Behavior Mapping': 'Behavior',
  'Cross-analysis': 'Analysis',
  'Operational Sync': 'Sync',
  'Organizational Awareness': 'Awareness',
  'Predictive Engine': 'Predictive'
};

function EngineStatusPanel({ engines }) {
  if (!engines.length) return null;
  return (
    <div className="cog-global-strip__engines-panel" role="region" aria-label="Motores cognitivos — detalhe">
      {engines.map(([label, val]) => (
        <span
          key={label}
          className={`cog-global-strip__chip ${val === 'RUNNING' || val === 'SYNCING' ? 'cog-global-strip__chip--run' : ''}`}
          title={`${label}: ${val}`}
        >
          <span className="cog-global-strip__chip-label">{ENGINE_SHORT_LABELS[label] || label}</span>
          <strong>{val}</strong>
        </span>
      ))}
    </div>
  );
}

/** Layout tablet expandido (UI-DESKTOP-003 — inalterado). */
function TabletExpandedStrip({ core, presence, consciousness, engines, tick, shellUi }) {
  return (
    <div className="cog-global-strip cog-global-strip--tablet" role="status" aria-live="polite">
      <div className="cog-global-strip__row cog-global-strip__row--head">
        <span className="cog-global-strip__brand">{core.name}</span>
        <span className="cog-global-strip__pulse" aria-hidden />
      </div>

      <div className="cog-global-strip__row cog-global-strip__row--engines">
        {engines.map(([label, val]) => (
          <span
            key={label}
            className={`cog-global-strip__chip ${val === 'RUNNING' || val === 'SYNCING' ? 'cog-global-strip__chip--run' : ''}`}
            title={`${label}: ${val}`}
          >
            <span className="cog-global-strip__chip-label" data-full={label}>
              {ENGINE_SHORT_LABELS[label] || label}
            </span>
            <strong>{val}</strong>
          </span>
        ))}
      </div>

      <div className="cog-global-strip__row cog-global-strip__row--foot">
        <span className="cog-global-strip__meta">
          {presence?.heartbeat_bpm ?? 64} bpm · {core.awareness_level_pct}% awareness
          {tick % 2 === 0 ? ' · ONLINE' : ''}
        </span>
        {shellUi?.openAwareness && (
          <button
            type="button"
            className="cog-global-strip__awareness-btn"
            onClick={shellUi.openAwareness}
            title="Organizational Awareness Mode"
          >
            <span className="cog-awareness-trigger__dot" aria-hidden />
            Consciência total
          </button>
        )}
      </div>
    </div>
  );
}

/** INC-014 — Desktop topo: faixa única horizontal compacta (identidade + motores + ícone). */
function DesktopCompactSingleStrip({ core, consciousness, engines, shellUi }) {
  const coreState = core?.status?.cognitive_core;
  const statusLabel =
    consciousness?.awareness_state ||
    (coreState === 'PRESENCE'
      ? 'PRESENÇA ATIVA'
      : coreState === 'ACTIVE'
        ? 'ATIVO'
        : coreState === 'STANDBY'
          ? 'AGUARDANDO DADOS'
          : '—');

  return (
    <div className="cog-global-strip cog-global-strip--desktop-compact-single" role="status" aria-live="polite">
      <div className="cog-core-rail">
        <div className="cog-core-rail__identity">
          <span className="cog-global-strip__pulse" aria-hidden />
          <span className="cog-global-strip__brand">{core.name || 'IMPETUS COGNITIVE CORE'}</span>
          <span className="cog-core-rail__status">{statusLabel}</span>
        </div>

        {engines.length > 0 && (
          <div className="cog-core-rail__engines" role="group" aria-label="Motores cognitivos">
            {engines.map(([label, val]) => (
              <span
                key={label}
                className={`cog-core-rail__cell ${val === 'RUNNING' || val === 'SYNCING' ? 'cog-core-rail__cell--run' : ''}`}
                title={`${label}: ${val}`}
              >
                <span className="cog-core-rail__cell-label">{ENGINE_SHORT_LABELS[label] || label}</span>
                <strong className="cog-core-rail__cell-val">{val}</strong>
              </span>
            ))}
          </div>
        )}

        {shellUi?.openAwareness && (
          <button
            type="button"
            className="cog-core-rail__awareness-icon"
            onClick={shellUi.openAwareness}
            aria-label="Consciência Total"
            title="Consciência Total"
          >
            <Brain size={16} strokeWidth={1.75} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

/** Desktop: card resumido (~60–90px) + engines sob demanda (UI-DESKTOP-004). */
function DesktopSummaryStrip({ core, consciousness, engines, shellUi, alwaysExposeEngines = false }) {
  const [enginesOpen, setEnginesOpen] = useState(alwaysExposeEngines);

  const showEngines = alwaysExposeEngines || enginesOpen;

  return (
    <div
      className={`cog-global-strip cog-global-strip--desktop-summary${alwaysExposeEngines ? ' cog-global-strip--top-exposed' : ''}`}
      role="status"
      aria-live="polite"
    >
      <CognitiveCoreSummaryCard
        core={core}
        consciousness={consciousness}
        compact
        detailsExpanded={showEngines}
        onOpenDetails={alwaysExposeEngines ? undefined : () => setEnginesOpen((v) => !v)}
        onOpenAwareness={shellUi?.openAwareness}
      />
      {showEngines && <EngineStatusPanel engines={engines} />}
    </div>
  );
}

export default function CognitiveGlobalStrip({
  core,
  presence,
  consciousness,
  compact = false,
  variant = 'tablet'
}) {
  const shellUi = useCognitiveShellUi();
  const [tick, setTick] = useState(0);
  const status = core?.status || {};
  const engines = [
    ['Cognitive Core', status.cognitive_core],
    ['Behavior Mapping', status.behavior_mapping],
    ['Cross-analysis', status.cross_analysis],
    ['Operational Sync', status.operational_sync],
    ['Organizational Awareness', status.organizational_awareness],
    ['Predictive Engine', status.predictive_engine || status.predictive_layer]
  ].filter(([, v]) => v);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 2400);
    return () => clearInterval(t);
  }, []);

  if (!core) return null;

  /* Mobile — inalterado (CERT-01.1 UI-MOBILE-001) */
  if (compact) {
    return (
      <div className="cog-global-strip cog-global-strip--compact" role="status" aria-live="polite">
        <CognitiveCoreSummaryCard
          core={core}
          consciousness={consciousness}
          compact
          onOpenDetails={shellUi?.openDetails}
          onOpenAwareness={shellUi?.openAwareness}
        />
      </div>
    );
  }

  if (variant === 'desktop-top-exposed') {
    return (
      <DesktopCompactSingleStrip
        core={core}
        consciousness={consciousness}
        engines={engines}
        shellUi={shellUi}
      />
    );
  }

  if (variant === 'desktop-summary') {
    return (
      <DesktopSummaryStrip
        core={core}
        consciousness={consciousness}
        engines={engines}
        shellUi={shellUi}
      />
    );
  }

  /* Tablet — layout UI-DESKTOP-003 preservado */
  return (
    <TabletExpandedStrip
      core={core}
      presence={presence}
      consciousness={consciousness}
      engines={engines}
      tick={tick}
      shellUi={shellUi}
    />
  );
}
