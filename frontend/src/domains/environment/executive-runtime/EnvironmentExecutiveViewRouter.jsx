import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { isEnvironmentExecutiveRuntimeEnabled } from './environmentExecutiveFeatureFlags.js';
import EnvironmentExecutiveIntelligenceCenter from './EnvironmentExecutiveIntelligenceCenter.jsx';
import EnvironmentExecutiveEsgCockpit from './EnvironmentExecutiveEsgCockpit.jsx';
import EnvironmentSustainabilityCockpit from './EnvironmentSustainabilityCockpit.jsx';
import EnvironmentCarbonCockpit from './EnvironmentCarbonCockpit.jsx';
import EnvironmentCarbonHeatmapWorkspace from './EnvironmentCarbonHeatmapWorkspace.jsx';
import EnvironmentHeatmapWorkspace from './EnvironmentHeatmapWorkspace.jsx';
import EnvironmentExecutiveRiskWorkspace from './EnvironmentExecutiveRiskWorkspace.jsx';
import EnvironmentExecutiveNarrativeCenterWorkspace from './EnvironmentExecutiveNarrativeCenterWorkspace.jsx';
import EnvironmentExecutiveCrossDomainWorkspace from './EnvironmentExecutiveCrossDomainWorkspace.jsx';
import EnvironmentExecutiveEsgNarrativeWorkspace from './EnvironmentExecutiveEsgNarrativeWorkspace.jsx';
import EnvironmentSustainabilityNarrativeWorkspace from './EnvironmentSustainabilityNarrativeWorkspace.jsx';

export function EnvironmentExecutiveViewRouter({ companyId }) {
  const [searchParams] = useSearchParams();
  const panel = searchParams.get('panel') || 'hub';

  if (!isEnvironmentExecutiveRuntimeEnabled()) {
    return (
      <div className="impetus-card" style={{ padding: 16, borderRadius: 4 }}>
        <p style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 12, textTransform: 'uppercase' }}>
          Executive runtime desligado (shadow)
        </p>
        <Link to="/app/environment/operational" className="btn-ghost" style={{ marginTop: 12, display: 'inline-flex', borderRadius: 4 }}>
          Voltar
        </Link>
      </div>
    );
  }

  if (panel === 'esg') return <EnvironmentExecutiveEsgCockpit />;
  if (panel === 'esg-narrative') return <EnvironmentExecutiveEsgNarrativeWorkspace />;
  if (panel === 'sustainability') return <EnvironmentSustainabilityCockpit />;
  if (panel === 'sustainability-narrative') return <EnvironmentSustainabilityNarrativeWorkspace />;
  if (panel === 'carbon') return <EnvironmentCarbonCockpit />;
  if (panel === 'carbon-heatmap') return <EnvironmentCarbonHeatmapWorkspace />;
  if (panel === 'heatmaps') return <EnvironmentHeatmapWorkspace />;
  if (panel === 'risk') return <EnvironmentExecutiveRiskWorkspace />;
  if (panel === 'intelligence') return <EnvironmentExecutiveNarrativeCenterWorkspace />;
  if (panel === 'cross-domain') return <EnvironmentExecutiveCrossDomainWorkspace />;
  return <EnvironmentExecutiveIntelligenceCenter companyId={companyId} />;
}

export default EnvironmentExecutiveViewRouter;
