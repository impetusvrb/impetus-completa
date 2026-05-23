/**
 * IMPETUS — Inteligência Organizacional Cognitiva Viva (nível presença global)
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useCognitivePulseContext } from './CognitivePulseContext';
import CognitiveCoreHub from './CognitiveCoreHub';
import DigitalTwinPanel from './DigitalTwinPanel';
import MultiAgentCouncil from './MultiAgentCouncil';
import OperationalNarrative from './OperationalNarrative';
import CauseEffectChain from './CauseEffectChain';
import AutonomousFocusBar from './AutonomousFocusBar';
import StrategicIntelligenceHub from './StrategicIntelligenceHub';
import AdvancedPredictionsPanel from './AdvancedPredictionsPanel';
import OrganizationalMemoryPanel from './OrganizationalMemoryPanel';
import OrganizationalEnergyPanel from './OrganizationalEnergyPanel';
import EmergentInsightsPanel from './EmergentInsightsPanel';
import DecisionEnginePanel from './DecisionEnginePanel';
import CognitiveTimelineLive from './CognitiveTimelineLive';
import CentroCognitivoGlobal from './CentroCognitivoGlobal';
import WarRoomModeBar from './WarRoomModeBar';
import BlackboxEngineBar from './BlackboxEngineBar';
import GlobalOperationState from './GlobalOperationState';
import OrganizationalTensionPanel from './OrganizationalTensionPanel';
import CognitiveNeuralMesh from './CognitiveNeuralMesh';
import LiveOperationalFeed from './LiveOperationalFeed';
import OperationalHeatmap from './OperationalHeatmap';
import OperationalRadar from './OperationalRadar';
import StrategicPredictions from './StrategicPredictions';
import PredictiveCurvesPanel from './PredictiveCurvesPanel';
import LiveOrgMap from './LiveOrgMap';
import CognitiveAssistantStrip from './CognitiveAssistantStrip';
import './cognitiveEcosystem.css';

export default function CognitiveEcosystemBand({ onModeChange }) {
  const { pulse, loading } = useCognitivePulseContext();
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

      <WarRoomModeBar activeMode={modeOverride} suggestedMode={suggested} onSelect={handleMode} />
      <AutonomousFocusBar focus={pulse.autonomous_focus} mode={activeMode} />
      <BlackboxEngineBar blackbox={pulse.blackbox} />

      <div className="cog-band__layout">
        <div className="cog-band__primary">
          <div className="cog-band__core-row">
            <CognitiveCoreHub core={pulse.cognitive_core} consciousness={pulse.consciousness} />
            <DigitalTwinPanel twin={pulse.digital_twin} />
          </div>

          <OrganizationalEnergyPanel energy={pulse.organizational_energy} />
          <MultiAgentCouncil multiAgents={pulse.multi_agents} />

          <div className="cog-band__intel-row">
            <OperationalNarrative narrative={pulse.operational_narrative} />
            <div className="cog-band__intel-col">
              <CauseEffectChain causeEffect={pulse.cause_effect} />
              <EmergentInsightsPanel emergent={pulse.emergent_insights} />
            </div>
          </div>

          <div className="cog-band__intel-row">
            <DecisionEnginePanel engine={pulse.decision_engine} />
            <CognitiveTimelineLive timeline={pulse.cognitive_timeline} />
          </div>

          <StrategicIntelligenceHub intel={pulse.strategic_intelligence} />
          <CentroCognitivoGlobal centro={pulse.centro_cognitivo} status={pulse.centro_cognitivo?.cognitive_status} />

          <div className="cog-band__executive-row">
            <GlobalOperationState state={pulse.global_operation} />
            <OrganizationalTensionPanel tension={pulse.organizational_tension} />
          </div>

          <AdvancedPredictionsPanel advanced={pulse.advanced_predictions} />

          <div className="cog-band__neural-row">
            <CognitiveNeuralMesh graph={pulse.neural_graph} />
            <PredictiveCurvesPanel curves={pulse.prediction_curves} predictions={pulse.predictions} />
          </div>

          <StrategicPredictions predictions={pulse.predictions} />
          <OrganizationalMemoryPanel memory={pulse.organizational_memory} />
          <LiveOperationalFeed items={pulse.live_feed} localTick={feedTick} />

          <div className="cog-band__row cog-band__row--maps">
            <LiveOrgMap orgMap={pulse.org_map} />
            <OperationalHeatmap sectors={pulse.heatmap} />
            <OperationalRadar blips={pulse.radar} />
          </div>
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
