import React from 'react';
import { environmentGovernance } from '../../../../services/api.js';
import { EnvironmentGovernanceApiPanel } from '../shared/EnvironmentGovernanceApiPanel.jsx';

export function EnvironmentEnergyHub() {
  return (
    <EnvironmentGovernanceApiPanel
      title="Energia"
      subtitle="Consumo, eficiência e correlação produção×energia"
      fetcher={() =>
        environmentGovernance.energyEfficiency({
          energy_kwh: 48000,
          expected_kwh: 50000,
          production_units: 1000
        })
      }
    />
  );
}

export const EnvironmentEnergyConsumptionWorkspace = EnvironmentEnergyHub;
export const EnvironmentEnergyEfficiencyWorkspace = EnvironmentEnergyHub;
export const EnvironmentEnergyCorrelationWorkspace = EnvironmentEnergyHub;

export default EnvironmentEnergyHub;
