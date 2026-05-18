import React from 'react';
import { environmentGovernance } from '../../../../services/api.js';
import { EnvironmentGovernanceApiPanel } from '../shared/EnvironmentGovernanceApiPanel.jsx';

export function EnvironmentEsgGovernanceHub() {
  return (
    <EnvironmentGovernanceApiPanel
      title="ESG Governance"
      subtitle="Score, metas, readiness e narrativa assistiva"
      fetcher={() => environmentGovernance.esgEvaluate({ environmental_score: 68, targets: { esg: 72 } })}
    />
  );
}

export const EnvironmentEsgScoreWorkspace = EnvironmentEsgGovernanceHub;
export const EnvironmentEsgNarrativeWorkspace = EnvironmentEsgGovernanceHub;
export const EnvironmentEsgMetricsWorkspace = EnvironmentEsgGovernanceHub;

export default EnvironmentEsgGovernanceHub;
