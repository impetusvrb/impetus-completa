import React from 'react';
import { Link } from 'react-router-dom';
import { EnvironmentGovernancePackPanel } from './shared/EnvironmentGovernanceApiPanel.jsx';
import { govLabel } from './shared/governanceUi.js';

const LINKS = [
  { view: 'esg', label: 'ESG' },
  { view: 'compliance', label: 'Compliance' },
  { view: 'carbon', label: 'Carbono' },
  { view: 'energy', label: 'Energia' },
  { view: 'sustainability', label: 'Sustentabilidade' },
  { view: 'intelligence', label: 'Inteligência executiva' }
];

export default function EnvironmentGovernanceHub() {
  return (
    <div>
      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4, marginBottom: 12 }}>
        <div style={govLabel}>Governança ambiental enterprise</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
          Camada estratégica · shadow · assistiva
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {LINKS.map((l) => (
            <Link key={l.view} to={`/app/environment/operational?view=${l.view}`} className="btn-ghost" style={{ borderRadius: 4 }}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>
      <EnvironmentGovernancePackPanel />
    </div>
  );
}
