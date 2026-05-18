import React from 'react';
import { environmentGovernance } from '../../../../services/api.js';
import { EnvironmentGovernanceApiPanel } from '../shared/EnvironmentGovernanceApiPanel.jsx';

export function EnvironmentSustainabilityHub() {
  return (
    <EnvironmentGovernanceApiPanel
      title="Sustentabilidade"
      subtitle="Pegadas hídrica/resíduos e maturidade ambiental"
      fetcher={() =>
        environmentGovernance.sustainabilityMaturity({
          water_m3: 1100,
          waste_tonnes: 12,
          esg_score: 65,
          compliance_score: 70
        })
      }
    />
  );
}

export const EnvironmentFootprintWorkspace = EnvironmentSustainabilityHub;
export const EnvironmentMaturityWorkspace = EnvironmentSustainabilityHub;
export const EnvironmentSustainabilityWorkspace = EnvironmentSustainabilityHub;

export default EnvironmentSustainabilityHub;
