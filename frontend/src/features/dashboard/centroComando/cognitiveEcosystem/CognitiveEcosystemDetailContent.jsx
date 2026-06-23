import React, { useState, useEffect } from 'react';
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

/**
 * Conteúdo detalhado do ecossistema cognitivo — mesma árvore de componentes
 * para Desktop (inline) e Mobile (bottom sheet). Garante convergência de dados.
 */
export default function CognitiveEcosystemDetailContent({
  pulse,
  activeMode,
  modeOverride,
  suggestedMode,
  onModeChange,
  feedTick: feedTickProp
}) {
  if (!pulse?.ok) return null;

  const [feedTickLocal, setFeedTickLocal] = useState(0);
  const feedTick = feedTickProp ?? feedTickLocal;

  useEffect(() => {
    if (feedTickProp != null) return undefined;
    const id = setInterval(() => setFeedTickLocal((t) => t + 1), 3500);
    return () => clearInterval(id);
  }, [feedTickProp]);

  return (
    <>
      <CognitiveCoreHub core={pulse.cognitive_core} consciousness={pulse.consciousness} />
      <WarRoomModeBar activeMode={modeOverride} suggestedMode={suggestedMode} onSelect={onModeChange} />
      <AutonomousFocusBar focus={pulse.autonomous_focus} mode={activeMode} />
      <BlackboxEngineBar blackbox={pulse.blackbox} />

      <div className="cog-band__core-row">
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
    </>
  );
}
