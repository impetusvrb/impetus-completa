import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { isEnvironmentGovernanceRuntimeEnabled } from './environmentGovernanceFeatureFlags.js';
import EnvironmentGovernanceHub from './EnvironmentGovernanceHub.jsx';
import { EnvironmentEsgGovernanceHub } from './esg/EnvironmentEsgGovernanceHub.jsx';
import { EnvironmentComplianceHub } from './compliance/EnvironmentComplianceHub.jsx';
import { EnvironmentCarbonHub } from './carbon/EnvironmentCarbonHub.jsx';
import { EnvironmentEnergyHub } from './energy/EnvironmentEnergyHub.jsx';
import { EnvironmentSustainabilityHub } from './sustainability/EnvironmentSustainabilityHub.jsx';
import { EnvironmentGovernancePackPanel } from './shared/EnvironmentGovernanceApiPanel.jsx';

function EnvironmentExecutiveIntelligenceWorkspace() {
  return (
    <div>
      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16, textTransform: 'uppercase', color: 'var(--text-accent)' }}>
          Inteligência executiva ambiental
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 8 }}>
          Narrativas e explainability assistiva — sem bloqueio operacional.
        </p>
      </div>
      <EnvironmentGovernancePackPanel />
    </div>
  );
}

const VIEW_MAP = {
  esg: EnvironmentEsgGovernanceHub,
  compliance: EnvironmentComplianceHub,
  carbon: EnvironmentCarbonHub,
  energy: EnvironmentEnergyHub,
  sustainability: EnvironmentSustainabilityHub,
  governance: EnvironmentGovernanceHub,
  intelligence: EnvironmentExecutiveIntelligenceWorkspace
};

export function EnvironmentGovernanceViewRouter() {
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view');

  if (!isEnvironmentGovernanceRuntimeEnabled()) {
    return (
      <div className="impetus-card" style={{ padding: 16, borderRadius: 4 }}>
        <p style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 12, textTransform: 'uppercase' }}>
          Governance runtime desligado (shadow)
        </p>
        <Link to="/app/environment/operational" className="btn-ghost" style={{ marginTop: 12, display: 'inline-flex', borderRadius: 4 }}>
          Voltar
        </Link>
      </div>
    );
  }

  const Comp = view ? VIEW_MAP[view] : null;
  if (Comp) return <Comp />;
  return null;
}
