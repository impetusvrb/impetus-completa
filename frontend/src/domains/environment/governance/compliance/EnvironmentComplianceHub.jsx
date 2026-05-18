import React from 'react';
import { environmentGovernance } from '../../../../services/api.js';
import { EnvironmentGovernanceApiPanel } from '../shared/EnvironmentGovernanceApiPanel.jsx';

export function EnvironmentComplianceHub() {
  return (
    <EnvironmentGovernanceApiPanel
      title="Compliance ambiental"
      subtitle="Licenças, condicionantes, auditorias e alertas"
      fetcher={() =>
        environmentGovernance.complianceScreen({
          licenses: [{ id: 'LP-1', days_to_expire: 30 }],
          obligations: [{ id: 'O1', status: 'ok' }]
        })
      }
    />
  );
}

export const EnvironmentLicensingWorkspace = EnvironmentComplianceHub;
export const EnvironmentAuditWorkspace = EnvironmentComplianceHub;
export const EnvironmentComplianceWorkspace = EnvironmentComplianceHub;

export default EnvironmentComplianceHub;
