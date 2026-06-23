/**
 * IMPETUS — Inteligência Organizacional Cognitiva Viva (nível presença global)
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useCognitivePulseContext } from './CognitivePulseContext';
import { useCognitiveShellUi } from './CognitiveShellUiContext';
import useViewportTier from './useViewportTier';
import CognitiveEcosystemDetailContent from './CognitiveEcosystemDetailContent';
import CognitiveAssistantStrip from './CognitiveAssistantStrip';
import './cognitiveEcosystem.css';

export default function CognitiveEcosystemBand({ onModeChange }) {
  const { pulse, loading } = useCognitivePulseContext();
  const shellUi = useCognitiveShellUi();
  const tier = useViewportTier();
  const [modeOverride, setModeOverride] = useState(null);
  const [feedTick, setFeedTick] = useState(0);

  const suggested = pulse?.operational_mode || 'normal';
  const activeMode = modeOverride || suggested;
  const intensity = pulse?.autonomous_focus?.visual_intensity || 'normal';

  const layoutClass = useMemo(() => {
    const hint = pulse?.autonomous_focus?.layout_hint || 'balanced';
    return `cog-band--layout-${hint.replace(/_/g, '-')}`;
  }, [pulse?.autonomous_focus?.layout_hint]);

  useEffect(() => {
    const id = setInterval(() => setFeedTick((t) => t + 1), 3500);
    return () => clearInterval(id);
  }, []);

  const handleMode = (id) => {
    setModeOverride(id);
    onModeChange?.(id);
  };

  if (loading && !pulse) {
    return (
      <div className="cog-band cog-band--loading cog-band--oi" aria-busy="true">
        <span className="cog-band__scan">IMPETUS Cognitive Core — boot sequence…</span>
      </div>
    );
  }

  if (!pulse?.ok) return null;

  if (tier.isMobile) {
    return (
      <p className="cog-band__mobile-hint">
        Resumo cognitivo no topo. Use <strong>Ver detalhes</strong> ou{' '}
        <button type="button" className="cog-band__mobile-hint-link" onClick={() => shellUi?.openDetails?.()}>
          abrir painel completo
        </button>
        .
      </p>
    );
  }

  const execSummary = [
    ...(pulse.operational_narrative?.paragraphs || []).slice(0, 1),
    pulse.multi_agents?.consensus
  ].filter(Boolean);

  return (
    <div
      className={`cog-band cog-band--oi cog-band--enterprise cog-band--intensity-${intensity} ${layoutClass} cog-band--mode-${activeMode}`}
      data-operational-mode={activeMode}
    >
      <div className="cog-band__scanner" aria-hidden />
      <div className="cog-band__scanner cog-band__scanner--h" aria-hidden />

      <header className="cog-command-header">
        <span className="cog-command-header__tag">INTELIGÊNCIA ORGANIZACIONAL VIVA</span>
        <h1 className="cog-command-header__title">COMMAND CENTER</h1>
        <p className="cog-command-header__sub">Organismo digital · consciência · presença cognitiva contínua</p>
      </header>

      <div className="cog-band__layout">
        <div className="cog-band__primary">
          <CognitiveEcosystemDetailContent
            pulse={pulse}
            activeMode={activeMode}
            modeOverride={modeOverride}
            suggestedMode={suggested}
            onModeChange={handleMode}
            feedTick={feedTick}
          />
        </div>

        <CognitiveAssistantStrip
          observations={pulse.ia_observations}
          insights={pulse.organizational_insights}
          memory={(pulse.organizational_memory?.contextual_entries || [])
            .concat(pulse.organizational_memory?.entries || [])
            .map((e) => e.text)}
          crossSummary={pulse.cross_analysis?.summary}
          activeLinks={pulse.cross_analysis?.active_links}
          executiveSummary={execSummary}
          narrative={pulse.operational_narrative}
        />
      </div>
    </div>
  );
}
