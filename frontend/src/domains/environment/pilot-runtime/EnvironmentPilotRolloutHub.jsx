import React from 'react';
import EnvironmentPilotOperationalDashboard from './EnvironmentPilotOperationalDashboard.jsx';

export default function EnvironmentPilotRolloutHub() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 20, textTransform: 'uppercase', color: 'var(--text-primary)' }}>
          Rollout Pilot — Ambiental
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
          Validação de maturidade, ergonomia, saturação cognitiva e coexistência multi-domínio (shadow).
        </p>
      </header>
      <EnvironmentPilotOperationalDashboard />
    </div>
  );
}
