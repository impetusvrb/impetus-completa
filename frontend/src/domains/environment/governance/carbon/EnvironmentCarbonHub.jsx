import React from 'react';
import { environmentGovernance } from '../../../../services/api.js';
import { EnvironmentGovernanceApiPanel } from '../shared/EnvironmentGovernanceApiPanel.jsx';

export function EnvironmentCarbonHub() {
  return (
    <EnvironmentGovernanceApiPanel
      title="Carbono / GEE"
      subtitle="Inventário GHG Escopo 1–3 e intensidade"
      fetcher={() =>
        environmentGovernance.carbonInventory({
          scope1_tco2e: 150,
          scope2_tco2e: 90,
          scope3_tco2e: 40,
          production_units: 1000
        })
      }
    />
  );
}

export const EnvironmentGhgWorkspace = EnvironmentCarbonHub;
export const EnvironmentCarbonIntensityWorkspace = EnvironmentCarbonHub;
export const EnvironmentCarbonNarrativeWorkspace = EnvironmentCarbonHub;

export default EnvironmentCarbonHub;
