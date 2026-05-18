import React from 'react';
import { assertEnvironmentRouteAccess } from './environmentRuntimePublicationGuard.js';

export function EnvironmentRuntimePublicationGate({ children, requirePublication = true }) {
  const gate = assertEnvironmentRouteAccess({ requirePublication });
  if (!gate.allowed) {
    return (
      <div className="impetus-card" style={{ padding: '1rem', margin: '0.5rem', borderRadius: 4 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--amber)', textTransform: 'uppercase' }}>
          Logística — runtime indisponível
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 8 }}>{gate.reason}</p>
      </div>
    );
  }
  return children;
}
