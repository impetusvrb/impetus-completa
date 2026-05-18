import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { isEnvironmentCognitiveRuntimeEnabled } from './environmentCognitiveFeatureFlags.js';
import EnvironmentCognitiveIntelligenceHub from './EnvironmentCognitiveIntelligenceHub.jsx';
import { EnvironmentRecommendationWorkspace } from './EnvironmentRecommendationWorkspace.jsx';
import { EnvironmentNarrativeWorkspace } from './EnvironmentNarrativeWorkspace.jsx';
import { EnvironmentReasoningWorkspace } from './EnvironmentReasoningWorkspace.jsx';
import { EnvironmentEnvironmentalRiskWorkspace } from './EnvironmentEnvironmentalRiskWorkspace.jsx';
import { EnvironmentCrossDomainWorkspace } from './EnvironmentCrossDomainWorkspace.jsx';

export function EnvironmentCognitiveViewRouter({ companyId }) {
  const [searchParams] = useSearchParams();
  const panel = searchParams.get('panel') || 'hub';

  if (!isEnvironmentCognitiveRuntimeEnabled()) {
    return (
      <div className="impetus-card" style={{ padding: 16, borderRadius: 4 }}>
        <p style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 12, textTransform: 'uppercase' }}>
          Cognitive runtime desligado (shadow)
        </p>
        <Link to="/app/environment/operational" className="btn-ghost" style={{ marginTop: 12, display: 'inline-flex', borderRadius: 4 }}>
          Voltar
        </Link>
      </div>
    );
  }

  if (panel === 'recommendations') return <EnvironmentRecommendationWorkspace />;
  if (panel === 'narrative') return <EnvironmentNarrativeWorkspace />;
  if (panel === 'reasoning') return <EnvironmentReasoningWorkspace />;
  if (panel === 'risk') return <EnvironmentEnvironmentalRiskWorkspace />;
  if (panel === 'cross-domain') return <EnvironmentCrossDomainWorkspace />;
  return <EnvironmentCognitiveIntelligenceHub companyId={companyId} />;
}

export default EnvironmentCognitiveViewRouter;
