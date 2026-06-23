import React, { useState, useEffect } from 'react';
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

/** Desktop: card resumido (~60–90px) + engines sob demanda (UI-DESKTOP-004). */
function DesktopSummaryStrip({ core, consciousness, engines, shellUi }) {
  const [enginesOpen, setEnginesOpen] = useState(false);

  return (
    <div className="cog-global-strip cog-global-strip--desktop-summary" role="status" aria-live="polite">
      <CognitiveCoreSummaryCard
        core={core}
        consciousness={consciousness}
        compact
        detailsExpanded={enginesOpen}
        onOpenDetails={() => setEnginesOpen((v) => !v)}
        onOpenAwareness={shellUi?.openAwareness}
      />
      {enginesOpen && <EngineStatusPanel engines={engines} />}
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
