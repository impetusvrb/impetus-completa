/**
 * Ecossistema cognitivo operacional enterprise — sistema vivo, densidade estratégica.
 */
import React, { useState, useEffect } from 'react';
import useCognitivePulse from './useCognitivePulse';
import CentroCognitivoGlobal from './CentroCognitivoGlobal';
import WarRoomModeBar from './WarRoomModeBar';
import BlackboxEngineBar from './BlackboxEngineBar';
import GlobalOperationState from './GlobalOperationState';
import OrganizationalTensionPanel from './OrganizationalTensionPanel';
import CognitiveNeuralMesh from './CognitiveNeuralMesh';
import LiveOperationalFeed from './LiveOperationalFeed';
import ExecutiveTimeline from './ExecutiveTimeline';
import OperationalHeatmap from './OperationalHeatmap';
import OperationalRadar from './OperationalRadar';
import StrategicPredictions from './StrategicPredictions';
import PredictiveCurvesPanel from './PredictiveCurvesPanel';
import LiveOrgMap from './LiveOrgMap';
import CognitiveAssistantStrip from './CognitiveAssistantStrip';
import './cognitiveEcosystem.css';

export default function CognitiveEcosystemBand({ onModeChange }) {
  const { pulse, loading } = useCognitivePulse();
  const [modeOverride, setModeOverride] = useState(null);
  const [feedTick, setFeedTick] = useState(0);

  const suggested = pulse?.operational_mode || 'normal';
  const activeMode = modeOverride || suggested;

  useEffect(() => {
    const id = setInterval(() => setFeedTick((t) => t + 1), 4000);
    return () => clearInterval(id);
  }, []);

  const handleMode = (id) => {
    setModeOverride(id);
    onModeChange?.(id);
  };

  if (loading && !pulse) {
    return (
      <div className="cog-band cog-band--loading" aria-busy="true">
        <div className="cog-band__particles" aria-hidden />
        <span className="cog-band__scan">Inicializando motor cognitivo enterprise…</span>
        <BlackboxEngineBar
          blackbox={{
            engines: [
              { id: 'c', label: 'Cognitive Engine', status: 'RUNNING' },
              { id: 'x', label: 'Cross-analysis', status: 'RUNNING' }
            ],
            background_log: ['Carregando consciência organizacional…']
          }}
        />
      </div>
    );
  }

  if (!pulse?.ok) return null;

  return (
    <div className={`cog-band cog-band--enterprise cog-band--mode-${activeMode}`} data-operational-mode={activeMode}>
      <div className="cog-band__particles" aria-hidden />
      <div className="cog-band__hologrid" aria-hidden />
      <div className="cog-band__scanner" aria-hidden />
      <div className="cog-band__scanner cog-band__scanner--h" aria-hidden />

      <WarRoomModeBar activeMode={modeOverride} suggestedMode={suggested} onSelect={handleMode} />
      <BlackboxEngineBar blackbox={pulse.blackbox} />

      <div className="cog-band__layout">
        <div className="cog-band__primary">
          <CentroCognitivoGlobal
            centro={pulse.centro_cognitivo}
            status={pulse.centro_cognitivo?.cognitive_status}
          />

          <div className="cog-band__executive-row">
            <GlobalOperationState state={pulse.global_operation} />
            <OrganizationalTensionPanel tension={pulse.organizational_tension} />
          </div>

          <div className="cog-band__neural-row">
            <CognitiveNeuralMesh graph={pulse.neural_graph} />
            <PredictiveCurvesPanel curves={pulse.prediction_curves} predictions={pulse.predictions} />
          </div>

          <StrategicPredictions predictions={pulse.predictions} />

          <LiveOperationalFeed items={pulse.live_feed} localTick={feedTick} />

          <div className="cog-band__row">
            <ExecutiveTimeline items={pulse.timeline} />
            <LiveOrgMap orgMap={pulse.org_map} />
          </div>

          <div className="cog-band__row cog-band__row--maps">
            <OperationalHeatmap sectors={pulse.heatmap} />
            <OperationalRadar blips={pulse.radar} />
          </div>
        </div>

        <CognitiveAssistantStrip
          observations={pulse.ia_observations}
          insights={pulse.organizational_insights}
          memory={pulse.memory}
          crossSummary={pulse.cross_analysis?.summary}
          activeLinks={pulse.cross_analysis?.active_links}
        />
      </div>
    </div>
  );
}
